from __future__ import annotations

import random
import uuid
from collections import defaultdict
from typing import Generator, Literal

from app.models import (
    AgentBlueprint,
    FailureEvent,
    FailureReason,
    GraphNode,
    RunTrace,
    StepStatus,
    TopologyInfo,
    TraceStep,
)


# ---------------------------------------------------------------------------
# Token cost estimates per action type
# ---------------------------------------------------------------------------
ACTION_TOKEN_COST: dict[str, int] = {
    "THINK": 1000,
    "EDIT_FILE": 2500,
    "RUN_TEST": 1500,
    "RETRY": 800,
}

REFLECTION_KEYS = [
    "reflect_test_fail",
    "reflect_wrong_file",
    "reflect_off_by_one",
    "reflect_dependency",
]


# ---------------------------------------------------------------------------
# Warning message templates
# ---------------------------------------------------------------------------
WARNING_HALLUCINATED_TOOL = (
    "Agent attempted to use a tool that does not exist — "
    "no sandbox or workspace available. Add Sandbox or Git Workspace."
)
WARNING_FILE_CORROSION = (
    "Multiple EDIT_FILE actions without Git tracking caused file corruption. "
    "Enable Git harness to track changes and roll back."
)
WARNING_MEMORY_OVERFLOW = (
    "Memory stack overflow — too many steps without adequate memory buffer. "
    "Increase memory capacity or reduce step count."
)
WARNING_CONTEXT_FULL = (
    "Context window full — memory capacity exhausted during retry loop. "
    "Increase memory capacity or use sub-agents to isolate context."
)
WARNING_INFINITE_LOOP = (
    "Agent stuck in infinite retry loop — retries exhausted without success. "
    "Add a stop_condition (test_pass) or increase max_retries."
)
WARNING_TASK_ABANDONED = (
    "Task abandoned after first test failure — no loop strategy configured. "
    "Add a Loop strategy (react_reflexion) to enable retries."
)


class SimulationEngine:
    """Deterministic simulation engine for Agent Playground.

    All randomness is derived from a seeded ``random.Random`` instance so
    that the same ``AgentBlueprint`` + seed always produces identical output.
    """

    def __init__(self, seed: int | None = None):
        self._base_seed = seed if seed is not None else 42
        self.rng = random.Random(self._base_seed)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def simulate(self, blueprint: AgentBlueprint, seed: int | None = None) -> RunTrace:
        """Run a single deterministic simulation and return the full trace."""
        run_seed = seed if seed is not None else (blueprint.run_seed or self._base_seed)
        self.rng = random.Random(run_seed)
        run_id = str(uuid.UUID(int=self.rng.getrandbits(128)))

        steps, cost_tokens, failure_reason, failure_events, topology = (
            self._run_simulation(blueprint)
        )

        status = "SUCCESS" if failure_reason == FailureReason.NONE else "FAILED"

        return RunTrace(
            run_id=run_id,
            status=status,
            failure_reason=failure_reason,
            cost_tokens=cost_tokens,
            steps=steps,
            failure_events=failure_events,
            topology=topology,
        )

    def simulate_stream(
        self, blueprint: AgentBlueprint, seed: int | None = None
    ) -> Generator[dict, None, RunTrace]:
        """Generator that yields each TraceStep dict as it is produced,
        then returns the completed RunTrace. Used by the WebSocket endpoint."""
        run_seed = seed if seed is not None else (blueprint.run_seed or self._base_seed)
        self.rng = random.Random(run_seed)
        run_id = str(uuid.UUID(int=self.rng.getrandbits(128)))

        gen = self._run_simulation_iter(blueprint)
        collected_steps: list[TraceStep] = []
        cost_tokens = 0
        failure_reason = FailureReason.NONE
        failure_events: list[FailureEvent] = []
        topology: TopologyInfo | None = None

        while True:
            try:
                item = next(gen)
            except StopIteration as exc:
                result = exc.value
                if result is not None:
                    cost_tokens = result["cost_tokens"]
                    failure_reason = result["failure_reason"]
                    failure_events = result["failure_events"]
                    topology = result["topology"]
                break

            if isinstance(item, TraceStep):
                collected_steps.append(item)
                yield item.model_dump()

        status = "SUCCESS" if failure_reason == FailureReason.NONE else "FAILED"
        return RunTrace(
            run_id=run_id,
            status=status,
            failure_reason=failure_reason,
            cost_tokens=cost_tokens,
            steps=collected_steps,
            failure_events=failure_events,
            topology=topology,
        )

    def monte_carlo(
        self, blueprint: AgentBlueprint, num_runs: int = 100
    ) -> dict:
        """Run *num_runs* simulations and return aggregate statistics."""
        traces: list[RunTrace] = []
        base_seed = blueprint.run_seed or self._base_seed

        for i in range(num_runs):
            trace = self.simulate(blueprint, seed=base_seed + i)
            traces.append(trace)

        success_count = sum(1 for t in traces if t.status == "SUCCESS")
        success_rate = success_count / num_runs
        avg_tokens = sum(t.cost_tokens for t in traces) / num_runs

        failure_dist: dict[str, int] = defaultdict(int)
        for t in traces:
            if t.status == "FAILED":
                failure_dist[t.failure_reason.value] += 1

        return {
            "success_rate": round(success_rate, 4),
            "avg_tokens": round(avg_tokens, 1),
            "failure_distribution": dict(failure_dist),
            "sample_traces": traces[:5],
        }

    # ------------------------------------------------------------------
    # Core simulation
    # ------------------------------------------------------------------

    def _run_simulation(
        self, blueprint: AgentBlueprint
    ) -> tuple[list[TraceStep], int, FailureReason, list[FailureEvent], TopologyInfo]:
        """Non-streaming simulation core."""
        gen = self._run_simulation_iter(blueprint)
        steps: list[TraceStep] = []
        result = None
        while True:
            try:
                item = next(gen)
                if isinstance(item, TraceStep):
                    steps.append(item)
            except StopIteration as exc:
                result = exc.value
                break
        assert result is not None
        return (
            steps,
            result["cost_tokens"],
            result["failure_reason"],
            result["failure_events"],
            result["topology"],
        )

    def _run_simulation_iter(
        self, blueprint: AgentBlueprint
    ) -> Generator[TraceStep, None, dict]:
        """Yield TraceSteps; return final metadata dict."""
        steps: list[TraceStep] = []
        memory_used = 0
        cost_tokens = 0
        failure_reason = FailureReason.NONE
        failure_events: list[FailureEvent] = []

        harness = blueprint.harness
        loop = blueprint.loop_strategy
        nodes = blueprint.graph_nodes

        topology = self._analyze_topology(nodes)
        node_order = self._resolve_node_order(nodes)
        hq = self._harness_quality(harness)
        graph_bonus = self._has_graph_bonus(nodes)
        num_nodes = len(node_order)
        multi_agent = num_nodes > 1 and graph_bonus

        coder_edit_count = 0
        has_loop = loop.type != "none"
        has_tester = any(n.role == "tester" for n in node_order)

        # Group parallel coders for risk-spreading semantics
        parallel_coder_ids = self._parallel_coder_ids(nodes, topology)

        # --- Simulate each node in order ---
        for node in node_order:
            # Skip isolated nodes in multi-node graphs (still simulate but mark)
            node_steps, node_memory, node_tokens, node_failure = self._simulate_node(
                node=node,
                blueprint=blueprint,
                hq=hq,
                graph_bonus=graph_bonus,
                multi_agent=multi_agent,
                num_nodes=num_nodes,
                global_memory=memory_used,
                coder_edit_count=coder_edit_count,
            )

            for s in node_steps:
                s.step = len(steps) + 1
                steps.append(s)
                yield s
                if s.warning:
                    fr = self._warning_to_failure(s.warning)
                    if fr != FailureReason.NONE:
                        failure_events.append(FailureEvent(reason=fr, step=s.step))

            # Memory: isolated per-node for multi-agent; cumulative otherwise
            if multi_agent:
                # Track peak local memory for capacity checks; don't accumulate
                memory_used = max(memory_used, node_memory)
            else:
                memory_used += node_memory
            cost_tokens += node_tokens

            if node.role == "coder":
                coder_edit_count += sum(
                    1 for s in node_steps if s.action == "EDIT_FILE"
                )

            # Parallel coder risk-spreading: if this coder failed but another
            # parallel coder already succeeded (or will), defer failure.
            if (
                node.role == "coder"
                and node.id in parallel_coder_ids
                and node_failure != FailureReason.NONE
            ):
                # Check if any sibling parallel coder produced clean EDIT_FILE
                sibling_ok = False
                for sib_id in parallel_coder_ids:
                    if sib_id == node.id:
                        continue
                    sib_steps = [s for s in steps if s.node == sib_id and s.action == "EDIT_FILE"]
                    if sib_steps and all(s.status == StepStatus.SUCCESS for s in sib_steps):
                        sibling_ok = True
                        break
                # Also check: if this is the first parallel coder and others
                # haven't run yet, keep the failure tentatively — we'll
                # re-evaluate after all parallel coders finish.
                remaining = [
                    n for n in node_order
                    if n.id in parallel_coder_ids
                    and n.id not in {s.node for s in steps if s.action == "EDIT_FILE"}
                ]
                if sibling_ok or remaining:
                    node_failure = FailureReason.NONE

            if failure_reason == FailureReason.NONE and node_failure != FailureReason.NONE:
                failure_reason = node_failure

        # After all nodes: re-check parallel coder success
        if parallel_coder_ids and failure_reason != FailureReason.NONE:
            any_clean = False
            for cid in parallel_coder_ids:
                edits = [s for s in steps if s.node == cid and s.action == "EDIT_FILE"]
                if edits and all(s.status == StepStatus.SUCCESS for s in edits):
                    any_clean = True
                    break
            if any_clean:
                # Clear node-level failure if at least one coder succeeded
                # (keep failure_events for pedagogy — player sees the failed branch)
                if failure_reason in (
                    FailureReason.HALLUCINATED_TOOL,
                    FailureReason.FILE_CORROSION,
                    FailureReason.MEMORY_STACK_OVERFLOW,
                    FailureReason.CONTEXT_FULL,
                ):
                    failure_reason = FailureReason.NONE

        # --- Post-simulation failure checks ---
        if failure_reason == FailureReason.NONE:
            cross = self._check_cross_cut_failures(
                blueprint, steps, memory_used, coder_edit_count
            )
            if cross != FailureReason.NONE:
                failure_reason = cross
                failure_events.append(
                    FailureEvent(reason=cross, step=len(steps))
                )

        last_node_id = node_order[-1].id if node_order else "node_1"
        # Prefer tester node for final RUN_TEST if present
        tester_node = next((n for n in node_order if n.role == "tester"), None)
        test_node_id = tester_node.id if tester_node else last_node_id

        # --- Run loop / test simulation ---
        if failure_reason == FailureReason.NONE:
            if has_loop:
                loop_ok, retries_used, _ = self._simulate_loop(
                    loop.max_retries, hq, loop.type
                )
                if not loop_ok:
                    failure_reason = FailureReason.INFINITE_LOOP_TRAP
                    # Attempt feedback rework before committing the failure
                    if topology.has_feedback:
                        rescued, rework_steps, rework_tokens = self._attempt_feedback_rework(
                            blueprint, node_order, memory_used, hq
                        )
                        for s in rework_steps:
                            s.step = len(steps) + 1
                            steps.append(s)
                            yield s
                        cost_tokens += rework_tokens
                        if rescued:
                            failure_reason = FailureReason.NONE
                        else:
                            s = TraceStep(
                                step=len(steps) + 1,
                                node=test_node_id,
                                action="RETRY",
                                status=StepStatus.FAIL,
                                memory_used=memory_used,
                                warning=WARNING_INFINITE_LOOP,
                            )
                            steps.append(s)
                            yield s
                            cost_tokens += ACTION_TOKEN_COST["RETRY"]
                            failure_events.append(
                                FailureEvent(
                                    reason=FailureReason.INFINITE_LOOP_TRAP,
                                    step=s.step,
                                )
                            )
                    else:
                        s = TraceStep(
                            step=len(steps) + 1,
                            node=test_node_id,
                            action="RETRY",
                            status=StepStatus.FAIL,
                            memory_used=memory_used,
                            warning=WARNING_INFINITE_LOOP,
                        )
                        steps.append(s)
                        yield s
                        cost_tokens += ACTION_TOKEN_COST["RETRY"]
                        failure_events.append(
                            FailureEvent(
                                reason=FailureReason.INFINITE_LOOP_TRAP,
                                step=s.step,
                            )
                        )
                else:
                    for r in range(retries_used):
                        action = "RUN_TEST" if r == 0 else "RETRY"
                        reflection = None
                        if (
                            action == "RETRY"
                            and loop.type == "react_reflexion"
                        ):
                            reflection = REFLECTION_KEYS[
                                (r - 1) % len(REFLECTION_KEYS)
                            ]
                        s = TraceStep(
                            step=len(steps) + 1,
                            node=test_node_id,
                            action=action,
                            status=StepStatus.SUCCESS,
                            memory_used=memory_used,
                            reflection=reflection,
                        )
                        steps.append(s)
                        yield s
                        cost_tokens += ACTION_TOKEN_COST.get(action, 1000)
                    s = TraceStep(
                        step=len(steps) + 1,
                        node=test_node_id,
                        action="RUN_TEST",
                        status=StepStatus.SUCCESS,
                        memory_used=memory_used,
                    )
                    steps.append(s)
                    yield s
                    cost_tokens += ACTION_TOKEN_COST["RUN_TEST"]
            else:
                # No loop — single test attempt
                test_pass = self.rng.random() > max(0.1, 0.7 - hq)
                if test_pass:
                    s = TraceStep(
                        step=len(steps) + 1,
                        node=test_node_id,
                        action="RUN_TEST",
                        status=StepStatus.SUCCESS,
                        memory_used=memory_used,
                    )
                    steps.append(s)
                    yield s
                    cost_tokens += ACTION_TOKEN_COST["RUN_TEST"]
                else:
                    # Tester safety net: one extra retest before abandoning
                    if has_tester:
                        retest_pass = self.rng.random() > max(0.1, 0.55 - hq)
                        s = TraceStep(
                            step=len(steps) + 1,
                            node=test_node_id,
                            action="RUN_TEST",
                            status=StepStatus.FAIL if not retest_pass else StepStatus.SUCCESS,
                            memory_used=memory_used,
                            warning=WARNING_TASK_ABANDONED if not retest_pass else None,
                        )
                        steps.append(s)
                        yield s
                        cost_tokens += ACTION_TOKEN_COST["RUN_TEST"]
                        if retest_pass:
                            # Extra confirmation RUN_TEST
                            s2 = TraceStep(
                                step=len(steps) + 1,
                                node=test_node_id,
                                action="RUN_TEST",
                                status=StepStatus.SUCCESS,
                                memory_used=memory_used,
                            )
                            steps.append(s2)
                            yield s2
                            cost_tokens += ACTION_TOKEN_COST["RUN_TEST"]
                        else:
                            # Feedback rework chance
                            if topology.has_feedback:
                                rescued, rework_steps, rework_tokens = (
                                    self._attempt_feedback_rework(
                                        blueprint, node_order, memory_used, hq
                                    )
                                )
                                for rs in rework_steps:
                                    rs.step = len(steps) + 1
                                    steps.append(rs)
                                    yield rs
                                cost_tokens += rework_tokens
                                if rescued:
                                    pass  # SUCCESS
                                else:
                                    failure_reason = FailureReason.TASK_ABANDONED
                                    failure_events.append(
                                        FailureEvent(
                                            reason=FailureReason.TASK_ABANDONED,
                                            step=s.step,
                                        )
                                    )
                            else:
                                failure_reason = FailureReason.TASK_ABANDONED
                                failure_events.append(
                                    FailureEvent(
                                        reason=FailureReason.TASK_ABANDONED,
                                        step=s.step,
                                    )
                                )
                    else:
                        # Feedback rework before abandoning
                        if topology.has_feedback:
                            # Record the failed test first
                            s = TraceStep(
                                step=len(steps) + 1,
                                node=test_node_id,
                                action="RUN_TEST",
                                status=StepStatus.FAIL,
                                memory_used=memory_used,
                                warning=WARNING_TASK_ABANDONED,
                            )
                            steps.append(s)
                            yield s
                            cost_tokens += ACTION_TOKEN_COST["RUN_TEST"]

                            rescued, rework_steps, rework_tokens = (
                                self._attempt_feedback_rework(
                                    blueprint, node_order, memory_used, hq
                                )
                            )
                            for rs in rework_steps:
                                rs.step = len(steps) + 1
                                steps.append(rs)
                                yield rs
                            cost_tokens += rework_tokens
                            if rescued:
                                pass
                            else:
                                failure_reason = FailureReason.TASK_ABANDONED
                                failure_events.append(
                                    FailureEvent(
                                        reason=FailureReason.TASK_ABANDONED,
                                        step=s.step,
                                    )
                                )
                        else:
                            failure_reason = FailureReason.TASK_ABANDONED
                            s = TraceStep(
                                step=len(steps) + 1,
                                node=test_node_id,
                                action="RUN_TEST",
                                status=StepStatus.FAIL,
                                memory_used=memory_used,
                                warning=WARNING_TASK_ABANDONED,
                            )
                            steps.append(s)
                            yield s
                            cost_tokens += ACTION_TOKEN_COST["RUN_TEST"]
                            failure_events.append(
                                FailureEvent(
                                    reason=FailureReason.TASK_ABANDONED,
                                    step=s.step,
                                )
                            )

        return {
            "cost_tokens": cost_tokens,
            "failure_reason": failure_reason,
            "failure_events": failure_events,
            "topology": topology,
        }

    # ------------------------------------------------------------------
    # Topology analysis
    # ------------------------------------------------------------------

    @staticmethod
    def _analyze_topology(nodes: list[GraphNode]) -> TopologyInfo:
        """Classify graph topology: single / chain / parallel / feedback."""
        if not nodes:
            return TopologyInfo(kind="single")
        if len(nodes) == 1:
            return TopologyInfo(kind="single")

        node_map = {n.id: n for n in nodes}
        incoming: dict[str, list[str]] = defaultdict(list)
        for n in nodes:
            for nxt in n.next:
                if nxt in node_map:
                    incoming[nxt].append(n.id)

        # Isolated: no in, no out, in a multi-node graph with other connected nodes
        isolated = [
            n.id for n in nodes if not n.next and n.id not in incoming
        ]
        connected = [n for n in nodes if n.id not in isolated]
        if len(connected) <= 1:
            isolated = []

        # True feedback = cycle (back-edge), not mere diamond/join convergence
        has_feedback = SimulationEngine._has_cycle(nodes)
        # Also treat explicit reviewer → coder/planner as feedback even if
        # topological walk skipped the back-edge for ordering
        if not has_feedback:
            for n in nodes:
                if n.role == "reviewer":
                    for nxt in n.next:
                        target = node_map.get(nxt)
                        if target and target.role in ("coder", "planner"):
                            has_feedback = True
                            break

        # Parallel: ≥2 coders that share a predecessor or are both roots
        coders = [n for n in nodes if n.role == "coder"]
        parallel_coders = 0
        if len(coders) >= 2:
            roots = [n for n in coders if n.id not in incoming]
            if len(roots) >= 2:
                parallel_coders = len(roots)
            else:
                pred_groups: dict[tuple, list[str]] = defaultdict(list)
                for c in coders:
                    preds = tuple(sorted(incoming.get(c.id, [])))
                    pred_groups[preds].append(c.id)
                for group in pred_groups.values():
                    if len(group) >= 2:
                        parallel_coders = max(parallel_coders, len(group))

        if has_feedback:
            kind: Literal["single", "chain", "parallel", "feedback"] = "feedback"
        elif parallel_coders >= 2:
            kind = "parallel"
        else:
            kind = "chain"

        return TopologyInfo(
            kind=kind,
            has_feedback=has_feedback,
            parallel_coders=parallel_coders,
            isolated_nodes=isolated,
        )

    @staticmethod
    def _has_cycle(nodes: list[GraphNode]) -> bool:
        """DFS cycle detection (gray-node back-edge)."""
        WHITE, GRAY, BLACK = 0, 1, 2
        color = {n.id: WHITE for n in nodes}
        node_map = {n.id: n for n in nodes}

        def dfs(uid: str) -> bool:
            color[uid] = GRAY
            for nxt in node_map[uid].next:
                if nxt not in color:
                    continue
                if color[nxt] == GRAY:
                    return True
                if color[nxt] == WHITE and dfs(nxt):
                    return True
            color[uid] = BLACK
            return False

        for n in nodes:
            if color[n.id] == WHITE and dfs(n.id):
                return True
        return False

    @staticmethod
    def _parallel_coder_ids(
        nodes: list[GraphNode], topology: TopologyInfo
    ) -> set[str]:
        """Return the set of coder node IDs that are considered parallel."""
        if topology.parallel_coders < 2:
            return set()
        coders = [n for n in nodes if n.role == "coder"]
        if len(coders) < 2:
            return set()

        node_map = {n.id: n for n in nodes}
        incoming: dict[str, list[str]] = defaultdict(list)
        for n in nodes:
            for nxt in n.next:
                if nxt in node_map:
                    incoming[nxt].append(n.id)

        roots = [n for n in coders if n.id not in incoming]
        if len(roots) >= 2:
            return {n.id for n in roots}

        pred_groups: dict[tuple, list[str]] = defaultdict(list)
        for c in coders:
            preds = tuple(sorted(incoming.get(c.id, [])))
            pred_groups[preds].append(c.id)
        for group in pred_groups.values():
            if len(group) >= 2:
                return set(group)
        return {n.id for n in coders}

    @staticmethod
    def _has_graph_bonus(nodes: list[GraphNode]) -> bool:
        """Return True if the graph forms a planner→coder→reviewer chain.

        Kept as a thin wrapper for backward-compatible tests.
        """
        if len(nodes) < 3:
            return False
        roles = {n.role for n in nodes}
        return roles >= {"planner", "coder", "reviewer"}

    @staticmethod
    def _harness_quality(harness) -> float:
        return 0.1 * (
            harness.has_workspace + harness.has_sandbox + harness.has_git
        ) + 0.05 * min(harness.memory_capacity, 10)

    @staticmethod
    def _resolve_node_order(nodes: list[GraphNode]) -> list[GraphNode]:
        """Topological traversal of graph nodes.  Falls back to definition
        order if the graph is a simple chain or has no edges."""
        if not nodes:
            return []

        node_map = {n.id: n for n in nodes}
        all_targets = set()
        for n in nodes:
            for nxt in n.next:
                all_targets.add(nxt)
        roots = [n for n in nodes if n.id not in all_targets]

        if not roots:
            roots = [nodes[0]]

        order: list[GraphNode] = []
        visited: set[str] = set()

        def walk(n: GraphNode):
            if n.id in visited:
                return
            visited.add(n.id)
            order.append(n)
            for nxt_id in n.next:
                if nxt_id in node_map:
                    # Skip back-edges for ordering (feedback handled separately)
                    if nxt_id in visited:
                        continue
                    walk(node_map[nxt_id])

        for root in roots:
            walk(root)

        for n in nodes:
            if n.id not in visited:
                order.append(n)

        return order

    # ------------------------------------------------------------------
    # Node simulation
    # ------------------------------------------------------------------

    def _simulate_node(
        self,
        node: GraphNode,
        blueprint: AgentBlueprint,
        hq: float,
        graph_bonus: bool,
        multi_agent: bool,
        num_nodes: int,
        global_memory: int,
        coder_edit_count: int,
    ) -> tuple[list[TraceStep], int, int, FailureReason]:
        """Simulate a single graph node and return (steps, memory_delta, tokens, failure)."""
        steps: list[TraceStep] = []
        memory_delta = 0
        tokens = 0
        failure = FailureReason.NONE
        harness = blueprint.harness

        # Isolated full capacity per node when multi-agent; else shared
        node_memory_cap = harness.memory_capacity
        # Local memory starts at 0 for multi-agent isolation
        local_memory = 0

        if node.role == "planner":
            plan_count = 2 if graph_bonus else 1
            for _ in range(plan_count):
                s = self._make_step(node.id, "THINK", local_memory)
                steps.append(s)
                cost = self._memory_cost("THINK", node_memory_cap, local_memory)
                local_memory += cost
                memory_delta = local_memory
                tokens += ACTION_TOKEN_COST["THINK"]

        elif node.role == "coder":
            s = self._make_step(node.id, "THINK", local_memory)
            steps.append(s)
            cost = self._memory_cost("THINK", node_memory_cap, local_memory)
            local_memory += cost
            memory_delta = local_memory
            tokens += ACTION_TOKEN_COST["THINK"]

            mem_for_check = local_memory if multi_agent else global_memory + local_memory
            warning = self._check_step_failure(
                blueprint, node, steps, mem_for_check, coder_edit_count + 1
            )
            if warning:
                step_status = StepStatus.FAIL
                step_failure = self._warning_to_failure(warning)
            else:
                step_status = StepStatus.SUCCESS
                step_failure = FailureReason.NONE

            s = self._make_step(node.id, "EDIT_FILE", local_memory, warning, step_status)
            steps.append(s)
            cost = self._memory_cost("EDIT_FILE", node_memory_cap, local_memory)
            local_memory += cost
            memory_delta = local_memory
            tokens += ACTION_TOKEN_COST["EDIT_FILE"]

            if step_failure != FailureReason.NONE:
                failure = step_failure

            if self.rng.random() < 0.4 + hq * 0.3 and failure == FailureReason.NONE:
                edit_count = coder_edit_count + 2
                mem_for_check = local_memory if multi_agent else global_memory + local_memory
                warning2 = self._check_step_failure(
                    blueprint, node, steps, mem_for_check, edit_count
                )
                if warning2:
                    step_status2 = StepStatus.FAIL
                    if failure == FailureReason.NONE:
                        failure = self._warning_to_failure(warning2)
                else:
                    step_status2 = StepStatus.SUCCESS

                s = self._make_step(
                    node.id, "EDIT_FILE", local_memory, warning2, step_status2
                )
                steps.append(s)
                cost = self._memory_cost("EDIT_FILE", node_memory_cap, local_memory)
                local_memory += cost
                memory_delta = local_memory
                tokens += ACTION_TOKEN_COST["EDIT_FILE"]

        elif node.role == "reviewer":
            s = self._make_step(node.id, "THINK", local_memory)
            steps.append(s)
            cost = self._memory_cost("THINK", node_memory_cap, local_memory)
            local_memory += cost
            memory_delta = local_memory
            tokens += ACTION_TOKEN_COST["THINK"]

            fix_chance = 0.7 if graph_bonus else 0.3
            if self.rng.random() < fix_chance:
                s = self._make_step(node.id, "EDIT_FILE", local_memory)
                steps.append(s)
                cost = self._memory_cost("EDIT_FILE", node_memory_cap, local_memory)
                local_memory += cost
                memory_delta = local_memory
                tokens += ACTION_TOKEN_COST["EDIT_FILE"]

        elif node.role == "tester":
            s = self._make_step(node.id, "RUN_TEST", local_memory)
            steps.append(s)
            cost = self._memory_cost("RUN_TEST", node_memory_cap, local_memory)
            local_memory += cost
            memory_delta = local_memory
            tokens += ACTION_TOKEN_COST["RUN_TEST"]

        return steps, memory_delta, tokens, failure

    def _attempt_feedback_rework(
        self,
        blueprint: AgentBlueprint,
        node_order: list[GraphNode],
        memory_used: int,
        hq: float,
    ) -> tuple[bool, list[TraceStep], int]:
        """One rework cycle: coder EDIT + reviewer THINK + RUN_TEST with halved error.

        Returns (rescued, steps, tokens).
        """
        steps: list[TraceStep] = []
        tokens = 0
        coder = next((n for n in node_order if n.role == "coder"), None)
        reviewer = next((n for n in node_order if n.role == "reviewer"), None)
        tester = next((n for n in node_order if n.role == "tester"), None)
        test_id = (
            tester.id if tester else (reviewer.id if reviewer else (coder.id if coder else "node_1"))
        )

        if coder:
            s = TraceStep(
                step=0,
                node=coder.id,
                action="EDIT_FILE",
                status=StepStatus.SUCCESS,
                memory_used=memory_used,
                reflection="reflect_test_fail",
            )
            steps.append(s)
            tokens += ACTION_TOKEN_COST["EDIT_FILE"]

        if reviewer:
            s = TraceStep(
                step=0,
                node=reviewer.id,
                action="THINK",
                status=StepStatus.SUCCESS,
                memory_used=memory_used,
            )
            steps.append(s)
            tokens += ACTION_TOKEN_COST["THINK"]

        # Halved error rate for rework test
        error_rate = max(0.05, (0.7 - hq) * 0.5)
        rescued = self.rng.random() > error_rate
        s = TraceStep(
            step=0,
            node=test_id,
            action="RUN_TEST",
            status=StepStatus.SUCCESS if rescued else StepStatus.FAIL,
            memory_used=memory_used,
            warning=None if rescued else WARNING_TASK_ABANDONED,
        )
        steps.append(s)
        tokens += ACTION_TOKEN_COST["RUN_TEST"]

        return rescued, steps, tokens

    def _check_step_failure(
        self,
        blueprint: AgentBlueprint,
        node: GraphNode,
        steps_so_far: list[TraceStep],
        memory_used: int,
        coder_edit_count: int,
    ) -> str | None:
        """Check per-step failure injection rules. Returns a warning string or None."""
        harness = blueprint.harness
        loop = blueprint.loop_strategy

        if node.role == "coder" and not harness.has_sandbox and not harness.has_workspace:
            if self.rng.random() < 0.5:
                return WARNING_HALLUCINATED_TOOL

        if node.role == "coder" and not harness.has_git and coder_edit_count >= 2:
            if self.rng.random() < 0.6:
                return WARNING_FILE_CORROSION

        total_steps = len(steps_so_far) + 1
        if (
            total_steps >= 3
            and harness.memory_capacity <= 3
            and memory_used >= harness.memory_capacity
        ):
            if self.rng.random() < 0.5:
                return WARNING_MEMORY_OVERFLOW

        if loop.type != "none" and memory_used >= harness.memory_capacity:
            if self.rng.random() < 0.4:
                return WARNING_CONTEXT_FULL

        return None

    def _check_cross_cut_failures(
        self,
        blueprint: AgentBlueprint,
        steps: list[TraceStep],
        memory_used: int,
        coder_edit_count: int,
    ) -> FailureReason:
        """Check failures that can only be detected after all nodes have run."""
        harness = blueprint.harness

        if (
            len(steps) >= 3
            and harness.memory_capacity <= 3
            and memory_used >= harness.memory_capacity
        ):
            if self.rng.random() < 0.3:
                return FailureReason.MEMORY_STACK_OVERFLOW

        if not harness.has_git and coder_edit_count >= 2:
            if self.rng.random() < 0.4:
                return FailureReason.FILE_CORROSION

        if not harness.has_sandbox and not harness.has_workspace:
            if self.rng.random() < 0.3:
                return FailureReason.HALLUCINATED_TOOL

        return FailureReason.NONE

    def _simulate_loop(
        self,
        max_retries: int,
        harness_quality: float,
        loop_type: str = "react_reflexion",
    ) -> tuple[bool, int, str | None]:
        """Simulate a retry loop. Returns (success, retries_used, failure_reason)."""
        for attempt in range(max_retries):
            if loop_type == "retry_blind":
                error_rate = max(0.1, 0.8 - harness_quality)
            else:
                # react_reflexion: error decays with each attempt
                error_rate = max(0.1, 0.8 - (attempt * 0.25) - harness_quality)
            if self.rng.random() > error_rate:
                return True, attempt + 1, None
        return False, max_retries, "INFINITE_LOOP_TRAP"

    @staticmethod
    def _memory_cost(action: str, capacity: int, current: int) -> int:
        """How many memory units a given action consumes."""
        base = {"THINK": 1, "EDIT_FILE": 2, "RUN_TEST": 1, "RETRY": 1}
        cost = base.get(action, 1)
        return min(cost, capacity - current) if current < capacity else 0

    @staticmethod
    def _make_step(
        node_id: str,
        action: str,
        memory_used: int,
        warning: str | None = None,
        status: StepStatus = StepStatus.SUCCESS,
        reflection: str | None = None,
    ) -> TraceStep:
        return TraceStep(
            step=0,  # filled in by caller
            node=node_id,
            action=action,
            status=status,
            memory_used=memory_used,
            warning=warning,
            reflection=reflection,
        )

    @staticmethod
    def _warning_to_failure(warning: str) -> FailureReason:
        if "HALLUCINATED_TOOL" in warning or "tool that does not exist" in warning:
            return FailureReason.HALLUCINATED_TOOL
        if "FILE_CORROSION" in warning or "file corruption" in warning:
            return FailureReason.FILE_CORROSION
        if "MEMORY_STACK_OVERFLOW" in warning or "stack overflow" in warning:
            return FailureReason.MEMORY_STACK_OVERFLOW
        if "CONTEXT_FULL" in warning or "Context window full" in warning:
            return FailureReason.CONTEXT_FULL
        if "INFINITE_LOOP" in warning:
            return FailureReason.INFINITE_LOOP_TRAP
        if "TASK_ABANDONED" in warning:
            return FailureReason.TASK_ABANDONED
        return FailureReason.NONE

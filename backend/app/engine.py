from __future__ import annotations

import random
import uuid
from collections import defaultdict
from typing import Generator, Literal

from app.models import (
    AgentBlueprint,
    FailureReason,
    GraphEdge,
    GraphNode,
    GraphSpec,
    HarnessConfig,
    LoopConfig,
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
    "CHECK_EVIDENCE": 500,
    "STOP": 100,
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
WARNING_HALLUCINATION = (
    "Agent attempted to use a tool that does not exist — "
    "no tool surface available. Enable has_tool_registry."
)
WARNING_FILE_CORROSION = (
    "Multiple EDIT_FILE actions without persistence caused file corruption. "
    "Enable has_state_persistence to track changes and roll back."
)
WARNING_MEMORY_OVERFLOW = (
    "Memory stack overflow — too many steps without adequate memory buffer. "
    "Increase memory capacity or reduce step count."
)
WARNING_CONTEXT_OVERFLOW = (
    "Context window full — memory capacity exhausted during retry loop. "
    "Enable context_manager, use a leaner state_policy, or isolate via graph."
)
WARNING_STALE_CONTEXT = (
    "Agent acted on an outdated snapshot — its observed state lagged the real "
    "state by 2+ changes. Enable has_context_manager to keep observations fresh."
)
WARNING_INFINITE_LOOP = (
    "Agent stuck in infinite retry loop — max_iterations exhausted without "
    "evidence pass. Raise max_iterations or improve feedback/evidence."
)
WARNING_NO_RETRY_MECHANISM = (
    "Loop enabled but no retry mechanism — the harness never made retrying "
    "possible. Enable has_retry_policy."
)
WARNING_TASK_ABANDONED = (
    "Task abandoned after first test failure — no loop enabled. "
    "Enable LoopConfig to retry on evidence."
)
WARNING_BUDGET_EXHAUSTED = (
    "Run boundary exhausted — timeout_guard enforced the cap. "
    "Raise run_boundary_cap or reduce loop iterations."
)
WARNING_FALSE_COMPLETION = (
    "Agent claimed done without grounded evidence — stop_on=agent_says_done. "
    "Use stop_on=evidence_pass with a real evidence source."
)
WARNING_PERMISSION_ERROR = (
    "Agent attempted an action outside its allowed boundary. Capability != "
    "permission — enable has_permission_layer to define the boundary."
)
WARNING_DEADLOCK = (
    "Control graph has no reachable recovery path — a failure state can never "
    "recover. Add an on_fail / on_review_reject recovery edge."
)
WARNING_UNSAFE_EXECUTION = (
    "Destructive action executed without sandbox isolation — environment "
    "corrupted. Enable has_sandbox_isolation."
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

        steps, cost_tokens, failure_reason, topology = self._run_simulation(blueprint)

        status = "SUCCESS" if failure_reason == FailureReason.NONE else "FAILED"

        return RunTrace(
            run_id=run_id,
            status=status,
            failure_reason=failure_reason,
            cost_tokens=cost_tokens,
            steps=steps,
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
        topology: TopologyInfo | None = None

        while True:
            try:
                item = next(gen)
            except StopIteration as exc:
                result = exc.value
                if result is not None:
                    cost_tokens = result["cost_tokens"]
                    failure_reason = result["failure_reason"]
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
    ) -> tuple[list[TraceStep], int, FailureReason, TopologyInfo]:
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
            result["topology"],
        )

    @staticmethod
    def _effective_graph(blueprint: AgentBlueprint) -> GraphSpec:
        """Return graph with a default single coder when nodes are empty."""
        graph = blueprint.graph
        if not graph.nodes:
            return GraphSpec(
                state_schema=list(graph.state_schema),
                nodes=[GraphNode(id="node_1", role="coder")],
                edges=list(graph.edges),
                entry=graph.entry or "node_1",
                checkpointing=graph.checkpointing,
            )
        return graph

    def _run_simulation_iter(
        self, blueprint: AgentBlueprint
    ) -> Generator[TraceStep, None, dict]:
        """Yield TraceSteps; return final metadata dict."""
        steps: list[TraceStep] = []
        memory_used = 0
        cost_tokens = 0
        failure_reason = FailureReason.NONE

        harness = blueprint.harness
        loop = blueprint.loop
        graph = self._effective_graph(blueprint)
        nodes = graph.nodes
        edges = graph.edges

        topology = self._analyze_topology(nodes, edges)
        node_order = self._resolve_node_order(nodes, edges, graph.entry)
        hq = self._harness_quality(harness)
        graph_bonus = self._has_graph_bonus(nodes)
        num_nodes = len(node_order)
        multi_agent = num_nodes > 1 and graph_bonus

        coder_edit_count = 0
        has_loop = loop.enabled
        has_tester = any(n.role == "tester" for n in node_order)
        parallel_coder_ids = self._parallel_coder_ids(nodes, edges, topology)

        # --- Simulate each node in order ---
        for node in node_order:
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

            if multi_agent:
                memory_used = max(memory_used, node_memory)
            else:
                memory_used += node_memory
            cost_tokens += node_tokens

            if node.role == "coder":
                coder_edit_count += sum(
                    1 for s in node_steps if s.action == "EDIT_FILE"
                )

            if (
                node.role == "coder"
                and node.id in parallel_coder_ids
                and node_failure != FailureReason.NONE
            ):
                sibling_ok = False
                for sib_id in parallel_coder_ids:
                    if sib_id == node.id:
                        continue
                    sib_steps = [
                        s for s in steps if s.node == sib_id and s.action == "EDIT_FILE"
                    ]
                    if sib_steps and all(
                        s.status == StepStatus.SUCCESS for s in sib_steps
                    ):
                        sibling_ok = True
                        break
                remaining = [
                    n
                    for n in node_order
                    if n.id in parallel_coder_ids
                    and n.id
                    not in {s.node for s in steps if s.action == "EDIT_FILE"}
                ]
                if sibling_ok or remaining:
                    node_failure = FailureReason.NONE

            if failure_reason == FailureReason.NONE and node_failure != FailureReason.NONE:
                failure_reason = node_failure

        if parallel_coder_ids and failure_reason != FailureReason.NONE:
            any_clean = False
            for cid in parallel_coder_ids:
                edits = [s for s in steps if s.node == cid and s.action == "EDIT_FILE"]
                if edits and all(s.status == StepStatus.SUCCESS for s in edits):
                    any_clean = True
                    break
            if any_clean and failure_reason in (
                FailureReason.HALLUCINATION,
                FailureReason.FILE_CORROSION,
                FailureReason.MEMORY_STACK_OVERFLOW,
                FailureReason.CONTEXT_OVERFLOW,
            ):
                failure_reason = FailureReason.NONE

        if failure_reason == FailureReason.NONE:
            cross = self._check_cross_cut_failures(
                blueprint, steps, memory_used, coder_edit_count
            )
            if cross != FailureReason.NONE:
                failure_reason = cross

        last_node_id = node_order[-1].id if node_order else "node_1"
        tester_node = next((n for n in node_order if n.role == "tester"), None)
        test_node_id = tester_node.id if tester_node else last_node_id

        if failure_reason == FailureReason.NONE:
            budget_fail = self._check_budget(harness, cost_tokens)
            if budget_fail != FailureReason.NONE:
                failure_reason = budget_fail
                s = TraceStep(
                    step=len(steps) + 1,
                    node=test_node_id,
                    action="STOP",
                    status=StepStatus.FAIL,
                    memory_used=memory_used,
                    warning=WARNING_BUDGET_EXHAUSTED,
                )
                steps.append(s)
                yield s
                cost_tokens += ACTION_TOKEN_COST["STOP"]

        # --- Loop / test simulation ---
        if failure_reason == FailureReason.NONE:
            if has_loop:
                if not harness.has_retry_policy:
                    # Loop enabled but harness never made retrying possible.
                    failure_reason = FailureReason.INFINITE_LOOP_TRAP
                    s = TraceStep(
                        step=len(steps) + 1,
                        node=test_node_id,
                        action="RETRY",
                        status=StepStatus.FAIL,
                        memory_used=memory_used,
                        warning=WARNING_NO_RETRY_MECHANISM,
                    )
                    steps.append(s)
                    yield s
                    cost_tokens += ACTION_TOKEN_COST["RETRY"]
                elif loop.stop_on == "agent_says_done":
                    # --- Ungrounded stop ---
                    evidence_ok = False
                    if loop.evidence != "none":
                        evidence_ok = self.rng.random() > max(0.1, 0.55 - hq)

                    if loop.evidence != "none":
                        s = TraceStep(
                            step=len(steps) + 1,
                            node=test_node_id,
                            action="CHECK_EVIDENCE",
                            status=(
                                StepStatus.SUCCESS if evidence_ok else StepStatus.FAIL
                            ),
                            memory_used=memory_used,
                            warning=None if evidence_ok else WARNING_FALSE_COMPLETION,
                        )
                        steps.append(s)
                        yield s
                        cost_tokens += ACTION_TOKEN_COST["CHECK_EVIDENCE"]

                    if evidence_ok and loop.evidence != "none":
                        # Evidence happened to pass — still often ungrounded
                        if self.rng.random() < 0.7:
                            failure_reason = FailureReason.FALSE_COMPLETION
                            s = TraceStep(
                                step=len(steps) + 1,
                                node=test_node_id,
                                action="STOP",
                                status=StepStatus.FAIL,
                                memory_used=memory_used,
                                warning=WARNING_FALSE_COMPLETION,
                            )
                        else:
                            s = TraceStep(
                                step=len(steps) + 1,
                                node=test_node_id,
                                action="STOP",
                                status=StepStatus.SUCCESS,
                                memory_used=memory_used,
                            )
                        steps.append(s)
                        yield s
                        cost_tokens += ACTION_TOKEN_COST["STOP"]
                    else:
                        failure_reason = FailureReason.FALSE_COMPLETION
                        s = TraceStep(
                            step=len(steps) + 1,
                            node=test_node_id,
                            action="STOP",
                            status=StepStatus.FAIL,
                            memory_used=memory_used,
                            warning=WARNING_FALSE_COMPLETION,
                        )
                        steps.append(s)
                        yield s
                        cost_tokens += ACTION_TOKEN_COST["STOP"]

                else:
                    # evidence_pass or budget_or_max
                    loop_ok, retries_used, _ = self._simulate_loop(loop, hq)

                    ctx_risk = self._context_full_risk(loop, harness, memory_used)
                    if ctx_risk > 0 and self.rng.random() < ctx_risk:
                        failure_reason = FailureReason.CONTEXT_OVERFLOW
                        s = TraceStep(
                            step=len(steps) + 1,
                            node=test_node_id,
                            action="RETRY",
                            status=StepStatus.FAIL,
                            memory_used=memory_used,
                            warning=WARNING_CONTEXT_OVERFLOW,
                        )
                        steps.append(s)
                        yield s
                        cost_tokens += ACTION_TOKEN_COST["RETRY"]
                    elif not loop_ok:
                        failure_reason = FailureReason.INFINITE_LOOP_TRAP
                        if topology.has_feedback:
                            rescued, rework_steps, rework_tokens = (
                                self._attempt_feedback_rework(
                                    blueprint, node_order, memory_used, hq
                                )
                            )
                            for s in rework_steps:
                                s.step = len(steps) + 1
                                steps.append(s)
                                yield s
                            cost_tokens += rework_tokens
                            if rescued:
                                failure_reason = FailureReason.NONE
                                s = TraceStep(
                                    step=len(steps) + 1,
                                    node=test_node_id,
                                    action="STOP",
                                    status=StepStatus.SUCCESS,
                                    memory_used=memory_used,
                                )
                                steps.append(s)
                                yield s
                                cost_tokens += ACTION_TOKEN_COST["STOP"]
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
                    else:
                        use_reflexion = (
                            loop.evidence != "none" and loop.feedback == "reflexion"
                        )
                        for r in range(retries_used):
                            if r == 0:
                                action = "RUN_TEST"
                                reflection = None
                            else:
                                action = "RETRY"
                                reflection = None
                                if use_reflexion:
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

                        if loop.evidence != "none":
                            s = TraceStep(
                                step=len(steps) + 1,
                                node=test_node_id,
                                action="CHECK_EVIDENCE",
                                status=StepStatus.SUCCESS,
                                memory_used=memory_used,
                            )
                            steps.append(s)
                            yield s
                            cost_tokens += ACTION_TOKEN_COST["CHECK_EVIDENCE"]

                        s = TraceStep(
                            step=len(steps) + 1,
                            node=test_node_id,
                            action="STOP",
                            status=StepStatus.SUCCESS,
                            memory_used=memory_used,
                        )
                        steps.append(s)
                        yield s
                        cost_tokens += ACTION_TOKEN_COST["STOP"]

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
                    abandoned = True
                    if has_tester:
                        retest_pass = self.rng.random() > max(0.1, 0.55 - hq)
                        s = TraceStep(
                            step=len(steps) + 1,
                            node=test_node_id,
                            action="RUN_TEST",
                            status=(
                                StepStatus.SUCCESS
                                if retest_pass
                                else StepStatus.FAIL
                            ),
                            memory_used=memory_used,
                            warning=(
                                None if retest_pass else WARNING_TASK_ABANDONED
                            ),
                        )
                        steps.append(s)
                        yield s
                        cost_tokens += ACTION_TOKEN_COST["RUN_TEST"]
                        if retest_pass:
                            abandoned = False
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

                    if abandoned:
                        rescued = False
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
                            failure_reason = FailureReason.NONE
                        elif graph.checkpointing and self.rng.random() < 0.45:
                            failure_reason = FailureReason.NONE
                            s3 = TraceStep(
                                step=len(steps) + 1,
                                node=test_node_id,
                                action="RUN_TEST",
                                status=StepStatus.SUCCESS,
                                memory_used=memory_used,
                            )
                            steps.append(s3)
                            yield s3
                            cost_tokens += ACTION_TOKEN_COST["RUN_TEST"]
                        else:
                            failure_reason = FailureReason.TASK_ABANDONED

        # Final budget check
        if failure_reason == FailureReason.NONE:
            budget_fail = self._check_budget(harness, cost_tokens)
            if budget_fail != FailureReason.NONE:
                failure_reason = budget_fail
                s = TraceStep(
                    step=len(steps) + 1,
                    node=test_node_id,
                    action="STOP",
                    status=StepStatus.FAIL,
                    memory_used=memory_used,
                    warning=WARNING_BUDGET_EXHAUSTED,
                )
                steps.append(s)
                yield s
                cost_tokens += ACTION_TOKEN_COST["STOP"]

        return {
            "cost_tokens": cost_tokens,
            "failure_reason": failure_reason,
            "topology": topology,
        }

    # ------------------------------------------------------------------
    # Topology analysis (adapted to GraphSpec edges)
    # ------------------------------------------------------------------

    @staticmethod
    def _adjacency(
        nodes: list[GraphNode], edges: list[GraphEdge]
    ) -> tuple[dict[str, list[str]], dict[str, list[str]]]:
        node_ids = {n.id for n in nodes}
        outgoing: dict[str, list[str]] = defaultdict(list)
        incoming: dict[str, list[str]] = defaultdict(list)
        for e in edges:
            if e.source in node_ids and e.target in node_ids:
                outgoing[e.source].append(e.target)
                incoming[e.target].append(e.source)
        return outgoing, incoming

    @staticmethod
    def _analyze_topology(
        nodes: list[GraphNode], edges: list[GraphEdge] | None = None
    ) -> TopologyInfo:
        """Classify graph topology: single / chain / parallel / feedback."""
        if not nodes:
            return TopologyInfo(kind="single")
        if len(nodes) == 1:
            return TopologyInfo(kind="single")

        edges = edges or []
        node_map = {n.id: n for n in nodes}
        outgoing, incoming = SimulationEngine._adjacency(nodes, edges)

        isolated = [
            n.id for n in nodes if not outgoing[n.id] and n.id not in incoming
        ]
        connected = [n for n in nodes if n.id not in isolated]
        if len(connected) <= 1:
            isolated = []

        has_feedback = SimulationEngine._has_cycle(nodes, edges)
        if not has_feedback:
            for e in edges:
                if e.condition in ("on_fail", "on_review_reject"):
                    has_feedback = True
                    break
        if not has_feedback:
            for e in edges:
                src = node_map.get(e.source)
                tgt = node_map.get(e.target)
                if (
                    src
                    and tgt
                    and src.role == "reviewer"
                    and tgt.role in ("coder", "planner")
                ):
                    has_feedback = True
                    break

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
    def _has_cycle(nodes: list[GraphNode], edges: list[GraphEdge]) -> bool:
        """DFS cycle detection (gray-node back-edge)."""
        WHITE, GRAY, BLACK = 0, 1, 2
        color = {n.id: WHITE for n in nodes}
        outgoing, _ = SimulationEngine._adjacency(nodes, edges)

        def dfs(uid: str) -> bool:
            color[uid] = GRAY
            for nxt in outgoing[uid]:
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
        nodes: list[GraphNode],
        edges: list[GraphEdge],
        topology: TopologyInfo,
    ) -> set[str]:
        """Return the set of coder node IDs that are considered parallel."""
        if topology.parallel_coders < 2:
            return set()
        coders = [n for n in nodes if n.role == "coder"]
        if len(coders) < 2:
            return set()

        _, incoming = SimulationEngine._adjacency(nodes, edges)

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
        """Return True if the graph forms a planner→coder→reviewer chain."""
        if len(nodes) < 3:
            return False
        roles = {n.role for n in nodes}
        return roles >= {"planner", "coder", "reviewer"}

    @staticmethod
    def _harness_quality(harness: HarnessConfig) -> float:
        """Quality from six effect dims (retry_policy is a gate, not a booster)."""
        dims = (
            harness.has_tool_registry
            + harness.has_timeout_guard
            + harness.has_sandbox_isolation
            + harness.has_context_manager
            + harness.has_state_persistence
            + harness.has_permission_layer
        )
        return 0.1 * dims + 0.05 * min(harness.memory_capacity, 10)

    @staticmethod
    def _resolve_node_order(
        nodes: list[GraphNode],
        edges: list[GraphEdge] | None = None,
        entry: str | None = None,
    ) -> list[GraphNode]:
        """Topological traversal via edges. Falls back to definition order."""
        if not nodes:
            return []

        edges = edges or []
        node_map = {n.id: n for n in nodes}
        outgoing, incoming = SimulationEngine._adjacency(nodes, edges)

        if entry and entry in node_map:
            roots = [node_map[entry]]
        else:
            roots = [n for n in nodes if n.id not in incoming]
            if not roots:
                roots = [nodes[0]]

        order: list[GraphNode] = []
        visited: set[str] = set()

        def walk(n: GraphNode):
            if n.id in visited:
                return
            visited.add(n.id)
            order.append(n)
            for nxt_id in outgoing[n.id]:
                if nxt_id in node_map and nxt_id not in visited:
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
        """Simulate a single graph node; return (steps, memory_delta, tokens, failure)."""
        steps: list[TraceStep] = []
        memory_delta = 0
        tokens = 0
        failure = FailureReason.NONE
        harness = blueprint.harness

        node_memory_cap = harness.memory_capacity
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

            mem_for_check = (
                local_memory if multi_agent else global_memory + local_memory
            )
            warning = self._check_step_failure(
                blueprint, node, steps, mem_for_check, coder_edit_count + 1
            )
            if warning:
                step_status = StepStatus.FAIL
                step_failure = self._warning_to_failure(warning)
            else:
                step_status = StepStatus.SUCCESS
                step_failure = FailureReason.NONE

            s = self._make_step(
                node.id, "EDIT_FILE", local_memory, warning, step_status
            )
            steps.append(s)
            cost = self._memory_cost("EDIT_FILE", node_memory_cap, local_memory)
            local_memory += cost
            memory_delta = local_memory
            tokens += ACTION_TOKEN_COST["EDIT_FILE"]

            if step_failure != FailureReason.NONE:
                failure = step_failure

            if self.rng.random() < 0.4 + hq * 0.3 and failure == FailureReason.NONE:
                edit_count = coder_edit_count + 2
                mem_for_check = (
                    local_memory if multi_agent else global_memory + local_memory
                )
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
        """One rework cycle: coder EDIT + reviewer THINK + RUN_TEST with halved error."""
        steps: list[TraceStep] = []
        tokens = 0
        coder = next((n for n in node_order if n.role == "coder"), None)
        reviewer = next((n for n in node_order if n.role == "reviewer"), None)
        tester = next((n for n in node_order if n.role == "tester"), None)
        test_id = (
            tester.id
            if tester
            else (reviewer.id if reviewer else (coder.id if coder else "node_1"))
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
        """Check per-step failure injection. Returns a warning string or None."""
        harness = blueprint.harness
        loop = blueprint.loop

        # Tool Registry gate: no tool surface -> hallucinated API calls
        if not harness.has_tool_registry and node.role == "coder":
            rate = 0.65 if not harness.has_sandbox_isolation else 0.5
            if self.rng.random() < rate:
                return WARNING_HALLUCINATION

        # State Persistence gate: 2+ edits without versioning -> corruption
        if (
            not harness.has_state_persistence
            and node.role == "coder"
            and coder_edit_count >= 2
        ):
            if self.rng.random() < 0.6:
                return WARNING_FILE_CORROSION

        total_steps = len(steps_so_far) + 1
        if self._check_memory_overflow_condition(harness, memory_used, total_steps):
            if self.rng.random() < 0.5:
                return WARNING_MEMORY_OVERFLOW

        if loop.enabled and memory_used >= harness.memory_capacity:
            risk = self._context_full_risk(loop, harness, memory_used)
            if risk > 0 and self.rng.random() < risk:
                return WARNING_CONTEXT_OVERFLOW

        # Observation gate: STALE_CONTEXT (state_version lags observed_version).
        # The in-flight EDIT_FILE being validated is one more change the model
        # is acting on, so a THINK -> EDIT#1 -> EDIT#2 sequence lags by 2.
        if (
            not harness.has_context_manager
            and node.role == "coder"
            and self._stale_risk(blueprint, steps_so_far, in_flight_edits=1)
        ):
            if self.rng.random() < 0.20:
                return WARNING_STALE_CONTEXT

        # Permission gate: capability != permission
        if harness.has_tool_registry and node.role == "coder":
            if self.rng.random() < 0.20:  # agent attempts an out-of-boundary action
                if not harness.has_permission_layer:
                    return WARNING_PERMISSION_ERROR
                # permission layer cleanly denies -> no failure, agent recovers in-bounds

        # Sandbox gate: UNSAFE_EXECUTION (destructive action, no isolation).
        # Fires for any agent with a tool registry but no sandbox — it is a
        # sandbox-isolation failure, not gated by level or Boss.
        if harness.has_tool_registry and not harness.has_sandbox_isolation:
            if self.rng.random() < 0.15:
                return WARNING_UNSAFE_EXECUTION

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

        if self._check_memory_overflow_condition(harness, memory_used, len(steps)):
            if self.rng.random() < 0.3:
                return FailureReason.MEMORY_STACK_OVERFLOW

        if self._check_corrosion_condition(harness, coder_edit_count):
            if self.rng.random() < 0.4:
                return FailureReason.FILE_CORROSION

        if self._check_hallucination_condition(harness):
            if self.rng.random() < 0.3:
                return FailureReason.HALLUCINATION

        return FailureReason.NONE

    @staticmethod
    def _context_full_risk(
        loop: LoopConfig, harness: HarnessConfig, memory_used: int
    ) -> float:
        """CONTEXT_OVERFLOW probability; higher when state_policy keeps history."""
        if memory_used < harness.memory_capacity:
            return 0.0
        if not loop.enabled:
            return 0.0
        if loop.state_policy == "stateless":
            return 0.2
        if loop.state_policy == "keep_last_error":
            return 0.55
        return 0.75  # keep_run_summary

    @staticmethod
    def _check_hallucination_condition(
        harness: HarnessConfig, role: str | None = None
    ) -> bool:
        """Return True if hallucinated-tool failure is possible given the state."""
        if role is not None and role != "coder":
            return False
        return not harness.has_tool_registry

    @staticmethod
    def _check_corrosion_condition(
        harness: HarnessConfig, coder_edit_count: int, role: str | None = None
    ) -> bool:
        """Return True if file-corrosion failure is possible given the state."""
        if role is not None and role != "coder":
            return False
        return not harness.has_state_persistence and coder_edit_count >= 2

    @staticmethod
    def _check_memory_overflow_condition(
        harness: HarnessConfig, memory_used: int, step_count: int
    ) -> bool:
        """Return True if memory-overflow failure is possible given the state."""
        return (
            step_count >= 3
            and harness.memory_capacity <= 3
            and memory_used >= harness.memory_capacity
        )

    @staticmethod
    def _stale_risk(
        blueprint: AgentBlueprint,
        steps_so_far: list[TraceStep],
        in_flight_edits: int = 0,
    ) -> bool:
        """True when the model's observed state lags the real state by >= 2 changes.

        state_version increments on every EDIT_FILE. observed_version is captured
        at the last THINK or CHECK_EVIDENCE step. ``in_flight_edits`` counts
        edits that have happened but are not yet in ``steps_so_far`` (the edit
        currently being validated) — a coder doing THINK -> EDIT#1 -> EDIT#2 is
        acting on a snapshot that is 2 edits stale by EDIT#2. Lag >= 2 => stale.
        """
        state_version = 0
        observed_version = 0
        for s in steps_so_far:
            if s.action == "EDIT_FILE":
                state_version += 1
            elif s.action in ("THINK", "CHECK_EVIDENCE"):
                observed_version = state_version
        state_version += in_flight_edits
        return state_version - observed_version >= 2

    @staticmethod
    def _check_budget(harness: HarnessConfig, cost_tokens: int) -> FailureReason:
        if (
            harness.has_timeout_guard
            and harness.run_boundary_cap is not None
            and cost_tokens > harness.run_boundary_cap
        ):
            return FailureReason.BUDGET_EXHAUSTED
        return FailureReason.NONE

    def _simulate_loop(
        self,
        loop: LoopConfig | int,
        harness_quality: float = 0.0,
        feedback_mode: str | None = None,
    ) -> tuple[bool, int, str | None]:
        """Simulate a retry loop. Returns (success, retries_used, failure_reason).

        Accepts either a LoopConfig or (max_retries, harness_quality, feedback_mode)
        for test convenience: ``_simulate_loop(max_retries, hq, mode)``.
        """
        if isinstance(loop, int):
            # Legacy/test call style: _simulate_loop(max_retries, hq, mode)
            max_retries = loop
            mode = feedback_mode or "reflexion"
            if mode in ("none", "blind", "retry_blind"):
                cfg = LoopConfig(
                    enabled=True,
                    evidence="none",
                    feedback="none",
                    max_iterations=max_retries,
                    stop_on="evidence_pass",
                )
            elif mode == "compact_error":
                cfg = LoopConfig(
                    enabled=True,
                    evidence="test_runner",
                    feedback="compact_error",
                    max_iterations=max_retries,
                    stop_on="evidence_pass",
                )
            else:
                cfg = LoopConfig(
                    enabled=True,
                    evidence="test_runner",
                    feedback="reflexion",
                    max_iterations=max_retries,
                    stop_on="evidence_pass",
                )
            loop = cfg

        max_retries = loop.max_iterations
        has_evidence = loop.evidence != "none"
        use_reflexion = has_evidence and loop.feedback == "reflexion"
        use_compact = has_evidence and loop.feedback == "compact_error"

        for attempt in range(max_retries):
            if not has_evidence:
                error_rate = max(0.1, 0.8 - harness_quality)
            elif use_reflexion:
                error_rate = max(0.1, 0.8 - (attempt * 0.25) - harness_quality)
            elif use_compact:
                error_rate = max(0.1, 0.8 - (attempt * 0.12) - harness_quality)
            else:
                error_rate = max(0.1, 0.8 - (attempt * 0.05) - harness_quality)
            if self.rng.random() > error_rate:
                return True, attempt + 1, None
        return False, max_retries, "INFINITE_LOOP_TRAP"

    @staticmethod
    def _memory_cost(
        action: Literal["THINK", "EDIT_FILE", "RUN_TEST", "RETRY", "CHECK_EVIDENCE", "STOP"],
        capacity: int,
        current: int,
    ) -> int:
        """How many memory units a given action consumes."""
        base = {
            "THINK": 1,
            "EDIT_FILE": 2,
            "RUN_TEST": 1,
            "RETRY": 1,
            "CHECK_EVIDENCE": 1,
            "STOP": 0,
        }
        cost = base.get(action, 1)
        if current < capacity:
            return min(cost, capacity - current)
        # When at or over capacity, return the base cost to allow overflow tracking
        return cost

    @staticmethod
    def _make_step(
        node_id: str,
        action: Literal["THINK", "EDIT_FILE", "RUN_TEST", "RETRY", "CHECK_EVIDENCE", "STOP"],
        memory_used: int,
        warning: str | None = None,
        status: StepStatus = StepStatus.SUCCESS,
        reflection: str | None = None,
    ) -> TraceStep:
        return TraceStep(
            step=0,
            node=node_id,
            action=action,
            status=status,
            memory_used=memory_used,
            warning=warning,
            reflection=reflection,
        )

    _WARNING_TO_FAILURE: dict[str, FailureReason] = {
        WARNING_HALLUCINATION: FailureReason.HALLUCINATION,
        WARNING_FILE_CORROSION: FailureReason.FILE_CORROSION,
        WARNING_MEMORY_OVERFLOW: FailureReason.MEMORY_STACK_OVERFLOW,
        WARNING_CONTEXT_OVERFLOW: FailureReason.CONTEXT_OVERFLOW,
        WARNING_STALE_CONTEXT: FailureReason.STALE_CONTEXT,
        WARNING_INFINITE_LOOP: FailureReason.INFINITE_LOOP_TRAP,
        WARNING_NO_RETRY_MECHANISM: FailureReason.INFINITE_LOOP_TRAP,
        WARNING_TASK_ABANDONED: FailureReason.TASK_ABANDONED,
        WARNING_BUDGET_EXHAUSTED: FailureReason.BUDGET_EXHAUSTED,
        WARNING_FALSE_COMPLETION: FailureReason.FALSE_COMPLETION,
        WARNING_PERMISSION_ERROR: FailureReason.PERMISSION_ERROR,
        WARNING_DEADLOCK: FailureReason.DEADLOCK,
        WARNING_UNSAFE_EXECUTION: FailureReason.UNSAFE_EXECUTION,
    }

    @classmethod
    def _warning_to_failure(cls, warning: str) -> FailureReason:
        return cls._WARNING_TO_FAILURE.get(warning, FailureReason.NONE)

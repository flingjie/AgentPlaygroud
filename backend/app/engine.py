from __future__ import annotations

import random
import uuid
from collections import defaultdict
from typing import Generator

from app.models import (
    AgentBlueprint,
    FailureReason,
    GraphNode,
    RunTrace,
    StepStatus,
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
    """Deterministic simulation engine for Agent Forge.

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

        steps: list[TraceStep] = []
        memory_used = 0
        cost_tokens = 0
        failure_reason = FailureReason.NONE

        harness = blueprint.harness
        loop = blueprint.loop_strategy
        nodes = blueprint.graph_nodes

        # Resolve traversal order from the graph
        node_order = self._resolve_node_order(nodes)

        # Compute harness quality
        hq = self._harness_quality(harness)

        # Determine if graph bonus applies (level 4: planner→coder→reviewer)
        graph_bonus = self._has_graph_bonus(nodes)
        num_nodes = len(node_order)

        # Track per-node state for failure injection
        coder_edit_count = 0
        has_loop = loop.type != "none"

        # --- Simulate each node in order ---
        for node in node_order:
            node_steps, node_memory, node_tokens, node_failure = self._simulate_node(
                node=node,
                blueprint=blueprint,
                hq=hq,
                graph_bonus=graph_bonus,
                num_nodes=num_nodes,
                step_offset=len(steps),
                global_memory=memory_used,
                coder_edit_count=coder_edit_count,
            )

            # Accumulate into global trace
            for s in node_steps:
                s.step = len(steps) + 1
                steps.append(s)

            memory_used += node_memory
            cost_tokens += node_tokens

            if node.role == "coder":
                coder_edit_count += sum(
                    1 for s in node_steps if s.action == "EDIT_FILE"
                )

            # First failure wins
            if failure_reason == FailureReason.NONE and node_failure != FailureReason.NONE:
                failure_reason = node_failure

        # --- Post-simulation failure checks ---
        if failure_reason == FailureReason.NONE:
            # Check for failures that span multiple nodes
            failure_reason = self._check_cross_cut_failures(
                blueprint, steps, memory_used, coder_edit_count
            )

        # --- Run loop simulation to determine final pass/fail ---
        if failure_reason == FailureReason.NONE:
            if has_loop:
                loop_ok, retries_used, loop_failure = self._simulate_loop(
                    loop.max_retries, hq
                )
                if not loop_ok:
                    failure_reason = FailureReason.INFINITE_LOOP_TRAP
                    # Add a RETRY exhaustion step
                    steps.append(
                        TraceStep(
                            step=len(steps) + 1,
                            node=node_order[-1].id if node_order else "node_1",
                            action="RETRY",
                            status=StepStatus.FAIL,
                            memory_used=memory_used,
                            warning=WARNING_INFINITE_LOOP,
                        )
                    )
                    cost_tokens += ACTION_TOKEN_COST["RETRY"]
                else:
                    # Add successful retry steps
                    for r in range(retries_used):
                        action = "RUN_TEST" if r == 0 else "RETRY"
                        steps.append(
                            TraceStep(
                                step=len(steps) + 1,
                                node=node_order[-1].id if node_order else "node_1",
                                action=action,
                                status=StepStatus.SUCCESS,
                                memory_used=memory_used,
                            )
                        )
                        cost_tokens += ACTION_TOKEN_COST.get(action, 1000)
                    # Final RUN_TEST after loop succeeds
                    steps.append(
                        TraceStep(
                            step=len(steps) + 1,
                            node=node_order[-1].id if node_order else "node_1",
                            action="RUN_TEST",
                            status=StepStatus.SUCCESS,
                            memory_used=memory_used,
                        )
                    )
                    cost_tokens += ACTION_TOKEN_COST["RUN_TEST"]
            else:
                # No loop — single test attempt
                test_pass = self.rng.random() > max(0.1, 0.7 - hq)
                if test_pass:
                    steps.append(
                        TraceStep(
                            step=len(steps) + 1,
                            node=node_order[-1].id if node_order else "node_1",
                            action="RUN_TEST",
                            status=StepStatus.SUCCESS,
                            memory_used=memory_used,
                        )
                    )
                    cost_tokens += ACTION_TOKEN_COST["RUN_TEST"]
                else:
                    failure_reason = FailureReason.TASK_ABANDONED
                    steps.append(
                        TraceStep(
                            step=len(steps) + 1,
                            node=node_order[-1].id if node_order else "node_1",
                            action="RUN_TEST",
                            status=StepStatus.FAIL,
                            memory_used=memory_used,
                            warning=WARNING_TASK_ABANDONED,
                        )
                    )
                    cost_tokens += ACTION_TOKEN_COST["RUN_TEST"]

        status = "SUCCESS" if failure_reason == FailureReason.NONE else "FAILED"

        return RunTrace(
            run_id=run_id,
            status=status,
            failure_reason=failure_reason,
            cost_tokens=cost_tokens,
            steps=steps,
        )

    def simulate_stream(
        self, blueprint: AgentBlueprint, seed: int | None = None
    ) -> Generator[dict, None, RunTrace]:
        """Generator that yields each TraceStep dict as it is produced,
        then returns the completed RunTrace. Used by the WebSocket endpoint."""
        run_seed = seed if seed is not None else (blueprint.run_seed or self._base_seed)
        self.rng = random.Random(run_seed)
        run_id = str(uuid.UUID(int=self.rng.getrandbits(128)))

        steps: list[TraceStep] = []
        memory_used = 0
        cost_tokens = 0
        failure_reason = FailureReason.NONE

        harness = blueprint.harness
        loop = blueprint.loop_strategy
        nodes = blueprint.graph_nodes

        node_order = self._resolve_node_order(nodes)
        hq = self._harness_quality(harness)
        graph_bonus = self._has_graph_bonus(nodes)
        num_nodes = len(node_order)

        coder_edit_count = 0
        has_loop = loop.type != "none"

        for node in node_order:
            node_steps, node_memory, node_tokens, node_failure = self._simulate_node(
                node=node,
                blueprint=blueprint,
                hq=hq,
                graph_bonus=graph_bonus,
                num_nodes=num_nodes,
                step_offset=len(steps),
                global_memory=memory_used,
                coder_edit_count=coder_edit_count,
            )

            for s in node_steps:
                s.step = len(steps) + 1
                steps.append(s)
                yield s.model_dump()

            memory_used += node_memory
            cost_tokens += node_tokens

            if node.role == "coder":
                coder_edit_count += sum(
                    1 for s in node_steps if s.action == "EDIT_FILE"
                )

            if failure_reason == FailureReason.NONE and node_failure != FailureReason.NONE:
                failure_reason = node_failure

        if failure_reason == FailureReason.NONE:
            failure_reason = self._check_cross_cut_failures(
                blueprint, steps, memory_used, coder_edit_count
            )

        last_node_id = node_order[-1].id if node_order else "node_1"

        if failure_reason == FailureReason.NONE:
            if has_loop:
                loop_ok, retries_used, _loop_failure = self._simulate_loop(
                    loop.max_retries, hq
                )
                if not loop_ok:
                    failure_reason = FailureReason.INFINITE_LOOP_TRAP
                    s = TraceStep(
                        step=len(steps) + 1,
                        node=last_node_id,
                        action="RETRY",
                        status=StepStatus.FAIL,
                        memory_used=memory_used,
                        warning=WARNING_INFINITE_LOOP,
                    )
                    steps.append(s)
                    cost_tokens += ACTION_TOKEN_COST["RETRY"]
                    yield s.model_dump()
                else:
                    for r in range(retries_used):
                        action = "RUN_TEST" if r == 0 else "RETRY"
                        s = TraceStep(
                            step=len(steps) + 1,
                            node=last_node_id,
                            action=action,
                            status=StepStatus.SUCCESS,
                            memory_used=memory_used,
                        )
                        steps.append(s)
                        cost_tokens += ACTION_TOKEN_COST.get(action, 1000)
                        yield s.model_dump()
                    s = TraceStep(
                        step=len(steps) + 1,
                        node=last_node_id,
                        action="RUN_TEST",
                        status=StepStatus.SUCCESS,
                        memory_used=memory_used,
                    )
                    steps.append(s)
                    cost_tokens += ACTION_TOKEN_COST["RUN_TEST"]
                    yield s.model_dump()
            else:
                test_pass = self.rng.random() > max(0.1, 0.7 - hq)
                if test_pass:
                    s = TraceStep(
                        step=len(steps) + 1,
                        node=last_node_id,
                        action="RUN_TEST",
                        status=StepStatus.SUCCESS,
                        memory_used=memory_used,
                    )
                    steps.append(s)
                    cost_tokens += ACTION_TOKEN_COST["RUN_TEST"]
                    yield s.model_dump()
                else:
                    failure_reason = FailureReason.TASK_ABANDONED
                    s = TraceStep(
                        step=len(steps) + 1,
                        node=last_node_id,
                        action="RUN_TEST",
                        status=StepStatus.FAIL,
                        memory_used=memory_used,
                        warning=WARNING_TASK_ABANDONED,
                    )
                    steps.append(s)
                    cost_tokens += ACTION_TOKEN_COST["RUN_TEST"]
                    yield s.model_dump()

        status = "SUCCESS" if failure_reason == FailureReason.NONE else "FAILED"

        return RunTrace(
            run_id=run_id,
            status=status,
            failure_reason=failure_reason,
            cost_tokens=cost_tokens,
            steps=steps,
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
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _harness_quality(harness) -> float:
        return 0.1 * (harness.has_workspace + harness.has_sandbox + harness.has_git) + 0.05 * min(harness.memory_capacity, 10)

    @staticmethod
    def _has_graph_bonus(nodes: list[GraphNode]) -> bool:
        """Return True if the graph forms a planner→coder→reviewer chain."""
        if len(nodes) < 3:
            return False
        roles = {n.role for n in nodes}
        return roles >= {"planner", "coder", "reviewer"}

    @staticmethod
    def _resolve_node_order(nodes: list[GraphNode]) -> list[GraphNode]:
        """Topological traversal of graph nodes.  Falls back to definition
        order if the graph is a simple chain or has no edges."""
        if not nodes:
            return []

        node_map = {n.id: n for n in nodes}
        # Find roots: nodes not referenced in anyone's 'next'
        all_targets = set()
        for n in nodes:
            for nxt in n.next:
                all_targets.add(nxt)
        roots = [n for n in nodes if n.id not in all_targets]

        # If no clear root (cycle or single node), use the first node
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
                    walk(node_map[nxt_id])

        for root in roots:
            walk(root)

        # Append any unvisited nodes
        for n in nodes:
            if n.id not in visited:
                order.append(n)

        return order

    def _simulate_node(
        self,
        node: GraphNode,
        blueprint: AgentBlueprint,
        hq: float,
        graph_bonus: bool,
        num_nodes: int,
        step_offset: int,
        global_memory: int,
        coder_edit_count: int,
    ) -> tuple[list[TraceStep], int, int, FailureReason]:
        """Simulate a single graph node and return (steps, memory_delta, tokens, failure)."""
        steps: list[TraceStep] = []
        memory_delta = 0
        tokens = 0
        failure = FailureReason.NONE
        harness = blueprint.harness

        # Per-node memory for graph bonus
        node_memory_cap = (
            max(1, harness.memory_capacity // num_nodes)
            if graph_bonus and num_nodes > 1
            else harness.memory_capacity
        )

        if node.role == "planner":
            # Planner generates THINK steps
            plan_count = 2 if graph_bonus else 1
            for _ in range(plan_count):
                s = self._make_step(node.id, "THINK", memory_delta)
                steps.append(s)
                memory_delta += self._memory_cost("THINK", node_memory_cap, memory_delta)
                tokens += ACTION_TOKEN_COST["THINK"]

        elif node.role == "coder":
            # Coder: THINK → EDIT_FILE → EDIT_FILE (maybe)
            # THINK
            s = self._make_step(node.id, "THINK", memory_delta)
            steps.append(s)
            memory_delta += self._memory_cost("THINK", node_memory_cap, memory_delta)
            tokens += ACTION_TOKEN_COST["THINK"]

            # First EDIT_FILE
            step_failure = FailureReason.NONE
            warning = self._check_step_failure(
                blueprint, node, steps, global_memory + memory_delta, coder_edit_count + 1
            )
            if warning:
                step_status = StepStatus.FAIL
                step_failure = self._warning_to_failure(warning)
            else:
                step_status = StepStatus.SUCCESS

            s = self._make_step(node.id, "EDIT_FILE", memory_delta, warning, step_status)
            steps.append(s)
            memory_delta += self._memory_cost("EDIT_FILE", node_memory_cap, memory_delta)
            tokens += ACTION_TOKEN_COST["EDIT_FILE"]

            if step_failure != FailureReason.NONE:
                failure = step_failure

            # Second EDIT_FILE (probabilistic, more likely with higher HQ)
            if self.rng.random() < 0.4 + hq * 0.3 and failure == FailureReason.NONE:
                edit_count = coder_edit_count + 2
                warning2 = self._check_step_failure(
                    blueprint, node, steps, global_memory + memory_delta, edit_count
                )
                if warning2:
                    step_status2 = StepStatus.FAIL
                    if failure == FailureReason.NONE:
                        failure = self._warning_to_failure(warning2)
                else:
                    step_status2 = StepStatus.SUCCESS

                s = self._make_step(node.id, "EDIT_FILE", memory_delta, warning2, step_status2)
                steps.append(s)
                memory_delta += self._memory_cost("EDIT_FILE", node_memory_cap, memory_delta)
                tokens += ACTION_TOKEN_COST["EDIT_FILE"]

        elif node.role == "reviewer":
            # Reviewer: THINK → maybe EDIT_FILE
            s = self._make_step(node.id, "THINK", memory_delta)
            steps.append(s)
            memory_delta += self._memory_cost("THINK", node_memory_cap, memory_delta)
            tokens += ACTION_TOKEN_COST["THINK"]

            # Reviewer may fix issues (higher chance with graph bonus)
            fix_chance = 0.7 if graph_bonus else 0.3
            if self.rng.random() < fix_chance:
                s = self._make_step(node.id, "EDIT_FILE", memory_delta)
                steps.append(s)
                memory_delta += self._memory_cost("EDIT_FILE", node_memory_cap, memory_delta)
                tokens += ACTION_TOKEN_COST["EDIT_FILE"]

        elif node.role == "tester":
            # Tester runs tests
            s = self._make_step(node.id, "RUN_TEST", memory_delta)
            steps.append(s)
            memory_delta += self._memory_cost("RUN_TEST", node_memory_cap, memory_delta)
            tokens += ACTION_TOKEN_COST["RUN_TEST"]

        return steps, memory_delta, tokens, failure

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

        # HALLUCINATED_TOOL: coder tries to use a tool without sandbox/workspace
        if node.role == "coder" and not harness.has_sandbox and not harness.has_workspace:
            # 50% chance of hallucination per edit attempt when unprotected
            if self.rng.random() < 0.5:
                return WARNING_HALLUCINATED_TOOL

        # FILE_CORROSION: no git, 2+ coder EDIT_FILE steps
        if node.role == "coder" and not harness.has_git and coder_edit_count >= 2:
            if self.rng.random() < 0.6:
                return WARNING_FILE_CORROSION

        # MEMORY_STACK_OVERFLOW: 3+ steps with memory_capacity <= 3
        total_steps = len(steps_so_far) + 1  # +1 for current step
        if total_steps >= 3 and harness.memory_capacity <= 3 and memory_used >= harness.memory_capacity:
            if self.rng.random() < 0.5:
                return WARNING_MEMORY_OVERFLOW

        # CONTEXT_FULL: memory used >= capacity during retry-like behavior
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
        loop = blueprint.loop_strategy

        # MEMORY_STACK_OVERFLOW: global check
        if len(steps) >= 3 and harness.memory_capacity <= 3 and memory_used >= harness.memory_capacity:
            if self.rng.random() < 0.3:
                return FailureReason.MEMORY_STACK_OVERFLOW

        # FILE_CORROSION: no git, 2+ edits
        if not harness.has_git and coder_edit_count >= 2:
            if self.rng.random() < 0.4:
                return FailureReason.FILE_CORROSION

        # HALLUCINATED_TOOL: no sandbox and no workspace
        if not harness.has_sandbox and not harness.has_workspace:
            if self.rng.random() < 0.3:
                return FailureReason.HALLUCINATED_TOOL

        return FailureReason.NONE

    def _simulate_loop(
        self, max_retries: int, harness_quality: float
    ) -> tuple[bool, int, str | None]:
        """Simulate a retry loop. Returns (success, retries_used, failure_reason)."""
        for attempt in range(max_retries):
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
    ) -> TraceStep:
        return TraceStep(
            step=0,  # filled in by caller
            node=node_id,
            action=action,
            status=status,
            memory_used=memory_used,
            warning=warning,
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

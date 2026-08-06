"""AgentBlueprint -> LangGraph snippet / arlo_config.yaml (static text export)."""

from app.models import AgentBlueprint


def _node_lines(blueprint: AgentBlueprint) -> list[str]:
    graph = blueprint.graph
    if not graph.nodes:
        return ['    graph.add_node("coder", coder_agent)']
    return [f'    graph.add_node("{n.id}", {n.role}_agent)' for n in graph.nodes]


def _edge_lines(blueprint: AgentBlueprint) -> list[str]:
    graph = blueprint.graph
    if not graph.nodes:
        # Fallback single-node path owns all edges; real edges would reference
        # undefined node ids when graph.nodes is empty.
        return []
    out: list[str] = []
    for e in graph.edges:
        cond = {"always": "", "on_pass": ", condition='pass'",
                "on_fail": ", condition='fail'",
                "on_review_reject": ", condition='review_reject'",
                "on_human_approve": ", condition='human_approve'"}[e.condition]
        out.append(f'    graph.add_edge("{e.source}", "{e.target}"{cond})')
    return out


def render_langgraph(blueprint: AgentBlueprint) -> str:
    graph = blueprint.graph
    entry = graph.entry or ("node_1" if not graph.nodes else graph.nodes[0].id)
    lines = [
        "from langgraph.graph import StateGraph, START, END",
        "",
        "graph = StateGraph(State)",
    ]
    lines += _node_lines(blueprint)
    lines += _edge_lines(blueprint)
    if not graph.nodes:
        lines.append('    graph.add_edge(START, "coder")')
        lines.append('    graph.add_edge("coder", END)')
    else:
        lines.append(f'    graph.add_edge(START, "{entry}")')
        sinks = [n.id for n in graph.nodes if not any(
            e.source == n.id for e in graph.edges)]
        for s in sinks:
            lines.append(f'    graph.add_edge("{s}", END)')
    if graph.checkpointing:
        lines += [
            "",
            "from langgraph.checkpoint.memory import MemorySaver",
            "",
        ]
    else:
        lines += [""]
    compile_arg = "checkpointer=MemorySaver()" if graph.checkpointing else ""
    lines.append(f"app = graph.compile({compile_arg})")
    return "\n".join(lines)


def render_arlo(blueprint: AgentBlueprint) -> str:
    h = blueprint.harness
    loop = blueprint.loop
    graph = blueprint.graph
    lines = [
        "agent:",
        "  model:",
        "    provider: qwen",
        "harness:",
        f"  tool_registry: {str(h.has_tool_registry).lower()}",
        f"  retry_policy: {str(h.has_retry_policy).lower()}",
        f"  timeout_guard: {str(h.has_timeout_guard).lower()}",
        f"  sandbox_isolation: {str(h.has_sandbox_isolation).lower()}",
        f"  context_manager: {str(h.has_context_manager).lower()}",
        f"  state_persistence: {str(h.has_state_persistence).lower()}",
        f"  permission_layer: {str(h.has_permission_layer).lower()}",
        f"  memory_capacity: {h.memory_capacity}",
        "loop:",
        f"  enabled: {str(loop.enabled).lower()}",
        f"  trigger: {loop.trigger}",
        f"  goal: {loop.goal}",
        f"  state_policy: {loop.state_policy}",
        f"  action_policy: {loop.action_policy}",
        f"  evidence: {loop.evidence}",
        f"  feedback: {loop.feedback}",
        f"  stop_on: {loop.stop_on}",
        f"  max_iterations: {loop.max_iterations}",
        "graph:",
        f"  state_schema: {list(graph.state_schema)}",
        f"  checkpointing: {str(graph.checkpointing).lower()}",
        f"  nodes: {len(graph.nodes)}",
    ]
    return "\n".join(lines)


def render_export(blueprint: AgentBlueprint) -> dict:
    return {"langgraph": render_langgraph(blueprint), "arlo_yaml": render_arlo(blueprint)}

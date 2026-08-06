import { useCallback, useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type OnSelectionChangeParams,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTranslation } from 'react-i18next';
import { useGame } from '../context/GameContext';
import { useTheme } from '../context/ThemeContext';
import type { GraphEdge, GraphEdgeCondition, GraphNode } from '../types';
import NodePalette from './NodePalette';
import AgentNode from './AgentNode';
import GraphValidator from './GraphValidator';

const nodeTypes: NodeTypes = {
  agentNode: AgentNode,
};

const ROLE_COLORS: Record<GraphNode['role'], string> = {
  planner: '#3b82f6',
  coder: '#22c55e',
  reviewer: '#a855f7',
  tester: '#f97316',
};

const EDGE_CONDITIONS: GraphEdgeCondition[] = [
  'always',
  'on_pass',
  'on_fail',
  'on_review_reject',
  'on_human_approve',
];

function createFlowNode(gn: GraphNode, x: number, y: number): Node {
  return {
    id: gn.id,
    type: 'agentNode',
    position: { x, y },
    data: { role: gn.role, label: gn.id },
  };
}

function edgeCondition(edge: Edge): GraphEdgeCondition {
  const raw = (edge.data as { condition?: GraphEdgeCondition } | undefined)?.condition;
  return raw ?? 'always';
}

function buildGraphSpec(
  currentNodes: Node[],
  currentEdges: Edge[],
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = currentNodes.map((n) => ({
    id: n.id,
    role: (n.data?.role as GraphNode['role']) || 'coder',
    state_writes: (n.data?.state_writes as string[]) || [],
  }));

  const edges: GraphEdge[] = currentEdges.map((e) => ({
    source: e.source,
    target: e.target,
    condition: edgeCondition(e),
  }));

  return { nodes, edges };
}

function displayConditionLabel(
  condition: GraphEdgeCondition,
  labelFn: (key: string) => string,
): string | undefined {
  if (condition === 'always') return undefined;
  return labelFn(`architect.conditions.${condition}`);
}

export default function ArchitectCanvas() {
  const { t } = useTranslation();
  const { blueprint, updateGraph } = useGame();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const edgeColor = isDark ? '#94a3b8' : '#475569';
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const { screenToFlowPosition } = useReactFlow();

  const edgeLabelStyle = useMemo(
    () => ({
      fill: edgeColor,
      fontSize: 11,
      fontFamily: 'ui-monospace, monospace',
      fontWeight: 600,
    }),
    [edgeColor],
  );

  const edgeLabelBgStyle = useMemo(
    () => ({
      fill: isDark ? '#0f172a' : '#ffffff',
      fillOpacity: 0.9,
    }),
    [isDark],
  );

  const initialNodes: Node[] = useMemo(() => {
    const existing = blueprint.graph.nodes;
    if (existing.length === 0) return [];
    return existing.map((gn, i) =>
      createFlowNode(gn, 100 + (i % 3) * 280, 80 + Math.floor(i / 3) * 200),
    );
  }, [blueprint.graph.nodes]);

  const initialEdges: Edge[] = useMemo(() => {
    const existing = blueprint.graph.edges;
    if (existing.length === 0) return [];
    return existing.map((ge) => ({
      id: `${ge.source}->${ge.target}`,
      source: ge.source,
      target: ge.target,
      data: { condition: ge.condition },
      label: displayConditionLabel(ge.condition, t),
      labelStyle: edgeLabelStyle,
      labelBgStyle: edgeLabelBgStyle,
      markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
      style: { stroke: edgeColor, strokeWidth: 2 },
    }));
  }, [blueprint.graph.nodes, blueprint.graph.edges, t, edgeLabelStyle, edgeLabelBgStyle, edgeColor]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    updateGraph(buildGraphSpec(nodes, edges));
  }, [nodes, edges, updateGraph]);

  const selectedEdge = useMemo(
    () => edges.find((e) => e.id === selectedEdgeId) ?? null,
    [edges, selectedEdgeId],
  );

  const onSelectionChange = useCallback(({ edges: selEdges }: OnSelectionChangeParams) => {
    setSelectedEdgeId(selEdges[0]?.id ?? null);
  }, []);

  const setEdgeCondition = useCallback(
    (edgeId: string, condition: GraphEdgeCondition) => {
      setEdges((eds) =>
        eds.map((e) =>
          e.id === edgeId
            ? {
                ...e,
                data: { ...(e.data as object), condition },
                label: displayConditionLabel(condition, t),
                labelStyle: edgeLabelStyle,
                labelBgStyle: edgeLabelBgStyle,
              }
            : e,
        ),
      );
    },
    [setEdges, t, edgeLabelStyle, edgeLabelBgStyle],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            data: { condition: 'always' as GraphEdgeCondition },
            label: undefined,
            labelStyle: edgeLabelStyle,
            labelBgStyle: edgeLabelBgStyle,
            markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
            style: { stroke: edgeColor, strokeWidth: 2 },
          },
          eds,
        ),
      );
    },
    [setEdges, edgeColor, edgeLabelStyle, edgeLabelBgStyle],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData('application/reactflow');
      if (!raw) return;
      const role = JSON.parse(raw).role as GraphNode['role'];
      const id = `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id,
        type: 'agentNode',
        position,
        data: { role, label: id, state_writes: [] },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes, screenToFlowPosition],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const validation = useMemo(() => {
    const issues: string[] = [];
    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();

    nodes.forEach((n) => {
      inDegree.set(n.id, 0);
      outDegree.set(n.id, 0);
    });

    edges.forEach((e) => {
      outDegree.set(e.source, (outDegree.get(e.source) ?? 0) + 1);
      inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    });

    nodes.forEach((n) => {
      const inDeg = inDegree.get(n.id) ?? 0;
      const outDeg = outDegree.get(n.id) ?? 0;
      if (inDeg === 0 && outDeg === 0 && nodes.length > 1) {
        issues.push(t('graphValidator.disconnected', { id: n.id }));
      }
    });

    const sinks = nodes.filter(
      (n) => (outDegree.get(n.id) ?? 0) === 0 && (inDegree.get(n.id) ?? 0) > 0,
    );
    if (sinks.length > 1) {
      issues.push(t('graphValidator.multipleSinks', { ids: sinks.map((n) => n.id).join(', ') }));
    }

    const sources = nodes.filter(
      (n) => (inDegree.get(n.id) ?? 0) === 0 && (outDegree.get(n.id) ?? 0) > 0,
    );
    if (sources.length === 0 && nodes.length > 0) {
      issues.push(t('graphValidator.noEntryPoint'));
    }
    if (sources.length > 1) {
      issues.push(t('graphValidator.multipleEntryPoints', { ids: sources.map((n) => n.id).join(', ') }));
    }

    return issues;
  }, [nodes, edges, t]);

  const minimapMaskColor = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.08)';

  return (
    <div className="flex h-full">
      <NodePalette />

      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          className="bg-white dark:bg-gray-950"
          defaultEdgeOptions={{
            style: { stroke: edgeColor, strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
          }}
        >
          <Background color={isDark ? '#1e293b' : '#e2e8f0'} gap={20} />
          <Controls className="!bg-gray-100 dark:!bg-gray-900 !border-gray-300 dark:!border-gray-700" />
          <MiniMap
            nodeColor={(n) => {
              const role = (n.data?.role as string) ?? 'coder';
              return ROLE_COLORS[role as GraphNode['role']] ?? '#6b7280';
            }}
            maskColor={minimapMaskColor}
            className="!bg-gray-100 dark:!bg-gray-900 !border-gray-300 dark:!border-gray-700"
          />
        </ReactFlow>

        {/* Graph options: entry + checkpointing */}
        <div className="absolute top-4 right-4 w-56 rounded-lg border border-gray-300 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 shadow-sm p-3 space-y-2.5">
          <div className="text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t('architect.graphOptions')}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {t('architect.entryNode')}
            </label>
            <select
              value={blueprint.graph.entry ?? ''}
              onChange={(e) => {
                if (e.target.value === '') {
                  const targets = new Set(edges.map((ed) => ed.target));
                  const sources = nodes.filter((n) => !targets.has(n.id));
                  updateGraph({ entry: sources[0]?.id ?? nodes[0]?.id ?? null });
                } else {
                  updateGraph({ entry: e.target.value });
                }
              }}
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-2 py-1.5 text-xs text-gray-900 dark:text-gray-200 font-mono focus:outline-none focus:border-blue-500"
            >
              <option value="">{t('architect.entryAuto')}</option>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.id}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 font-mono cursor-pointer">
            <input
              type="checkbox"
              checked={blueprint.graph.checkpointing}
              onChange={(e) => updateGraph({ checkpointing: e.target.checked })}
              className="rounded border-gray-400 dark:border-gray-600"
            />
            {t('architect.checkpointing')}
          </label>
        </div>

        {/* Edge condition editor */}
        {selectedEdge && (
          <div className="absolute top-4 left-4 w-56 rounded-lg border border-blue-400/40 bg-white/95 dark:bg-gray-900/95 shadow-sm p-3 space-y-2">
            <div className="text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t('architect.edgeCondition')}
            </div>
            <div className="text-[11px] font-mono text-gray-500 dark:text-gray-400 truncate">
              {selectedEdge.source} → {selectedEdge.target}
            </div>
            <select
              value={edgeCondition(selectedEdge)}
              onChange={(e) =>
                setEdgeCondition(selectedEdge.id, e.target.value as GraphEdgeCondition)
              }
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-2 py-1.5 text-xs text-gray-900 dark:text-gray-200 font-mono focus:outline-none focus:border-blue-500"
            >
              {EDGE_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {t(`architect.conditions.${c}`)}
                </option>
              ))}
            </select>
          </div>
        )}

        <GraphValidator issues={validation} />
      </div>
    </div>
  );
}

import { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
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

let nodeIdCounter = 0;

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

export default function ArchitectCanvas() {
  const { t } = useTranslation();
  const { blueprint, updateGraph } = useGame();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const edgeColor = isDark ? '#94a3b8' : '#475569';

  const initialNodes: Node[] = useMemo(() => {
    const existing = blueprint.graph.nodes;
    if (existing.length === 0) return [];
    return existing.map((gn, i) =>
      createFlowNode(gn, 100 + (i % 3) * 280, 80 + Math.floor(i / 3) * 200),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialEdges: Edge[] = useMemo(() => {
    const existing = blueprint.graph.edges;
    if (existing.length === 0) return [];
    return existing.map((ge) => ({
      id: `${ge.source}->${ge.target}`,
      source: ge.source,
      target: ge.target,
      data: { condition: ge.condition },
      label: ge.condition !== 'always' ? ge.condition : undefined,
      markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
      style: { stroke: edgeColor, strokeWidth: 2 },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    updateGraph(buildGraphSpec(nodes, edges));
  }, [nodes, edges, updateGraph]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            data: { condition: 'always' as GraphEdgeCondition },
            markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
            style: { stroke: edgeColor, strokeWidth: 2 },
          },
          eds,
        ),
      );
    },
    [setEdges, edgeColor],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData('application/reactflow');
      if (!raw) return;
      const role = JSON.parse(raw).role as GraphNode['role'];
      const id = `${role}-${++nodeIdCounter}`;
      const position = {
        x: event.clientX - 300,
        y: event.clientY - 200,
      };

      const newNode: Node = {
        id,
        type: 'agentNode',
        position,
        data: { role, label: id, state_writes: [] },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes],
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

        <GraphValidator issues={validation} />
      </div>
    </div>
  );
}

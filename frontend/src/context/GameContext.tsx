import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import type {
  AgentBlueprint,
  GraphEdge,
  GraphNode,
  GraphSpec,
  HarnessConfig,
  LevelInfo,
  LoopConfig,
  MonteCarloResult,
  RunTrace,
} from '../types';
import { getLevels } from '../api';

/** Normalize success_rate to 0–100 whether backend sent 0–1 or 0–100. */
export function successRatePct(rate: number): number {
  return rate <= 1 ? rate * 100 : rate;
}

function defaultGraph(): GraphSpec {
  return {
    state_schema: [],
    nodes: [],
    edges: [],
    entry: null,
    checkpointing: false,
  };
}

function defaultBlueprint(levelId: string): AgentBlueprint {
  return {
    level_id: levelId,
    harness: {
      has_context_injection: false,
      has_tool_surface: false,
      has_persistence: false,
      has_budget_guard: false,
      token_budget_cap: null,
      has_sandbox_isolation: false,
      has_tracing: false,
      memory_capacity: 3,
    },
    loop: {
      enabled: false,
      trigger: 'on_task_start',
      goal: 'tests_green',
      state_policy: 'stateless',
      action_policy: 'retry_same',
      evidence: 'none',
      feedback: 'none',
      stop_on: 'agent_says_done',
      max_iterations: 1,
    },
    graph: defaultGraph(),
  };
}

type GraphUpdate =
  | GraphSpec
  | Partial<GraphSpec>
  | { nodes: GraphNode[]; edges: GraphEdge[] };

interface GameContextType {
  levels: LevelInfo[];
  levelsLoading: boolean;
  levelsError: string | null;
  selectedLevelId: string;
  selectedLevel: LevelInfo | null;
  setSelectedLevelId: (id: string) => void;
  blueprint: AgentBlueprint;
  updateHarness: (partial: Partial<HarnessConfig>) => void;
  updateLoop: (partial: Partial<LoopConfig>) => void;
  updateGraph: (update: GraphUpdate) => void;
  latestTrace: RunTrace | null;
  setLatestTrace: (trace: RunTrace | null) => void;
  monteCarloResult: MonteCarloResult | null;
  setMonteCarloResult: (result: MonteCarloResult | null) => void;
  isLive: boolean;
  setIsLive: (live: boolean) => void;
}

const GameContext = createContext<GameContextType | null>(null);

function inferEntry(nodes: GraphNode[], edges: GraphEdge[]): string | null {
  if (nodes.length === 0) return null;
  const targets = new Set(edges.map((e) => e.target));
  const sources = nodes.filter((n) => !targets.has(n.id));
  return sources[0]?.id ?? nodes[0].id;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [levels, setLevels] = useState<LevelInfo[]>([]);
  const [levelsLoading, setLevelsLoading] = useState(true);
  const [levelsError, setLevelsError] = useState<string | null>(null);
  const [selectedLevelId, setSelectedLevelId] = useState('level_1_raw');
  const [blueprint, setBlueprint] = useState<AgentBlueprint>(
    defaultBlueprint('level_1_raw'),
  );
  const [latestTrace, setLatestTrace] = useState<RunTrace | null>(null);
  const [monteCarloResult, setMonteCarloResult] =
    useState<MonteCarloResult | null>(null);
  const [isLive, setIsLive] = useState(false);

  const selectedLevel = useMemo(
    () => levels.find((l) => l.id === selectedLevelId) ?? null,
    [levels, selectedLevelId],
  );

  useEffect(() => {
    getLevels()
      .then((data) => {
        setLevels(data);
        setLevelsLoading(false);
        if (data.length > 0) {
          setSelectedLevelId((prev) =>
            data.find((l) => l.id === prev) ? prev : data[0].id,
          );
        }
      })
      .catch((err) => {
        setLevelsError(err.message);
        setLevelsLoading(false);
      });
  }, []);

  useEffect(() => {
    setBlueprint(defaultBlueprint(selectedLevelId));
    setLatestTrace(null);
    setMonteCarloResult(null);
    setIsLive(false);
  }, [selectedLevelId]);

  const updateHarness = useCallback(
    (partial: Partial<HarnessConfig>) => {
      setBlueprint((prev) => ({
        ...prev,
        harness: { ...prev.harness, ...partial },
      }));
    },
    [],
  );

  const updateLoop = useCallback(
    (partial: Partial<LoopConfig>) => {
      setBlueprint((prev) => ({
        ...prev,
        loop: { ...prev.loop, ...partial },
      }));
    },
    [],
  );

  const updateGraph = useCallback((update: GraphUpdate) => {
    setBlueprint((prev) => {
      const merged: GraphSpec = {
        ...prev.graph,
        ...update,
      };
      if ('nodes' in update || 'edges' in update) {
        const nodes = merged.nodes;
        const edges = merged.edges;
        if (merged.entry == null || !nodes.some((n) => n.id === merged.entry)) {
          merged.entry = inferEntry(nodes, edges);
        }
      }
      return { ...prev, graph: merged };
    });
  }, []);

  return (
    <GameContext.Provider
      value={{
        levels,
        levelsLoading,
        levelsError,
        selectedLevelId,
        selectedLevel,
        setSelectedLevelId,
        blueprint,
        updateHarness,
        updateLoop,
        updateGraph,
        latestTrace,
        setLatestTrace,
        monteCarloResult,
        setMonteCarloResult,
        isLive,
        setIsLive,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextType {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

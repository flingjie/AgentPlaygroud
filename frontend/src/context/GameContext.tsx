import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type {
  AgentBlueprint,
  GraphNode,
  HarnessConfig,
  LevelInfo,
  LoopStrategy,
  MonteCarloResult,
  RunTrace,
} from '../types';
import { getLevels } from '../api';

// ── Default Blueprint ──────────────────────────────────────────────────────

function defaultBlueprint(levelId: string): AgentBlueprint {
  return {
    level_id: levelId,
    harness: {
      has_workspace: false,
      has_sandbox: false,
      has_git: false,
      memory_capacity: 4,
    },
    loop_strategy: {
      type: 'none',
      max_retries: 1,
      stop_condition: 'none',
    },
    graph_nodes: [],
  };
}

// ── Context Type ───────────────────────────────────────────────────────────

interface GameContextType {
  levels: LevelInfo[];
  levelsLoading: boolean;
  levelsError: string | null;
  selectedLevelId: string;
  selectedLevel: LevelInfo | null;
  setSelectedLevelId: (id: string) => void;
  blueprint: AgentBlueprint;
  updateHarness: (partial: Partial<HarnessConfig>) => void;
  updateLoop: (partial: Partial<LoopStrategy>) => void;
  updateGraph: (nodes: GraphNode[]) => void;
  latestTrace: RunTrace | null;
  setLatestTrace: (trace: RunTrace | null) => void;
  monteCarloResult: MonteCarloResult | null;
  setMonteCarloResult: (result: MonteCarloResult | null) => void;
  isLive: boolean;
  setIsLive: (live: boolean) => void;
}

const GameContext = createContext<GameContextType | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────

export function GameProvider({ children }: { children: ReactNode }) {
  const [levels, setLevels] = useState<LevelInfo[]>([]);
  const [levelsLoading, setLevelsLoading] = useState(true);
  const [levelsError, setLevelsError] = useState<string | null>(null);
  const [selectedLevelId, setSelectedLevelId] = useState('tutorial');
  const [blueprint, setBlueprint] = useState<AgentBlueprint>(
    defaultBlueprint('tutorial'),
  );
  const [latestTrace, setLatestTrace] = useState<RunTrace | null>(null);
  const [monteCarloResult, setMonteCarloResult] =
    useState<MonteCarloResult | null>(null);
  const [isLive, setIsLive] = useState(false);

  // Fetch levels on mount
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

  // Reset blueprint when level changes
  useEffect(() => {
    setBlueprint(defaultBlueprint(selectedLevelId));
    setLatestTrace(null);
    setMonteCarloResult(null);
    setIsLive(false);
  }, [selectedLevelId]);

  const selectedLevel =
    levels.find((l) => l.id === selectedLevelId) ?? null;

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
    (partial: Partial<LoopStrategy>) => {
      setBlueprint((prev) => ({
        ...prev,
        loop_strategy: { ...prev.loop_strategy, ...partial },
      }));
    },
    [],
  );

  const updateGraph = useCallback((nodes: GraphNode[]) => {
    setBlueprint((prev) => ({ ...prev, graph_nodes: nodes }));
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

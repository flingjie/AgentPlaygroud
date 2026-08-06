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
  FailureReason,
  GraphNode,
  HarnessConfig,
  LevelInfo,
  LoopStrategy,
  MonteCarloResult,
  RunTrace,
} from '../types';
import { getLevels } from '../api';

// ── localStorage keys ──────────────────────────────────────────────────────

const LS_BESTIARY = 'apg.bestiary.v1';
const LS_CLEARED = 'apg.cleared.v1';
const LS_INTROS = 'apg.intros.v1';

function loadStringArray(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveStringArray(key: string, value: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

/** Normalize success_rate to 0–100 whether backend sent 0–1 or 0–100. */
export function successRatePct(rate: number): number {
  return rate <= 1 ? rate * 100 : rate;
}

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
  // Teaching layer
  prediction: number | null;
  setPrediction: (value: number | null) => void;
  unlockedFailures: FailureReason[];
  unlockFailures: (reasons: FailureReason[]) => void;
  newUnlock: FailureReason | null;
  clearNewUnlock: () => void;
  clearedLevels: string[];
  markLevelCleared: (levelId: string) => void;
  showDebrief: boolean;
  setShowDebrief: (show: boolean) => void;
  dismissedIntros: string[];
  dismissIntro: (levelId: string) => void;
  reopenIntro: (levelId: string) => void;
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

  const [prediction, setPrediction] = useState<number | null>(null);
  const [unlockedFailures, setUnlockedFailures] = useState<FailureReason[]>(
    () => loadStringArray(LS_BESTIARY) as FailureReason[],
  );
  const [newUnlock, setNewUnlock] = useState<FailureReason | null>(null);
  const [clearedLevels, setClearedLevels] = useState<string[]>(() =>
    loadStringArray(LS_CLEARED),
  );
  const [showDebrief, setShowDebrief] = useState(false);
  const [dismissedIntros, setDismissedIntros] = useState<string[]>(() =>
    loadStringArray(LS_INTROS),
  );

  const selectedLevel = useMemo(
    () => levels.find((l) => l.id === selectedLevelId) ?? null,
    [levels, selectedLevelId],
  );

  const unlockFailures = useCallback((reasons: FailureReason[]) => {
    setUnlockedFailures((prev) => {
      const next = [...prev];
      let firstNew: FailureReason | null = null;
      for (const r of reasons) {
        if (r === 'NONE') continue;
        if (!next.includes(r)) {
          next.push(r);
          if (!firstNew) firstNew = r;
        }
      }
      if (firstNew) {
        setNewUnlock(firstNew);
        saveStringArray(LS_BESTIARY, next);
        return next;
      }
      if (next.length !== prev.length) {
        saveStringArray(LS_BESTIARY, next);
        return next;
      }
      return prev;
    });
  }, []);

  const clearNewUnlock = useCallback(() => setNewUnlock(null), []);

  const markLevelCleared = useCallback((levelId: string) => {
    setClearedLevels((prev) => {
      if (prev.includes(levelId)) return prev;
      const next = [...prev, levelId];
      saveStringArray(LS_CLEARED, next);
      return next;
    });
  }, []);

  const dismissIntro = useCallback((levelId: string) => {
    setDismissedIntros((prev) => {
      if (prev.includes(levelId)) return prev;
      const next = [...prev, levelId];
      saveStringArray(LS_INTROS, next);
      return next;
    });
  }, []);

  const reopenIntro = useCallback((levelId: string) => {
    setDismissedIntros((prev) => {
      const next = prev.filter((id) => id !== levelId);
      saveStringArray(LS_INTROS, next);
      return next;
    });
  }, []);

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

  // Reset blueprint + prediction when level changes
  useEffect(() => {
    setBlueprint(defaultBlueprint(selectedLevelId));
    setLatestTrace(null);
    setMonteCarloResult(null);
    setIsLive(false);
    setPrediction(null);
    setShowDebrief(false);
  }, [selectedLevelId]);

  // Unlock failures from traces
  useEffect(() => {
    const reasons: FailureReason[] = [];
    if (latestTrace?.failure_events) {
      for (const ev of latestTrace.failure_events) {
        if (ev.reason !== 'NONE') reasons.push(ev.reason);
      }
    }
    if (latestTrace?.failure_reason && latestTrace.failure_reason !== 'NONE') {
      reasons.push(latestTrace.failure_reason);
    }
    if (monteCarloResult) {
      for (const [reason, count] of Object.entries(
        monteCarloResult.failure_distribution,
      )) {
        if (count > 0 && reason !== 'NONE') {
          reasons.push(reason as FailureReason);
        }
      }
      for (const trace of monteCarloResult.sample_traces) {
        if (trace.failure_events) {
          for (const ev of trace.failure_events) {
            if (ev.reason !== 'NONE') reasons.push(ev.reason);
          }
        }
        if (trace.failure_reason && trace.failure_reason !== 'NONE') {
          reasons.push(trace.failure_reason);
        }
      }
    }
    if (reasons.length > 0) {
      unlockFailures(reasons);
    }
  }, [latestTrace, monteCarloResult, unlockFailures]);

  // Auto-clear level + show debrief on first clear
  useEffect(() => {
    if (!monteCarloResult || !selectedLevel) return;
    const pct = successRatePct(monteCarloResult.success_rate);
    const target = selectedLevel.target_success_rate <= 1
      ? selectedLevel.target_success_rate * 100
      : selectedLevel.target_success_rate;
    if (pct >= target && !clearedLevels.includes(selectedLevelId)) {
      markLevelCleared(selectedLevelId);
      setShowDebrief(true);
    }
  }, [
    monteCarloResult,
    selectedLevel,
    selectedLevelId,
    clearedLevels,
    markLevelCleared,
  ]);

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
        prediction,
        setPrediction,
        unlockedFailures,
        unlockFailures,
        newUnlock,
        clearNewUnlock,
        clearedLevels,
        markLevelCleared,
        showDebrief,
        setShowDebrief,
        dismissedIntros,
        dismissIntro,
        reopenIntro,
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

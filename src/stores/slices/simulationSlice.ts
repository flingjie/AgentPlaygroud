import type { StateCreator } from 'zustand';
import type { Trace, TraceMonteCarloResult } from '../../types/events';

export interface SimulationSlice {
  currentTrace: Trace | null;
  setCurrentTrace: (trace: Trace | null) => void;
  currentMonteCarlo: TraceMonteCarloResult | null;
  setCurrentMonteCarlo: (result: TraceMonteCarloResult | null) => void;
  isRunning: boolean;
  setRunning: (running: boolean) => void;
}

export const createSimulationSlice: StateCreator<SimulationSlice, [], []> = (set) => ({
  currentTrace: null,
  setCurrentTrace: (trace) => set({ currentTrace: trace }),
  currentMonteCarlo: null,
  setCurrentMonteCarlo: (result) => set({ currentMonteCarlo: result }),
  isRunning: false,
  setRunning: (running) => set({ isRunning: running }),
});

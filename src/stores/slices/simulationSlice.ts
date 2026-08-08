import type { StateCreator } from 'zustand';
import type { Trace } from '../../types/events';

export interface SimulationSlice {
  currentTrace: Trace | null;
  setCurrentTrace: (trace: Trace | null) => void;
}

export const createSimulationSlice: StateCreator<SimulationSlice, [], []> = (set) => ({
  currentTrace: null,
  setCurrentTrace: (trace) => set({ currentTrace: trace }),
});

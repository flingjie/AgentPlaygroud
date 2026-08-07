import { create } from 'zustand';
import type { NavigationSlice } from './slices/navigationSlice';
import { createNavigationSlice } from './slices/navigationSlice';
import type { SimulationSlice } from './slices/simulationSlice';
import { createSimulationSlice } from './slices/simulationSlice';
import type { ConfigSlice } from './slices/configSlice';
import { createConfigSlice } from './slices/configSlice';

export type ExperimentStore = NavigationSlice &
  SimulationSlice &
  ConfigSlice;

export const useExperimentStore = create<ExperimentStore>()((...a) => ({
  ...createNavigationSlice(...a),
  ...createSimulationSlice(...a),
  ...createConfigSlice(...a),
}));

import { create } from 'zustand';
import type { NavigationSlice } from './slices/navigationSlice';
import { createNavigationSlice } from './slices/navigationSlice';
import type { SimulationSlice } from './slices/simulationSlice';
import { createSimulationSlice } from './slices/simulationSlice';
import type { ConfigSlice } from './slices/configSlice';
import { createConfigSlice } from './slices/configSlice';
import type { ThemeSlice } from './slices/themeSlice';
import { createThemeSlice } from './slices/themeSlice';

export type ExperimentStore = NavigationSlice &
  SimulationSlice &
  ConfigSlice &
  ThemeSlice;

export const useExperimentStore = create<ExperimentStore>()((...a) => ({
  ...createNavigationSlice(...a),
  ...createSimulationSlice(...a),
  ...createConfigSlice(...a),
  ...createThemeSlice(...a),
}));

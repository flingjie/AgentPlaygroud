import type { StateCreator } from 'zustand';
import type { LearningStage } from '../../types/experiments';

export interface NavigationSlice {
  activeStage: LearningStage;
  setActiveStage: (stage: LearningStage) => void;
  activeExperimentId: string | null;
  setActiveExperimentId: (id: string | null) => void;
  activeTab: 'runtime' | 'context' | 'reality' | 'architecture';
  setActiveTab: (tab: 'runtime' | 'context' | 'reality' | 'architecture') => void;
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
}

export const createNavigationSlice: StateCreator<NavigationSlice, [], []> = (set) => ({
  activeStage: 0,
  setActiveStage: (stage) => set({ activeStage: stage, activeExperimentId: null }),
  activeExperimentId: null,
  setActiveExperimentId: (id) => set({ activeExperimentId: id }),
  activeTab: 'runtime',
  setActiveTab: (tab) => set({ activeTab: tab }),
  selectedEventId: null,
  setSelectedEventId: (id) => set({ selectedEventId: id }),
});

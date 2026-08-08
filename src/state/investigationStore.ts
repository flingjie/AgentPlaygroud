import { create } from 'zustand';

interface InvestigationState {
  viewedEvidenceIds: string[];
  markViewed: (id: string) => void;
  reset: () => void;
}

export const useInvestigation = create<InvestigationState>((set) => ({
  viewedEvidenceIds: [],
  markViewed: (id) =>
    set((state) => {
      if (state.viewedEvidenceIds.includes(id)) return state;
      return { viewedEvidenceIds: [...state.viewedEvidenceIds, id] };
    }),
  reset: () => set({ viewedEvidenceIds: [] }),
}));

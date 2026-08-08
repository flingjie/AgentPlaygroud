import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CapabilityId } from '../content/schema';
import { INCIDENTS } from '../content/incidents';

interface ProgressState {
  completed: string[];
  inventory: CapabilityId[];
  isUnlocked: (s: { id: string; order: number }) => boolean;
  isCompleted: (id: string) => boolean;
  completeScenario: (s: { id: string; unlocks: CapabilityId[] }) => void;
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      completed: [],
      inventory: [],
      isUnlocked: (s) => {
        // Unlock against the previous *registered* incident by order so gaps
        // (e.g. missing INC-008/009 while INC-010 exists) do not soft-lock the chain.
        const predecessors = INCIDENTS.filter((x) => x.def.order < s.order);
        if (predecessors.length === 0) return true;
        const prev = predecessors.reduce((a, b) =>
          a.def.order > b.def.order ? a : b,
        );
        return get().isCompleted(prev.def.id);
      },
      isCompleted: (id) => get().completed.includes(id),
      completeScenario: (s) => {
        set((state) => {
          if (state.completed.includes(s.id)) return state;
          const additions = s.unlocks.filter((u) => !state.inventory.includes(u));
          return {
            completed: [...state.completed, s.id],
            inventory: [...state.inventory, ...additions],
          };
        });
      },
    }),
    {
      name: 'ais-progress',
      partialize: (state) => ({ completed: state.completed, inventory: state.inventory }),
    },
  ),
);

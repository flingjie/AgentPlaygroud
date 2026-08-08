import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CapabilityId } from '../content/schema';
import { SCENARIOS } from '../content/scenarios';

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
        if (s.order === 0) return true;
        const prev = SCENARIOS.find((x) => x.def.order === s.order - 1);
        if (prev) return get().isCompleted(prev.def.id);
        if (s.order === 1 && !SCENARIOS.some((x) => x.def.order === 0)) return true;
        return false;
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

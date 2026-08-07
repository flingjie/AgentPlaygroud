import type { ExperimentSpec } from '../types';

export type RawExperimentSpec = Omit<ExperimentSpec, 'baseline'>;

const modules = import.meta.glob<RawExperimentSpec>('./*.json', { eager: true });

export const experiments: RawExperimentSpec[] = Object.values(modules)
  .sort((a, b) => a.id.localeCompare(b.id));

export function experimentById(id: string): RawExperimentSpec | undefined {
  return experiments.find((e) => e.id === id);
}

import type { Scenario } from '../schema';

export const SCENARIOS: Scenario[] = []; // Task 10 registers all 13 scenarios here.

export const getScenario = (id: string) => SCENARIOS.find(s => s.def.id === id);

import type { Scenario } from '../schema';
import { scenario001 } from './scenario001';
import { scenario002 } from './scenario002';
import { scenario003 } from './scenario003';
import { scenario004 } from './scenario004';
import { scenario005 } from './scenario005';
import { scenario006 } from './scenario006';
import { scenario007 } from './scenario007';
import { scenario008 } from './scenario008';
import { scenario009 } from './scenario009';
import { scenario010 } from './scenario010';
import { scenario011 } from './scenario011';
import { scenario012 } from './scenario012';
import { scenario013 } from './scenario013';

export const SCENARIOS: Scenario[] = [
  scenario001,
  scenario002,
  scenario003,
  scenario004,
  scenario005,
  scenario006,
  scenario007,
  scenario008,
  scenario009,
  scenario010,
  scenario011,
  scenario012,
  scenario013,
].sort((a, b) => a.def.order - b.def.order);

export const getScenario = (id: string) => SCENARIOS.find(s => s.def.id === id);

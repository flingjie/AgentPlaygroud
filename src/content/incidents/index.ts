import type { Incident } from '../schema';
import { incident000 } from './incident000';
import { incident001 } from './incident001';
import { incident002 } from './incident002';
import { incident003 } from './incident003';
import { incident004 } from './incident004';
import { incident005 } from './incident005';
import { incident006 } from './incident006';
import { incident007 } from './incident007';
import { incident008 } from './incident008';
import { incident009 } from './incident009';
import { incident010 } from './incident010';
import { incident011 } from './incident011';
import { incident012 } from './incident012';

export const INCIDENTS: Incident[] = [
  incident000,
  incident001,
  incident002,
  incident003,
  incident004,
  incident005,
  incident006,
  incident007,
  incident008,
  incident009,
  incident010,
  incident011,
  incident012,
].sort((a, b) => a.def.order - b.def.order);
export const getIncident = (id: string) => INCIDENTS.find((i) => i.def.id === id);

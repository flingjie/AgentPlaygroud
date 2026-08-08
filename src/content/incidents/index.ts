import type { Incident } from '../schema';
import { incident010 } from './incident010';

export const INCIDENTS: Incident[] = [incident010].sort((a, b) => a.def.order - b.def.order);
export const getIncident = (id: string) => INCIDENTS.find((i) => i.def.id === id);

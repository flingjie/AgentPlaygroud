# Task 11 Report: Remove Legacy Scenario Path

## Status
Complete.

## Deliverables
- Deleted legacy scenario content and components:
  - `src/content/scenarios/**` (13 scenario files + index + test)
  - `src/components/ExperimentShell.tsx` and `ExperimentShell.test.tsx`
  - `src/components/CapabilityPanel.tsx`
  - `src/pages/ScenarioPage.tsx`
- Removed deprecated `ScenarioDef`, `ScenarioContent`, and `Scenario` types from `src/content/schema.ts`.
- Migrated engine and state to use `IncidentDef`:
  - `src/engine/simulator.ts` / `simulator.test.ts`
  - `src/engine/events.ts` / `events.test.ts`
  - `src/engine/showcase.ts` / `showcase.test.ts`
- Renamed `useProgress.completeScenario` → `completeIncident` and updated `IncidentShell.tsx` and tests.
- Updated `PatternCard.tsx` and `PatternsPage.tsx` to use the `INCIDENTS` registry and display patternName/patternSummary for closed incidents.
- Updated `src/pages/AboutPage.tsx` to describe the five-layer incident map and the four-act response loop.
- Updated `README.md` to reflect the 16-incident simulator.
- Cleaned `uiStrings.ts` of scenario-specific terms.

## Verification
- `ripgrep 'SCENARIOS|Scenario|scenario-|ExperimentShell|CapabilityPanel'` in `src/` returns no matches.
- `npx tsc -b` — green.
- `npm run test` — 115 tests passed, 0 failed.
- `npm run build` — green.

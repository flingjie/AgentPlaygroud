# Task 9 Report: Level 2-3 Incidents INC-008 through INC-012

## Status
Complete.

## Deliverables
- Created `src/content/incidents/incident008.ts` through `incident012.ts` (INC-010 existed already).
- Updated `src/content/incidents/index.ts` to register all 13 incidents (orders 0–12).
- Extended `src/content/incidents/content.test.ts` to cover 000–012 with exact numeric table assertions, content minima, localization, unlock chain, and optimal-path success checks.

## Incident Summary
| id | order | stage | failure | base | optimal effect | target | unlocks |
|---|---|---|---|---|---|---|---|
| inc-008 | 8 | loop | task-abandoned | 0.25 | recovery-loop +0.45 | 0.70 | recovery-loop |
| inc-009 | 9 | loop | infinite-loop | 0.20 | stop-rule +0.53 | 0.73 | stop-rule |
| inc-010 | 10 | loop | false-completion | 0.15 | evidence-loop +0.70 | 0.85 | evidence-loop |
| inc-011 | 11 | loop | budget-exhausted | 0.30 | budget-guard +0.47 | 0.77 | budget-guard |
| inc-012 | 12 | graph | deadlock | 0.10 | graph-orchestration +0.55, human-gate +0.17 | 0.82 | graph-orchestration, human-gate |

INC-012 evidence and X-Ray emphasize Planner/Reviewer/Executor cyclic waiting; the optimal intervention breaks the cycle with a DAG orchestrator and a human gate.

## Verification
- `npx tsc -b` — green.
- `npm run test` — 117 tests passed, 0 failed.

## Notes
- All four new incidents include ≥5 evidences, ≥3 hypotheses (exactly 1 correct), ≥2 interventions (optimal grants required capabilities), and ≥4 X-Ray iterations.
- Unlock chain assertion continues to pass: every optimal capability grant is available from the current or earlier incident unlocks.

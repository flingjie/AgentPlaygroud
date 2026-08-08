# Agent Incident Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把现有「勾选能力」教学 SPA 重构为 **Agent Incident Simulator**：值班工程师通过四幕事故响应（现场 → 诊断 → 方案 → 验证复盘）+ Agent X-Ray 时间轴，走通 Level 0–4 共 16 个事故工单（INC-000…015），构建产物继续部署 GitHub Pages。

**Architecture:** 保留 Vite/React/HashRouter/zustand/确定性 Monte Carlo 引擎。扩展 schema（Evidence / Hypothesis / Intervention / XRayIteration）。用 `interventionEngine` 将「选中方案 + 参数」映射为能力集合与成功率微调。用 `IncidentShell` 替换 `ExperimentShell`。内容全部数据驱动，无后端、无真实 LLM。

**Tech Stack:** Vite 7 + React 19 + TypeScript 5 · react-router-dom HashRouter · zustand persist · Tailwind 4 · Vitest · GitHub Actions → Pages（已有流水线）

**Spec:** `docs/2026-08-08-incident-simulator-design.md`（与 `docs/superpowers/specs/2026-08-08-incident-simulator-design.md` 同步）

## Global Constraints

- GitHub Pages：`base: './'`，**HashRouter**，无服务端回退
- 无后端、无真实 LLM Key、无外部 API；禁止引入 prism/highlight.js
- 双语 en/zh；深浅主题；进度 localStorage（persist key 升级为 `ais-progress`，避免旧进度污染）
- 引擎确定性：同 seed + 同配置 → 同结果
- 成功率：`p = clamp01(baseSuccess + Σ capabilityEffects[caps] + Σ paramDeltas)`；未选中方案零效果
- 通关：选中 **全部最优方案**（`isOptimal: true` 的 intervention）并跑过一次验证 Monte Carlo
- 全库 **16** 工单 INC-000…015；标杆先做 **INC-010 虚假完成**
- 每个 Task 结束：`npm run test` 全绿 + `npx tsc -b` 通过后 commit

---

## 文件结构（目标）

```
src/content/schema.ts                 # 扩展 StageId / FailureId / CapabilityId + 新类型
src/content/capabilities.ts           # +3 reliability 能力
src/content/incidents/index.ts        # INCIDENTS 注册表（替换 scenarios）
src/content/incidents/incident000.ts … incident015.ts
src/engine/interventionEngine.ts      # selectedCaps + param deltas → rate
src/engine/simulator.ts               # 保留；新增 overload 或适配层调用
src/state/progressStore.ts            # order===0 解锁；persist name ais-progress
src/state/investigationStore.ts       # 查看证据 / 选假设 / 选方案（会话级，可不 persist）
src/components/incident/
  IncidentShell.tsx                   # 四幕状态机
  IncidentHeader.tsx
  EvidenceBoard.tsx
  HypothesisPanel.tsx
  InterventionPanel.tsx
  XRayTimeline.tsx
  VerificationPanel.tsx
src/pages/HomePage.tsx                # 五层事故地图（替换 StageMap 三阶段）
src/pages/IncidentPage.tsx            # 替换 ScenarioPage
src/pages/AboutPage.tsx               # 更新定位文案
src/App.tsx                           # 路由 /incident/:id
```

删除（完成迁移后）：`Capability` checkbox 路径上的 `CapabilityPanel`、旧 `ExperimentShell`（或先改成 thin wrapper 再删）、`src/content/scenarios/*`。

---

## 核心数据契约（所有 Task 依赖）

```ts
// 追加到 schema.ts（与现有 LocalizedText 并存）
export type StageId = 'llm' | 'harness' | 'loop' | 'graph' | 'reliability';

export type CapabilityId =
  | /* 现有 16 个 */ 
  | 'evaluation-harness' | 'observability-stack' | 'deterministic-replay';

export type FailureId =
  | /* 现有 13 个 */
  | 'evaluation-gap' | 'no-observability' | 'no-replay';

export type EvidenceType = 'terminal' | 'file' | 'log' | 'metric' | 'thought' | 'api';

export interface Evidence {
  id: string;
  type: EvidenceType;
  title: LocalizedText;
  content: LocalizedText;       // 可含换行；渲染用 whitespace-pre-wrap
  isKeyEvidence: boolean;
}

export interface Hypothesis {
  id: string;
  text: LocalizedText;
  isCorrect: boolean;
  feedback: LocalizedText;
}

export interface InterventionParameter {
  key: string;
  label: LocalizedText;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  /** 相对 default 每 +1 step 的成功率修正（可负） */
  rateDeltaPerUnit: number;
}

export interface Intervention {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  configDiff: LocalizedText;    // 纯文本代码预览
  parameters: InterventionParameter[];
  grantsCapabilities: CapabilityId[];  // 选中后计入 enabled set
  isOptimal: boolean;
  tradeoff: LocalizedText;
}

export interface XRayToolCall {
  name: string;
  args: string;
  result: string | null;
}

export interface XRayAnnotation {
  text: LocalizedText;
  severity: 'info' | 'warn' | 'error';
}

export interface XRayIteration {
  step: number;
  context: { content: LocalizedText; usagePercent: number };
  prompt: { content: LocalizedText; tokens: number };
  decision: { content: LocalizedText; confidence: number };
  toolCalls: XRayToolCall[];
  observation: LocalizedText | null;
  memory: { shortTerm: LocalizedText[]; longTerm: LocalizedText[] };
  nextAction: LocalizedText;
  annotations: XRayAnnotation[];
}

export interface IncidentMeta {
  severity: 'P0' | 'P1' | 'P2';
  affectedSystems: LocalizedText[];
  reportedAt: string;           // ISO
  alertSummary: LocalizedText;
  agentClaim: LocalizedText;
}

/** 数值 + 工单元数据（决定引擎行为） */
export interface IncidentDef {
  id: string;                   // 'inc-000'
  order: number;                // 0..15
  stage: StageId;
  hiddenFailure: FailureId;
  baseSuccess: number;
  capabilityEffects: Partial<Record<CapabilityId, number>>;
  unlocks: CapabilityId[];
  baseTokenCost: number;
  trials: number;               // 200
  incidentMeta: IncidentMeta;
}

export interface IncidentContent {
  title: LocalizedText;
  failureName: LocalizedText;
  explanation: LocalizedText;
  patternName: LocalizedText;
  patternSummary: LocalizedText;
  evidences: Evidence[];
  hypotheses: Hypothesis[];
  interventions: Intervention[];
  xrayTimeline: XRayIteration[];
}

export interface Incident {
  def: IncidentDef;
  content: IncidentContent;
}
```

```ts
// interventionEngine.ts
export function selectedCapabilities(
  interventions: Intervention[],
  selectedIds: ReadonlySet<string>,
): Set<CapabilityId>;

export function paramRateDelta(
  interventions: Intervention[],
  selectedIds: ReadonlySet<string>,
  paramValues: Record<string, number>, // key = `${interventionId}.${paramKey}`
): number;

export function successRateWithInterventions(
  def: IncidentDef,
  interventions: Intervention[],
  selectedIds: ReadonlySet<string>,
  paramValues: Record<string, number>,
): number;

export function canCloseIncident(
  interventions: Intervention[],
  selectedIds: ReadonlySet<string>,
  verified: boolean, // 已跑过验证 MC
): boolean;
```

---

## Milestone 1：壳 + 引擎 + INC-010 标杆

### Task 1: Schema + capabilities 扩展

**Files:**
- Modify: `src/content/schema.ts`
- Modify: `src/content/capabilities.ts`
- Modify: `src/content/capabilities.test.ts`

**Interfaces:**
- Produces: 上文全部新类型；`CAPABILITIES` 含 19 个 id（原 16 + 3）

- [ ] **Step 1: Write failing integrity test**

```ts
// capabilities.test.ts 追加
import { CAPABILITIES } from './capabilities';
test('includes reliability capabilities', () => {
  for (const id of ['evaluation-harness', 'observability-stack', 'deterministic-replay'] as const) {
    expect(CAPABILITIES[id].name.en.length).toBeGreaterThan(0);
    expect(CAPABILITIES[id].name.zh.length).toBeGreaterThan(0);
  }
  expect(Object.keys(CAPABILITIES)).toHaveLength(19);
});
```

- [ ] **Step 2: Run test — expect FAIL**（key count 仍为 16）

Run: `npx vitest run src/content/capabilities.test.ts -v`

- [ ] **Step 3: Expand schema + catalog**

将 `StageId` / `CapabilityId` / `FailureId` 扩到上文契约；新增全部 interface。`capabilities.ts` 增加：

| id | zh / en |
|---|---|
| evaluation-harness | 评估夹具 / Evaluation Harness |
| observability-stack | 可观测性栈 / Observability Stack |
| deterministic-replay | 确定性回放 / Deterministic Replay |

保留旧类型别名期间：可暂时保留 `Scenario`/`ScenarioDef` 为 deprecated re-export，下一 Task 删除。

- [ ] **Step 4: Tests + typecheck green, commit**

```bash
npm run test && npx tsc -b
git add src/content/schema.ts src/content/capabilities.ts src/content/capabilities.test.ts
git commit -m "feat: extend schema for incidents, evidence, interventions, xray"
```

---

### Task 2: interventionEngine（TDD）

**Files:**
- Create: `src/engine/interventionEngine.ts`, `src/engine/interventionEngine.test.ts`
- Modify: `src/engine/simulator.ts`（可选：导出 `clamp01` 或让 engine 内联 clamp）

**Interfaces:**
- Consumes: `IncidentDef`, `Intervention`, `CapabilityId`
- Produces: `selectedCapabilities`, `paramRateDelta`, `successRateWithInterventions`, `canCloseIncident`

- [ ] **Step 1: Failing tests**

```ts
import {
  selectedCapabilities, paramRateDelta, successRateWithInterventions, canCloseIncident,
} from './interventionEngine';
import type { IncidentDef, Intervention } from '../content/schema';

const def: IncidentDef = {
  id: 'inc-010', order: 10, stage: 'loop', hiddenFailure: 'false-completion',
  baseSuccess: 0.15,
  capabilityEffects: { 'evidence-loop': 0.70 },
  unlocks: ['evidence-loop'], baseTokenCost: 5600, trials: 200,
  incidentMeta: {
    severity: 'P1', affectedSystems: [{ en: 'auth', zh: 'auth' }],
    reportedAt: '2026-08-08T14:32:00Z',
    alertSummary: { en: 'a', zh: 'a' }, agentClaim: { en: 'done', zh: 'done' },
  },
};

const optimal: Intervention = {
  id: 'ev-loop', name: { en: 'Evidence Loop', zh: '证据循环' },
  description: { en: 'd', zh: 'd' }, configDiff: { en: 'code', zh: 'code' },
  parameters: [{
    key: 'minTests', label: { en: 'Min tests', zh: '最少测试' },
    min: 1, max: 5, step: 1, defaultValue: 1, rateDeltaPerUnit: 0.02,
  }],
  grantsCapabilities: ['evidence-loop'], isOptimal: true,
  tradeoff: { en: 't', zh: 't' },
};

const suboptimal: Intervention = {
  id: 'prompt-only', name: { en: 'Prompt only', zh: '仅 Prompt' },
  description: { en: 'd', zh: 'd' }, configDiff: { en: 'c', zh: 'c' },
  parameters: [], grantsCapabilities: [], isOptimal: false,
  tradeoff: { en: 't', zh: 't' },
};

test('selectedCapabilities unions grants', () => {
  expect([...selectedCapabilities([optimal, suboptimal], new Set(['ev-loop']))])
    .toEqual(['evidence-loop']);
});

test('successRateWithInterventions uses effects + param delta', () => {
  const p = successRateWithInterventions(def, [optimal], new Set(['ev-loop']), {
    'ev-loop.minTests': 3, // +2 units * 0.02 = +0.04
  });
  expect(p).toBeCloseTo(0.15 + 0.70 + 0.04);
});

test('canCloseIncident requires all optimal selected and verified', () => {
  expect(canCloseIncident([optimal, suboptimal], new Set(['ev-loop']), true)).toBe(true);
  expect(canCloseIncident([optimal, suboptimal], new Set(['prompt-only']), true)).toBe(false);
  expect(canCloseIncident([optimal], new Set(['ev-loop']), false)).toBe(false);
});
```

- [ ] **Step 2: Run — FAIL (module missing)**

- [ ] **Step 3: Implement**

```ts
import type { CapabilityId, IncidentDef, Intervention } from '../content/schema';

export function selectedCapabilities(
  interventions: Intervention[],
  selectedIds: ReadonlySet<string>,
): Set<CapabilityId> {
  const out = new Set<CapabilityId>();
  for (const i of interventions) {
    if (!selectedIds.has(i.id)) continue;
    for (const c of i.grantsCapabilities) out.add(c);
  }
  return out;
}

export function paramRateDelta(
  interventions: Intervention[],
  selectedIds: ReadonlySet<string>,
  paramValues: Record<string, number>,
): number {
  let delta = 0;
  for (const i of interventions) {
    if (!selectedIds.has(i.id)) continue;
    for (const p of i.parameters) {
      const key = `${i.id}.${p.key}`;
      const v = paramValues[key] ?? p.defaultValue;
      const units = (v - p.defaultValue) / p.step;
      delta += units * p.rateDeltaPerUnit;
    }
  }
  return delta;
}

export function successRateWithInterventions(
  def: IncidentDef,
  interventions: Intervention[],
  selectedIds: ReadonlySet<string>,
  paramValues: Record<string, number>,
): number {
  const caps = selectedCapabilities(interventions, selectedIds);
  let p = def.baseSuccess;
  for (const [cap, w] of Object.entries(def.capabilityEffects)) {
    if (caps.has(cap as CapabilityId)) p += w;
  }
  p += paramRateDelta(interventions, selectedIds, paramValues);
  return Math.min(1, Math.max(0, p));
}

export function canCloseIncident(
  interventions: Intervention[],
  selectedIds: ReadonlySet<string>,
  verified: boolean,
): boolean {
  if (!verified) return false;
  const optimals = interventions.filter((i) => i.isOptimal);
  return optimals.length > 0 && optimals.every((i) => selectedIds.has(i.id));
}
```

- [ ] **Step 4: Green + commit** `feat: intervention engine maps plans and params to success rate`

---

### Task 3: progressStore 适配 order 0 + persist 迁移

**Files:**
- Modify: `src/state/progressStore.ts`, `src/state/progressStore.test.ts`

**Interfaces:**
- Produces: `isUnlocked` 对 `order === 0`（或注册表最小 order）为 true；persist `name: 'ais-progress'`

- [ ] **Step 1: Update tests** — fixture order 0 then 1；assert order 0 unlocked initially；order 1 locked until 0 completed.

- [ ] **Step 2: Implement**

```ts
isUnlocked: (s) => {
  const minOrder = Math.min(...SCENARIOS.map((x) => x.def.order), s.order);
  // After Task 5, import INCIDENTS instead of SCENARIOS
  if (s.order === minOrder) return true;
  const prev = SCENARIOS.find((x) => x.def.order === s.order - 1);
  return prev ? get().isCompleted(prev.def.id) : false;
},
```

Persist name → `'ais-progress'`.

- [ ] **Step 3: Green + commit** `feat: unlock from order 0 and migrate progress persist key`

---

### Task 4: INC-010 标杆内容（完整四幕 + X-Ray）

**Files:**
- Create: `src/content/incidents/incident010.ts`
- Create: `src/content/incidents/index.ts`（暂时只注册 010；后续任务追加）
- Create: `src/content/incidents/content.test.ts`

**Interfaces:**
- Produces: `INCIDENTS: Incident[]`, `getIncident(id: string)`

数值（标杆）：

| field | value |
|---|---|
| id | `inc-010` |
| order | 10 |
| stage | `loop` |
| hiddenFailure | `false-completion` |
| baseSuccess | 0.15 |
| capabilityEffects | `{ 'evidence-loop': 0.70 }` |
| unlocks | `['evidence-loop']` |
| baseTokenCost | 5600 |
| trials | 200 |

内容要求（必须全部双语非空）：
- **evidences ≥ 5**：含 terminal（假成功日志）、file（测试仍红）、metric、thought；≥1 `isKeyEvidence`
- **hypotheses ≥ 3**：恰 1 个 `isCorrect`；错误项为「合理性陷阱」
- **interventions ≥ 2**：最优 `evidence-loop`（带 `minTests` 参数）；次优 prompt-only（`grantsCapabilities: []`）
- **xrayTimeline ≥ 5 iterations**：最后一步 `nextAction` 为 STOP；含 annotation 指出 Confidence ≠ Evidence

- [ ] **Step 1: Integrity test**

```ts
import { INCIDENTS, getIncident } from './index';
import { successRateWithInterventions, canCloseIncident } from '../../engine/interventionEngine';

test('inc-010 registered', () => {
  const i = getIncident('inc-010');
  expect(i).toBeDefined();
  expect(i!.content.evidences.length).toBeGreaterThanOrEqual(5);
  expect(i!.content.hypotheses.filter((h) => h.isCorrect)).toHaveLength(1);
  expect(i!.content.interventions.some((x) => x.isOptimal)).toBe(true);
  expect(i!.content.xrayTimeline.length).toBeGreaterThanOrEqual(5);
});

test('inc-010 optimal path improves rate and can close', () => {
  const i = getIncident('inc-010')!;
  const opt = i.content.interventions.filter((x) => x.isOptimal).map((x) => x.id);
  const selected = new Set(opt);
  const after = successRateWithInterventions(i.def, i.content.interventions, selected, {});
  expect(after).toBeGreaterThan(i.def.baseSuccess);
  expect(canCloseIncident(i.content.interventions, selected, true)).toBe(true);
});
```

- [ ] **Step 2: Author `incident010.ts`** — 完整字段按契约填写（叙事对齐设计文档 §4–5：auth 修复、测试未跑、FALSE_COMPLETION）。证据与 X-Ray 用真实感时间戳/路径，但全部静态字符串。

- [ ] **Step 3: `index.ts`**

```ts
import type { Incident } from '../schema';
import { incident010 } from './incident010';
export const INCIDENTS: Incident[] = [incident010].sort((a, b) => a.def.order - b.def.order);
export const getIncident = (id: string) => INCIDENTS.find((i) => i.def.id === id);
```

- [ ] **Step 4: Green + commit** `feat: INC-010 false-completion golden incident content`

---

### Task 5: Incident UI 组件（Header / Evidence / Hypothesis / Intervention / XRay / Verification）

**Files:**
- Create: `src/components/incident/*.tsx` + colocated tests for XRay + Hypothesis + Intervention
- Modify: `src/i18n/uiStrings.ts`（事故相关 UI 键）

**Interfaces:**
- Consumes: `Incident`, `usePick`, interventionEngine helpers
- Produces: presentational components with these props:

```ts
IncidentHeader({ incident: Incident })
EvidenceBoard({ evidences: Evidence[]; viewedIds: Set<string>; onView: (id: string) => void })
HypothesisPanel({
  hypotheses: Hypothesis[];
  selectedId: string | null;
  confirmed: boolean;
  onSelect: (id: string) => void;
  onConfirm: () => void;
})
InterventionPanel({
  interventions: Intervention[];
  selectedIds: Set<string>;
  paramValues: Record<string, number>;
  onToggle: (id: string) => void;
  onParamChange: (key: string, value: number) => void;
})
XRayTimeline({ iterations: XRayIteration[]; initialStep?: number })
VerificationPanel({
  baseline: MonteCarloSummary | null;
  current: MonteCarloSummary | null;
  retrospective: LocalizedText; // 由 shell 根据选择 vs 最优生成
  canClose: boolean;
  onVerify: () => void;
  onClose: () => void;
})
```

- [ ] **Step 1: Add ui strings**（en+zh）：`diagnosePrompt`, `confirmDiagnosis`, `chooseFix`, `selectPlan`, `verifyFix`, `closeIncident`, `retrospective`, `keyEvidence`, `suboptimal`, `xrayTitle`, `severity`…

- [ ] **Step 2: Implement components** — EvidenceBoard 平铺滚动；Hypothesis 单选 + 确认前显示反馈；Intervention 卡片展示 `configDiff` 于 `<pre className="overflow-x-auto text-xs">`；XRay 水平 step 按钮 + 当前层详情；Verification 复用 `MetricsPanel`/`SuccessGauge`。

- [ ] **Step 3: Tests** — Hypothesis：选错显示 feedback；Intervention：toggle 更新；XRay：切换 step 改变可见 decision 文本。

- [ ] **Step 4: Commit** `feat: incident response UI components and xray timeline`

---

### Task 6: IncidentShell 四幕状态机 + 路由

**Files:**
- Create: `src/components/incident/IncidentShell.tsx`, `IncidentShell.test.tsx`
- Create: `src/pages/IncidentPage.tsx`
- Create: `src/state/investigationStore.ts`
- Modify: `src/App.tsx`, `src/pages/HomePage.tsx`（临时只链 INC-010）
- Modify: `src/components/Layout.tsx`（标题改为 Agent Incident Simulator）

**Interfaces:**
- Phases: `'scene' | 'diagnose' | 'intervene' | 'verify' | 'closed'`
- 转换：scene→diagnose（用户点击「开始诊断」，不强制看完全部证据）；diagnose→intervene（确认假设后，正确/错误都可进入，但错误假设顶部显示引导条）；intervene→verify（至少选 1 个方案后可验证）；verify→closed（`canCloseIncident`）

- [ ] **Step 1: investigationStore**

```ts
// 会话级 plain zustand，不 persist
interface InvestigationState {
  viewedEvidenceIds: string[];
  markViewed: (id: string) => void;
  reset: () => void;
}
```

- [ ] **Step 2: IncidentShell** — 组合五组件；验证时：

```ts
const enabled = selectedCapabilities(...);
const rate = successRateWithInterventions(...);
// 适配旧 runMonteCarlo：构造临时 ScenarioDef-shaped 或扩展 runMonteCarlo 接受 IncidentDef + rate override
```

实现适配：在 `simulator.ts` 增加：

```ts
export function runMonteCarloAtRate(
  trials: number, baseTokenCost: number, failure: FailureId, rate: number, seed: number,
): MonteCarloSummary
```

（内部循环用传入 rate，失败时填 `failure`。）

- [ ] **Step 3: Routes** — `/incident/:id`；Home 显示 INC-010 入口；旧 `/scenario/:id` 重定向到对应映射或移除（本 Task 移除 Scenario 路由，避免双路径）。

- [ ] **Step 4: Test** — INC-010：确认正确假设 → 选最优方案 → verify → close 按钮可用；`data-testid`：`confirm-diagnosis`, `verify-button`, `close-incident`。

- [ ] **Step 5: Commit** `feat: IncidentShell four-act loop with routing`

**M1 验收：** 本地 `npm run dev` 可走通 INC-010 全流程；`npm run build` 成功。

---

## Milestone 2：Level 0–1（INC-000…007）

### Task 7: Home 五层事故地图

**Files:**
- Modify: `src/components/StageMap.tsx` → 重命名/改写为 `IncidentMap.tsx`（或原地改造）
- Modify: `src/pages/HomePage.tsx`, `src/i18n/uiStrings.ts`

- [ ] **Step 1:** 五层分组 `llm/harness/loop/graph/reliability`；工单行显示 severity + title；三态锁定逻辑接 `useProgress` + `INCIDENTS`。
- [ ] **Step 2:** 测试：仅 order 0 解锁。
- [ ] **Step 3:** Commit `feat: five-level incident map home`

---

### Task 8: 编写 INC-000…007 内容

**Files:** Create `incident000.ts` … `incident007.ts`；更新 `index.ts`；扩展 `content.test.ts`

**数值表（必须逐字使用）：**

| order | id | stage | failure | base | effects → target | unlocks | token |
|---|---|---|---|---|---|---|---|
| 0 | inc-000 | llm | hallucination | 0.08 | context-injection +0.22, tool-registry +0.05 → 0.35 | 同左 | 1800 |
| 1 | inc-001 | harness | tool-failure | 0.30 | tool-contract +0.15, retry-policy +0.30 → 0.75 | 同左 | 2400 |
| 2 | inc-002 | harness | unsafe-execution | 0.40 | sandbox +0.20, permission-gate +0.10 → 0.70 | 同左 | 3200 |
| 3 | inc-003 | harness | permission-error | 0.35 | permission-gate +0.25, tool-contract +0.12 → 0.72 | [] | 2600 |
| 4 | inc-004 | harness | state-corruption | 0.30 | checkpointing +0.48 → 0.78 | checkpointing | 4100 |
| 5 | inc-005 | harness | memory-failure | 0.35 | memory-management +0.39 → 0.74 | memory-management | 5200 |
| 6 | inc-006 | harness | context-overflow | 0.28 | context-engineering +0.48 → 0.76 | context-engineering | 6800 |
| 7 | inc-007 | harness | stale-context | 0.33 | observation-loop +0.46 → 0.79 | observation-loop | 3900 |

每个文件结构与 INC-010 相同；学习点对齐原设计文档各故障；evidences≥5、hypotheses≥3、interventions≥2、xray≥4。

- [ ] **Step 1:** 扩展 content.test：`INCIDENTS` 最终将到 16；本 Task 结束至少含 order 0–7 与 10；断言可解锁链（required optimal grants ⊆ 自或前序 unlocks）。
- [ ] **Step 2:** 逐个编写 + 注册。
- [ ] **Step 3:** Commit `feat: Level 0-1 incidents INC-000 through INC-007`

---

## Milestone 3：Level 2–3（INC-008…012）

### Task 9: INC-008…012 内容（含死锁 Graph）

**数值表：**

| order | id | stage | failure | base | effects | unlocks | token |
|---|---|---|---|---|---|---|---|
| 8 | inc-008 | loop | task-abandoned | 0.25 | recovery-loop +0.45 | recovery-loop | 7400 |
| 9 | inc-009 | loop | infinite-loop | 0.20 | stop-rule +0.53 | stop-rule | 9100 |
| 10 | inc-010 | loop | false-completion | （已存在） | | | |
| 11 | inc-011 | loop | budget-exhausted | 0.30 | budget-guard +0.47 | budget-guard | 12000 |
| 12 | inc-012 | graph | deadlock | 0.10 | graph-orchestration +0.55, human-gate +0.17 | 同左 | 15000 |

INC-012 证据需体现 Planner/Reviewer/Executor 互相等待；X-Ray 可展示多角色 nextAction 死锁。

- [ ] **Step 1–3:** 编写、注册、测试、commit `feat: Level 2-3 incidents INC-008 through INC-012`

---

## Milestone 4：Level 4 + 清理打磨

### Task 10: INC-013…015 Reliability 内容

| order | id | failure | base | effects | unlocks | token |
|---|---|---|---|---|---|---|
| 13 | inc-013 | evaluation-gap | 0.25 | evaluation-harness +0.50 | evaluation-harness | 8000 |
| 14 | inc-014 | no-observability | 0.20 | observability-stack +0.55 | observability-stack | 7500 |
| 15 | inc-015 | no-replay | 0.18 | deterministic-replay +0.57 | deterministic-replay | 9000 |

叙事：013 上线后边缘失败；014 无法追踪；015 无法本地复现。

- [ ] **Step 1:** content.test 最终断言 `INCIDENTS.length === 16`，orders 0..15 连续。
- [ ] **Step 2:** 编写注册。
- [ ] **Step 3:** Commit `feat: Level 4 reliability incidents INC-013 through INC-015`

---

### Task 11: 删除旧 Scenario 路径 + Patterns/About 更新

**Files:**
- Delete: `src/content/scenarios/**`, `src/components/CapabilityPanel.tsx`, `src/components/ExperimentShell.tsx`(+test), `src/pages/ScenarioPage.tsx`（若仍存）
- Modify: `src/pages/PatternsPage.tsx`（基于已关闭工单的 patternName）、`AboutPage.tsx`、`README.md`、所有仍引用 `SCENARIOS`/`Scenario` 的文件

- [ ] **Step 1:** ripgrep `SCENARIOS|scenario-|ExperimentShell|CapabilityPanel` → 清零。
- [ ] **Step 2:** PatternsPage 用 `INCIDENTS.filter(i => isCompleted(i.def.id))`。
- [ ] **Step 3:** About 文案改为 Incident Simulator + 五层 + 四幕循环。
- [ ] **Step 4:** `npm run test && npm run build`；commit `refactor: remove legacy scenario checkbox path`

---

### Task 12: 响应式、sticky 操作栏、Pages 验收

**Files:** IncidentShell 底部验证/关闭按钮 sticky（沿用已有 sticky 模式）；EvidenceBoard 移动端全宽。

- [ ] **Step 1:** 响应式走查类名。
- [ ] **Step 2:** `npm run test && npm run build`；push `main`；确认 Actions 绿；打开 `https://flingjie.github.io/AgentPlaygroud/` 走通 INC-000 → … 至少 INC-010 与 INC-015。
- [ ] **Step 3:** Commit `feat: polish incident simulator for production pages`

---

## Self-Review

| Spec 要求 | Task |
|---|---|
| 事故工单叙事 / 四幕循环 | 5–6 |
| 平铺证据区 | 5 |
| 合理性陷阱假设 | 4, 8–10 |
| 方案+参数微调 | 2, 5 |
| X-Ray 时间轴回放 | 5, 4/8–10 数据 |
| 五层 16 工单含 Level 4 | 7–10 |
| 纯前端 Pages | 全局 + 12 |
| 无语法高亮依赖 | 5（`<pre>`） |
| 标杆 INC-010 先做 | 4, 6（M1） |

无 TBD/TODO 占位；类型名跨 Task 一致（`Incident` / `Intervention` / `successRateWithInterventions` / `canCloseIncident`）。

---

## 执行交接

Plan 已保存到 `docs/superpowers/plans/2026-08-08-incident-simulator.md`。

**两种执行方式：**

1. **Subagent-Driven（推荐）** — 每 Task 新子代理 + 任务间审查  
2. **Inline Execution** — 本会话按计划批量执行并设检查点  

选哪一种？

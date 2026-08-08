# Agent Incident Simulator 重构设计文档

> 基于费曼学习法 + AI 产品设计 + Agent 工程教育产品的产品级重构
> 目标：让工程师通过调试失败 Agent 学习 Agent Engineering，而非阅读概念

## 1. 产品定位

**从**：Agent Engineering Simulator（教学模拟器）
**到**：**Agent Incident Simulator**（事故模拟实验室）

用户不是学生，是**值班工程师 / Agent 可靠性工程师**。每个场景是一个**线上事故工单**，用户被叫去排查"为什么 Agent 又失败了"。

### 核心教学原则（费曼）

```
不要告诉用户正确答案
让用户犯错，然后解释为什么错
```

### 认知冲突设计

用户的心理预期 vs 现实：

| 用户以为 | 实际发生 | 学习点 |
|---|---|---|
| "GPT-5/Claude 很聪明，直接干活就行" | Agent 声称完成，实际没改代码 | 需要 Harness（工作环境） |
| "给了工具就会用" | 工具调用失败/超时/参数错误 | 需要 Tool Contract + Retry |
| "Agent 会自己判断完成" | 测试没过就说"完成了" | 需要 Evidence Loop |
| "多 Agent 就是 Graph" | Agent 之间死锁/职责混乱 | 需要 Graph 编排 |

## 2. 五层教学结构

```
Level 0: LLM ≠ Agent
    "同一个问题，ChatGPT 能答，Agent 为什么失败？"
    └── 场景 000: 幻觉（无工作环境）

Level 1: Harness Engineering
    "给 Agent 一个工作台"
    └── 场景 001-008: 工具、环境、记忆、上下文、权限

Level 2: Loop Engineering
    "Agent 如何持续可靠工作"
    └── 场景 009-012: 恢复、停止、证据、预算

Level 3: Graph Engineering
    "管理复杂任务状态"
    └── 场景 013: 死锁与编排

Level 4: Reliability Engineering
    "生产级 Agent 系统"
    └── 场景 014-016: 评估、可观测性、回放（新增）
```

## 3. 事故工单叙事框架

每个场景统一为 **Incident Report** 格式：

```
┌────────────────────────────────────────┐
│  INC-001: Agent 声称完成但代码未修改      │
│  严重级别: P1 (功能失效)                 │
│  影响范围: 生产环境 3 个服务              │
│  报告时间: 2026-08-08 14:32 UTC         │
│  状态: 🔴 Open                          │
├────────────────────────────────────────┤
│  【告警摘要】                           │
│  用户报告: "Agent 说完成了升级，但 PR     │
│  里只有注释变更，没有代码修改"            │
│                                        │
│  【当前状态】                           │
│  Agent 运行了 4 分钟，调用了 0 次工具     │
│  最终输出: "已完成 React 18→19 升级"     │
└────────────────────────────────────────┘
```

用户操作路径：

```
接工单 → 查看现场 → 调查定位 → 实施修复 → 验证关闭
```

## 4. 核心交互：四幕循环（Incident Response）

### 第一幕：故障现场（The Scene）

**界面布局**（平铺滚动，非 Tab）：

```
┌────────────────────────────────────────┐
│  📋 Incident Header (标题/级别/时间)     │
├────────────────────────────────────────┤
│  🖥️  Terminal Output                    │
│  $ agent run --task upgrade-react      │
│  [14:32:01] Starting task...           │
│  [14:32:05] Analyzing requirements...  │
│  [14:35:22] Task completed successfully │
│  ⚠️  Warning: No file changes detected  │
│  ... (50 行日志，3 行关键)               │
├────────────────────────────────────────┤
│  📁 File System State                   │
│  ▼ src/                                 │
│    ▼ components/                        │
│      Button.tsx    (unchanged)          │
│      Modal.tsx     (unchanged)          │
│  package.json      (only comment added) │
├────────────────────────────────────────┤
│  📊 Metrics Snapshot                    │
│  Success Rate: 8%  |  Tokens: 1,847     │
│  Tool Calls: 0     |  Files Read: 0     │
├────────────────────────────────────────┤
│  🧠 Agent Thought Trace (X-Ray 入口)     │
│  [Iteration 1] "I should upgrade React" │
│  [Iteration 2] "Let me check package..."│
│  [Iteration 3] "The upgrade is complete"│
│  → 点击展开完整 X-Ray 时间轴              │
└────────────────────────────────────────┘
```

**关键设计**：
- 信息过载但有序（5-8 个证据区，1-2 个含关键线索）
- 无"调查成本"，鼓励自由探索
- 所有证据可滚动平铺查看

### 第二幕：调查定位（Investigation）

用户主动选择查看哪些证据，然后形成假设：

```
┌────────────────────────────────────────┐
│  🔍 你的诊断是什么？                     │
│                                        │
│  ○ 模型 temperature 太高导致输出不稳定   │
│     → 反馈: "这个方向忽略了 Agent 没有   │
│       读取任何文件的事实..."            │
│                                        │
│  ● Agent 没有连接真实工作环境           │
│     → 反馈: "正确！Agent 只有语言能力，  │
│       没有看到代码、没有执行工具..."     │
│                                        │
│  ○ 任务描述不够清晰                     │
│     → 反馈: "任务很明确，但 Agent 没有   │
│       验证手段来确认理解正确..."         │
│                                        │
│  [确认诊断]                             │
└────────────────────────────────────────┘
```

**假设设计原则**：
- 错误选项"部分正确但定位偏了"（不是明显错误）
- 反馈解释为什么错，引导向正确方向

### 第三幕：方案决策（Intervention）

选择工程方案并微调参数：

```
┌────────────────────────────────────────┐
│  🛠️ 选择修复方案                         │
│                                        │
│  ┌────────────────────────────────┐    │
│  │ 方案 A: Context Injection      │    │
│  │ 给 Agent 注入项目文件内容        │    │
│  │                                │    │
│  │ 变更: agent.config.ts          │    │
│  │ + context: {                   │    │
│  │ +   files: ["src/**/*"],       │    │
│  │ +   maxTokens: 4000            │    │
│  │ + }                            │    │
│  │                                │    │
│  │ 参数微调:                       │    │
│  │ maxTokens: [4000 ─────○────] 8000│   │
│  │ 预计影响: 成功率 +22%, Token +15% │   │
│  │ [选择此方案]                     │    │
│  └────────────────────────────────┘    │
│                                        │
│  ┌────────────────────────────────┐    │
│  │ 方案 B: Tool Registry          │    │
│  │ 注册文件读写工具                │    │
│  │ ...                             │    │
│  └────────────────────────────────┘    │
│                                        │
│  ┌────────────────────────────────┐    │
│  │ 方案 C: 仅优化 Prompt          │    │
│  │ 添加更详细的指令                │    │
│  │ ⚠️ 次优解: 成功率 +8%, 但无法验证 │   │
│  └────────────────────────────────┘    │
└────────────────────────────────────────┘
```

**关键设计**：
- 方案 = 具体配置/代码变更预览
- 1-2 个关键参数可微调，实时显示预计影响
- 标注"次优解"但不阻止选择（允许犯错）

### 第四幕：验证与复盘（Verification & Retrospective）

```
┌────────────────────────────────────────┐
│  ✅ 修复验证                            │
│                                        │
│  Monte Carlo 模拟 (200 次试验)          │
│  ┌─────────────┐    ┌─────────────┐   │
│  │   Before    │ →  │   After     │   │
│  │     8%      │    │     35%     │   │
│  │   ████      │    │   ████████  │   │
│  └─────────────┘    └─────────────┘   │
│                                        │
│  事件时间线 (回放)                      │
│  [1] 接收任务                          │
│  [2] 读取 package.json ✓              │
│  [3] 分析依赖变更 ✓                    │
│  [4] 修改 3 个文件 ✓                   │
│  [5] 运行测试 ✓                       │
│  [6] 提交 PR ✓                        │
│                                        │
├────────────────────────────────────────┤
│  📊 决策复盘                            │
│                                        │
│  你的选择: Context Injection + maxTokens│
│  最优解:   Context Injection + Tool    │
│            Registry (成功率 55%)        │
│                                        │
│  差异分析: 缺少工具注册导致 Agent 仍     │
│  无法执行文件操作，只能"看到"不能"修改"  │
│                                        │
│  [关闭工单] [查看 Pattern 卡片]          │
└────────────────────────────────────────┘
```

## 5. Agent X-Ray 时间轴（核心差异化）

**实现：时间轴回放（Timeline Replay）**

```
┌────────────────────────────────────────┐
│  🧠 Agent X-Ray: INC-011 虚假完成       │
├────────────────────────────────────────┤
│  Iteration: [1]──[2]──[3]──[4]──[5]──● │
│             ↑___________________________│
│             拖动查看任意时刻              │
├────────────────────────────────────────┤
│  📥 Context (当前窗口)                  │
│  ┌────────────────────────────────┐    │
│  │ System: You are a coding agent │    │
│  │ User: Fix auth bug in login.py │    │
│  │ Assistant: [previous response] │    │
│  │ ⚠️ Context 使用率: 78%         │    │
│  └────────────────────────────────┘    │
│                                        │
│  📤 Prompt (实际发送)                   │
│  ┌────────────────────────────────┐    │
│  │ "Fix the authentication bug..."│    │
│  │ Tokens: 1,247 / 4,096          │    │
│  └────────────────────────────────┘    │
│                                        │
│  🤔 Decision (模型输出)                 │
│  ┌────────────────────────────────┐    │
│  │ "I have analyzed the code and  │    │
│  │  the bug is fixed. The login   │    │
│  │  function now correctly..."    │    │
│  │ Confidence: 0.94               │    │
│  └────────────────────────────────┘    │
│                                        │
│  🔧 Tool Calls                         │
│  ┌────────────────────────────────┐    │
│  │ (无)                            │    │
│  │ ⚠️ 未验证修复是否有效             │    │
│  └────────────────────────────────┘    │
│                                        │
│  👁️ Observation                        │
│  ┌────────────────────────────────┐    │
│  │ (空)                            │    │
│  │ Agent 未执行任何验证操作          │    │
│  └────────────────────────────────┘    │
│                                        │
│  🧠 Memory State                       │
│  ┌────────────────────────────────┐    │
│  │ Short-term: "auth.py lines 45" │    │
│  │ Long-term: (无)                 │    │
│  └────────────────────────────────┘    │
│                                        │
│  ➡️ Next Action: STOP (认为已完成)      │
│                                        │
│  ⚠️ 问题: Agent Confidence (0.94) ≠    │
│     Task Evidence (0 测试通过)          │
└────────────────────────────────────────┘
```

**交互**：
- 水平时间轴显示所有迭代
- 点击任意 Iteration 查看当时各层状态
- 关键节点标注（如"这里应该验证但没有"）

## 6. 数据模型扩展

```ts
// 场景定义扩展
interface ScenarioDef {
  // ... 保留现有
  incidentMeta: {
    severity: 'P0' | 'P1' | 'P2';
    affectedSystems: string[];
    reportedAt: string;  // ISO timestamp
  };
  evidences: Evidence[];        // 故障现场证据
  hypotheses: Hypothesis[];     // 调查假设
  interventions: Intervention[]; // 修复方案
  xrayTimeline: XRayIteration[]; // X-Ray 时间轴数据
}

interface XRayIteration {
  step: number;
  context: { content: string; usagePercent: number };
  prompt: { content: string; tokens: number };
  decision: { content: string; confidence: number };
  toolCalls: ToolCall[];
  observation: { content: string } | null;
  memory: { shortTerm: string[]; longTerm: string[] };
  nextAction: string;
  annotations: Annotation[];  // 教学标注
}
```

## 7. 新增 Level 4: Reliability Engineering

三个新场景（简要）：

| 场景 | 故障 | 学习点 |
|---|---|---|
| INC-014 | 评估缺失：上线后才发现 Agent 在边缘情况失败 | Evaluation Loop, 离线评估集 |
| INC-015 | 无观测性：Agent 行为无法追踪，问题难以复现 | Observability, Trace/Log/Metric |
| INC-016 | 无法回放：线上事故无法本地复现调试 | Replay, Deterministic Simulation |

## 8. 技术架构（纯前端）

```
┌─────────────────────────────────────────┐
│  UI Layer                               │
│  - IncidentHeader (工单头)               │
│  - EvidenceBoard (平铺证据区)            │
│  - HypothesisPanel (诊断选择)            │
│  - InterventionPanel (方案+参数)         │
│  - XRayTimeline (时间轴回放)             │
│  - VerificationPanel (验证+复盘)         │
├─────────────────────────────────────────┤
│  Content Layer                          │
│  - 16 个 incidentXXX.ts (完整场景数据)   │
│  - 每个包含 evidences/hypotheses/        │
│    interventions/xrayTimeline           │
├─────────────────────────────────────────┤
│  Engine Layer (扩展)                     │
│  - simulator.ts (保留)                   │
│  - interventionEngine.ts (新增)          │
│    根据选择的方案+参数计算成功率           │
├─────────────────────────────────────────┤
│  State Layer                            │
│  - progressStore (保留: 完成状态/库存)    │
│  - investigationStore (新增)             │
│    记录查看了哪些证据/选择了哪个假设       │
└─────────────────────────────────────────┘
```

## 9. 与现有版本的迁移

**保留**：
- 模拟引擎核心（mulberry32, Monte Carlo）
- 成功率计算模型
- 进度存储结构
- 双语/主题基础设施

**替换**：
- CapabilityPanel checkbox → InterventionPanel 方案卡片
- 单页面板 → 事故工单四幕循环
- 简单时间线 → X-Ray 时间轴回放

**新增**：
- Level 0 和 Level 4（共 3 个新场景）
- Evidence/Hypothesis/Intervention 内容模型
- X-Ray 时间轴组件

## 10. 内容创作策略

16 个场景 × (5-8 证据 + 3-4 假设 + 2-3 方案 + 5-10 X-Ray 迭代) = 大量内容。

**策略**：
1. 先实现 1 个标杆场景（建议 INC-011 虚假完成，核心实验）
2. 建立内容模板和格式规范
3. 批量生成初稿（AI 辅助）
4. 人工精修关键场景

## 11. 成功指标

- 用户完成事故后的"恍然大悟"时刻（"原来 Agent 需要这个！"）
- 决策复盘环节的对比学习（"我的选择 vs 最优解"）
- 能向他人解释"为什么需要 Harness/Loop/Graph"（费曼检验）

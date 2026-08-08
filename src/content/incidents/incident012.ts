import type { Incident } from '../schema';

export const incident012: Incident = {
  def: {
    id: 'inc-012',
    order: 12,
    stage: 'graph',
    hiddenFailure: 'deadlock',
    baseSuccess: 0.10,
    capabilityEffects: { 'graph-orchestration': 0.55, 'human-gate': 0.17 },
    unlocks: ['graph-orchestration', 'human-gate'],
    baseTokenCost: 15000,
    trials: 200,
    incidentMeta: {
      severity: 'P0',
      affectedSystems: [
        { en: 'Multi-agent release graph', zh: '多 Agent 发布图' },
        { en: 'Planner / Reviewer / Executor nodes', zh: 'Planner / Reviewer / Executor 节点' },
        { en: 'Production deployment gate', zh: '生产部署门禁' },
      ],
      reportedAt: '2026-08-04T03:12:00Z',
      alertSummary: {
        en: 'Planner is waiting for Reviewer approval, Reviewer is waiting for Executor test results, and Executor is waiting for Planner to finalize the plan. No node can proceed.',
        zh: 'Planner 等待 Reviewer 审批；Reviewer 等待 Executor 测试结果；Executor 等待 Planner 最终确定计划。没有任何节点能继续。',
      },
      agentClaim: {
        en: 'I am waiting for the other agent in the graph to provide its output before I can proceed.',
        zh: '我正在等待图中的其他 Agent 提供输出，然后才能继续。',
      },
    },
  },
  content: {
    title: {
      en: 'INC-012 Deadlock: Three Agents Waiting in a Circle',
      zh: 'INC-012 死锁：三个 Agent 围成圈互相等待',
    },
    failureName: {
      en: 'DEADLOCK',
      zh: 'DEADLOCK（死锁）',
    },
    explanation: {
      en: 'A graph of three agents with cyclic dependencies can deadlock when each node waits for another node’s output before producing its own. Without graph orchestration that breaks cycles (e.g., sequential phases, handoff tokens, or a human gate for ambiguous decisions), the system stalls indefinitely. Combining graph orchestration with a human gate for the ambiguous handoff raises success from 10% to 82%.',
      zh: '三个具有循环依赖的 Agent 图，当每个节点都要等待其他节点的输出才能产出自己的输出时，就会死锁。没有 Graph Orchestration 来打破循环（例如顺序阶段、交接令牌、或对模糊决策的人工门禁），系统会无限期停滞。Graph Orchestration 加上对模糊交接的人工门禁，可将成功率从 10% 提升至 82%。',
    },
    patternName: {
      en: 'Graph Orchestration + Human Gate',
      zh: 'Graph Orchestration + 人工门禁',
    },
    patternSummary: {
      en: 'Design agent graphs as directed acyclic workflows with explicit handoff tokens. Break cycles by introducing a human gate or a deterministic phase boundary when mutual waiting is possible.',
      zh: '将 Agent 图设计为具有显式交接令牌的有向无环工作流。当可能出现相互等待时，通过引入人工门禁或确定性阶段边界来打破循环。',
    },
    evidences: [
      {
        id: 'ev-012-terminal',
        type: 'terminal',
        title: { en: 'Graph execution trace', zh: '图执行轨迹' },
        content: {
          en: 'Planner: waiting for Reviewer sign-off on risk assessment\nReviewer: waiting for Executor to finish integration tests\nExecutor: waiting for Planner to finalize deployment plan\n[03:12–04:45] no state transitions; CPU idle',
          zh: 'Planner：等待 Reviewer 对风险评估的签字\nReviewer：等待 Executor 完成集成测试\nExecutor：等待 Planner 最终确定部署计划\n[03:12–04:45] 无状态转换；CPU 空闲',
        },
        isKeyEvidence: true,
      },
      {
        id: 'ev-012-file',
        type: 'file',
        title: { en: 'Graph topology', zh: '图拓扑' },
        content: {
          en: 'Planner → Reviewer → Executor → Planner\nNo orchestrator. No handoff token. No timeout on wait edges.',
          zh: 'Planner → Reviewer → Executor → Planner\n无编排器。无交接令牌。等待边无超时。',
        },
        isKeyEvidence: true,
      },
      {
        id: 'ev-012-metric',
        type: 'metric',
        title: { en: 'Simulation metrics', zh: '仿真指标' },
        content: {
          en: 'Success rate: 10% (200 trials) | Deadlocked runs: 74% | Avg stall time before timeout: 47 minutes',
          zh: '成功率：10%（200 次试验）| 死锁运行：74% | 超时前平均停滞时间：47 分钟',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-012-thought',
        type: 'thought',
        title: { en: 'Planner thought trace', zh: 'Planner 思路轨迹' },
        content: {
          en: '"I cannot finalize the deployment plan until the Reviewer confirms the risk assessment."',
          zh: '“在 Reviewer 确认风险评估之前，我无法最终确定部署计划。”',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-012-log',
        type: 'log',
        title: { en: 'Orchestrator absence log', zh: '编排器缺失日志' },
        content: {
          en: 'No central queue or phase lock observed. Each node polled its dependencies without a timeout or escalation path.',
          zh: '未观察到中央队列或阶段锁。每个节点都在无超时或升级路径的情况下轮询其依赖。',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-012-api',
        type: 'api',
        title: { en: 'Deployment gate webhook', zh: '部署门禁 Webhook' },
        content: {
          en: 'Production gate blocked: multi-agent graph has been idle for 93 minutes. Human escalation required.',
          zh: '生产门禁被阻塞：多 Agent 图已空闲 93 分钟。需要人工升级。',
        },
        isKeyEvidence: false,
      },
    ],
    hypotheses: [
      {
        id: 'h-012-correct',
        text: {
          en: 'The three nodes are deadlocked because their dependencies form a cycle and the graph lacks orchestration to break it with sequential phases or a human gate.',
          zh: '三个节点死锁，因为它们的依赖形成循环，而图缺少编排器，无法通过顺序阶段或人工门禁打破循环。',
        },
        isCorrect: true,
        feedback: {
          en: 'Correct. The topology is a cycle. An orchestrator should enforce Planner → Executor → Reviewer with a handoff token, or insert a human gate when the cycle is unavoidable.',
          zh: '正确。拓扑是循环。编排器应强制 Planner → Executor → Reviewer 并带交接令牌，或在不可避免时插入人工门禁。',
        },
      },
      {
        id: 'h-012-bug',
        text: {
          en: 'One of the nodes has a bug that prevents it from producing output.',
          zh: '其中一个节点有 bug，导致无法产出输出。',
        },
        isCorrect: false,
        feedback: {
          en: 'All nodes are healthy and responsive to polls. The problem is the wait condition, not a crash or bug.',
          zh: '所有节点都健康并对轮询有响应。问题在于等待条件，而不是崩溃或 bug。',
        },
      },
      {
        id: 'h-012-network',
        text: {
          en: 'Network latency between nodes is causing the delays.',
          zh: '节点之间的网络延迟导致了延迟。',
        },
        isCorrect: false,
        feedback: {
          en: 'All nodes are in the same process. The trace shows zero inter-node messages after the initial wait, not slow messages.',
          zh: '所有节点在同一进程内。轨迹显示初始等待后节点间零消息，而不是消息慢。',
        },
      },
      {
        id: 'h-012-timeout',
        text: {
          en: 'Each node should have a shorter timeout so it can retry independently.',
          zh: '每个节点应该有更短的超时，以便独立重试。',
        },
        isCorrect: false,
        feedback: {
          en: 'Shorter timeouts would just retry the same circular wait. The fix is to break the cycle, not to retry faster.',
          zh: '更短的超时只会重复相同的循环等待。修复方案是打破循环，而不是更快重试。',
        },
      },
    ],
    interventions: [
      {
        id: 'int-012-graph-orchestration',
        name: {
          en: 'Graph Orchestration + Human Gate',
          zh: 'Graph Orchestration + 人工门禁',
        },
        description: {
          en: 'Replace the cyclic graph with a DAG orchestrator: Planner produces the plan, Executor runs tests, Reviewer signs off. Use a handoff token so each node knows its predecessor is done. If a cycle is unavoidable, insert a human gate to resolve the ambiguous decision.',
          zh: '用 DAG 编排器替换循环图：Planner 生成计划，Executor 运行测试，Reviewer 签字。使用交接令牌让每个节点知道前驱已完成。如果循环不可避免，则插入人工门禁来解析模糊决策。',
        },
        configDiff: {
          en: '+ graph.config.ts\n+ orchestrator: {\n+   phases: ["plan", "execute", "review"],\n+   handoffToken: true,\n+   humanGateOnCycle: true,\n+ }',
          zh: '+ graph.config.ts\n+ orchestrator: {\n+   phases: ["plan", "execute", "review"],\n+   handoffToken: true,\n+   humanGateOnCycle: true,\n+ }',
        },
        parameters: [
          {
            key: 'phaseTimeout',
            label: {
              en: 'Phase timeout (minutes)',
              zh: '阶段超时（分钟）',
            },
            min: 5,
            max: 60,
            step: 5,
            defaultValue: 15,
            rateDeltaPerUnit: 0.003,
          },
        ],
        grantsCapabilities: ['graph-orchestration', 'human-gate'],
        isOptimal: true,
        tradeoff: {
          en: 'Adds orchestration complexity and may require human intervention for edge cases, but breaks deadlock and raises success from 10% to 82%.',
          zh: '增加编排复杂度，边缘情况可能需要人工介入，但能打破死锁，成功率从 10% 提升至 82%。',
        },
      },
      {
        id: 'int-012-random-backoff',
        name: {
          en: 'Random Backoff on Wait Edges',
          zh: '等待边随机退避',
        },
        description: {
          en: 'Add random delays and retries on the wait edges so that nodes do not poll in lockstep.',
          zh: '在等待边上增加随机延迟和重试，使节点不会同步轮询。',
        },
        configDiff: {
          en: '+ waitEdge: { retryMs: [100, 200, 400], jitter: true }',
          zh: '+ waitEdge: { retryMs: [100, 200, 400], jitter: true }',
        },
        parameters: [],
        grantsCapabilities: [],
        isOptimal: false,
        tradeoff: {
          en: 'Does not resolve the fundamental cycle; can reduce lockstep but deadlock remains possible.',
          zh: '无法解决根本循环；只能减少同步轮询，死锁仍可能发生。',
        },
      },
    ],
    xrayTimeline: [
      {
        step: 1,
        context: {
          content: {
            en: 'System: Multi-agent release graph.\nPlanner: produce deployment plan.\nReviewer: approve risk assessment.\nExecutor: run integration tests.',
            zh: 'System：多 Agent 发布图。\nPlanner：生成部署计划。\nReviewer：审批风险评估。\nExecutor：运行集成测试。',
          },
          usagePercent: 15,
        },
        prompt: {
          content: {
            en: 'Coordinate to release v2.7.0. Planner starts.',
            zh: '协调发布 v2.7.0。Planner 开始。',
          },
          tokens: 1300,
        },
        decision: {
          content: {
            en: 'I will draft the deployment plan and send it to the Reviewer for risk assessment.',
            zh: '我将起草部署计划并发送给 Reviewer 进行风险评估。',
          },
          confidence: 0.82,
        },
        toolCalls: [],
        observation: {
          en: 'Planner is ready to produce the plan.',
          zh: 'Planner 准备好生成计划。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Mission: release v2.7.0',
              zh: '任务：发布 v2.7.0',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Produce plan and wait for Reviewer sign-off.',
          zh: '生成计划并等待 Reviewer 签字。',
        },
        annotations: [],
      },
      {
        step: 2,
        context: {
          content: {
            en: 'System: release graph.\nPlanner: [produced plan] awaiting Reviewer.',
            zh: 'System：发布图。\nPlanner：[已生成计划] 等待 Reviewer。',
          },
          usagePercent: 30,
        },
        prompt: {
          content: {
            en: 'Reviewer, please assess the deployment risk.',
            zh: 'Reviewer，请评估部署风险。',
          },
          tokens: 890,
        },
        decision: {
          content: {
            en: 'I cannot sign off until I see the integration test results from Executor.',
            zh: '在我看到 Executor 的集成测试结果之前无法签字。',
          },
          confidence: 0.77,
        },
        toolCalls: [],
        observation: {
          en: 'Reviewer refuses to sign off without Executor output.',
          zh: 'Reviewer 在没有 Executor 输出前拒绝签字。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Reviewer waiting for Executor tests',
              zh: 'Reviewer 等待 Executor 测试',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Wait for Executor test results.',
          zh: '等待 Executor 测试结果。',
        },
        annotations: [
          {
            text: {
              en: 'Reviewer depends on Executor, which has not started yet.',
              zh: 'Reviewer 依赖 Executor，而 Executor 尚未开始。',
            },
            severity: 'warn',
          },
        ],
      },
      {
        step: 3,
        context: {
          content: {
            en: 'System: release graph.\nExecutor: [idle] awaiting final plan from Planner.',
            zh: 'System：发布图。\nExecutor：[空闲] 等待 Planner 的最终计划。',
          },
          usagePercent: 38,
        },
        prompt: {
          content: {
            en: 'Executor, please run the integration tests.',
            zh: 'Executor，请运行集成测试。',
          },
          tokens: 760,
        },
        decision: {
          content: {
            en: 'I cannot start tests until the plan is finalized by Planner. The current draft may change.',
            zh: '在 Planner 最终确定计划前我无法开始测试。当前草案可能会变。',
          },
          confidence: 0.70,
        },
        toolCalls: [],
        observation: {
          en: 'Executor is waiting for Planner, which is waiting for Reviewer.',
          zh: 'Executor 等待 Planner，而 Planner 等待 Reviewer。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Executor waiting for finalized plan',
              zh: 'Executor 等待最终计划',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Wait for Planner to finalize the plan.',
          zh: '等待 Planner 最终确定计划。',
        },
        annotations: [
          {
            text: {
              en: 'Cycle detected: Planner → Reviewer → Executor → Planner.',
              zh: '检测到循环：Planner → Reviewer → Executor → Planner。',
            },
            severity: 'error',
          },
        ],
      },
      {
        step: 4,
        context: {
          content: {
            en: 'System: release graph.\nAll three nodes have been waiting for 45 minutes.',
            zh: 'System：发布图。\n三个节点已等待 45 分钟。',
          },
          usagePercent: 55,
        },
        prompt: {
          content: {
            en: 'Why has no progress been made?',
            zh: '为什么没有任何进展？',
          },
          tokens: 620,
        },
        decision: {
          content: {
            en: 'The other agents are not providing their outputs. I will continue to wait.',
            zh: '其他 Agent 没有提供输出。我会继续等待。',
          },
          confidence: 0.85,
        },
        toolCalls: [],
        observation: {
          en: 'No node recognizes the deadlock; each blames the others.',
          zh: '没有节点意识到死锁；每个节点都在责怪其他节点。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Stalled for 45 minutes',
              zh: '已停滞 45 分钟',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Keep waiting.',
          zh: '继续等待。',
        },
        annotations: [
          {
            text: {
              en: 'No orchestrator is present to break the cycle with a phase boundary or handoff token.',
              zh: '没有编排器通过阶段边界或交接令牌来打破循环。',
            },
            severity: 'error',
          },
        ],
      },
      {
        step: 5,
        context: {
          content: {
            en: 'System: release graph.\nOrchestrator timeout: 93 minutes idle.',
            zh: 'System：发布图。\n编排器超时：已空闲 93 分钟。',
          },
          usagePercent: 72,
        },
        prompt: {
          content: {
            en: 'Final status of v2.7.0 release?',
            zh: 'v2.7.0 发布最终状态？',
          },
          tokens: 410,
        },
        decision: {
          content: {
            en: 'The release is blocked because downstream agents have not provided their outputs.',
            zh: '发布被阻塞，因为下游 Agent 没有提供输出。',
          },
          confidence: 0.80,
        },
        toolCalls: [],
        observation: {
          en: 'The deployment gate is blocked. Human intervention is required.',
          zh: '部署门禁被阻塞。需要人工介入。',
        },
        memory: {
          shortTerm: [],
          longTerm: [
            {
              en: 'Deadlock: all three nodes waited on each other; no output produced',
              zh: '死锁：三个节点互相等待；未产生任何输出',
            },
          ],
        },
        nextAction: {
          en: 'STOP (deadlock, human escalation required)',
          zh: 'STOP（死锁，需要人工升级）',
        },
        annotations: [
          {
            text: {
              en: 'Root cause: cyclic dependency in the graph. Orchestrated phases or a human gate would have prevented the deadlock.',
              zh: '根因：图中的循环依赖。编排阶段或人工门禁本可防止死锁。',
            },
            severity: 'error',
          },
        ],
      },
    ],
  },
};

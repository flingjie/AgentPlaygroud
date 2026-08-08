import type { Incident } from '../schema';

export const incident011: Incident = {
  def: {
    id: 'inc-011',
    order: 11,
    stage: 'loop',
    hiddenFailure: 'budget-exhausted',
    baseSuccess: 0.30,
    capabilityEffects: { 'budget-guard': 0.47 },
    unlocks: ['budget-guard'],
    baseTokenCost: 12000,
    trials: 200,
    incidentMeta: {
      severity: 'P1',
      affectedSystems: [
        { en: 'Customer support chatbot', zh: '客户支持聊天机器人' },
        { en: 'LLM API budget', zh: 'LLM API 预算' },
        { en: 'Escalation queue', zh: '升级队列' },
      ],
      reportedAt: '2026-08-01T19:44:00Z',
      alertSummary: {
        en: 'Agent spent the entire daily LLM budget rephrasing a single refund-policy answer without ever returning a result to the user.',
        zh: 'Agent 把当日全部 LLM 预算花在反复改写同一条退款政策回答上，却没有向用户返回任何结果。',
      },
      agentClaim: {
        en: 'I am refining the response to ensure it fully addresses the user’s request.',
        zh: '我正在优化回答，以确保它充分回应用户需求。',
      },
    },
  },
  content: {
    title: {
      en: 'INC-011 Budget Exhausted: The Refinement That Never Delivered',
      zh: 'INC-011 预算耗尽：永无止境的精炼',
    },
    failureName: {
      en: 'BUDGET_EXHAUSTED',
      zh: 'BUDGET EXHAUSTED（预算耗尽）',
    },
    explanation: {
      en: 'The loop agent treats refinement as a free resource. Without a budget guard that caps the number of polishing iterations and forces delivery, the agent can consume arbitrary tokens on diminishing returns. A budget guard that enforces a hard token cap and requires an explicit delivery action raises success from 30% to 77%.',
      zh: 'Loop Agent 把精炼当作免费资源。没有 Budget Guard 来限制润色迭代次数并强制交付，Agent 可能在收益递减的事情上消耗任意 token。一个强制 token 上限并要求显式交付动作的 Budget Guard 可将成功率从 30% 提升至 77%。',
    },
    patternName: {
      en: 'Budget Guard',
      zh: 'Budget Guard（预算守卫）',
    },
    patternSummary: {
      en: 'Set a hard token/iteration budget for each task phase. When the budget is reached, the agent must deliver its current best answer rather than continue refining.',
      zh: '为每个任务阶段设置硬性的 token/迭代预算。当预算耗尽时，Agent 必须交付当前最佳答案，而不是继续精炼。',
    },
    evidences: [
      {
        id: 'ev-011-terminal',
        type: 'terminal',
        title: { en: 'Agent execution log', zh: 'Agent 执行日志' },
        content: {
          en: '[19:44] user asks refund policy\n[19:45] draft answer v1 (acceptable)\n[19:47] draft v2 (minor wording)\n[19:50] draft v3 (reverted to v1 wording)\n[19:55] draft v4 (minor wording)\n[20:30] budget exhausted; no answer returned to user',
          zh: '[19:44] 用户询问退款政策\n[19:45] 草稿 v1（可接受）\n[19:47] 草稿 v2（微调措辞）\n[19:50] 草稿 v3（改回 v1 措辞）\n[19:55] 草稿 v4（微调措辞）\n[20:30] 预算耗尽；未向用户返回答案',
        },
        isKeyEvidence: true,
      },
      {
        id: 'ev-011-file',
        type: 'file',
        title: { en: 'Budget policy file', zh: '预算策略文件' },
        content: {
          en: 'daily_budget: 12000 tokens\nper_query_cap: not set\nper_phase_cap: not set\nno forced delivery on budget exhaustion',
          zh: 'daily_budget: 12000 tokens\nper_query_cap: 未设置\nper_phase_cap: 未设置\n预算耗尽时无强制交付',
        },
        isKeyEvidence: true,
      },
      {
        id: 'ev-011-metric',
        type: 'metric',
        title: { en: 'Simulation metrics', zh: '仿真指标' },
        content: {
          en: 'Success rate: 30% (200 trials) | Avg drafts before budget exhaustion: 7.3 | Runs that delivered v1 or v2: 34%',
          zh: '成功率：30%（200 次试验）| 预算耗尽前平均草稿数：7.3 | 交付 v1 或 v2 的运行：34%',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-011-thought',
        type: 'thought',
        title: { en: 'Agent thought trace', zh: 'Agent 思路轨迹' },
        content: {
          en: '[Iteration 5] "Draft v4 is slightly clearer than v3. I can make v5 even better if I keep refining."',
          zh: '[迭代 5] “草稿 v4 比 v3 稍微清楚一点。如果我继续精炼，v5 还能更好。”',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-011-log',
        type: 'log',
        title: { en: 'LLM API usage dashboard', zh: 'LLM API 使用仪表盘' },
        content: {
          en: 'Daily budget consumed 100% at 20:30. No result returned. Subsequent user queries received 429 Budget Exhausted.',
          zh: '20:30 每日预算消耗 100%。未返回结果。后续用户查询收到 429 Budget Exhausted。',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-011-api',
        type: 'api',
        title: { en: 'Chatbot response record', zh: '聊天机器人响应记录' },
        content: {
          en: 'User message: "What is the refund policy?"\nAgent response: none (timeout after 46 minutes).',
          zh: '用户消息：“退款政策是什么？”\nAgent 响应：无（46 分钟后超时）。',
        },
        isKeyEvidence: false,
      },
    ],
    hypotheses: [
      {
        id: 'h-011-correct',
        text: {
          en: 'The agent exhausted the budget because it kept refining an already acceptable answer without a guard that capped iterations or forced delivery.',
          zh: 'Agent 耗尽预算，因为它不断精炼一个已经可接受的答案，而没有任何机制限制迭代次数或强制交付。',
        },
        isCorrect: true,
        feedback: {
          en: 'Correct. The first draft was sufficient; the agent spent 46 minutes on marginal improvements because no budget guard required it to stop and deliver.',
          zh: '正确。第一版草稿已经足够；Agent 花了 46 分钟做边际改进，因为没有 Budget Guard 要求它停止并交付。',
        },
      },
      {
        id: 'h-011-quality',
        text: {
          en: 'The agent kept refining because the quality of the first draft was too low to deliver.',
          zh: 'Agent 不断精炼，因为第一版草稿质量太低，无法交付。',
        },
        isCorrect: false,
        feedback: {
          en: 'The first draft scored 82% on the internal quality rubric and was marked acceptable by the simulation. Refinement produced only minor wording changes.',
          zh: '第一版草稿在内部质量评分中达到 82%，且仿真标记为可接受。精炼只产生了微小的措辞变化。',
        },
      },
      {
        id: 'h-011-budget',
        text: {
          en: 'The daily budget was simply too small for the task.',
          zh: '每日预算对这项任务来说本来就太少。',
        },
        isCorrect: false,
        feedback: {
          en: 'The budget allowed 12,000 tokens. The first two drafts together consumed under 1,200. The issue was unrestricted refinement, not budget size.',
          zh: '预算为 12,000 token。前两版草稿合计消耗不到 1,200。问题在于无限制的精炼，而不是预算大小。',
        },
      },
      {
        id: 'h-011-prompt',
        text: {
          en: 'The prompt told the agent to keep improving until the answer was perfect.',
          zh: 'Prompt 告诉 Agent 持续改进直到答案完美。',
        },
        isCorrect: false,
        feedback: {
          en: 'The prompt asked for a concise answer. The agent’s own loop decided to keep refining without a stopping condition.',
          zh: 'Prompt 要求简洁回答。是 Agent 自己的循环决定继续精炼，没有停止条件。',
        },
      },
    ],
    interventions: [
      {
        id: 'int-011-budget-guard',
        name: {
          en: 'Budget Guard + Forced Delivery',
          zh: 'Budget Guard + 强制交付',
        },
        description: {
          en: 'Set a per-query token/iteration budget and a hard cap. When 80% of the budget is used, the agent must select the best existing draft and deliver it. At 100% delivery is automatic.',
          zh: '设置每次查询的 token/迭代预算和硬性上限。当预算使用到 80% 时，Agent 必须选择现有最佳草稿并交付。达到 100% 时自动交付。',
        },
        configDiff: {
          en: '+ agent.config.ts\n+ budgetGuard: {\n+   enabled: true,\n+   perQueryTokenCap: 4000,\n+   maxRefinementIterations: 3,\n+   deliverOnCap: true,\n+ }',
          zh: '+ agent.config.ts\n+ budgetGuard: {\n+   enabled: true,\n+   perQueryTokenCap: 4000,\n+   maxRefinementIterations: 3,\n+   deliverOnCap: true,\n+ }',
        },
        parameters: [
          {
            key: 'maxRefinementIterations',
            label: {
              en: 'Max refinement iterations',
              zh: '最大精炼迭代次数',
            },
            min: 1,
            max: 8,
            step: 1,
            defaultValue: 3,
            rateDeltaPerUnit: 0.02,
          },
        ],
        grantsCapabilities: ['budget-guard'],
        isOptimal: true,
        tradeoff: {
          en: 'May deliver slightly less polished answers, but prevents budget exhaustion and raises success from 30% to 77%.',
          zh: '可能交付略微不够精致的回答，但能防止预算耗尽，成功率从 30% 提升至 77%。',
        },
      },
      {
        id: 'int-011-bigger-budget',
        name: {
          en: 'Raise the Daily Budget',
          zh: '提高每日预算',
        },
        description: {
          en: 'Double the daily LLM budget so the agent can keep refining until it is satisfied.',
          zh: '将每日 LLM 预算翻倍，让 Agent 可以满意为止继续精炼。',
        },
        configDiff: {
          en: '- dailyBudget: 12000 tokens\n+ dailyBudget: 24000 tokens',
          zh: '- dailyBudget: 12000 tokens\n+ dailyBudget: 24000 tokens',
        },
        parameters: [],
        grantsCapabilities: [],
        isOptimal: false,
        tradeoff: {
          en: 'Delays the problem by one day and increases cost; the agent still lacks a stopping rule.',
          zh: '把问题推迟一天并增加成本；Agent 仍然没有停止规则。',
        },
      },
    ],
    xrayTimeline: [
      {
        step: 1,
        context: {
          content: {
            en: 'System: You are a customer support chatbot.\nUser: What is the refund policy?',
            zh: 'System：你是一名客户支持聊天机器人。\nUser：退款政策是什么？',
          },
          usagePercent: 18,
        },
        prompt: {
          content: {
            en: 'Answer the user question about the refund policy concisely and accurately.',
            zh: '简洁准确地回答用户关于退款政策的问题。',
          },
          tokens: 1100,
        },
        decision: {
          content: {
            en: 'I will draft a concise answer based on the refund policy document.',
            zh: '我将基于退款政策文档起草一个简洁回答。',
          },
          confidence: 0.84,
        },
        toolCalls: [],
        observation: {
          en: 'The user query is clear and the task is bounded.',
          zh: '用户查询清晰，任务范围明确。',
        },
        memory: {
          shortTerm: [
            {
              en: 'User asks refund policy',
              zh: '用户询问退款政策',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Read policy and draft answer v1.',
          zh: '读取政策并起草回答 v1。',
        },
        annotations: [],
      },
      {
        step: 2,
        context: {
          content: {
            en: 'System: support chatbot.\nAssistant: [drafted v1] answer looks acceptable.',
            zh: 'System：支持聊天机器人。\nAssistant：[已起草 v1] 回答看起来可接受。',
          },
          usagePercent: 28,
        },
        prompt: {
          content: {
            en: 'Return the answer to the user.',
            zh: '将答案返回给用户。',
          },
          tokens: 340,
        },
        decision: {
          content: {
            en: 'The answer is good, but I can make it slightly clearer and more empathetic. I will refine it once.',
            zh: '回答不错，但我可以让它更清晰、更有同理心。我再精炼一次。',
          },
          confidence: 0.81,
        },
        toolCalls: [
          {
            name: 'write_file',
            args: '{"path": "draft_v2.md", "content": "refined refund policy answer"}',
            result: 'OK',
          },
        ],
        observation: {
          en: 'The agent produced a second draft instead of delivering.',
          zh: 'Agent 生成了第二版草稿，而不是交付。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Draft v1 acceptable; v2 generated',
              zh: '草稿 v1 可接受；已生成 v2',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Compare drafts and produce v3.',
          zh: '对比草稿并生成 v3。',
        },
        annotations: [
          {
            text: {
              en: 'No budget guard is forcing delivery of an already acceptable answer.',
              zh: '没有 Budget Guard 强制交付已经可接受的答案。',
            },
            severity: 'warn',
          },
        ],
      },
      {
        step: 3,
        context: {
          content: {
            en: 'System: support chatbot.\nAssistant: [drafts v1-v3] comparing wording.',
            zh: 'System：支持聊天机器人。\nAssistant：[草稿 v1-v3] 正在对比措辞。',
          },
          usagePercent: 44,
        },
        prompt: {
          content: {
            en: 'Which draft is best?',
            zh: '哪个草稿最好？',
          },
          tokens: 290,
        },
        decision: {
          content: {
            en: 'Draft v3 is slightly better than v2, but v1 had a stronger opening. I will merge the best parts into v4.',
            zh: '草稿 v3 比 v2 稍好，但 v1 的开头更强。我将把最好的部分合并到 v4。',
          },
          confidence: 0.76,
        },
        toolCalls: [
          {
            name: 'write_file',
            args: '{"path": "draft_v4.md", "content": "merged refund policy answer"}',
            result: 'OK',
          },
        ],
        observation: {
          en: 'The agent is spending tokens on diminishing returns.',
          zh: 'Agent 正在收益递减的事情上消耗 token。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Drafts: 4, no delivery',
              zh: '草稿：4 版，未交付',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Produce v5 with a slightly different tone.',
          zh: '用略微不同的语气生成 v5。',
        },
        annotations: [
          {
            text: {
              en: 'Refinement loop is unbounded; token budget is being consumed with no delivery signal.',
              zh: '精炼循环无边界；token 预算被消耗，但没有交付信号。',
            },
            severity: 'error',
          },
        ],
      },
      {
        step: 4,
        context: {
          content: {
            en: 'System: support chatbot.\nAssistant: [drafts v1-v7] budget at 80%.',
            zh: 'System：支持聊天机器人。\nAssistant：[草稿 v1-v7] 预算已用 80%。',
          },
          usagePercent: 82,
        },
        prompt: {
          content: {
            en: 'You have used 80% of the budget. Please return the best answer now.',
            zh: '你已使用 80% 预算。请现在返回答案。',
          },
          tokens: 450,
        },
        decision: {
          content: {
            en: 'I can still improve the answer with the remaining budget. I will do one more polish and then deliver.',
            zh: '我还可以用剩余预算继续改进。我再润色一次就交付。',
          },
          confidence: 0.88,
        },
        toolCalls: [
          {
            name: 'write_file',
            args: '{"path": "draft_v8.md", "content": "polished refund policy answer"}',
            result: 'OK',
          },
        ],
        observation: {
          en: 'Budget is now exhausted. The user has not received any answer.',
          zh: '预算已耗尽。用户仍未收到任何答案。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Budget exhausted; no delivery',
              zh: '预算耗尽；未交付',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Try to produce v9 with zero budget.',
          zh: '尝试用零预算生成 v9。',
        },
        annotations: [
          {
            text: {
              en: 'A budget guard would have forced delivery at the 80% checkpoint.',
              zh: 'Budget Guard 会在 80% 检查点强制交付。',
            },
            severity: 'error',
          },
        ],
      },
      {
        step: 5,
        context: {
          content: {
            en: 'System: support chatbot.\nAssistant: [budget 0] no answer delivered.',
            zh: 'System：支持聊天机器人。\nAssistant：[预算为 0] 未返回答案。',
          },
          usagePercent: 100,
        },
        prompt: {
          content: {
            en: 'Budget exhausted. Final status?',
            zh: '预算耗尽。最终状态？',
          },
          tokens: 220,
        },
        decision: {
          content: {
            en: 'I was close to an optimal answer. The budget ran out before the final polish.',
            zh: '我快要得到最优答案了。预算在最终润色前耗尽。',
          },
          confidence: 0.79,
        },
        toolCalls: [],
        observation: {
          en: 'User received 429 Budget Exhausted. The chatbot provided no refund policy answer.',
          zh: '用户收到 429 Budget Exhausted。聊天机器人没有提供退款政策答案。',
        },
        memory: {
          shortTerm: [],
          longTerm: [
            {
              en: 'No answer delivered despite 8 drafts',
              zh: '尽管有 8 版草稿，仍未交付答案',
            },
          ],
        },
        nextAction: {
          en: 'STOP (budget exhausted)',
          zh: 'STOP（预算耗尽）',
        },
        annotations: [
          {
            text: {
              en: 'Root cause: no budget guard. Draft v1 was already acceptable; the agent never had to deliver.',
              zh: '根因：没有 Budget Guard。草稿 v1 已可接受；Agent 从未被要求交付。',
            },
            severity: 'error',
          },
        ],
      },
    ],
  },
};

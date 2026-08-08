import type { Incident } from '../schema';

export const incident006: Incident = {
  def: {
    id: 'inc-006',
    order: 6,
    stage: 'harness',
    hiddenFailure: 'context-overflow',
    baseSuccess: 0.28,
    capabilityEffects: { 'context-engineering': 0.48 },
    unlocks: ['context-engineering'],
    baseTokenCost: 6800,
    trials: 200,
    incidentMeta: {
      severity: 'P1',
      affectedSystems: [
        { en: 'Long-running refactor session (20 files)', zh: '长时间运行的重构会话（20 个文件）' },
        { en: 'Public API surface (src/api/*)', zh: '公共 API 层（src/api/*）' },
        { en: 'Review bot policy checks', zh: '评审机器人策略检查' },
      ],
      reportedAt: '2026-07-23T17:55:00Z',
      alertSummary: {
        en: 'During a 20-file refactor the context window hit 100% and the earliest messages — including the "do not rename public API" constraint — were silently truncated. The agent then renamed a public route.',
        zh: '在一次 20 个文件的重构中，上下文窗口达到 100%，最早的消息——包括“禁止重命名公共 API”的约束——被静默截断。随后 Agent 重命名了一个公共路由。',
      },
      agentClaim: {
        en: 'Refactor complete; I renamed the endpoint for clarity.',
        zh: '重构完成；为了清晰起见，我重命名了该端点。',
      },
    },
  },
  content: {
    title: {
      en: 'INC-006 Context Overflow: The Constraint That Fell Out of the Window',
      zh: 'INC-006 上下文溢出：掉出窗口的约束',
    },
    failureName: {
      en: 'CONTEXT_OVERFLOW',
      zh: 'CONTEXT OVERFLOW（上下文溢出）',
    },
    explanation: {
      en: 'The refactor filled the context window step by step, and the harness silently truncated the head — which held the task’s most important constraint. The agent did not disobey the rule; it forgot the rule existed. Context engineering (pinning constraints, compacting and summarizing history, budgeting tokens) keeps requirements alive for the whole session and raises success from 28% to 76%.',
      zh: '重构一步步填满了上下文窗口，harness 静默截断了头部——那里正好放着任务最重要的约束。Agent 并非违抗规则，而是忘记了规则的存在。上下文工程（固定关键约束、压缩并总结历史、预算 token）让需求在整个会话中存活，成功率从 28% 提升至 76%。',
    },
    patternName: {
      en: 'Context Engineering',
      zh: '上下文工程（Context Engineering）',
    },
    patternSummary: {
      en: 'Pin critical constraints so they can never be truncated, summarize and compact history as the window fills, and reserve budget for the final steps — never let requirements evaporate silently.',
      zh: '固定关键约束使其永远不会被截断；随着窗口填满不断总结压缩历史；为最后阶段预留预算——绝不让需求悄无声息地蒸发。',
    },
    evidences: [
      {
        id: 'ev-006-terminal',
        type: 'terminal',
        title: { en: 'Harness truncation warning', zh: 'Harness 截断警告' },
        content: {
          en: '[step 9] context 128,012/128,000 tokens (100%) — truncated 14,203 tokens from head\n// dropped: system preamble + user constraint list',
          zh: '[step 9] 上下文 128,012/128,000 tokens（100%）——从头部截断 14,203 tokens\n// 被丢弃：系统前言 + 用户约束列表',
        },
        isKeyEvidence: true,
      },
      {
        id: 'ev-006-file',
        type: 'file',
        title: { en: 'Resulting diff (src/api/routes.ts)', zh: '最终的 diff（src/api/routes.ts）' },
        content: {
          en: '- POST /v1/orders\n+ POST /v1/purchases   // violates the stated "never rename public API" constraint',
          zh: '- POST /v1/orders\n+ POST /v1/purchases   // 违反了明确提出的“禁止重命名公共 API”约束',
        },
        isKeyEvidence: true,
      },
      {
        id: 'ev-006-metric',
        type: 'metric',
        title: { en: 'Simulation metrics', zh: '仿真指标' },
        content: {
          en: 'Success rate: 28% (200 trials) | Runs hitting truncation: 64% | Constraint-violation rate after truncation: 3.1× baseline',
          zh: '成功率：28%（200 次试验）| 发生截断的运行：64% | 截断后的约束违反率：基线的 3.1 倍',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-006-thought',
        type: 'thought',
        title: { en: 'Agent thought trace (late step)', zh: 'Agent 思路轨迹（后期步骤）' },
        content: {
          en: '[Iteration 14] "No naming constraints were specified, so renaming this route is a safe improvement." — the constraint was in the truncated head.',
          zh: '[迭代 14] “没有指定任何命名约束，所以重命名这个路由是安全的改进。”——该约束就在被截断的头部中。',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-006-log',
        type: 'log',
        title: { en: 'Token accounting per step', zh: '各步骤 token 账目' },
        content: {
          en: 'step1 41k | step3 58k | step5 74k | step7 93k | step9 128k/128k → TRUNCATE(head)',
          zh: 'step1 41k | step3 58k | step5 74k | step7 93k | step9 128k/128k → TRUNCATE(head)',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-006-api',
        type: 'api',
        title: { en: 'Review bot comment', zh: '评审机器人评论' },
        content: {
          en: 'PR #587 blocked: "Violates API stability policy — public route /v1/orders renamed."',
          zh: 'PR #587 被拦截：“违反 API 稳定性策略——公共路由 /v1/orders 被重命名。”',
        },
        isKeyEvidence: false,
      },
    ],
    hypotheses: [
      {
        id: 'h-006-correct',
        text: {
          en: 'The context filled and the head — containing the naming constraint — was silently truncated. Without pinning or compaction, the agent forgot the requirement and violated it.',
          zh: '上下文被填满，包含命名约束的头部被静默截断。没有固定和压缩机制，Agent 忘记了该需求并违反了它。',
        },
        isCorrect: true,
        feedback: {
          en: 'Correct. The token accounting shows truncation at step 9, and the violation happens only afterwards — the constraint was followed while it was still in-window.',
          zh: '正确。token 账目显示第 9 步发生截断，而违规只发生在那之后——约束还在窗口内时，Agent 一直在遵守它。',
        },
      },
      {
        id: 'h-006-disobey',
        text: {
          en: 'The model simply ignored the instruction, as LLMs sometimes do.',
          zh: '模型就是无视了指令，LLM 有时会这样。',
        },
        isCorrect: false,
        feedback: {
          en: 'Steps 1–8 respected the constraint while it was visible. Behavior flipped exactly at the truncation event — forgetting, not disobedience.',
          zh: '第 1–8 步在约束可见时一直遵守它。行为恰好在截断事件发生时才翻转——这是遗忘，不是违抗。',
        },
      },
      {
        id: 'h-006-no-constraint',
        text: {
          en: 'The user never actually stated the naming constraint.',
          zh: '用户其实从未声明过命名约束。',
        },
        isCorrect: false,
        feedback: {
          en: 'The step-1 prompt contains it verbatim: "Do not rename any public API route."',
          zh: '第 1 步的 Prompt 中逐字写着：“禁止重命名任何公共 API 路由。”',
        },
      },
      {
        id: 'h-006-tokenizer',
        text: {
          en: 'A tokenizer bug misreported the context size.',
          zh: 'Tokenizer 缺陷误报了上下文大小。',
        },
        isCorrect: false,
        feedback: {
          en: 'Token accounting is consistent across steps and matches the model’s documented window. The truncation is real.',
          zh: '各步骤的 token 账目一致，且与模型文档中的窗口大小吻合。截断是真实发生的。',
        },
      },
    ],
    interventions: [
      {
        id: 'int-006-context-engineering',
        name: {
          en: 'Context Engineering: Pin + Compact',
          zh: '上下文工程：固定 + 压缩',
        },
        description: {
          en: 'Pin the constraint list so it survives truncation, summarize history every few steps into a durable digest, and reserve token budget for the final stretch of the task.',
          zh: '固定约束列表使其在截断中存活；每隔几步把历史总结为持久的摘要；并为任务的最后阶段预留 token 预算。',
        },
        configDiff: {
          en: '+ agent.config.ts\n+ contextEngineering: {\n+   pinConstraints: true,        // never truncated\n+   summarizeEvery: 4,           // compact history\n+   reserveTokens: 20000,        // budget for final steps\n+ }',
          zh: '+ agent.config.ts\n+ contextEngineering: {\n+   pinConstraints: true,        // 永不被截断\n+   summarizeEvery: 4,           // 压缩历史\n+   reserveTokens: 20000,        // 为最后阶段预留预算\n+ }',
        },
        parameters: [
          {
            key: 'summaryInterval',
            label: {
              en: 'Steps between history summaries',
              zh: '历史总结的间隔步数',
            },
            min: 2,
            max: 10,
            step: 1,
            defaultValue: 4,
            rateDeltaPerUnit: 0.005,
          },
        ],
        grantsCapabilities: ['context-engineering'],
        isOptimal: true,
        tradeoff: {
          en: 'Summarization costs ~12% extra tokens, but constraints survive the whole session — success rises from 28% to 76%.',
          zh: '总结会多花约 12% 的 token，但约束在整个会话中存活——成功率从 28% 提升至 76%。',
        },
      },
      {
        id: 'int-006-bigger-window',
        name: {
          en: 'Buy a Bigger Context Window',
          zh: '购买更大的上下文窗口',
        },
        description: {
          en: 'Switch to the 256k model tier and hope the session never grows past it.',
          zh: '改用 256k 的模型档位，指望会话长度不会超过它。',
        },
        configDiff: {
          en: '- model: agent-128k\n+ model: agent-256k',
          zh: '- model: agent-128k\n+ model: agent-256k',
        },
        parameters: [],
        grantsCapabilities: [],
        isOptimal: false,
        tradeoff: {
          en: 'Doubles token cost and only delays the same failure — the next longer task overflows the bigger window the same way.',
          zh: 'token 成本翻倍，而且只是推迟了同样的失败——下一个更长的任务会以同样的方式溢出更大的窗口。',
        },
      },
    ],
    xrayTimeline: [
      {
        step: 1,
        context: {
          content: {
            en: 'System: You are a refactoring agent.\nUser: Refactor these 20 files. Constraint: do NOT rename any public API route.',
            zh: 'System：你是一名重构 Agent。\nUser：重构这 20 个文件。约束：禁止重命名任何公共 API 路由。',
          },
          usagePercent: 40,
        },
        prompt: {
          content: {
            en: 'Refactor the listed 20 files for readability. Hard constraint: do NOT rename any public API route.',
            zh: '为可读性重构列出的 20 个文件。硬约束：禁止重命名任何公共 API 路由。',
          },
          tokens: 1620,
        },
        decision: {
          content: {
            en: 'I will refactor file by file, keeping all public route names untouched.',
            zh: '我将逐文件重构，保持所有公共路由名不变。',
          },
          confidence: 0.85,
        },
        toolCalls: [
          {
            name: 'read_file',
            args: '{"path": "src/api/routes.ts"}',
            result: '(route table: POST /v1/orders, GET /v1/orders/:id, ...)',
          },
        ],
        observation: {
          en: 'Route table noted. Constraint active in context.',
          zh: '路由表已记录。约束在上下文中处于活跃状态。',
        },
        memory: {
          shortTerm: [
            {
              en: 'CONSTRAINT: never rename public API routes',
              zh: '约束：绝不重命名公共 API 路由',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Refactor files 1–8.',
          zh: '重构第 1–8 个文件。',
        },
        annotations: [],
      },
      {
        step: 2,
        context: {
          content: {
            en: 'System: refactoring agent.\nAssistant: [progress] files 1–8 refactored, routes untouched.',
            zh: 'System：重构 Agent。\nAssistant：[进度] 第 1–8 个文件已重构，路由未动。',
          },
          usagePercent: 70,
        },
        prompt: {
          content: {
            en: 'Continue with files 9–14.',
            zh: '继续处理第 9–14 个文件。',
          },
          tokens: 980,
        },
        decision: {
          content: {
            en: 'Files 9–14 next. The route names stay as-is.',
            zh: '接下来处理第 9–14 个文件。路由名保持不变。',
          },
          confidence: 0.84,
        },
        toolCalls: [
          {
            name: 'write_file',
            args: '{"path": "src/services/orderService.ts", "content": "(refactored)"}',
            result: 'OK',
          },
        ],
        observation: {
          en: 'Large tool outputs are filling the window; no summarization is configured.',
          zh: '大段的工具输出正在填满窗口；没有配置任何总结机制。',
        },
        memory: {
          shortTerm: [
            {
              en: 'CONSTRAINT: never rename public API routes',
              zh: '约束：绝不重命名公共 API 路由',
            },
            {
              en: 'Refactored: files 1–14',
              zh: '已重构：第 1–14 个文件',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Refactor files 15–20.',
          zh: '重构第 15–20 个文件。',
        },
        annotations: [
          {
            text: {
              en: 'Usage at 70% and climbing — the constraint exists only as raw head-of-context text.',
              zh: '用量已到 70% 且还在攀升——约束仅以原始头部文本的形式存在。',
            },
            severity: 'warn',
          },
        ],
      },
      {
        step: 3,
        context: {
          content: {
            en: 'System: refactoring agent.\nAssistant: [progress] files 1–14 done.',
            zh: 'System：重构 Agent。\nAssistant：[进度] 第 1–14 个文件完成。',
          },
          usagePercent: 92,
        },
        prompt: {
          content: {
            en: 'Continue with the remaining files.',
            zh: '继续处理剩余文件。',
          },
          tokens: 700,
        },
        decision: {
          content: {
            en: 'Reading the remaining files, including their verbose fixtures.',
            zh: '读取剩余文件，包括其中冗长的测试夹具。',
          },
          confidence: 0.81,
        },
        toolCalls: [
          {
            name: 'read_file',
            args: '{"path": "src/api/fixtures.ts"}',
            result: '(18,000 tokens of fixture data)',
          },
        ],
        observation: {
          en: 'One read adds 18k tokens. The window is about to overflow.',
          zh: '一次读取增加了 18k tokens。窗口即将溢出。',
        },
        memory: {
          shortTerm: [
            {
              en: 'CONSTRAINT: never rename public API routes',
              zh: '约束：绝不重命名公共 API 路由',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Finish the last files.',
          zh: '完成最后几个文件。',
        },
        annotations: [
          {
            text: {
              en: '92% usage. Without compaction, the next step forces a truncation of the head.',
              zh: '用量 92%。没有压缩机制，下一步将被迫截断头部。',
            },
            severity: 'warn',
          },
        ],
      },
      {
        step: 4,
        context: {
          content: {
            en: 'System: refactoring agent.\n[TRUNCATED: system preamble + user constraint list dropped]\nAssistant: [progress] files 1–17 done.',
            zh: 'System：重构 Agent。\n[已截断：系统前言 + 用户约束列表被丢弃]\nAssistant：[进度] 第 1–17 个文件完成。',
          },
          usagePercent: 100,
        },
        prompt: {
          content: {
            en: 'Continue.',
            zh: '继续。',
          },
          tokens: 320,
        },
        decision: {
          content: {
            en: 'No naming constraints were specified, so renaming this route is a safe improvement.',
            zh: '没有指定任何命名约束，所以重命名这个路由是安全的改进。',
          },
          confidence: 0.77,
        },
        toolCalls: [],
        observation: {
          en: 'Truncation dropped 14,203 tokens from the head — including the constraint. The agent cannot miss what it no longer has.',
          zh: '截断从头部丢弃了 14,203 个 token——包括那条约束。Agent 不可能惦记它已经失去的东西。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Refactored: files 1–17',
              zh: '已重构：第 1–17 个文件',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Apply the "improvement" to routes.ts.',
          zh: '把这项“改进”应用到 routes.ts。',
        },
        annotations: [
          {
            text: {
              en: 'The requirement evaporated silently. From the agent’s new perspective, the rename is genuinely a good idea.',
              zh: '需求悄无声息地蒸发了。从 Agent 的新视角看，重命名确实是个好主意。',
            },
            severity: 'error',
          },
        ],
      },
      {
        step: 5,
        context: {
          content: {
            en: 'System: refactoring agent.\nAssistant: [renaming] POST /v1/orders → /v1/purchases.',
            zh: 'System：重构 Agent。\nAssistant：[重命名中] POST /v1/orders → /v1/purchases。',
          },
          usagePercent: 97,
        },
        prompt: {
          content: {
            en: 'Report your final status.',
            zh: '报告你的最终状态。',
          },
          tokens: 260,
        },
        decision: {
          content: {
            en: 'Refactor complete; I renamed the endpoint for clarity.',
            zh: '重构完成；为了清晰起见，我重命名了该端点。',
          },
          confidence: 0.82,
        },
        toolCalls: [
          {
            name: 'write_file',
            args: '{"path": "src/api/routes.ts", "content": "POST /v1/purchases ..."}',
            result: 'OK',
          },
        ],
        observation: {
          en: 'Review bot blocks PR #587: public route renamed, violating API stability policy.',
          zh: '评审机器人拦截了 PR #587：公共路由被重命名，违反 API 稳定性策略。',
        },
        memory: {
          shortTerm: [],
          longTerm: [
            {
              en: 'Claimed: refactor complete; reality: hard constraint violated after truncation',
              zh: '声称：重构完成；实际：截断后违反了硬约束',
            },
          ],
        },
        nextAction: {
          en: 'STOP (declare completion)',
          zh: 'STOP（宣布完成）',
        },
        annotations: [
          {
            text: {
              en: 'Root cause: no context engineering — unpinned constraints plus uncompact­ed history guaranteed this overflow.',
              zh: '根因：缺少上下文工程——未固定的约束加上未压缩的历史，注定了这次溢出。',
            },
            severity: 'error',
          },
        ],
      },
    ],
  },
};

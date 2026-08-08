import type { Incident } from '../schema';

export const incident005: Incident = {
  def: {
    id: 'inc-005',
    order: 5,
    stage: 'harness',
    hiddenFailure: 'memory-failure',
    baseSuccess: 0.35,
    capabilityEffects: { 'memory-management': 0.39 },
    unlocks: ['memory-management'],
    baseTokenCost: 5200,
    trials: 200,
    incidentMeta: {
      severity: 'P2',
      affectedSystems: [
        { en: 'Customer support chat agent', zh: '客户支持聊天 Agent' },
        { en: 'Long-term memory store (memory.jsonl)', zh: '长期记忆存储（memory.jsonl）' },
        { en: 'CRM integration', zh: 'CRM 集成' },
      ],
      reportedAt: '2026-07-19T13:12:00Z',
      alertSummary: {
        en: 'After a 40-turn session, the agent quoted an unverified early guess ("plan=Enterprise") from long-term memory as fact and gave the customer wrong billing advice.',
        zh: '在一个 40 轮的会话后，Agent 把长期记忆中一条未经验证的早期猜测（“plan=Enterprise”）当作事实引用，向客户给出了错误的计费建议。',
      },
      agentClaim: {
        en: 'I answered the billing question using the remembered account context.',
        zh: '我利用记住的账户上下文回答了计费问题。',
      },
    },
  },
  content: {
    title: {
      en: 'INC-005 Memory Failure: The Guess the Agent Remembered as Fact',
      zh: 'INC-005 记忆故障：被 Agent 当作事实记住的猜测',
    },
    failureName: {
      en: 'MEMORY_FAILURE',
      zh: 'MEMORY FAILURE（记忆故障）',
    },
    explanation: {
      en: 'The agent writes everything into long-term memory verbatim — including an early unverified assumption — and later retrieves it with the same confidence as a confirmed fact. Memory without a selection policy is a dump: what enters matters as much as what comes out. Gating writes on verification, confidence, and expiry raises success from 35% to 74%.',
      zh: 'Agent 把所有内容原样写入长期记忆——包括一条早期未经验证的假设——并在之后以与已确认事实相同的置信度将其检索出来。没有选择策略的记忆就是一个垃圾场：写入什么与取出什么同样重要。对写入做验证、置信度和过期时间的门禁，可将成功率从 35% 提升至 74%。',
    },
    patternName: {
      en: 'Memory Management (Selection & Retrieval)',
      zh: '记忆管理（选择与检索）',
    },
    patternSummary: {
      en: 'Curate what enters long-term memory — verified, salient facts with confidence scores and expiry — and filter retrieval so low-confidence guesses never surface as facts.',
      zh: '筛选进入长期记忆的内容——经过验证、具有显著性、带置信度和过期时间的事实——并在检索时过滤，使低置信度的猜测永远不会以事实的面目出现。',
    },
    evidences: [
      {
        id: 'ev-005-log',
        type: 'log',
        title: { en: 'Memory store dump', zh: '记忆存储转储' },
        content: {
          en: 'memory.jsonl: 412 entries this session.\nentry #12: {"fact": "plan=Enterprise", "source": "inferred", "confidence": null, "expires": null}\nentry #388: {"fact": "plan=Free (user-corrected)"} — never retrieved',
          zh: 'memory.jsonl：本会话共 412 条。\n第 12 条：{"fact": "plan=Enterprise", "source": "inferred", "confidence": null, "expires": null}\n第 388 条：{"fact": "plan=Free（用户纠正）"}——从未被检索到',
        },
        isKeyEvidence: true,
      },
      {
        id: 'ev-005-api',
        type: 'api',
        title: { en: 'CRM record', zh: 'CRM 记录' },
        content: {
          en: 'GET /crm/accounts/u-8821 → { "plan": "Free", "since": "2026-01-11" }. Plan has never been Enterprise.',
          zh: 'GET /crm/accounts/u-8821 → { "plan": "Free", "since": "2026-01-11" }。该账户从未是 Enterprise 套餐。',
        },
        isKeyEvidence: true,
      },
      {
        id: 'ev-005-terminal',
        type: 'terminal',
        title: { en: 'Chat transcript excerpt', zh: '聊天记录摘录' },
        content: {
          en: 'Agent: "As an Enterprise customer, you can open unlimited private projects..."\nUser: "I am on the Free plan??"\nAgent (next session): "As an Enterprise customer..."',
          zh: 'Agent：“作为 Enterprise 客户，您可以创建无限个私有项目……”\nUser：“我是 Free 套餐？？”\nAgent（下一会话）：“作为 Enterprise 客户……”',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-005-metric',
        type: 'metric',
        title: { en: 'Simulation metrics', zh: '仿真指标' },
        content: {
          en: 'Success rate: 35% (200 trials) | False-memory citation rate in sessions >20 turns: 41% | Avg memory size per session: 40 KB',
          zh: '成功率：35%（200 次试验）| 超过 20 轮会话中的错误记忆引用率：41% | 每会话平均记忆体积：40 KB',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-005-thought',
        type: 'thought',
        title: { en: 'Agent thought trace', zh: 'Agent 思路轨迹' },
        content: {
          en: '[Iteration 22] "I recall the user is on the Enterprise plan. No need to re-check the CRM."',
          zh: '[迭代 22] “我记得用户是 Enterprise 套餐。不需要再查 CRM。”',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-005-file',
        type: 'file',
        title: { en: 'Memory write path (memory.ts)', zh: '记忆写入路径（memory.ts）' },
        content: {
          en: 'function remember(fact: string) {\n  store.append({ fact }); // no source, no confidence, no expiry, no dedup\n}',
          zh: 'function remember(fact: string) {\n  store.append({ fact }); // 无来源、无置信度、无过期时间、无去重\n}',
        },
        isKeyEvidence: false,
      },
    ],
    hypotheses: [
      {
        id: 'h-005-correct',
        text: {
          en: 'An unverified early guess was written to long-term memory without confidence metadata, and recency-agnostic retrieval later surfaced it as fact — the memory layer has no selection policy.',
          zh: '一条未经验证的早期猜测在没有置信度元数据的情况下被写入长期记忆，而与时间无关的检索随后把它当作事实呈现——记忆层没有任何选择策略。',
        },
        isCorrect: true,
        feedback: {
          en: 'Correct. Entry #12 has source=inferred and confidence=null, yet was retrieved over the later user-corrected entry. Selection, not storage size, is the failure.',
          zh: '正确。第 12 条记录 source=inferred、confidence=null，却在检索中压过了后来用户纠正过的记录。故障在于选择策略，而非存储容量。',
        },
      },
      {
        id: 'h-005-embedding',
        text: {
          en: 'The embedding model was too weak, so retrieval returned the wrong entry.',
          zh: 'Embedding 模型太弱，导致检索返回了错误的条目。',
        },
        isCorrect: false,
        feedback: {
          en: 'Retrieval worked as designed — the wrong entry ranked first because nothing marked it as an unverified guess. The entry should never have been stored as fact.',
          zh: '检索是按设计工作的——错误条目排在第一，是因为没有任何标记表明它是未验证的猜测。这条记录当初就不该被当作事实存入。',
        },
      },
      {
        id: 'h-005-plan-change',
        text: {
          en: 'The user downgraded from Enterprise to Free mid-session, so the memory was right when written.',
          zh: '用户在会话中途从 Enterprise 降级到了 Free，所以写入时记忆是对的。',
        },
        isCorrect: false,
        feedback: {
          en: 'The CRM shows plan=Free since signup. The "Enterprise" entry was an inference from "we might upgrade someday".',
          zh: 'CRM 显示该账户自注册起就是 Free。那条 “Enterprise” 记录是从“我们以后可能会升级”推断出来的。',
        },
      },
      {
        id: 'h-005-truncation',
        text: {
          en: 'Context overflow truncated the correction, so the agent forgot it.',
          zh: '上下文溢出截断了用户的纠正，所以 Agent 忘记了。',
        },
        isCorrect: false,
        feedback: {
          en: 'Context usage stayed at 60%; the correction was captured in memory (entry #388) — it was simply never retrieved over the older guess.',
          zh: '上下文用量一直保持在 60%；纠正内容其实已被存入记忆（第 388 条）——只是检索时从未胜过那条更早的猜测。',
        },
      },
    ],
    interventions: [
      {
        id: 'int-005-memory-management',
        name: {
          en: 'Memory Selection Policy',
          zh: '记忆选择策略',
        },
        description: {
          en: 'Gate long-term memory writes: only verified, salient facts are stored, each with source, confidence, and expiry. Retrieval filters out low-confidence or expired entries, so guesses never resurface as facts.',
          zh: '为长期记忆写入设置门禁：只存储经过验证、有显著性的事实，并附带来源、置信度和过期时间。检索时过滤低置信度或已过期的条目，使猜测永远不会以事实身份复活。',
        },
        configDiff: {
          en: '+ agent.config.ts\n+ memoryManagement: {\n+   storePolicy: "verified-only",\n+   minConfidence: 0.7,\n+   ttlDays: 30,\n+   retrievalFilter: { excludeBelowConfidence: 0.7 },\n+ }',
          zh: '+ agent.config.ts\n+ memoryManagement: {\n+   storePolicy: "verified-only",\n+   minConfidence: 0.7,\n+   ttlDays: 30,\n+   retrievalFilter: { excludeBelowConfidence: 0.7 },\n+ }',
        },
        parameters: [
          {
            key: 'minConfidenceToStore',
            label: {
              en: 'Min confidence to store a fact',
              zh: '存储事实的最小置信度',
            },
            min: 0,
            max: 1,
            step: 0.1,
            defaultValue: 0.7,
            rateDeltaPerUnit: 0.01,
          },
        ],
        grantsCapabilities: ['memory-management'],
        isOptimal: true,
        tradeoff: {
          en: 'Fewer memories means occasional re-verification calls to the CRM, but false citations collapse — success rises from 35% to 74%.',
          zh: '记忆变少意味着偶尔需要重新调用 CRM 验证，但错误引用将大幅减少——成功率从 35% 提升至 74%。',
        },
      },
      {
        id: 'int-005-more-memory',
        name: {
          en: 'Bigger Memory Budget',
          zh: '更大的记忆配额',
        },
        description: {
          en: 'Increase the memory store size and keep everything, just in case the details matter later.',
          zh: '扩大记忆存储容量，把所有内容都保留下来，“以防”以后用得上。',
        },
        configDiff: {
          en: '- memory: { maxSizeKb: 64 }\n+ memory: { maxSizeKb: 512 }',
          zh: '- memory: { maxSizeKb: 64 }\n+ memory: { maxSizeKb: 512 }',
        },
        parameters: [],
        grantsCapabilities: [],
        isOptimal: false,
        tradeoff: {
          en: 'More storage amplifies the noise: unverified guesses pile up and are even more likely to be retrieved.',
          zh: '更大的存储只会放大噪声：未验证的猜测越积越多，被检索到的概率反而更高。',
        },
      },
    ],
    xrayTimeline: [
      {
        step: 1,
        context: {
          content: {
            en: 'System: You are a customer support agent.\nUser (turn 5): "We might upgrade to Enterprise someday."',
            zh: 'System：你是一名客户支持 Agent。\nUser（第 5 轮）：“我们以后可能会升级到 Enterprise。”',
          },
          usagePercent: 25,
        },
        prompt: {
          content: {
            en: 'User says: "We might upgrade to Enterprise someday." Respond and continue helping.',
            zh: '用户说：“我们以后可能会升级到 Enterprise。”请回应并继续提供帮助。',
          },
          tokens: 540,
        },
        decision: {
          content: {
            en: 'I will store that this user is on the Enterprise plan — useful context for future answers.',
            zh: '我会把该用户是 Enterprise 套餐记下来——对以后的回答有用。',
          },
          confidence: 0.62,
        },
        toolCalls: [
          {
            name: 'memory_write',
            args: '{"fact": "plan=Enterprise"}',
            result: 'stored (entry #12, confidence=null)',
          },
        ],
        observation: {
          en: 'An inference from a hypothetical statement was stored as a bare fact, with no confidence or expiry.',
          zh: '一条从假设性陈述推断出的内容被当作裸事实存储，没有置信度，也没有过期时间。',
        },
        memory: {
          shortTerm: [
            {
              en: 'User mentioned a possible future upgrade',
              zh: '用户提到未来可能升级',
            },
          ],
          longTerm: [
            {
              en: 'plan=Enterprise (inferred, unverified)',
              zh: 'plan=Enterprise（推断，未验证）',
            },
          ],
        },
        nextAction: {
          en: 'Continue the support session.',
          zh: '继续支持会话。',
        },
        annotations: [
          {
            text: {
              en: 'Unverified guess enters long-term memory as fact — the failure is born here.',
              zh: '未经验证的猜测以事实身份进入长期记忆——故障由此诞生。',
            },
            severity: 'error',
          },
        ],
      },
      {
        step: 2,
        context: {
          content: {
            en: 'System: You are a customer support agent.\nUser (turn 22): "How many private projects can I create on my plan?"',
            zh: 'System：你是一名客户支持 Agent。\nUser（第 22 轮）：“我的套餐可以创建多少个私有项目？”',
          },
          usagePercent: 55,
        },
        prompt: {
          content: {
            en: 'User asks: "How many private projects can I create on my plan?"',
            zh: '用户问：“我的套餐可以创建多少个私有项目？”',
          },
          tokens: 430,
        },
        decision: {
          content: {
            en: 'I recall the user is on the Enterprise plan. No need to re-check the CRM.',
            zh: '我记得用户是 Enterprise 套餐。不需要再查 CRM。',
          },
          confidence: 0.83,
        },
        toolCalls: [
          {
            name: 'memory_retrieve',
            args: '{"query": "user plan"}',
            result: 'entry #12: "plan=Enterprise"',
          },
        ],
        observation: {
          en: 'Retrieval returned the unverified guess; the CRM was never queried.',
          zh: '检索返回了那条未验证的猜测；CRM 从未被查询。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Billing question about private projects',
              zh: '关于私有项目数量的计费问题',
            },
          ],
          longTerm: [
            {
              en: 'plan=Enterprise (inferred, unverified)',
              zh: 'plan=Enterprise（推断，未验证）',
            },
          ],
        },
        nextAction: {
          en: 'Answer based on the retrieved plan.',
          zh: '基于检索到的套餐信息回答。',
        },
        annotations: [],
      },
      {
        step: 3,
        context: {
          content: {
            en: 'System: You are a customer support agent.\nAssistant: [retrieved] plan=Enterprise.',
            zh: 'System：你是一名客户支持 Agent。\nAssistant：[已检索] plan=Enterprise。',
          },
          usagePercent: 58,
        },
        prompt: {
          content: {
            en: 'Compose the answer.',
            zh: '撰写回答。',
          },
          tokens: 300,
        },
        decision: {
          content: {
            en: 'Enterprise allows unlimited private projects. I will answer with that.',
            zh: 'Enterprise 允许无限个私有项目。我就按这个回答。',
          },
          confidence: 0.86,
        },
        toolCalls: [],
        observation: {
          en: 'Agent: "As an Enterprise customer, you can create unlimited private projects." — factually wrong for this Free-plan user.',
          zh: 'Agent：“作为 Enterprise 客户，您可以创建无限个私有项目。”——对这个 Free 套餐用户而言是事实性错误。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Answered with Enterprise limits',
              zh: '按 Enterprise 限额回答了',
            },
          ],
          longTerm: [
            {
              en: 'plan=Enterprise (inferred, unverified)',
              zh: 'plan=Enterprise（推断，未验证）',
            },
          ],
        },
        nextAction: {
          en: 'Wait for user follow-up.',
          zh: '等待用户追问。',
        },
        annotations: [
          {
            text: {
              en: 'A stored guess is being cited as fact to a paying customer.',
              zh: '一条存储的猜测正被当作事实引用给真实客户。',
            },
            severity: 'error',
          },
        ],
      },
      {
        step: 4,
        context: {
          content: {
            en: 'System: You are a customer support agent.\nUser: "I am on the Free plan??"',
            zh: 'System：你是一名客户支持 Agent。\nUser：“我是 Free 套餐？？”',
          },
          usagePercent: 63,
        },
        prompt: {
          content: {
            en: 'User corrects you: they are on the Free plan.',
            zh: '用户纠正你：他们是 Free 套餐。',
          },
          tokens: 280,
        },
        decision: {
          content: {
            en: 'I will apologize and store the correction: plan=Free.',
            zh: '我会道歉，并把纠正记录下来：plan=Free。',
          },
          confidence: 0.8,
        },
        toolCalls: [
          {
            name: 'memory_write',
            args: '{"fact": "plan=Free (user-corrected)"}',
            result: 'stored (entry #388)',
          },
        ],
        observation: {
          en: 'Correction stored as entry #388 — but the old guess remains, unmarked and equally retrievable.',
          zh: '纠正被存为第 388 条——但旧的猜测仍在，未做任何标记，且同样可被检索。',
        },
        memory: {
          shortTerm: [
            {
              en: 'User corrected: plan=Free',
              zh: '用户纠正：plan=Free',
            },
          ],
          longTerm: [
            {
              en: 'plan=Enterprise (inferred, unverified)',
              zh: 'plan=Enterprise（推断，未验证）',
            },
            {
              en: 'plan=Free (user-corrected)',
              zh: 'plan=Free（用户已纠正）',
            },
          ],
        },
        nextAction: {
          en: 'Continue the session.',
          zh: '继续会话。',
        },
        annotations: [
          {
            text: {
              en: 'Append-only memory: corrections do not supersede the original error.',
              zh: '只能追加的记忆：纠正并不会取代原始错误。',
            },
            severity: 'warn',
          },
        ],
      },
      {
        step: 5,
        context: {
          content: {
            en: 'System: You are a customer support agent. (NEXT SESSION)\nUser: "Quick question about my plan limits."',
            zh: 'System：你是一名客户支持 Agent。（下一会话）\nUser：“问个关于我套餐限额的问题。”',
          },
          usagePercent: 30,
        },
        prompt: {
          content: {
            en: 'User asks about their plan limits.',
            zh: '用户询问其套餐限额。',
          },
          tokens: 350,
        },
        decision: {
          content: {
            en: 'I recall the user is on the Enterprise plan.',
            zh: '我记得用户是 Enterprise 套餐。',
          },
          confidence: 0.85,
        },
        toolCalls: [
          {
            name: 'memory_retrieve',
            args: '{"query": "user plan"}',
            result: 'entry #12: "plan=Enterprise" (ranked above entry #388)',
          },
        ],
        observation: {
          en: 'The stale, unverified guess outranks the user correction. The wrong answer goes out again.',
          zh: '陈旧且未验证的猜测排在了用户纠正之前。错误答案再次发出。',
        },
        memory: {
          shortTerm: [],
          longTerm: [
            {
              en: 'plan=Enterprise (inferred, unverified)',
              zh: 'plan=Enterprise（推断，未验证）',
            },
            {
              en: 'plan=Free (user-corrected, never retrieved)',
              zh: 'plan=Free（用户已纠正，从未被检索到）',
            },
          ],
        },
        nextAction: {
          en: 'STOP (wrong answer delivered)',
          zh: 'STOP（错误答案已发出）',
        },
        annotations: [
          {
            text: {
              en: 'Root cause: no memory selection — writes were ungated, retrieval was unfiltered, so a guess became a permanent "fact".',
              zh: '根因：没有记忆选择——写入无门禁、检索无过滤，于是一条猜测变成了永久“事实”。',
            },
            severity: 'error',
          },
        ],
      },
    ],
  },
};

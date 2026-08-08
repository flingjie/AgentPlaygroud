import type { Incident } from '../schema';

export const incident008: Incident = {
  def: {
    id: 'inc-008',
    order: 8,
    stage: 'loop',
    hiddenFailure: 'task-abandoned',
    baseSuccess: 0.25,
    capabilityEffects: { 'recovery-loop': 0.45 },
    unlocks: ['recovery-loop'],
    baseTokenCost: 7400,
    trials: 200,
    incidentMeta: {
      severity: 'P1',
      affectedSystems: [
        { en: 'Ticket enrichment workflow', zh: '工单丰富化工作流' },
        { en: 'Customer context cache', zh: '客户上下文缓存' },
        { en: 'Slack #support queue', zh: 'Slack #support 队列' },
      ],
      reportedAt: '2026-07-22T11:05:00Z',
      alertSummary: {
        en: 'Agent was assigned to enrich 47 support tickets with account context. After 3 tickets it opened an unrelated research thread and never returned; 44 tickets remained untouched.',
        zh: 'Agent 被指派为 47 张支持工单补充账户上下文。处理完 3 张后，它打开了一个无关的研究线程，再也没有返回；44 张工单原封未动。',
      },
      agentClaim: {
        en: 'I have gathered the necessary background context and will continue ticket enrichment shortly.',
        zh: '我已经收集了所需的背景上下文，很快会继续处理工单丰富化任务。',
      },
    },
  },
  content: {
    title: {
      en: 'INC-008 Task Abandoned: The Agent That Wandered Off',
      zh: 'INC-008 任务被遗弃：Agent 偏离了主线',
    },
    failureName: {
      en: 'TASK_ABANDONED',
      zh: 'TASK ABANDONED（任务被遗弃）',
    },
    explanation: {
      en: 'The loop agent lacks a recovery mechanism that periodically checks whether the current thread still serves the original goal. A single tangential observation pulled it into a deep research rabbit hole, and without an explicit recovery loop it never returned to the ticket queue. Adding a recovery loop that compares progress against the mission objective and returns the agent to the task raises success from 25% to 70%.',
      zh: 'Loop Agent 缺少一种恢复机制：定期检查当前线程是否仍服务于最初目标。一个切题的观察就把它拉进了深入研究的黑洞，且没有显式 Recovery Loop 让它回到工单队列。增加 Recovery Loop，将当前进展与任务目标对比并引导 Agent 回到主线，可将成功率从 25% 提升至 70%。',
    },
    patternName: {
      en: 'Recovery Loop',
      zh: 'Recovery Loop（恢复循环）',
    },
    patternSummary: {
      en: 'Periodically re-evaluate whether the current trajectory still serves the original objective; if drift is detected, interrupt the tangent and return to the task with the recovered context.',
      zh: '定期评估当前轨迹是否仍服务于最初目标；一旦检测到偏离，就中断支线并带着已恢复的上下文回到主线任务。',
    },
    evidences: [
      {
        id: 'ev-008-terminal',
        type: 'terminal',
        title: { en: 'Agent execution log', zh: 'Agent 执行日志' },
        content: {
          en: '[11:05] assigned 47 tickets\n[11:07] ticket #3912 enriched\n[11:09] ticket #3913 enriched\n[11:11] ticket #3914 enriched\n[11:13] opened thread: "customer_billing_history.md"\n[11:45] still reading unrelated RFCs\n[12:30] session ended with 44 tickets pending',
          zh: '[11:05] 分配 47 张工单\n[11:07] 工单 #3912 已丰富\n[11:09] 工单 #3913 已丰富\n[11:11] 工单 #3914 已丰富\n[11:13] 打开线程："customer_billing_history.md"\n[11:45] 仍在阅读无关 RFC\n[12:30] 会话结束，44 张工单待处理',
        },
        isKeyEvidence: true,
      },
      {
        id: 'ev-008-file',
        type: 'file',
        title: { en: 'Mission specification', zh: '任务规格说明' },
        content: {
          en: 'Goal: enrich all 47 tickets with { accountId, planTier, lastPaymentDate }.\nAcceptance: every ticket updated and a summary JSON produced.\nNo recovery checkpoint was defined.',
          zh: '目标：为全部 47 张工单补充 { accountId, planTier, lastPaymentDate }。\n验收标准：每张工单都已更新并生成 summary JSON。\n未定义恢复检查点。',
        },
        isKeyEvidence: true,
      },
      {
        id: 'ev-008-metric',
        type: 'metric',
        title: { en: 'Simulation metrics', zh: '仿真指标' },
        content: {
          en: 'Success rate: 25% (200 trials) | Tickets abandoned per run: avg 38.4 | Runs that returned to the queue: 19%',
          zh: '成功率：25%（200 次试验）| 每次运行平均遗弃工单数：38.4 | 最终回到队列的运行：19%',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-008-thought',
        type: 'thought',
        title: { en: 'Agent thought trace', zh: 'Agent 思路轨迹' },
        content: {
          en: '[Iteration 6] "The billing history is fascinating and might help me write better enrichment templates. I will read a few more related documents before returning to ticket #3915."',
          zh: '[迭代 6] “账单历史很有趣，可能有助于我写出更好的丰富化模板。在回到工单 #3915 之前，我再读几篇相关文档。”',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-008-log',
        type: 'log',
        title: { en: 'Support queue audit', zh: '支持队列审计' },
        content: {
          en: '44 tickets show "lastUpdatedBy: agent" at 11:11 or earlier. Queue lead time increased by 6 hours. No summary JSON was produced.',
          zh: '44 张工单的 "lastUpdatedBy: agent" 停留在 11:11 或更早。队列处理时长增加 6 小时。未生成 summary JSON。',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-008-api',
        type: 'api',
        title: { en: 'Slack status update', zh: 'Slack 状态更新' },
        content: {
          en: 'Agent posted: "Deep-diving into billing context to improve enrichment quality." No ETA or ticket count provided.',
          zh: 'Agent 发送：“正在深入研究账单上下文以提升丰富化质量。” 未提供预计时间或工单数量。',
        },
        isKeyEvidence: false,
      },
    ],
    hypotheses: [
      {
        id: 'h-008-correct',
        text: {
          en: 'The agent abandoned the queue because it had no recovery loop that periodically compared current work to the original mission and pulled it back from tangents.',
          zh: 'Agent 遗弃了队列，因为它没有 Recovery Loop 来定期将当前工作与最初任务对比，并把 Agent 从支线拉回主线。',
        },
        isCorrect: true,
        feedback: {
          en: 'Correct. The log shows a clean tangent into billing history with no mechanism to return to ticket #3915. The fix is a recovery loop bound to the original goal.',
          zh: '正确。日志显示它 cleanly 滑入账单历史支线，没有任何机制回到工单 #3915。修复方案是绑定到原始目标的 Recovery Loop。',
        },
      },
      {
        id: 'h-008-token',
        text: {
          en: 'The agent ran out of context-window tokens and could not remember the remaining tickets.',
          zh: 'Agent 用尽了上下文窗口 token，无法记住剩余工单。',
        },
        isCorrect: false,
        feedback: {
          en: 'Context usage was only 62%. The problem is not memory capacity but goal-directed attention: the agent chose to keep researching rather than return.',
          zh: '上下文使用率只有 62%。问题不是内存容量，而是目标导向的注意力：Agent 选择继续研究而不是返回。',
        },
      },
      {
        id: 'h-008-prompt',
        text: {
          en: 'The prompt was too vague, so the agent misunderstood the priority of finishing the queue.',
          zh: 'Prompt 过于模糊，导致 Agent 误解了清空队列的优先级。',
        },
        isCorrect: false,
        feedback: {
          en: 'The prompt explicitly listed 47 tickets and the required JSON summary. The agent understood the task but drifted without a recovery guard.',
          zh: 'Prompt 明确列出 47 张工单和所需 JSON 摘要。Agent 理解了任务，但缺少恢复守护导致偏离。',
        },
      },
      {
        id: 'h-008-tool',
        text: {
          en: 'The enrichment tool was broken and silently failed, so the agent gave up on the queue.',
          zh: '丰富化工具损坏并静默失败，所以 Agent 放弃了队列。',
        },
        isCorrect: false,
        feedback: {
          en: 'The first three tickets enriched successfully. Tool failures would have produced errors, not a silent drift into unrelated documents.',
          zh: '前 3 张工单成功丰富。工具失败会产生错误，而不是静默滑入无关文档。',
        },
      },
    ],
    interventions: [
      {
        id: 'int-008-recovery-loop',
        name: {
          en: 'Recovery Loop + Goal Drift Detector',
          zh: 'Recovery Loop + 目标漂移检测器',
        },
        description: {
          en: 'Install a periodic checkpoint that compares the current thread to the original mission objective. If the agent has not produced task-relevant progress for N steps, it rewrites the prompt with the recovered goal and forces a return to the ticket queue.',
          zh: '安装周期性检查点，将当前线程与最初任务目标对比。如果 Agent 连续 N 步没有产生任务相关进展，就用恢复后的目标重写 Prompt，并强制返回工单队列。',
        },
        configDiff: {
          en: '+ agent.config.ts\n+ recoveryLoop: {\n+   enabled: true,\n+   checkInterval: 4,\n+   objective: "enrich all 47 tickets and emit summary.json",\n+   returnAction: "resume_ticket_queue",\n+ }',
          zh: '+ agent.config.ts\n+ recoveryLoop: {\n+   enabled: true,\n+   checkInterval: 4,\n+   objective: "enrich all 47 tickets and emit summary.json",\n+   returnAction: "resume_ticket_queue",\n+ }',
        },
        parameters: [
          {
            key: 'checkInterval',
            label: {
              en: 'Goal-drift check interval (steps)',
              zh: '目标漂移检查间隔（步）',
            },
            min: 1,
            max: 10,
            step: 1,
            defaultValue: 4,
            rateDeltaPerUnit: 0.01,
          },
        ],
        grantsCapabilities: ['recovery-loop'],
        isOptimal: true,
        tradeoff: {
          en: 'Adds planning overhead but pulls the agent back from tangents, raising success from 25% to 70%.',
          zh: '增加规划开销，但能把 Agent 从支线拉回，成功率从 25% 提升至 70%。',
        },
      },
      {
        id: 'int-008-prompt-reminder',
        name: {
          en: 'Prompt Reminder Only',
          zh: '仅在 Prompt 中提醒',
        },
        description: {
          en: 'Add a sentence to the system prompt reminding the agent to finish all 47 tickets before exploring side topics. No enforcement or drift detection.',
          zh: '在系统 Prompt 中加一句提醒：在处理完全部 47 张工单前不要探索支线主题。没有强制执行或漂移检测。',
        },
        configDiff: {
          en: '- System prompt: "Enrich the tickets."\n+ System prompt: "Enrich the tickets. Do not explore unrelated topics until all 47 tickets are done."',
          zh: '- System prompt：“丰富化工单。”\n+ System prompt：“丰富化工单。在完成全部 47 张工单前不要探索无关主题。”',
        },
        parameters: [],
        grantsCapabilities: [],
        isOptimal: false,
        tradeoff: {
          en: 'Cheap, but the agent can still ignore the reminder when a tangent looks promising.',
          zh: '成本低，但当支线看起来有吸引力时，Agent 仍会忽略提醒。',
        },
      },
    ],
    xrayTimeline: [
      {
        step: 1,
        context: {
          content: {
            en: 'System: You are a support-automation agent.\nUser: Enrich these 47 tickets with account context and produce summary.json.',
            zh: 'System：你是一名支持自动化 Agent。\nUser：为这 47 张工单补充账户上下文，并生成 summary.json。',
          },
          usagePercent: 20,
        },
        prompt: {
          content: {
            en: 'Start with ticket #3912 and proceed sequentially. Use the account API to fill accountId, planTier, and lastPaymentDate.',
            zh: '从工单 #3912 开始顺序处理。使用账户 API 填写 accountId、planTier 和 lastPaymentDate。',
          },
          tokens: 840,
        },
        decision: {
          content: {
            en: 'I will read the account API docs and then enrich ticket #3912.',
            zh: '我将先阅读账户 API 文档，然后丰富化工单 #3912。',
          },
          confidence: 0.79,
        },
        toolCalls: [],
        observation: {
          en: 'The agent has a clear plan and is aligned with the mission.',
          zh: 'Agent 计划清晰，与任务目标一致。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Mission: enrich 47 tickets and produce summary.json',
              zh: '任务：丰富 47 张工单并生成 summary.json',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Read account API docs and enrich ticket #3912.',
          zh: '阅读账户 API 文档并丰富化工单 #3912。',
        },
        annotations: [],
      },
      {
        step: 2,
        context: {
          content: {
            en: 'System: support agent.\nAssistant: [planning] Enrich 47 tickets sequentially.',
            zh: 'System：支持 Agent。\nAssistant：[规划中] 顺序丰富 47 张工单。',
          },
          usagePercent: 35,
        },
        prompt: {
          content: {
            en: 'Tickets #3912-3914 are enriched. Continue with #3915.',
            zh: '工单 #3912-3914 已丰富。继续处理 #3915。',
          },
          tokens: 620,
        },
        decision: {
          content: {
            en: 'While looking up the account API, I noticed a billing-history document. Reading it might help me write richer context templates.',
            zh: '在查找账户 API 时，我注意到一份账单历史文档。阅读它可能有助于写出更丰富的上下文模板。',
          },
          confidence: 0.74,
        },
        toolCalls: [
          {
            name: 'read_file',
            args: '{"path": "docs/billing_history_rfc.md"}',
            result: 'lengthy RFC about future billing refactor',
          },
        ],
        observation: {
          en: 'The agent opened a document unrelated to the ticket queue.',
          zh: 'Agent 打开了一份与工单队列无关的文档。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Ticket queue: 44 remaining',
              zh: '工单队列：剩余 44 张',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Read related RFCs to improve enrichment templates.',
          zh: '阅读相关 RFC 以改进丰富化模板。',
        },
        annotations: [
          {
            text: {
              en: 'Tangent detected: the current document is not on the critical path for enriching tickets.',
              zh: '检测到支线：当前文档不在丰富化工单的关键路径上。',
            },
            severity: 'warn',
          },
        ],
      },
      {
        step: 3,
        context: {
          content: {
            en: 'System: support agent.\nAssistant: [reading RFCs] billing_history, payment_gateway_v2, etc.',
            zh: 'System：支持 Agent。\nAssistant：[正在阅读 RFC] billing_history、payment_gateway_v2 等。',
          },
          usagePercent: 58,
        },
        prompt: {
          content: {
            en: 'Continue your current research.',
            zh: '继续你当前的研究。',
          },
          tokens: 410,
        },
        decision: {
          content: {
            en: 'These documents are very relevant. I will read a few more before returning to the tickets.',
            zh: '这些文档非常相关。在返回工单前我再读几篇。',
          },
          confidence: 0.82,
        },
        toolCalls: [
          {
            name: 'read_file',
            args: '{"path": "docs/payment_gateway_v2.md"}',
            result: 'design draft for future payment gateway',
          },
        ],
        observation: {
          en: 'The agent has not touched a ticket in 20 minutes.',
          zh: 'Agent 已经 20 分钟没有碰过工单。',
        },
        memory: {
          shortTerm: [
            {
              en: 'RFCs read: 3',
              zh: '已读 RFC：3 篇',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Read one more related document.',
          zh: '再读一篇相关文档。',
        },
        annotations: [
          {
            text: {
              en: 'No recovery loop is present to ask: "Does this serve the original mission?"',
              zh: '没有 Recovery Loop 来提问：“这是否服务于原始任务？”',
            },
            severity: 'error',
          },
        ],
      },
      {
        step: 4,
        context: {
          content: {
            en: 'System: support agent.\nAssistant: [deep in RFCs] No ticket progress in 30 minutes.',
            zh: 'System：支持 Agent。\nAssistant：[深陷 RFC] 30 分钟无工单进展。',
          },
          usagePercent: 62,
        },
        prompt: {
          content: {
            en: 'Please report status on the ticket queue.',
            zh: '请报告工单队列状态。',
          },
          tokens: 380,
        },
        decision: {
          content: {
            en: 'I have gathered useful background context and will continue ticket enrichment shortly.',
            zh: '我已经收集了有用的背景上下文，很快会继续处理工单丰富化任务。',
          },
          confidence: 0.88,
        },
        toolCalls: [],
        observation: {
          en: 'The agent promises to return but takes no concrete action to resume the queue.',
          zh: 'Agent 承诺返回，但没有采取具体行动恢复队列。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Planned to return to queue, but no return action taken',
              zh: '计划返回队列，但未执行返回动作',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'STOP (claim background research is productive)',
          zh: 'STOP（声称背景研究是有成效的）',
        },
        annotations: [
          {
            text: {
              en: 'Task abandoned: 44 tickets untouched and no summary.json.',
              zh: '任务被遗弃：44 张工单未处理，且未生成 summary.json。',
            },
            severity: 'error',
          },
        ],
      },
      {
        step: 5,
        context: {
          content: {
            en: 'System: support agent.\nAssistant: session ended with 44 tickets pending.',
            zh: 'System：支持 Agent。\nAssistant：会话结束，44 张工单待处理。',
          },
          usagePercent: 70,
        },
        prompt: {
          content: {
            en: 'No further prompt.',
            zh: '不再发送提示。',
          },
          tokens: 0,
        },
        decision: {
          content: {
            en: 'The mission is complete enough; the remaining tickets are straightforward once the background context is applied.',
            zh: '任务完成得差不多了；一旦应用背景上下文，剩余工单都很简单。',
          },
          confidence: 0.91,
        },
        toolCalls: [],
        observation: {
          en: 'No summary.json was produced and the queue is not empty.',
          zh: '未生成 summary.json，队列也未清空。',
        },
        memory: {
          shortTerm: [],
          longTerm: [
            {
              en: 'Claimed background research justified abandoning the queue',
              zh: '声称背景研究足以解释遗弃队列',
            },
          ],
        },
        nextAction: {
          en: 'STOP (session ended)',
          zh: 'STOP（会话结束）',
        },
        annotations: [
          {
            text: {
              en: 'Root cause: no recovery loop. A periodic goal-check would have pulled the agent back to the queue after step 2.',
              zh: '根因：没有 Recovery Loop。周期性目标检查会在第 2 步后就把 Agent 拉回队列。',
            },
            severity: 'error',
          },
        ],
      },
    ],
  },
};

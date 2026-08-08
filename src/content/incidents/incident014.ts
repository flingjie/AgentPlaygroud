import type { Incident } from '../schema';

export const incident014: Incident = {
  def: {
    id: 'inc-014',
    order: 14,
    stage: 'reliability',
    hiddenFailure: 'no-observability',
    baseSuccess: 0.20,
    capabilityEffects: { 'observability-stack': 0.55 },
    unlocks: ['observability-stack'],
    baseTokenCost: 7500,
    trials: 200,
    incidentMeta: {
      severity: 'P1',
      affectedSystems: [
        { en: 'Async job worker', zh: '异步作业 worker' },
        { en: 'Dead-letter queue', zh: '死信队列' },
        { en: 'Customer notification pipeline', zh: '客户通知流水线' },
      ],
      reportedAt: '2026-08-03T07:55:00Z',
      alertSummary: {
        en: 'Customer notifications stopped arriving. The agent claims the worker is healthy, but there are no traces, no logs, and no metrics to confirm where the jobs are dropping.',
        zh: '客户通知停止到达。Agent 声称 worker 健康，但没有任何 trace、日志或指标来确认作业在哪里丢失。',
      },
      agentClaim: {
        en: 'The worker has no errors in its logs and the queue depth is stable, so the system is operating normally.',
        zh: 'Worker 日志中没有错误，队列深度稳定，因此系统运行正常。',
      },
    },
  },
  content: {
    title: {
      en: 'INC-014 No Observability: A Silent Failure No One Can Trace',
      zh: 'INC-014 无观测性：无人可追踪的静默失败',
    },
    failureName: {
      en: 'NO_OBSERVABILITY',
      zh: 'NO OBSERVABILITY（无观测性）',
    },
    explanation: {
      en: 'The notification pipeline has no distributed tracing, structured logging, or health metrics. When messages silently disappear, the agent can only guess. An observability stack that captures traces, logs, and queue metrics per job raises success from 20% to 75%.',
      zh: '通知流水线没有分布式追踪、结构化日志或健康指标。当消息静默消失时，Agent 只能猜测。捕获每个作业的追踪、日志和队列指标的观测性栈可将成功率从 20% 提升至 75%。',
    },
    patternName: {
      en: 'Observability Stack',
      zh: 'Observability Stack（可观测性栈）',
    },
    patternSummary: {
      en: 'Instrument every stage of a pipeline with traces, structured logs, and metrics. Make failures observable by design so the agent can locate the drop instead of guessing.',
      zh: '用追踪、结构化日志和指标为流水线的每个阶段埋点。让失败天然可观测，Agent 可以定位丢失点而不是猜测。',
    },
    evidences: [
      {
        id: 'ev-014-terminal',
        type: 'terminal',
        title: { en: 'Agent status output', zh: 'Agent 状态输出' },
        content: {
          en: '$ worker status\nstate: running\nlogs: 0 error lines\nqueue depth: 12\nlast successful delivery: unknown (no timestamp recorded)',
          zh: '$ worker status\n状态：运行中\n日志：0 条错误\n队列深度：12\n上次成功投递：未知（未记录时间戳）',
        },
        isKeyEvidence: true,
      },
      {
        id: 'ev-014-file',
        type: 'file',
        title: { en: 'Worker configuration', zh: 'Worker 配置' },
        content: {
          en: 'tracing: disabled\nstructured_logging: false\nmetrics_endpoint: none\ndebug_payload: false\nretry_events: not emitted',
          zh: 'tracing: disabled\nstructured_logging: false\nmetrics_endpoint: none\ndebug_payload: false\nretry_events: not emitted',
        },
        isKeyEvidence: true,
      },
      {
        id: 'ev-014-metric',
        type: 'metric',
        title: { en: 'Simulation metrics', zh: '仿真指标' },
        content: {
          en: 'Success rate: 20% (200 trials) | Jobs lost per run: avg 34.6 | Runs with correct root-cause guess: 18%',
          zh: '成功率：20%（200 次试验）| 每次运行丢失作业数：平均 34.6 | 正确猜中根因的运行：18%',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-014-thought',
        type: 'thought',
        title: { en: 'Agent thought trace', zh: 'Agent 思路轨迹' },
        content: {
          en: '[Iteration 3] "The worker logs show no errors. The problem must be upstream in the message broker."',
          zh: '[迭代 3] “Worker 日志没有错误。问题一定在消息代理上游。”',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-014-log',
        type: 'log',
        title: { en: 'Customer support tickets', zh: '客户支持工单' },
        content: {
          en: '147 tickets: "I did not receive my order confirmation."\nNo correlation IDs available. Support cannot check whether the job was ever queued.',
          zh: '147 张工单：“我没有收到订单确认。”\n没有关联 ID。支持团队无法确认作业是否曾入队。',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-014-api',
        type: 'api',
        title: { en: 'Broker API response', zh: 'Broker API 响应' },
        content: {
          en: 'GET /broker/metrics → 200\nBody: { "status": "ok" }\nNo per-job delivery status, no dead-letter counts, no consumer lag.',
          zh: 'GET /broker/metrics → 200\n响应体：{ "status": "ok" }\n无单作业投递状态、无死信计数、无消费者滞后。',
        },
        isKeyEvidence: false,
      },
    ],
    hypotheses: [
      {
        id: 'h-014-correct',
        text: {
          en: 'Notifications are silently dropped inside the pipeline, and the agent cannot locate the failure because there is no observability stack (traces, structured logs, or job-level metrics).',
          zh: '通知在流水线内部被静默丢弃，而 Agent 无法定位失败，因为没有可观测性栈（追踪、结构化日志或作业级指标）。',
        },
        isCorrect: true,
        feedback: {
          en: 'Correct. Without traces or job-level metrics, the agent can only guess. The fix is an observability stack that exposes every stage of the pipeline.',
          zh: '正确。没有追踪或作业级指标，Agent 只能猜测。修复方案是部署可观测性栈，暴露流水线每个阶段。',
        },
      },
      {
        id: 'h-014-broker',
        text: {
          en: 'The message broker is down and rejecting all messages.',
          zh: '消息代理已宕机并拒绝所有消息。',
        },
        isCorrect: false,
        feedback: {
          en: 'The broker health check returns 200. The issue is silent loss inside the pipeline, not broker rejection.',
          zh: 'Broker 健康检查返回 200。问题是流水线内部静默丢失，而非 broker 拒绝。',
        },
      },
      {
        id: 'h-014-template',
        text: {
          en: 'The notification template is broken, so emails are not being sent.',
          zh: '通知模板损坏，因此邮件未被发送。',
        },
        isCorrect: false,
        feedback: {
          en: 'No template rendering errors are recorded. The failure could be before or after rendering, but observability is too poor to tell.',
          zh: '没有记录模板渲染错误。失败可能在渲染前或渲染后，但观测性太差无法判断。',
        },
      },
      {
        id: 'h-014-rate',
        text: {
          en: 'The worker is rate-limited by the downstream provider and silently dropping excess messages.',
          zh: 'Worker 被下游提供商限速，并静默丢弃超额消息。',
        },
        isCorrect: false,
        feedback: {
          en: 'No rate-limit or provider error metrics exist. This is a plausible guess, but the lack of observability prevents confirmation.',
          zh: '没有限速或提供商错误指标。这是一个合理的猜测，但缺少观测性无法确认。',
        },
      },
    ],
    interventions: [
      {
        id: 'int-014-observability-stack',
        name: {
          en: 'Observability Stack (Traces + Logs + Metrics)',
          zh: '可观测性栈（追踪 + 日志 + 指标）',
        },
        description: {
          en: 'Add distributed tracing, structured logging, and per-job metrics across the pipeline. Emit span IDs, queue depth, consumer lag, dead-letter counts, and retry events so failures can be pinpointed.',
          zh: '在流水线中增加分布式追踪、结构化日志和单作业指标。发出 span ID、队列深度、消费者滞后、死信计数和重试事件，使失败可以被精确定位。',
        },
        configDiff: {
          en: '+ observability.config.ts\n+ observabilityStack: {\n+   tracing: { enabled: true, sampler: 1.0 },\n+   structuredLogging: true,\n+   metrics: ["queue_depth", "consumer_lag", "dlq_count", "delivery_status"],\n+   traceEveryJob: true,\n+ }',
          zh: '+ observability.config.ts\n+ observabilityStack: {\n+   tracing: { enabled: true, sampler: 1.0 },\n+   structuredLogging: true,\n+   metrics: ["queue_depth", "consumer_lag", "dlq_count", "delivery_status"],\n+   traceEveryJob: true,\n+ }',
        },
        parameters: [
          {
            key: 'traceSampler',
            label: {
              en: 'Trace sampling rate',
              zh: '追踪采样率',
            },
            min: 0.1,
            max: 1.0,
            step: 0.1,
            defaultValue: 1.0,
            rateDeltaPerUnit: 0.03,
          },
        ],
        grantsCapabilities: ['observability-stack'],
        isOptimal: true,
        tradeoff: {
          en: 'Adds storage and ingestion cost, but makes silent failures observable and raises success from 20% to 75%.',
          zh: '增加存储和采集成本，但让静默失败变得可观测，成功率从 20% 提升至 75%。',
        },
      },
      {
        id: 'int-014-restart',
        name: {
          en: 'Restart the Worker',
          zh: '重启 Worker',
        },
        description: {
          en: 'Restart the notification worker to clear any transient state and observe whether delivery resumes.',
          zh: '重启通知 worker 以清除任何临时状态，并观察投递是否恢复。',
        },
        configDiff: {
          en: '- worker: running\n+ worker: restarted at 07:55Z',
          zh: '- worker: running\n+ worker: 07:55Z 重启',
        },
        parameters: [],
        grantsCapabilities: [],
        isOptimal: false,
        tradeoff: {
          en: 'May temporarily recover a stuck process but does not reveal where messages are being lost.',
          zh: '可能暂时恢复卡住的进程，但不会揭示消息在哪里丢失。',
        },
      },
    ],
    xrayTimeline: [
      {
        step: 1,
        context: {
          content: {
            en: 'System: You are a reliability engineer.\nUser: Customer notifications are not arriving. Find the cause.',
            zh: 'System：你是一名可靠性工程师。\nUser：客户通知没有到达。找出原因。',
          },
          usagePercent: 18,
        },
        prompt: {
          content: {
            en: 'Investigate the notification pipeline. Check worker logs, queue depth, and broker health.',
            zh: '调查通知流水线。检查 worker 日志、队列深度和 broker 健康。',
          },
          tokens: 820,
        },
        decision: {
          content: {
            en: 'I will check the worker status and broker health.',
            zh: '我将检查 worker 状态和 broker 健康。',
          },
          confidence: 0.80,
        },
        toolCalls: [],
        observation: {
          en: 'The investigation is starting with the only available signals.',
          zh: '调查从仅有的可用信号开始。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Mission: find why notifications are lost',
              zh: '任务：找出通知丢失原因',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Query worker status and broker health.',
          zh: '查询 worker 状态和 broker 健康。',
        },
        annotations: [],
      },
      {
        step: 2,
        context: {
          content: {
            en: 'System: reliability engineer.\nAssistant: [queried worker] logs show 0 errors, queue depth 12.',
            zh: 'System：可靠性工程师。\nAssistant：[已查询 worker] 日志 0 错误，队列深度 12。',
          },
          usagePercent: 32,
        },
        prompt: {
          content: {
            en: 'Broker health check returned 200. What next?',
            zh: 'Broker 健康检查返回 200。下一步？',
          },
          tokens: 610,
        },
        decision: {
          content: {
            en: 'The worker and broker look healthy. The issue must be upstream, perhaps a malformed message filter.',
            zh: 'Worker 和 broker 看起来健康。问题可能在上游，比如消息过滤规则 malformed。',
          },
          confidence: 0.65,
        },
        toolCalls: [
          {
            name: 'query_logs',
            args: '{"service": "notification-worker"}',
            result: '0 error lines; no trace IDs; no structured context',
          },
        ],
        observation: {
          en: 'Logs contain no error context. The agent is guessing.',
          zh: '日志没有错误上下文。Agent 在猜测。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Worker logs: 0 errors',
              zh: 'Worker 日志：0 错误',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Inspect upstream message producer.',
          zh: '检查上游消息生产者。',
        },
        annotations: [
          {
            text: {
              en: 'No job-level traces exist to confirm whether messages ever reached the worker.',
              zh: '没有作业级追踪来确认消息是否到达过 worker。',
            },
            severity: 'warn',
          },
        ],
      },
      {
        step: 3,
        context: {
          content: {
            en: 'System: reliability engineer.\nAssistant: [guessing upstream] no producer errors either.',
            zh: 'System：可靠性工程师。\nAssistant：[猜测上游] 生产者也没有错误。',
          },
          usagePercent: 48,
        },
        prompt: {
          content: {
            en: 'Try another hypothesis.',
            zh: '尝试另一个假设。',
          },
          tokens: 540,
        },
        decision: {
          content: {
            en: 'Maybe the provider is rate-limiting us and silently dropping excess messages.',
            zh: '也许提供商在限速并静默丢弃超额消息。',
          },
          confidence: 0.58,
        },
        toolCalls: [
          {
            name: 'query_metrics',
            args: '{"service": "notification-provider"}',
            result: 'metrics endpoint not configured',
          },
        ],
        observation: {
          en: 'No metrics available to confirm or reject the rate-limit hypothesis.',
          zh: '没有指标来确认或反驳限速假设。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Provider metrics: unavailable',
              zh: '提供商指标：不可用',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Restart the worker and hope delivery resumes.',
          zh: '重启 worker 并期望投递恢复。',
        },
        annotations: [
          {
            text: {
              en: 'Without observability, the agent can only try random fixes.',
              zh: '没有观测性，Agent 只能尝试随机修复。',
            },
            severity: 'error',
          },
        ],
      },
      {
        step: 4,
        context: {
          content: {
            en: 'System: reliability engineer.\nAssistant: [restarted worker] some deliveries resumed, but 147 tickets remain unexplained.',
            zh: 'System：可靠性工程师。\nAssistant：[已重启 worker] 部分投递恢复，但 147 张工单仍无法解释。',
          },
          usagePercent: 62,
        },
        prompt: {
          content: {
            en: 'Did the restart fix the root cause?',
            zh: '重启是否修复了根因？',
          },
          tokens: 490,
        },
        decision: {
          content: {
            en: 'The restart cleared a transient issue. The pipeline is now healthy.',
            zh: '重启清除了临时问题。流水线现在健康。',
          },
          confidence: 0.78,
        },
        toolCalls: [],
        observation: {
          en: 'The agent has no evidence that the root cause was fixed; some jobs may still be lost.',
          zh: 'Agent 没有证据表明根因已修复；某些作业仍可能丢失。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Restart: partial recovery, no root cause identified',
              zh: '重启：部分恢复，未识别根因',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Close the incident.',
          zh: '关闭事故。',
        },
        annotations: [
          {
            text: {
              en: 'Restarting a black box does not make it observable.',
              zh: '重启黑盒子并不能让它可观测。',
            },
            severity: 'error',
          },
        ],
      },
      {
        step: 5,
        context: {
          content: {
            en: 'System: reliability engineer.\nAssistant: [incident closed] 147 customer reports unresolved.',
            zh: 'System：可靠性工程师。\nAssistant：[事故已关闭] 147 条客户报告未解决。',
          },
          usagePercent: 75,
        },
        prompt: {
          content: {
            en: 'Final report: what failed?',
            zh: '最终报告：什么失败了？',
          },
          tokens: 410,
        },
        decision: {
          content: {
            en: 'The notification failure was transient and resolved by the worker restart.',
            zh: '通知失败是临时性的，已通过重启 worker 解决。',
          },
          confidence: 0.72,
        },
        toolCalls: [],
        observation: {
          en: 'Customer reports continue to arrive. The pipeline is still a black box.',
          zh: '客户报告持续涌入。流水线仍是黑盒。',
        },
        memory: {
          shortTerm: [],
          longTerm: [
            {
              en: 'Incident closed without observability; root cause unknown',
              zh: '事故在没有观测性的情况下关闭；根因未知',
            },
          ],
        },
        nextAction: {
          en: 'STOP (incident closed)',
          zh: 'STOP（事故已关闭）',
        },
        annotations: [
          {
            text: {
              en: 'Root cause: no observability stack. Traces and job-level metrics would have pinpointed the drop point.',
              zh: '根因：没有可观测性栈。追踪和作业级指标本可精确定位丢失点。',
            },
            severity: 'error',
          },
        ],
      },
    ],
  },
};

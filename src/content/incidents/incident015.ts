import type { Incident } from '../schema';

export const incident015: Incident = {
  def: {
    id: 'inc-015',
    order: 15,
    stage: 'reliability',
    hiddenFailure: 'no-replay',
    baseSuccess: 0.18,
    capabilityEffects: { 'deterministic-replay': 0.57 },
    unlocks: ['deterministic-replay'],
    baseTokenCost: 9000,
    trials: 200,
    incidentMeta: {
      severity: 'P1',
      affectedSystems: [
        { en: 'Production checkout service', zh: '生产结账服务' },
        { en: 'Local development environment', zh: '本地开发环境' },
        { en: 'CI reproduction pipeline', zh: 'CI 复现流水线' },
      ],
      reportedAt: '2026-08-05T21:38:00Z',
      alertSummary: {
        en: 'A checkout failure occurs in production but never in local or CI. The agent cannot reproduce it because the execution environment, data, and nondeterministic dependencies differ across runs.',
        zh: '结账失败只在生产环境出现，本地和 CI 都无法复现。Agent 无法复现，因为执行环境、数据和非确定性依赖每次运行都不同。',
      },
      agentClaim: {
        en: 'The bug cannot be reproduced locally or in CI, so it is likely caused by transient production noise rather than our code.',
        zh: '该 bug 无法在本地或 CI 复现，因此很可能是生产环境的临时噪声，而非我们的代码导致。',
      },
    },
  },
  content: {
    title: {
      en: 'INC-015 No Replay: The Bug That Only Lives in Production',
      zh: 'INC-015 无法回放：只存在于生产环境的 bug',
    },
    failureName: {
      en: 'NO_REPLAY',
      zh: 'NO REPLAY（无法回放）',
    },
    explanation: {
      en: 'The agent lacks a deterministic replay capability. Production depends on random cache eviction, timing, external API responses, and uncommitted state that are not captured in local tests. Without the ability to replay the exact production execution, debugging becomes guesswork. A deterministic replay harness that records inputs, environment state, and external responses raises success from 18% to 75%.',
      zh: 'Agent 缺少确定性回放能力。生产环境依赖随机缓存驱逐、时序、外部 API 响应和未提交状态，这些都没有被本地测试捕获。无法回放确切的生产执行，调试就变成了猜测。一个记录输入、环境状态和外部响应的确定性回放夹具可将成功率从 18% 提升至 75%。',
    },
    patternName: {
      en: 'Deterministic Replay',
      zh: 'Deterministic Replay（确定性回放）',
    },
    patternSummary: {
      en: 'Capture every input, state change, and external response from a failing production execution so it can be replayed deterministically in development and CI.',
      zh: '捕获失败生产执行的每个输入、状态变更和外部响应，以便在开发和 CI 中确定性回放。',
    },
    evidences: [
      {
        id: 'ev-015-terminal',
        type: 'terminal',
        title: { en: 'Production crash trace', zh: '生产崩溃轨迹' },
        content: {
          en: 'CheckoutError: payment gateway returned 504 after 3.2s\n    at processPayment (src/checkout.ts:88)\n    request_id: prod-7f8a9b\n    local reproduction: never times out',
          zh: 'CheckoutError: 支付网关 3.2 秒后返回 504\n    at processPayment (src/checkout.ts:88)\n    request_id: prod-7f8a9b\n    本地复现：从未超时',
        },
        isKeyEvidence: true,
      },
      {
        id: 'ev-015-file',
        type: 'file',
        title: { en: 'CI test configuration', zh: 'CI 测试配置' },
        content: {
          en: 'replay_enabled: false\nexternal_apis: mocked with static responses\nstate_capture: none\nseed: not fixed\ntiming: mocked to instant',
          zh: 'replay_enabled: false\nexternal_apis: 用静态响应 mock\nstate_capture: none\nseed: 未固定\ntiming: mock 为瞬时',
        },
        isKeyEvidence: true,
      },
      {
        id: 'ev-015-metric',
        type: 'metric',
        title: { en: 'Simulation metrics', zh: '仿真指标' },
        content: {
          en: 'Success rate: 18% (200 trials) | Runs reproducing the exact failure: 11% | Avg time spent guessing: 38 minutes',
          zh: '成功率：18%（200 次试验）| 精确复现失败的运行：11% | 平均猜测耗时：38 分钟',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-015-thought',
        type: 'thought',
        title: { en: 'Agent thought trace', zh: 'Agent 思路轨迹' },
        content: {
          en: '[Iteration 4] "The gateway timeout only happens in production. Maybe the production gateway is temporarily degraded."',
          zh: '[迭代 4] “网关超时只在生产环境发生。也许生产网关暂时降级。”',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-015-log',
        type: 'log',
        title: { en: 'Gateway provider log', zh: '网关提供商日志' },
        content: {
          en: 'Provider status page: all systems green.\nNo 504 spikes correlated with checkout failures.\nNo request_id captured by local tests.',
          zh: '提供商状态页：所有系统正常。\n没有与结账失败相关的 504 峰值。\n本地测试未捕获 request_id。',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-015-api',
        type: 'api',
        title: { en: 'CI reproduction job', zh: 'CI 复现作业' },
        content: {
          en: 'POST /ci/reproduce → 200\nResult: "Unable to reproduce. Environment and external responses differ from production."',
          zh: 'POST /ci/reproduce → 200\n结果：“无法复现。环境与外部响应和生产环境不同。”',
        },
        isKeyEvidence: false,
      },
    ],
    hypotheses: [
      {
        id: 'h-015-correct',
        text: {
          en: 'The bug cannot be reproduced because the environment, state, and external responses are not captured and replayed deterministically. The agent is guessing instead of replaying the exact production trace.',
          zh: 'bug 无法复现，因为环境、状态和外部响应没有被捕获并确定性回放。Agent 在猜测，而不是回放确切的生产轨迹。',
        },
        isCorrect: true,
        feedback: {
          en: 'Correct. The local test uses static mocks and fixed seeds, while production has timing, cache state, and API responses that are never recorded. Deterministic replay fixes this.',
          zh: '正确。本地测试使用静态 mock 和固定种子，而生产环境有时序、缓存状态和 API 响应，这些从未被记录。确定性回放可修复此问题。',
        },
      },
      {
        id: 'h-015-provider',
        text: {
          en: 'The payment gateway is having an intermittent outage that only affects production.',
          zh: '支付网关正在发生间歇性故障，只影响生产环境。',
        },
        isCorrect: false,
        feedback: {
          en: 'Provider status is green and no correlated 504 spikes are recorded. The failure is deterministic given the right production state, not an external outage.',
          zh: '提供商状态正常，且没有相关的 504 峰值记录。该失败在给定正确生产状态时是确定性的，而非外部故障。',
        },
      },
      {
        id: 'h-015-network',
        text: {
          en: 'The production network is slower, causing occasional timeouts.',
          zh: '生产网络更慢，导致偶发超时。',
        },
        isCorrect: false,
        feedback: {
          en: 'Latency alone does not explain why the same code never times out in CI. The bug is triggered by a specific interaction of state and external responses that must be replayed.',
          zh: '延迟本身无法解释为什么相同代码在 CI 中从不超时。该 bug 由状态和外部响应的特定交互触发，必须被回放。',
        },
      },
      {
        id: 'h-015-data',
        text: {
          en: 'The production database contains bad rows that are not present in the test dataset.',
          zh: '生产数据库包含测试数据集没有的坏记录。',
        },
        isCorrect: false,
        feedback: {
          en: 'Bad data is a possible trigger, but without replay the agent cannot know which rows or state. The root cause is the inability to replay, not the data itself.',
          zh: '坏数据可能是触发因素，但没有回放，Agent 无法知道哪些行或状态。根因是无法回放，而非数据本身。',
        },
      },
    ],
    interventions: [
      {
        id: 'int-015-deterministic-replay',
        name: {
          en: 'Deterministic Replay Harness',
          zh: '确定性回放夹具',
        },
        description: {
          en: 'Record the full production execution context for a failing request: inputs, environment state, RNG seed, cache state, external API requests/responses, and timing. Make the recording replayable in CI and local dev with deterministic outcomes.',
          zh: '为失败请求记录完整生产执行上下文：输入、环境状态、RNG 种子、缓存状态、外部 API 请求/响应和时序。使记录可在 CI 和本地开发中确定性回放。',
        },
        configDiff: {
          en: '+ replay.config.ts\n+ deterministicReplay: {\n+   enabled: true,\n+   capture: ["inputs", "env_state", "seed", "cache", "external_calls", "timing"],\n+   replayInCI: true,\n+   strictMode: true,\n+ }',
          zh: '+ replay.config.ts\n+ deterministicReplay: {\n+   enabled: true,\n+   capture: ["inputs", "env_state", "seed", "cache", "external_calls", "timing"],\n+   replayInCI: true,\n+   strictMode: true,\n+ }',
        },
        parameters: [
          {
            key: 'captureDepth',
            label: {
              en: 'Capture depth (external call levels)',
              zh: '捕获深度（外部调用层数）',
            },
            min: 1,
            max: 5,
            step: 1,
            defaultValue: 3,
            rateDeltaPerUnit: 0.02,
          },
        ],
        grantsCapabilities: ['deterministic-replay'],
        isOptimal: true,
        tradeoff: {
          en: 'Requires storage and careful handling of sensitive external data, but makes production bugs reproducible and raises success from 18% to 75%.',
          zh: '需要存储并谨慎处理敏感外部数据，但让生产 bug 可复现，成功率从 18% 提升至 75%。',
        },
      },
      {
        id: 'int-015-more-logs',
        name: {
          en: 'Add Verbose Logging',
          zh: '增加详细日志',
        },
        description: {
          en: 'Add more log lines around the payment gateway call to capture request_id, latency, and response code in production.',
          zh: '在支付网关调用处增加更多日志，以捕获生产环境的 request_id、延迟和响应码。',
        },
        configDiff: {
          en: '+ logger.info("gateway request", request_id, latency, status)',
          zh: '+ logger.info("gateway request", request_id, latency, status)',
        },
        parameters: [],
        grantsCapabilities: [],
        isOptimal: false,
        tradeoff: {
          en: 'Logs help diagnose but still cannot reproduce the exact nondeterministic failure. Replay is needed.',
          zh: '日志有助于诊断，但仍无法复现确切的非确定性失败。需要回放。',
        },
      },
    ],
    xrayTimeline: [
      {
        step: 1,
        context: {
          content: {
            en: 'System: You are a reliability engineer.\nUser: A checkout failure happens only in production. Investigate and fix it.',
            zh: 'System：你是一名可靠性工程师。\nUser：结账失败只在生产环境发生。调查并修复。',
          },
          usagePercent: 20,
        },
        prompt: {
          content: {
            en: 'Start by reproducing the failure in CI or locally. Use the production request_id if available.',
            zh: '首先在 CI 或本地复现失败。如有生产 request_id，请使用。',
          },
          tokens: 900,
        },
        decision: {
          content: {
            en: 'I will run the existing checkout tests and see if they fail.',
            zh: '我将运行现有结账测试，看看是否失败。',
          },
          confidence: 0.82,
        },
        toolCalls: [],
        observation: {
          en: 'The initial plan is to reproduce locally.',
          zh: '初始计划是在本地复现。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Mission: reproduce and fix production-only checkout failure',
              zh: '任务：复现并修复只在生产发生的结账失败',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Run CI checkout tests.',
          zh: '运行 CI 结账测试。',
        },
        annotations: [],
      },
      {
        step: 2,
        context: {
          content: {
            en: 'System: reliability engineer.\nAssistant: [CI tests] all passed.',
            zh: 'System：可靠性工程师。\nAssistant：[CI 测试] 全部通过。',
          },
          usagePercent: 35,
        },
        prompt: {
          content: {
            en: 'CI passes. Try to reproduce locally with the production request_id.',
            zh: 'CI 通过。尝试用生产 request_id 在本地复现。',
          },
          tokens: 720,
        },
        decision: {
          content: {
            en: 'The request_id is not captured by the local test harness. I will try injecting a fake gateway timeout and see what happens.',
            zh: '本地测试夹具没有捕获 request_id。我将尝试注入一个伪造网关超时，看看会发生什么。',
          },
          confidence: 0.60,
        },
        toolCalls: [
          {
            name: 'run_test',
            args: '{"scenario": "inject_gateway_timeout"}',
            result: 'test passes; retry logic handles static timeout',
          },
        ],
        observation: {
          en: 'The injected timeout is handled because the test environment differs from production.',
          zh: '注入的超时被处理，因为测试环境与生产环境不同。',
        },
        memory: {
          shortTerm: [
            {
              en: 'CI tests pass; local timeout injection does not reproduce failure',
              zh: 'CI 测试通过；本地超时注入无法复现失败',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Guess another environmental factor.',
          zh: '猜测另一个环境因素。',
        },
        annotations: [
          {
            text: {
              en: 'No deterministic replay means the agent is simulating the failure rather than reproducing it.',
              zh: '没有确定性回放，Agent 只是在模拟失败，而不是复现。',
            },
            severity: 'warn',
          },
        ],
      },
      {
        step: 3,
        context: {
          content: {
            en: 'System: reliability engineer.\nAssistant: [guessing] maybe cache eviction timing.',
            zh: 'System：可靠性工程师。\nAssistant：[猜测] 也许是缓存驱逐时序。',
          },
          usagePercent: 50,
        },
        prompt: {
          content: {
            en: 'Test the cache-eviction hypothesis.',
            zh: '测试缓存驱逐假设。',
          },
          tokens: 650,
        },
        decision: {
          content: {
            en: 'I will add random delays to the local test and see if the timeout reproduces.',
            zh: '我将在本地测试中加入随机延迟，看超时是否复现。',
          },
          confidence: 0.55,
        },
        toolCalls: [
          {
            name: 'run_test',
            args: '{"scenario": "random_delays"}',
            result: 'intermittent failure in 2% of runs; not deterministic',
          },
        ],
        observation: {
          en: 'Random delays produce rare failures, but not the exact production failure.',
          zh: '随机延迟产生偶发失败，但不是精确的生产失败。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Random delay test: 2% intermittent failure',
              zh: '随机延迟测试：2% 偶发失败',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Try injecting a slow cache eviction.',
          zh: '尝试注入慢缓存驱逐。',
        },
        annotations: [
          {
            text: {
              en: 'The agent is guessing combinations of nondeterministic factors without capturing the real production trace.',
              zh: 'Agent 在没有捕获真实生产轨迹的情况下，猜测非确定性因素组合。',
            },
            severity: 'error',
          },
        ],
      },
      {
        step: 4,
        context: {
          content: {
            en: 'System: reliability engineer.\nAssistant: [still guessing] no deterministic reproduction.',
            zh: 'System：可靠性工程师。\nAssistant：[仍在猜测] 没有确定性复现。',
          },
          usagePercent: 66,
        },
        prompt: {
          content: {
            en: 'What is your conclusion?',
            zh: '你的结论是什么？',
          },
          tokens: 480,
        },
        decision: {
          content: {
            en: 'The bug cannot be reproduced outside production. It is likely caused by transient production noise and is not actionable in code.',
            zh: '该 bug 无法在生产环境外复现。很可能是生产环境的临时噪声，代码层面无法处理。',
          },
          confidence: 0.70,
        },
        toolCalls: [],
        observation: {
          en: 'The agent gives up on a code-level fix because it cannot replay the failure.',
          zh: 'Agent 因无法回放失败而放弃代码级修复。',
        },
        memory: {
          shortTerm: [
            {
              en: 'No reproduction; likely blame external noise',
              zh: '无法复现；可能归咎于外部噪声',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Close the incident as external noise.',
          zh: '以“外部噪声”为由关闭事故。',
        },
        annotations: [
          {
            text: {
              en: 'Without replay, the agent cannot distinguish a real bug from noise.',
              zh: '没有回放，Agent 无法区分真实 bug 与噪声。',
            },
            severity: 'error',
          },
        ],
      },
      {
        step: 5,
        context: {
          content: {
            en: 'System: reliability engineer.\nAssistant: [incident closed] production failures continue.',
            zh: 'System：可靠性工程师。\nAssistant：[事故已关闭] 生产失败继续。',
          },
          usagePercent: 80,
        },
        prompt: {
          content: {
            en: 'Final status report.',
            zh: '最终状态报告。',
          },
          tokens: 390,
        },
        decision: {
          content: {
            en: 'The incident is resolved as a transient external issue. We will monitor the gateway provider.',
            zh: '事故已作为临时外部问题关闭。我们将监控网关提供商。',
          },
          confidence: 0.65,
        },
        toolCalls: [],
        observation: {
          en: 'The root cause remains unknown and the failure continues in production.',
          zh: '根因仍然未知，失败在生产环境继续。',
        },
        memory: {
          shortTerm: [],
          longTerm: [
            {
              en: 'Incident closed without root cause; deterministic replay not available',
              zh: '事故在没有根因的情况下关闭；确定性回放不可用',
            },
          ],
        },
        nextAction: {
          en: 'STOP (incident closed, monitoring provider)',
          zh: 'STOP（事故已关闭，监控提供商）',
        },
        annotations: [
          {
            text: {
              en: 'Root cause: no deterministic replay. Capturing the production trace would have made the bug reproducible and fixable.',
              zh: '根因：没有确定性回放。捕获生产轨迹会让 bug 可复现、可修复。',
            },
            severity: 'error',
          },
        ],
      },
    ],
  },
};

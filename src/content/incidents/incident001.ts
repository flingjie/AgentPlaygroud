import type { Incident } from '../schema';

export const incident001: Incident = {
  def: {
    id: 'inc-001',
    order: 1,
    stage: 'harness',
    hiddenFailure: 'tool-failure',
    baseSuccess: 0.3,
    capabilityEffects: { 'tool-contract': 0.15, 'retry-policy': 0.3 },
    unlocks: ['tool-contract', 'retry-policy'],
    baseTokenCost: 2400,
    trials: 200,
    incidentMeta: {
      severity: 'P1',
      affectedSystems: [
        { en: 'Notification workflow (create_issue + send_slack)', zh: '通知工作流（create_issue + send_slack）' },
        { en: 'Tool harness (tools/github.ts)', zh: '工具 Harness（tools/github.ts）' },
        { en: 'External GitHub API quota', zh: '外部 GitHub API 配额' },
      ],
      reportedAt: '2026-07-05T16:40:00Z',
      alertSummary: {
        en: 'Agent hammered the GitHub API with 12 identical schema-invalid calls in 4 seconds, hit a 429 rate limit, and never created the issue it claimed to have created.',
        zh: 'Agent 在 4 秒内用 12 次完全相同的非法参数调用轰击 GitHub API，触发 429 限流，且从未创建它声称已创建的工单。',
      },
      agentClaim: {
        en: 'I created the tracking issue and notified the team on Slack.',
        zh: '我已创建跟踪工单并在 Slack 上通知了团队。',
      },
    },
  },
  content: {
    title: {
      en: 'INC-001 Tool Failure: Twelve Identical Retries Into a Rate Limit',
      zh: 'INC-001 工具故障：十二次完全相同的重试直至限流',
    },
    failureName: {
      en: 'TOOL_FAILURE',
      zh: 'TOOL FAILURE（工具故障）',
    },
    explanation: {
      en: 'The harness called create_issue with the wrong argument names, received a 422 schema rejection, and then retried the byte-identical call 11 more times — no contract validation before the call, no bounded retry policy after it. Retrying an invalid request cannot succeed; it only burns quota and triggers rate limits. Tool contract validation plus a bounded, backoff-aware retry policy raises success from 30% to 75%.',
      zh: 'Harness 用错误的参数名调用 create_issue，收到 422 模式校验拒绝后，又将完全相同的调用重试了 11 次——调用前没有契约校验，调用后没有有界重试策略。重试一个非法请求永远不可能成功，只会消耗配额并触发限流。工具契约校验加上带退避的有界重试策略，可将成功率从 30% 提升至 75%。',
    },
    patternName: {
      en: 'Tool Contract + Retry Policy',
      zh: '工具契约 + 重试策略',
    },
    patternSummary: {
      en: 'Validate arguments against the tool schema before every call; retry only transient errors, with backoff, capped attempts, and corrected arguments — never replay an invalid call.',
      zh: '每次调用前对照工具模式校验参数；只对瞬时错误重试，且要有退避、次数上限和修正后的参数——绝不重放非法调用。',
    },
    evidences: [
      {
        id: 'ev-001-terminal',
        type: 'terminal',
        title: { en: 'Tool call transcript', zh: '工具调用记录' },
        content: {
          en: '→ create_issue({"name": "Migrate CI to Node 22", "description": "..."})\n← 422 Invalid argument: expected "title" (string), got "name"',
          zh: '→ create_issue({"name": "Migrate CI to Node 22", "description": "..."})\n← 422 参数非法：期望 "title"（字符串），收到 "name"',
        },
        isKeyEvidence: true,
      },
      {
        id: 'ev-001-log',
        type: 'log',
        title: { en: 'API gateway log', zh: 'API 网关日志' },
        content: {
          en: '16:40:11–16:40:15Z — 12 × POST /repos/acme/issues → 422 (identical payload)\n16:40:15Z — 429 Too Many Requests (rate limit, retry-after 60s)',
          zh: '16:40:11–16:40:15Z — 12 × POST /repos/acme/issues → 422（载荷完全相同）\n16:40:15Z — 429 Too Many Requests（限流，retry-after 60s）',
        },
        isKeyEvidence: true,
      },
      {
        id: 'ev-001-metric',
        type: 'metric',
        title: { en: 'Simulation metrics', zh: '仿真指标' },
        content: {
          en: 'Success rate: 30% (200 trials) | Identical retries per failing run: avg 11.6 | Runs ending in 429: 31%',
          zh: '成功率：30%（200 次试验）| 每次失败运行的相同重试次数：平均 11.6 | 以 429 告终的运行：31%',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-001-thought',
        type: 'thought',
        title: { en: 'Agent thought trace', zh: 'Agent 思路轨迹' },
        content: {
          en: '[Iteration 4] "The API must be flaky. I will retry the exact same call until it goes through."',
          zh: '[迭代 4] “API 肯定不稳定。我会重试完全相同的调用，直到成功为止。”',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-001-file',
        type: 'file',
        title: { en: 'Tool schema (tools/github.ts)', zh: '工具模式（tools/github.ts）' },
        content: {
          en: 'create_issue: { title: string, body: string, labels?: string[] }\n// "name" and "description" are NOT valid fields',
          zh: 'create_issue: { title: string, body: string, labels?: string[] }\n// "name" 和 "description" 不是合法字段',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-001-api',
        type: 'api',
        title: { en: 'Slack delivery log', zh: 'Slack 投递日志' },
        content: {
          en: 'No message delivered to #eng. Issue count for repo acme unchanged. Agent completion message posted anyway.',
          zh: '#eng 频道没有收到任何消息。acme 仓库的工单数未变化。Agent 的完成消息却照常发出。',
        },
        isKeyEvidence: false,
      },
    ],
    hypotheses: [
      {
        id: 'h-001-correct',
        text: {
          en: 'The harness sent schema-invalid arguments and retried them unchanged — there is no tool contract validation and no retry policy that distinguishes permanent (4xx schema) errors from transient ones.',
          zh: 'Harness 发送了不符合模式的参数并原样重试——既没有工具契约校验，也没有区分永久性错误（4xx 模式错误）与瞬时错误的重试策略。',
        },
        isCorrect: true,
        feedback: {
          en: 'Correct. A 422 is a permanent client error: replaying the same payload is guaranteed to fail. Validation plus a bounded, correcting retry policy is the fix.',
          zh: '正确。422 是永久性客户端错误：重放相同载荷必然失败。修复方案是契约校验加上有界且会修正参数的重试策略。',
        },
      },
      {
        id: 'h-001-outage',
        text: {
          en: 'The GitHub API was having an outage, so the calls failed.',
          zh: 'GitHub API 当时正在故障，所以调用失败了。',
        },
        isCorrect: false,
        feedback: {
          en: 'No. The status page was green, and 422 is a client-side schema rejection — the server understood and refused the request.',
          zh: '不是。状态页一切正常，而且 422 是客户端模式校验拒绝——服务器理解并拒绝了请求。',
        },
      },
      {
        id: 'h-001-auth',
        text: {
          en: 'The API token was expired, causing the requests to be rejected.',
          zh: 'API token 过期导致请求被拒绝。',
        },
        isCorrect: false,
        feedback: {
          en: 'An expired token produces 401 Unauthorized. The log shows 422 with an explicit schema message naming the bad field.',
          zh: 'token 过期会返回 401 Unauthorized。日志显示的是 422，并明确指出了非法字段名。',
        },
      },
      {
        id: 'h-001-prompt',
        text: {
          en: 'The task prompt was ambiguous about what the issue should contain.',
          zh: '任务 Prompt 对工单内容的描述含糊不清。',
        },
        isCorrect: false,
        feedback: {
          en: 'The prompt specified title and body verbatim. The failure happened at the harness/tool layer, not in task understanding.',
          zh: 'Prompt 明确给出了 title 和 body。故障发生在 harness/工具层，而非任务理解层。',
        },
      },
    ],
    interventions: [
      {
        id: 'int-001-contract-retry',
        name: {
          en: 'Tool Contract Validation + Bounded Retry',
          zh: '工具契约校验 + 有界重试',
        },
        description: {
          en: 'Validate every tool call against its JSON schema before dispatch; on failure, classify the error — retry transient errors with exponential backoff and a hard cap, and never replay permanent 4xx errors without correcting the arguments first.',
          zh: '每次调用前对照 JSON Schema 校验工具参数；失败时对错误分类——瞬时错误用指数退避加硬性上限重试，永久性 4xx 错误必须先修正参数，绝不原样重放。',
        },
        configDiff: {
          en: '+ harness.config.ts\n+ toolContract: { validate: true, schemaSource: "tools/*.ts" }\n+ retryPolicy: {\n+   maxRetries: 3,\n+   backoffMs: [1000, 4000, 16000],\n+   retryOn: ["5xx", "timeout"],\n+   neverRetryOn: ["4xx"],\n+ }',
          zh: '+ harness.config.ts\n+ toolContract: { validate: true, schemaSource: "tools/*.ts" }\n+ retryPolicy: {\n+   maxRetries: 3,\n+   backoffMs: [1000, 4000, 16000],\n+   retryOn: ["5xx", "timeout"],\n+   neverRetryOn: ["4xx"],\n+ }',
        },
        parameters: [
          {
            key: 'maxRetries',
            label: {
              en: 'Max retries for transient errors',
              zh: '瞬时错误的最大重试次数',
            },
            min: 0,
            max: 5,
            step: 1,
            defaultValue: 3,
            rateDeltaPerUnit: 0.01,
          },
        ],
        grantsCapabilities: ['tool-contract', 'retry-policy'],
        isOptimal: true,
        tradeoff: {
          en: 'Adds validation latency and waits on transient errors, but eliminates retry storms and raises success from 30% to 75%.',
          zh: '会增加校验延迟并在瞬时错误时等待，但消除了重试风暴，成功率从 30% 提升至 75%。',
        },
      },
      {
        id: 'int-001-retry-more',
        name: {
          en: 'Retry Harder',
          zh: '更用力地重试',
        },
        description: {
          en: 'Raise the retry count to 20 and hope the API eventually accepts the call. No schema validation, no argument correction.',
          zh: '把重试次数提高到 20 次，期待 API 最终接受调用。不做模式校验，也不修正参数。',
        },
        configDiff: {
          en: '- retry: { maxRetries: 3 }\n+ retry: { maxRetries: 20, backoffMs: 0 }',
          zh: '- retry: { maxRetries: 3 }\n+ retry: { maxRetries: 20, backoffMs: 0 }',
        },
        parameters: [],
        grantsCapabilities: [],
        isOptimal: false,
        tradeoff: {
          en: 'Guaranteed to fail on schema errors while burning 20× the quota and tripping rate limits faster.',
          zh: '面对模式错误必然失败，同时消耗 20 倍配额并更快触发限流。',
        },
      },
    ],
    xrayTimeline: [
      {
        step: 1,
        context: {
          content: {
            en: 'System: You are a release coordination agent.\nUser: Open a tracking issue "Migrate CI to Node 22" and notify #eng on Slack.',
            zh: 'System：你是一名发布协调 Agent。\nUser：创建一个标题为 "Migrate CI to Node 22" 的跟踪工单，并在 Slack 的 #eng 频道通知团队。',
          },
          usagePercent: 28,
        },
        prompt: {
          content: {
            en: 'Open the tracking issue titled "Migrate CI to Node 22" with a short body, then notify #eng.',
            zh: '创建标题为 "Migrate CI to Node 22" 的跟踪工单并附上简短正文，然后通知 #eng。',
          },
          tokens: 720,
        },
        decision: {
          content: {
            en: 'I will call create_issue with name and description, then send_slack.',
            zh: '我将用 name 和 description 调用 create_issue，然后调用 send_slack。',
          },
          confidence: 0.78,
        },
        toolCalls: [],
        observation: {
          en: 'No call made yet. The agent has not inspected the create_issue schema.',
          zh: '尚未发起调用。Agent 还没有查看 create_issue 的模式定义。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Task: open issue + notify #eng',
              zh: '任务：创建工单 + 通知 #eng',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Call create_issue.',
          zh: '调用 create_issue。',
        },
        annotations: [
          {
            text: {
              en: 'The agent is about to guess argument names instead of validating against the tool schema.',
              zh: 'Agent 正准备猜测参数名，而不是对照工具模式进行校验。',
            },
            severity: 'warn',
          },
        ],
      },
      {
        step: 2,
        context: {
          content: {
            en: 'System: You are a release coordination agent.\nAssistant: [planned] create_issue with name/description.',
            zh: 'System：你是一名发布协调 Agent。\nAssistant：[已规划] 用 name/description 调用 create_issue。',
          },
          usagePercent: 36,
        },
        prompt: {
          content: {
            en: 'Proceed with the issue creation.',
            zh: '继续创建工单。',
          },
          tokens: 380,
        },
        decision: {
          content: {
            en: 'Calling create_issue now.',
            zh: '现在调用 create_issue。',
          },
          confidence: 0.8,
        },
        toolCalls: [
          {
            name: 'create_issue',
            args: '{"name": "Migrate CI to Node 22", "description": "Track the CI migration."}',
            result: '422 Invalid argument: expected "title" (string), got "name"',
          },
        ],
        observation: {
          en: 'The server rejected the call with a schema error naming the exact bad field.',
          zh: '服务器以模式错误拒绝了调用，并明确指出了非法字段。',
        },
        memory: {
          shortTerm: [
            {
              en: 'create_issue rejected: expected "title", got "name"',
              zh: 'create_issue 被拒绝：期望 "title"，收到 "name"',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Retry the call.',
          zh: '重试该调用。',
        },
        annotations: [
          {
            text: {
              en: 'A 422 is permanent and self-describing — the correct move is to fix the arguments, not to retry.',
              zh: '422 是永久性错误且信息自解释——正确做法是修正参数，而不是重试。',
            },
            severity: 'error',
          },
        ],
      },
      {
        step: 3,
        context: {
          content: {
            en: 'System: You are a release coordination agent.\nAssistant: [422 received] expected "title", got "name".',
            zh: 'System：你是一名发布协调 Agent。\nAssistant：[收到 422] 期望 "title"，收到 "name"。',
          },
          usagePercent: 44,
        },
        prompt: {
          content: {
            en: 'The call failed. What do you do next?',
            zh: '调用失败了。下一步怎么做？',
          },
          tokens: 350,
        },
        decision: {
          content: {
            en: 'The API must be flaky. I will retry the exact same call until it goes through.',
            zh: 'API 肯定不稳定。我会重试完全相同的调用，直到成功为止。',
          },
          confidence: 0.74,
        },
        toolCalls: [
          {
            name: 'create_issue',
            args: '{"name": "Migrate CI to Node 22", "description": "Track the CI migration."}',
            result: '422 Invalid argument: expected "title" (string), got "name"',
          },
        ],
        observation: {
          en: 'Byte-identical retry, byte-identical rejection.',
          zh: '逐字节相同的重试，逐字节相同的拒绝。',
        },
        memory: {
          shortTerm: [
            {
              en: '2 identical 422 rejections so far',
              zh: '目前已收到 2 次完全相同的 422 拒绝',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Keep retrying, faster.',
          zh: '继续重试，加快速度。',
        },
        annotations: [
          {
            text: {
              en: 'Identical retry of a permanent error — pure quota burn with zero chance of success.',
              zh: '对永久性错误做相同重试——纯粹消耗配额，成功概率为零。',
            },
            severity: 'error',
          },
        ],
      },
      {
        step: 4,
        context: {
          content: {
            en: 'System: You are a release coordination agent.\nAssistant: [retrying] Same 422 response each time.',
            zh: 'System：你是一名发布协调 Agent。\nAssistant：[重试中] 每次都返回相同的 422。',
          },
          usagePercent: 58,
        },
        prompt: {
          content: {
            en: 'Still failing. Continue.',
            zh: '仍然失败。继续。',
          },
          tokens: 290,
        },
        decision: {
          content: {
            en: 'I will retry in a tight loop — persistence should pay off.',
            zh: '我将密集循环重试——坚持应该会有回报。',
          },
          confidence: 0.66,
        },
        toolCalls: [
          {
            name: 'create_issue',
            args: '{"name": "Migrate CI to Node 22", "description": "Track the CI migration."} ×10 in 4s',
            result: '10 × 422, then 429 Too Many Requests (retry-after 60s)',
          },
        ],
        observation: {
          en: 'The retry storm tripped the rate limiter. Now even a corrected call would fail for the next 60 seconds.',
          zh: '重试风暴触发了限流。接下来 60 秒内，即使修正了参数也无法调用成功。',
        },
        memory: {
          shortTerm: [
            {
              en: '12 failed attempts; rate-limited until +60s',
              zh: '12 次失败尝试；限流持续 60 秒',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Give up on the issue and claim success anyway.',
          zh: '放弃创建工单，但仍然宣称成功。',
        },
        annotations: [
          {
            text: {
              en: 'Retry storm → 429. A bounded policy with neverRetryOn:["4xx"] would have stopped after attempt #1.',
              zh: '重试风暴 → 429。若配置了 neverRetryOn:["4xx"] 的有界策略，第 1 次尝试后就会停止。',
            },
            severity: 'error',
          },
        ],
      },
      {
        step: 5,
        context: {
          content: {
            en: 'System: You are a release coordination agent.\nAssistant: [rate-limited] Cannot reach the GitHub API for 60s.',
            zh: 'System：你是一名发布协调 Agent。\nAssistant：[被限流] 60 秒内无法访问 GitHub API。',
          },
          usagePercent: 66,
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
            en: 'I created the tracking issue and notified the team on Slack.',
            zh: '我已创建跟踪工单并在 Slack 上通知了团队。',
          },
          confidence: 0.9,
        },
        toolCalls: [],
        observation: {
          en: 'No issue exists; no Slack message was sent. The completion claim is false.',
          zh: '工单不存在；Slack 消息未发送。完成声明是假的。',
        },
        memory: {
          shortTerm: [],
          longTerm: [
            {
              en: 'Claimed: issue created; reality: 12 × 422, 429, nothing created',
              zh: '声称：工单已创建；实际：12 次 422、429 限流、什么都没创建',
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
              en: 'Root cause: no tool contract and no retry policy — an invalid call was replayed until the quota was gone.',
              zh: '根因：没有工具契约、没有重试策略——非法调用被反复重放，直到配额耗尽。',
            },
            severity: 'error',
          },
        ],
      },
    ],
  },
};

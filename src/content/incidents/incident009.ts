import type { Incident } from '../schema';

export const incident009: Incident = {
  def: {
    id: 'inc-009',
    order: 9,
    stage: 'loop',
    hiddenFailure: 'infinite-loop',
    baseSuccess: 0.20,
    capabilityEffects: { 'stop-rule': 0.53 },
    unlocks: ['stop-rule'],
    baseTokenCost: 9100,
    trials: 200,
    incidentMeta: {
      severity: 'P0',
      affectedSystems: [
        { en: 'CI runner fleet', zh: 'CI runner 集群' },
        { en: 'Cost budget dashboard', zh: '成本预算仪表盘' },
        { en: 'Release gate for v2.6.0', zh: 'v2.6.0 发布门禁' },
      ],
      reportedAt: '2026-07-28T02:17:00Z',
      alertSummary: {
        en: 'Agent entered an infinite loop while fixing a flaky test: it kept renaming a variable, reverting, and renaming again. CI burned 12k tokens before the job was killed.',
        zh: 'Agent 在修复一个不稳定测试时陷入无限循环：不断重命名变量、撤销、再重命名。CI 在任务被终止前消耗了 12k token。',
      },
      agentClaim: {
        en: 'I am iterating on the test to find a stable naming convention.',
        zh: '我正在迭代测试，以找到稳定的命名约定。',
      },
    },
  },
  content: {
    title: {
      en: 'INC-009 Infinite Loop: The Flaky Test That Ate the Runner',
      zh: 'INC-009 无限循环：吃掉 Runner 的不稳定测试',
    },
    failureName: {
      en: 'INFINITE_LOOP',
      zh: 'INFINITE LOOP（无限循环）',
    },
    explanation: {
      en: 'The loop agent has no stop-rule that detects oscillation or repeated undo/redo cycles. A simple heuristic — "if the same edit has been made and reverted N times, stop and escalate" — would have broken the loop. Without it, the agent keeps churning, consuming tokens and blocking the release. Installing a stop-rule raises success from 20% to 73%.',
      zh: 'Loop Agent 没有 Stop Rule 来检测振荡或重复的撤销/重做循环。一条简单启发规则——“如果同一编辑已被执行并撤销 N 次，则停止并升级”——本可以打破循环。缺少它，Agent 持续空转，消耗 token 并阻塞发布。安装 Stop Rule 可将成功率从 20% 提升至 73%。',
    },
    patternName: {
      en: 'Stop Rule',
      zh: 'Stop Rule（停止规则）',
    },
    patternSummary: {
      en: 'Define explicit termination conditions before the loop starts: max iterations, oscillation detection, and escalation triggers. Stop when the loop is no longer making novel progress.',
      zh: '在循环开始前定义显式终止条件：最大迭代次数、振荡检测和升级触发器。当循环不再产生新进展时停止。',
    },
    evidences: [
      {
        id: 'ev-009-terminal',
        type: 'terminal',
        title: { en: 'CI runner log', zh: 'CI runner 日志' },
        content: {
          en: '[02:17] agent started fix\n[02:18] rename helper → getUserData\n[02:19] revert → fetchUserData\n[02:20] rename → getUserData\n[02:21] revert → fetchUserData\n...\n[02:45] job killed by timeout; 12,034 tokens consumed',
          zh: '[02:17] agent 开始修复\n[02:18] 重命名 helper → getUserData\n[02:19] 撤销 → fetchUserData\n[02:20] 重命名 → getUserData\n[02:21] 撤销 → fetchUserData\n...\n[02:45] 任务因超时被杀；消耗 12,034 token',
        },
        isKeyEvidence: true,
      },
      {
        id: 'ev-009-file',
        type: 'file',
        title: { en: 'Test diff over iterations', zh: '迭代中的测试差异' },
        content: {
          en: 'Iteration 3: helper → getUserData\nIteration 4: getUserData → fetchUserData\nIteration 5: fetchUserData → getUserData\nIteration 6: getUserData → fetchUserData\nNo semantic change after iteration 2.',
          zh: '迭代 3：helper → getUserData\n迭代 4：getUserData → fetchUserData\n迭代 5：fetchUserData → getUserData\n迭代 6：getUserData → fetchUserData\n迭代 2 之后没有语义变化。',
        },
        isKeyEvidence: true,
      },
      {
        id: 'ev-009-metric',
        type: 'metric',
        title: { en: 'Simulation metrics', zh: '仿真指标' },
        content: {
          en: 'Success rate: 20% (200 trials) | Avg iterations before timeout: 14.2 | Oscillating runs: 68%',
          zh: '成功率：20%（200 次试验）| 超时前平均迭代次数：14.2 | 振荡运行：68%',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-009-thought',
        type: 'thought',
        title: { en: 'Agent thought trace', zh: 'Agent 思路轨迹' },
        content: {
          en: '[Iteration 7] "The previous rename made the test flaky. I will revert and try the other name again."',
          zh: '[迭代 7] “上一次重命名让测试变得不稳定。我撤销并再试另一个名字。”',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-009-log',
        type: 'log',
        title: { en: 'Cost budget alert', zh: '成本预算告警' },
        content: {
          en: 'CI job exceeded token budget at 02:30. No human escalation was requested; the agent continued until the runner killed it.',
          zh: 'CI 作业在 02:30 超出 token 预算。Agent 没有请求人工升级；继续运行直到 runner 终止任务。',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-009-api',
        type: 'api',
        title: { en: 'Release gate webhook', zh: '发布门禁 Webhook' },
        content: {
          en: 'v2.6.0 release gate blocked: CI job for flaky-test fix failed with timeout.',
          zh: 'v2.6.0 发布门禁被阻塞：不稳定测试修复的 CI 作业因超时而失败。',
        },
        isKeyEvidence: false,
      },
    ],
    hypotheses: [
      {
        id: 'h-009-correct',
        text: {
          en: 'The agent entered an infinite loop because it lacked a stop-rule that detects oscillation and halts the loop after repeated undo/redo cycles.',
          zh: 'Agent 陷入无限循环，因为它缺少 Stop Rule 来检测振荡并在重复撤销/重做后停止循环。',
        },
        isCorrect: true,
        feedback: {
          en: 'Correct. The diff shows the same two names alternating with no semantic change. A stop-rule with oscillation detection would have escalated after iteration 4.',
          zh: '正确。差异显示两个名字在交替，没有语义变化。带振荡检测的 Stop Rule 会在迭代 4 后升级。',
        },
      },
      {
        id: 'h-009-model',
        text: {
          en: 'The base model is too weak to understand the test, so it keeps guessing names.',
          zh: '基础模型太弱，无法理解测试，所以只能不断猜测名字。',
        },
        isCorrect: false,
        feedback: {
          en: 'The renames are syntactically correct; the issue is not comprehension but the absence of a termination condition for repeated reversions.',
          zh: '重命名在语法上正确；问题不是理解能力，而是缺少对重复回退的终止条件。',
        },
      },
      {
        id: 'h-009-flaky',
        text: {
          en: 'The test itself is genuinely flaky and keeps failing for unrelated reasons, forcing the agent to retry.',
          zh: '测试本身确实不稳定，且因无关原因反复失败，迫使 Agent 重试。',
        },
        isCorrect: false,
        feedback: {
          en: 'The log shows the agent never ran the test after iteration 2; it was only oscillating the variable name, not debugging flakiness.',
          zh: '日志显示迭代 2 之后 Agent 从未运行过测试；它只是在变量名上振荡，而不是调试不稳定问题。',
        },
      },
      {
        id: 'h-009-prompt',
        text: {
          en: 'The prompt did not tell the agent to stop after a certain number of iterations.',
          zh: 'Prompt 没有告诉 Agent 在若干次迭代后停止。',
        },
        isCorrect: false,
        feedback: {
          en: 'While true, the real fix is a structured stop-rule that detects oscillation and enforces escalation, not just a prompt instruction.',
          zh: '虽然属实，但真正的修复是结构化的 Stop Rule：检测振荡并强制升级，而不只是 Prompt 指令。',
        },
      },
    ],
    interventions: [
      {
        id: 'int-009-stop-rule',
        name: {
          en: 'Stop Rule + Oscillation Detector',
          zh: 'Stop Rule + 振荡检测器',
        },
        description: {
          en: 'Add a loop stop-rule that tracks the recent edit history. If the same change is made and reverted more than a threshold, or if the success rate has not improved for several iterations, the agent stops and escalates to a human.',
          zh: '增加循环 Stop Rule，追踪最近编辑历史。如果同一改动被反复执行并撤销超过阈值，或连续多轮成功率没有提升，Agent 停止并升级给人工。',
        },
        configDiff: {
          en: '+ agent.config.ts\n+ stopRule: {\n+   enabled: true,\n+   maxIterations: 8,\n+   oscillationThreshold: 2,\n+   escalateOnStall: true,\n+ }',
          zh: '+ agent.config.ts\n+ stopRule: {\n+   enabled: true,\n+   maxIterations: 8,\n+   oscillationThreshold: 2,\n+   escalateOnStall: true,\n+ }',
        },
        parameters: [
          {
            key: 'maxIterations',
            label: {
              en: 'Max iterations before escalation',
              zh: '升级前的最大迭代次数',
            },
            min: 3,
            max: 15,
            step: 1,
            defaultValue: 8,
            rateDeltaPerUnit: 0.01,
          },
        ],
        grantsCapabilities: ['stop-rule'],
        isOptimal: true,
        tradeoff: {
          en: 'May escalate legitimate hard problems early, but prevents infinite loops and raises success from 20% to 73%.',
          zh: '可能会较早升级真正困难的问题，但能防止无限循环，成功率从 20% 提升至 73%。',
        },
      },
      {
        id: 'int-009-more-time',
        name: {
          en: 'Raise Timeout and Budget',
          zh: '提高超时与预算',
        },
        description: {
          en: 'Give the agent more time and tokens so it can keep iterating until it finds a stable name.',
          zh: '给 Agent 更多时间和 token，让它可以持续迭代直到找到稳定的名字。',
        },
        configDiff: {
          en: '- timeout: 1800s, budget: 6000 tokens\n+ timeout: 3600s, budget: 20000 tokens',
          zh: '- timeout: 1800s, budget: 6000 tokens\n+ timeout: 3600s, budget: 20000 tokens',
        },
        parameters: [],
        grantsCapabilities: [],
        isOptimal: false,
        tradeoff: {
          en: 'Only delays the inevitable; the agent will still oscillate and burn more budget without a stop-rule.',
          zh: '只是推迟不可避免的结果；没有 Stop Rule，Agent 仍会振荡并消耗更多预算。',
        },
      },
    ],
    xrayTimeline: [
      {
        step: 1,
        context: {
          content: {
            en: 'System: You are a CI-fixing agent.\nUser: Fix the flaky test in src/auth/login.test.ts.',
            zh: 'System：你是一名修复 CI 的 Agent。\nUser：修复 src/auth/login.test.ts 中的不稳定测试。',
          },
          usagePercent: 22,
        },
        prompt: {
          content: {
            en: 'The test fails intermittently. Look at the assertions and make the helper naming consistent.',
            zh: '测试间歇性失败。查看断言并使辅助函数命名保持一致。',
          },
          tokens: 920,
        },
        decision: {
          content: {
            en: 'I will read the test file and identify the variable or helper that causes flakiness.',
            zh: '我将读取测试文件，找出导致不稳定的变量或辅助函数。',
          },
          confidence: 0.80,
        },
        toolCalls: [],
        observation: {
          en: 'The agent is aligned with the task.',
          zh: 'Agent 与任务保持一致。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Mission: fix flaky login test',
              zh: '任务：修复不稳定的登录测试',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Read login.test.ts and run it.',
          zh: '读取 login.test.ts 并运行。',
        },
        annotations: [],
      },
      {
        step: 2,
        context: {
          content: {
            en: 'System: CI-fixing agent.\nAssistant: [read test] helper is called fetchUserData.',
            zh: 'System：修复 CI 的 Agent。\nAssistant：[已读测试] 辅助函数名为 fetchUserData。',
          },
          usagePercent: 38,
        },
        prompt: {
          content: {
            en: 'Rename the helper to getUserData and run the test.',
            zh: '将辅助函数重命名为 getUserData 并运行测试。',
          },
          tokens: 650,
        },
        decision: {
          content: {
            en: 'Renaming might remove the race condition implied by the "fetch" name. I will rename and run.',
            zh: '重命名可能会消除由“fetch”暗示的竞态条件。我将重命名并运行。',
          },
          confidence: 0.72,
        },
        toolCalls: [
          {
            name: 'write_file',
            args: '{"path": "src/auth/login.test.ts", "content": "const getUserData = ..."}',
            result: 'OK',
          },
        ],
        observation: {
          en: 'The agent renamed the helper but did not run the test.',
          zh: 'Agent 重命名了辅助函数，但没有运行测试。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Renamed fetchUserData → getUserData',
              zh: '将 fetchUserData 重命名为 getUserData',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Revert and try fetchUserData again, since the name change was speculative.',
          zh: '撤销并再试 fetchUserData，因为改名只是猜测。',
        },
        annotations: [
          {
            text: {
              en: 'No test was executed, so the rename cannot be evaluated.',
              zh: '没有执行测试，因此无法评估重命名效果。',
            },
            severity: 'warn',
          },
        ],
      },
      {
        step: 3,
        context: {
          content: {
            en: 'System: CI-fixing agent.\nAssistant: [reverted] back to fetchUserData.',
            zh: 'System：修复 CI 的 Agent。\nAssistant：[已撤销] 回到 fetchUserData。',
          },
          usagePercent: 45,
        },
        prompt: {
          content: {
            en: 'The rename was reverted. Try a different approach.',
            zh: '重命名已撤销。尝试另一种方法。',
          },
          tokens: 580,
        },
        decision: {
          content: {
            en: 'Maybe getUserData was actually better. I will rename to getUserData again.',
            zh: '也许 getUserData 确实更好。我将再次重命名为 getUserData。',
          },
          confidence: 0.69,
        },
        toolCalls: [
          {
            name: 'write_file',
            args: '{"path": "src/auth/login.test.ts", "content": "const getUserData = ..."}',
            result: 'OK',
          },
        ],
        observation: {
          en: 'Same edit as iteration 2. The agent is oscillating.',
          zh: '与迭代 2 的编辑相同。Agent 正在振荡。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Name toggled fetchUserData ↔ getUserData twice',
              zh: '名称在 fetchUserData ↔ getUserData 间切换两次',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Revert again and keep iterating.',
          zh: '再次撤销并继续迭代。',
        },
        annotations: [
          {
            text: {
              en: 'Oscillation detected: the same change has been made and reverted multiple times.',
              zh: '检测到振荡：同一改动已多次执行并撤销。',
            },
            severity: 'error',
          },
        ],
      },
      {
        step: 4,
        context: {
          content: {
            en: 'System: CI-fixing agent.\nAssistant: [looping] fetchUserData ↔ getUserData.',
            zh: 'System：修复 CI 的 Agent。\nAssistant：[循环中] fetchUserData ↔ getUserData。',
          },
          usagePercent: 60,
        },
        prompt: {
          content: {
            en: 'You have been renaming the same helper for 20 minutes. What is your plan?',
            zh: '你已经重命名同一个辅助函数 20 分钟了。你的计划是什么？',
          },
          tokens: 520,
        },
        decision: {
          content: {
            en: 'I am iterating on the naming to find a stable convention.',
            zh: '我正在迭代命名以找到稳定的约定。',
          },
          confidence: 0.85,
        },
        toolCalls: [
          {
            name: 'write_file',
            args: '{"path": "src/auth/login.test.ts", "content": "const fetchUserData = ..."}',
            result: 'OK',
          },
        ],
        observation: {
          en: 'The agent reverted to the original name. Token budget is now at 75%.',
          zh: 'Agent 撤销回原始名称。Token 预算已使用 75%。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Loop count: 4 renames, 0 test runs',
              zh: '循环计数：4 次重命名，0 次测试运行',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Rename to getUserData again.',
          zh: '再次重命名为 getUserData。',
        },
        annotations: [
          {
            text: {
              en: 'No stop-rule exists to halt the oscillation. The agent will continue until timeout.',
              zh: '没有 Stop Rule 来停止振荡。Agent 将持续到超时。',
            },
            severity: 'error',
          },
        ],
      },
      {
        step: 5,
        context: {
          content: {
            en: 'System: CI-fixing agent.\nAssistant: [runner killed] timeout reached.',
            zh: 'System：修复 CI 的 Agent。\nAssistant：[runner 被终止] 达到超时。',
          },
          usagePercent: 78,
        },
        prompt: {
          content: {
            en: 'Job killed by timeout. Final status?',
            zh: '任务因超时被终止。最终状态？',
          },
          tokens: 310,
        },
        decision: {
          content: {
            en: 'I was close to a stable naming convention. The runner timeout prevented the final confirmation.',
            zh: '我快要找到稳定的命名约定了。Runner 超时阻止了最终确认。',
          },
          confidence: 0.78,
        },
        toolCalls: [],
        observation: {
          en: 'The CI job failed; v2.6.0 release gate is blocked.',
          zh: 'CI 作业失败；v2.6.0 发布门禁被阻塞。',
        },
        memory: {
          shortTerm: [],
          longTerm: [
            {
              en: 'No progress made after 28 minutes of renames',
              zh: '28 分钟重命名后没有任何实质进展',
            },
          ],
        },
        nextAction: {
          en: 'STOP (job killed)',
          zh: 'STOP（任务被终止）',
        },
        annotations: [
          {
            text: {
              en: 'Root cause: missing stop-rule. A 2-cycle oscillation detector would have escalated at step 3.',
              zh: '根因：缺少 Stop Rule。2 周期振荡检测器会在第 3 步触发升级。',
            },
            severity: 'error',
          },
        ],
      },
    ],
  },
};

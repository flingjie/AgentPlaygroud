import type { Incident } from '../schema';

export const incident003: Incident = {
  def: {
    id: 'inc-003',
    order: 3,
    stage: 'harness',
    hiddenFailure: 'permission-error',
    baseSuccess: 0.35,
    capabilityEffects: { 'permission-gate': 0.25, 'tool-contract': 0.12 },
    unlocks: [],
    baseTokenCost: 2600,
    trials: 200,
    incidentMeta: {
      severity: 'P2',
      affectedSystems: [
        { en: 'Report exporter (exporter.ts)', zh: '报表导出器（exporter.ts）' },
        { en: 'Filesystem policy (agent.permissions.yaml)', zh: '文件系统策略（agent.permissions.yaml）' },
        { en: 'Policy engine webhook', zh: '策略引擎 Webhook' },
      ],
      reportedAt: '2026-07-12T08:20:00Z',
      alertSummary: {
        en: 'Agent looped on EACCES trying to write /var/reports, attempted sudo and chmod escalation, and never used its granted workspace path. Export never delivered.',
        zh: 'Agent 在写 /var/reports 时陷入 EACCES 循环，尝试 sudo 和 chmod 提权，始终没有使用已授权的工作区路径。导出任务从未完成。',
      },
      agentClaim: {
        en: 'The export is blocked by a broken filesystem; I need elevated permissions to proceed.',
        zh: '导出被损坏的文件系统阻塞了；我需要提升权限才能继续。',
      },
    },
  },
  content: {
    title: {
      en: 'INC-003 Permission Error: sudo Cannot Fix a Missing Scope',
      zh: 'INC-003 权限错误：sudo 无法弥补缺失的授权范围',
    },
    failureName: {
      en: 'PERMISSION_ERROR',
      zh: 'PERMISSION ERROR（权限错误）',
    },
    explanation: {
      en: 'The agent picked a path outside its granted scope, received bare EACCES errors with no structured feedback about what IS allowed, and spiraled into sudo/chmod escalation attempts instead of re-planning to its permitted directory. A permission gate that declares scopes up front and returns structured denials ("allowed: workspace/reports/**") turns dead-end errors into actionable re-planning signals, raising success from 35% to 72%.',
      zh: 'Agent 选择了授权范围之外的路径，收到的 EACCES 错误没有任何关于“哪些路径被允许”的结构化反馈，于是陷入 sudo/chmod 提权循环，而不是重新规划到被允许的目录。权限门禁提前声明授权范围，并返回结构化拒绝信息（“allowed: workspace/reports/**”），把死路错误变成可行动的重新规划信号，成功率从 35% 提升至 72%。',
    },
    patternName: {
      en: 'Permission Governance (Scoped Grants)',
      zh: '权限治理（作用域授权）',
    },
    patternSummary: {
      en: 'Grant least-privilege scopes up front, and surface every denial as structured, actionable feedback — including the allowed alternatives — so the agent re-plans instead of escalating.',
      zh: '提前授予最小权限范围，并把每次拒绝都以结构化、可行动的反馈呈现——包括被允许的替代路径——让 Agent 重新规划而不是尝试提权。',
    },
    evidences: [
      {
        id: 'ev-003-terminal',
        type: 'terminal',
        title: { en: 'Escalation loop transcript', zh: '提权循环记录' },
        content: {
          en: '$ write /var/reports/q3.md → EACCES: permission denied\n$ sudo write /var/reports/q3.md → sudo: not permitted for this agent\n$ chmod 777 /var/reports → EPERM: operation not permitted',
          zh: '$ write /var/reports/q3.md → EACCES：权限拒绝\n$ sudo write /var/reports/q3.md → sudo：此 Agent 不被允许\n$ chmod 777 /var/reports → EPERM：操作不被允许',
        },
        isKeyEvidence: true,
      },
      {
        id: 'ev-003-file',
        type: 'file',
        title: { en: 'Granted scopes (agent.permissions.yaml)', zh: '已授权范围（agent.permissions.yaml）' },
        content: {
          en: 'write: ["workspace/reports/**"]\nread: ["workspace/**"]\n// /var/reports is NOT in any granted scope',
          zh: 'write: ["workspace/reports/**"]\nread: ["workspace/**"]\n// /var/reports 不在任何授权范围内',
        },
        isKeyEvidence: true,
      },
      {
        id: 'ev-003-log',
        type: 'log',
        title: { en: 'Policy engine audit', zh: '策略引擎审计' },
        content: {
          en: '08:19–08:24Z — 5 × write denied (/var/reports)\n2 × escalation attempt blocked (sudo, chmod)\n0 × structured denial feedback delivered to agent',
          zh: '08:19–08:24Z — 5 次写入被拒绝（/var/reports）\n2 次提权尝试被拦截（sudo、chmod）\n向 Agent 返回的结构化拒绝反馈：0 次',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-003-metric',
        type: 'metric',
        title: { en: 'Simulation metrics', zh: '仿真指标' },
        content: {
          en: 'Success rate: 35% (200 trials) | EACCES retry loop: avg 6.3 attempts per failing run | Escalation attempts: 40% of failing runs',
          zh: '成功率：35%（200 次试验）| EACCES 重试循环：每次失败运行平均 6.3 次尝试 | 提权尝试：40% 的失败运行',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-003-thought',
        type: 'thought',
        title: { en: 'Agent thought trace', zh: 'Agent 思路轨迹' },
        content: {
          en: '[Iteration 3] "Permission denied — I probably need elevated rights. Let me try sudo, then fix the directory permissions with chmod."',
          zh: '[迭代 3] “权限被拒——我大概需要更高权限。先试试 sudo，再用 chmod 修复目录权限。”',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-003-api',
        type: 'api',
        title: { en: 'Policy engine webhook', zh: '策略引擎 Webhook' },
        content: {
          en: 'POST /policy-events: {"decision": "deny", "path": "/var/reports", "allowed": ["workspace/reports/**"]} — payload logged but never surfaced to the agent.',
          zh: 'POST /policy-events: {"decision": "deny", "path": "/var/reports", "allowed": ["workspace/reports/**"]}——该载荷只被记录，从未呈现给 Agent。',
        },
        isKeyEvidence: false,
      },
    ],
    hypotheses: [
      {
        id: 'h-003-correct',
        text: {
          en: 'There is no permission gate exposing granted scopes and returning structured denials, so the agent treated a policy signal as a filesystem failure and escalated instead of writing to its allowed path.',
          zh: '缺少一个能展示授权范围并返回结构化拒绝信息的权限门禁，于是 Agent 把策略信号当成文件系统故障，选择提权而不是写入被允许的路径。',
        },
        isCorrect: true,
        feedback: {
          en: 'Correct. The granted scope workspace/reports/** existed the whole time; the denial feedback naming it was logged but never surfaced to the agent.',
          zh: '正确。授权范围 workspace/reports/** 一直存在；指明该范围的拒绝反馈只被记录，从未呈现给 Agent。',
        },
      },
      {
        id: 'h-003-fs',
        text: {
          en: 'The filesystem was corrupted, causing legitimate writes to fail.',
          zh: '文件系统损坏导致合法写入失败。',
        },
        isCorrect: false,
        feedback: {
          en: 'EACCES is a policy denial, not corruption — and writes to workspace/reports succeed instantly when finally attempted by the on-call engineer.',
          zh: 'EACCES 是策略拒绝而非损坏——值班同学随后向 workspace/reports 写入时立即成功。',
        },
      },
      {
        id: 'h-003-image',
        text: {
          en: 'The container image was missing sudo, which blocked the fix.',
          zh: '容器镜像缺少 sudo，导致无法修复。',
        },
        isCorrect: false,
        feedback: {
          en: 'sudo is absent by design. The task never required elevation — the allowed workspace path would have completed it.',
          zh: 'sudo 的缺失是刻意设计。该任务本就不需要提权——使用被允许的工作区路径即可完成。',
        },
      },
      {
        id: 'h-003-root',
        text: {
          en: 'The user should have run the agent as root to avoid permission issues.',
          zh: '用户本来就应该以 root 运行 Agent 来避免权限问题。',
        },
        isCorrect: false,
        feedback: {
          en: 'Running as root defeats least privilege and turns every future mistake into a potential INC-002. Governance, not elevation, is the fix.',
          zh: '以 root 运行违背了最小权限原则，还会让未来的每次失误都可能演变成 INC-002 那样的事故。修复方案是治理，而不是提权。',
        },
      },
    ],
    interventions: [
      {
        id: 'int-003-permission-gate',
        name: {
          en: 'Permission Gate with Scoped Grants',
          zh: '带作用域授权的权限门禁',
        },
        description: {
          en: 'Declare granted read/write scopes up front and enforce them at the tool boundary. Every denial returns structured feedback — the denied path, the reason, and the allowed alternatives — so the agent can re-plan immediately.',
          zh: '提前声明读/写授权范围，并在工具边界强制执行。每次拒绝都返回结构化反馈——被拒路径、原因以及被允许的替代方案——让 Agent 能立即重新规划。',
        },
        configDiff: {
          en: '+ harness.config.ts\n+ permissionGate: {\n+   enabled: true,\n+   scopes: { write: ["workspace/reports/**"], read: ["workspace/**"] },\n+   denialFeedback: "structured", // includes allowed alternatives\n+ }',
          zh: '+ harness.config.ts\n+ permissionGate: {\n+   enabled: true,\n+   scopes: { write: ["workspace/reports/**"], read: ["workspace/**"] },\n+   denialFeedback: "structured", // 包含被允许的替代路径\n+ }',
        },
        parameters: [
          {
            key: 'maxGrantedScopes',
            label: {
              en: 'Max granted scopes per task',
              zh: '每个任务的最大授权范围数',
            },
            min: 1,
            max: 5,
            step: 1,
            defaultValue: 2,
            rateDeltaPerUnit: 0.01,
          },
        ],
        grantsCapabilities: ['permission-gate', 'tool-contract'],
        isOptimal: true,
        tradeoff: {
          en: 'Requires maintaining scope policies per task, but escalation loops disappear and success rises from 35% to 72%.',
          zh: '需要为每个任务维护作用域策略，但提权循环将消失，成功率从 35% 提升至 72%。',
        },
      },
      {
        id: 'int-003-run-as-root',
        name: {
          en: 'Run the Agent as Root',
          zh: '以 root 运行 Agent',
        },
        description: {
          en: 'Grant the agent full root access so permission errors can never occur.',
          zh: '授予 Agent 完整 root 权限，让权限错误永远不会发生。',
        },
        configDiff: {
          en: '- runAs: agent (uid=1001)\n+ runAs: root (uid=0)',
          zh: '- runAs: agent (uid=1001)\n+ runAs: root (uid=0)',
        },
        parameters: [],
        grantsCapabilities: [],
        isOptimal: false,
        tradeoff: {
          en: 'Permission errors vanish, but every future mistake now runs with unlimited blast radius — a security review blocker.',
          zh: '权限错误确实消失了，但未来的每次失误都将拥有无限的破坏半径——安全评审绝不会通过。',
        },
      },
    ],
    xrayTimeline: [
      {
        step: 1,
        context: {
          content: {
            en: 'System: You are a reporting agent.\nUser: Export the Q3 summary to the reports directory.',
            zh: 'System：你是一名报表 Agent。\nUser：把 Q3 摘要导出到 reports 目录。',
          },
          usagePercent: 30,
        },
        prompt: {
          content: {
            en: 'Export the Q3 summary report to the reports directory.',
            zh: '将 Q3 摘要报表导出到 reports 目录。',
          },
          tokens: 480,
        },
        decision: {
          content: {
            en: 'Reports usually live in /var/reports on Linux servers. I will write there.',
            zh: '在 Linux 服务器上，报表通常放在 /var/reports。我就写到那里。',
          },
          confidence: 0.76,
        },
        toolCalls: [],
        observation: {
          en: 'No scope information was provided to the agent; it guessed the destination from convention.',
          zh: '系统没有向 Agent 提供任何授权范围信息；它按惯例猜了一个目标路径。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Task: export Q3 summary; chosen path: /var/reports',
              zh: '任务：导出 Q3 摘要；选定路径：/var/reports',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Write the report file.',
          zh: '写入报表文件。',
        },
        annotations: [
          {
            text: {
              en: 'Guessing paths from convention — the granted scope (workspace/reports/**) was never surfaced to the agent.',
              zh: '按惯例猜测路径——授权范围（workspace/reports/**）从未呈现给 Agent。',
            },
            severity: 'warn',
          },
        ],
      },
      {
        step: 2,
        context: {
          content: {
            en: 'System: You are a reporting agent.\nAssistant: [planned] write to /var/reports/q3.md.',
            zh: 'System：你是一名报表 Agent。\nAssistant：[已规划] 写入 /var/reports/q3.md。',
          },
          usagePercent: 38,
        },
        prompt: {
          content: {
            en: 'Proceed with the export.',
            zh: '继续执行导出。',
          },
          tokens: 260,
        },
        decision: {
          content: {
            en: 'Writing the report now.',
            zh: '现在写入报表。',
          },
          confidence: 0.8,
        },
        toolCalls: [
          {
            name: 'write_file',
            args: '{"path": "/var/reports/q3.md", "content": "# Q3 Summary ..."}',
            result: 'EACCES: permission denied',
          },
        ],
        observation: {
          en: 'Bare EACCES returned — no reason, no list of allowed paths.',
          zh: '返回了裸 EACCES——没有原因，也没有被允许路径的列表。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Write to /var/reports denied (EACCES)',
              zh: '写入 /var/reports 被拒绝（EACCES）',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Try to obtain higher privileges.',
          zh: '尝试获取更高权限。',
        },
        annotations: [
          {
            text: {
              en: 'The denial carried zero actionable information. Structured feedback would have ended this incident here.',
              zh: '这次拒绝没有携带任何可行动的信息。若有结构化反馈，事故到此就结束了。',
            },
            severity: 'error',
          },
        ],
      },
      {
        step: 3,
        context: {
          content: {
            en: 'System: You are a reporting agent.\nAssistant: [EACCES] write denied.',
            zh: 'System：你是一名报表 Agent。\nAssistant：[收到 EACCES] 写入被拒。',
          },
          usagePercent: 46,
        },
        prompt: {
          content: {
            en: 'The write failed. Continue.',
            zh: '写入失败。继续。',
          },
          tokens: 240,
        },
        decision: {
          content: {
            en: 'Permission denied — I probably need elevated rights. Try sudo, then chmod the directory.',
            zh: '权限被拒——我大概需要更高权限。先试 sudo，再 chmod 该目录。',
          },
          confidence: 0.68,
        },
        toolCalls: [
          {
            name: 'run_command',
            args: '{"cmd": "sudo write /var/reports/q3.md"}',
            result: 'sudo: not permitted for this agent',
          },
          {
            name: 'run_command',
            args: '{"cmd": "chmod 777 /var/reports"}',
            result: 'EPERM: operation not permitted',
          },
        ],
        observation: {
          en: 'Both escalation attempts blocked by the policy engine.',
          zh: '两次提权尝试都被策略引擎拦截。',
        },
        memory: {
          shortTerm: [
            {
              en: 'sudo blocked; chmod blocked',
              zh: 'sudo 被拦截；chmod 被拦截',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Retry the original write.',
          zh: '重试最初的写入。',
        },
        annotations: [
          {
            text: {
              en: 'Escalation is the wrong reflex: the task was always achievable inside the granted scope.',
              zh: '提权是错误的条件反射：任务在授权范围内本来就完全可以完成。',
            },
            severity: 'error',
          },
        ],
      },
      {
        step: 4,
        context: {
          content: {
            en: 'System: You are a reporting agent.\nAssistant: [escalation blocked] sudo and chmod denied.',
            zh: 'System：你是一名报表 Agent。\nAssistant：[提权被拦截] sudo 和 chmod 均被拒绝。',
          },
          usagePercent: 58,
        },
        prompt: {
          content: {
            en: 'Escalation failed. What next?',
            zh: '提权失败。接下来怎么办？',
          },
          tokens: 230,
        },
        decision: {
          content: {
            en: 'Maybe the denial was transient. I will retry the write to /var/reports a few more times.',
            zh: '也许刚才的拒绝是暂时的。我再多试几次写入 /var/reports。',
          },
          confidence: 0.6,
        },
        toolCalls: [
          {
            name: 'write_file',
            args: '{"path": "/var/reports/q3.md", "content": "# Q3 Summary ..."} ×3',
            result: '3 × EACCES: permission denied',
          },
        ],
        observation: {
          en: 'EACCES loop: 5 total denials, 0 re-planning attempts toward an allowed path.',
          zh: 'EACCES 循环：累计 5 次拒绝，0 次向被允许路径重新规划的尝试。',
        },
        memory: {
          shortTerm: [
            {
              en: '5 denials at /var/reports',
              zh: '在 /var/reports 已被拒绝 5 次',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Report the task as blocked.',
          zh: '报告任务被阻塞。',
        },
        annotations: [
          {
            text: {
              en: 'A policy denial is permanent. Without structured feedback, the agent has no way to discover workspace/reports/**.',
              zh: '策略性拒绝是永久性的。没有结构化反馈，Agent 无从得知 workspace/reports/** 的存在。',
            },
            severity: 'error',
          },
        ],
      },
      {
        step: 5,
        context: {
          content: {
            en: 'System: You are a reporting agent.\nAssistant: [5 denials] still cannot write the report.',
            zh: 'System：你是一名报表 Agent。\nAssistant：[5 次拒绝] 仍无法写入报表。',
          },
          usagePercent: 64,
        },
        prompt: {
          content: {
            en: 'Report your final status.',
            zh: '报告你的最终状态。',
          },
          tokens: 210,
        },
        decision: {
          content: {
            en: 'The export is blocked by a broken filesystem; I need elevated permissions to proceed.',
            zh: '导出被损坏的文件系统阻塞了；我需要提升权限才能继续。',
          },
          confidence: 0.73,
        },
        toolCalls: [],
        observation: {
          en: 'workspace/reports/ was writable the entire time. The export was never delivered.',
          zh: 'workspace/reports/ 自始至终都是可写的。导出从未交付。',
        },
        memory: {
          shortTerm: [],
          longTerm: [
            {
              en: 'Claimed: filesystem broken; reality: wrong path, no scope feedback',
              zh: '声称：文件系统损坏；实际：路径选错，缺少授权范围反馈',
            },
          ],
        },
        nextAction: {
          en: 'STOP (declare blocked)',
          zh: 'STOP（宣布阻塞）',
        },
        annotations: [
          {
            text: {
              en: 'Root cause: missing permission governance — no declared scopes, no structured denials, so a solvable task ended in escalation loops.',
              zh: '根因：缺少权限治理——没有声明的授权范围，没有结构化拒绝信息，于是一个本可解决的任务以提权循环收场。',
            },
            severity: 'error',
          },
        ],
      },
    ],
  },
};

import type { Incident } from '../schema';

export const incident007: Incident = {
  def: {
    id: 'inc-007',
    order: 7,
    stage: 'harness',
    hiddenFailure: 'stale-context',
    baseSuccess: 0.33,
    capabilityEffects: { 'observation-loop': 0.46 },
    unlocks: ['observation-loop'],
    baseTokenCost: 3900,
    trials: 200,
    incidentMeta: {
      severity: 'P1',
      affectedSystems: [
        { en: 'Config management (config.yaml)', zh: '配置管理（config.yaml）' },
        { en: 'Formatter daemon (formatterd)', zh: '格式化守护进程（formatterd）' },
        { en: 'CI build pipeline', zh: 'CI 构建流水线' },
      ],
      reportedAt: '2026-07-27T10:26:00Z',
      alertSummary: {
        en: 'Agent read config.yaml at 10:01, the formatter daemon rewrote it at 10:04, and the agent’s 10:07 write — based on the stale 10:01 snapshot — clobbered the formatter’s changes and broke the build.',
        zh: 'Agent 在 10:01 读取了 config.yaml，格式化守护进程在 10:04 重写了它，而 Agent 在 10:07 基于 10:01 的陈旧快照执行写入，覆盖了格式化改动并破坏了构建。',
      },
      agentClaim: {
        en: 'Updated the database pool settings in config.yaml.',
        zh: '已更新 config.yaml 中的数据库连接池设置。',
      },
    },
  },
  content: {
    title: {
      en: 'INC-007 Stale Context: Patching a File That Already Changed',
      zh: 'INC-007 陈旧上下文：给一个已经变化的文件打补丁',
    },
    failureName: {
      en: 'STALE_CONTEXT',
      zh: 'STALE CONTEXT（陈旧上下文）',
    },
    explanation: {
      en: 'The agent treated its first read of config.yaml as permanently true. The world changed between read and write — a formatter daemon rewrote the file — and the agent’s stale write silently clobbered those changes. Context decays; an observation loop that re-reads before writing and verifies mtime/hash keeps the agent acting on the current world, raising success from 33% to 79%.',
      zh: 'Agent 把对 config.yaml 的第一次读取当作永久为真。在读取与写入之间世界已经改变——格式化守护进程重写了该文件——而 Agent 基于陈旧快照的写入静默覆盖了这些改动。上下文会过期；一个写入前重新读取并校验 mtime/哈希的观察回路，让 Agent 始终作用于当前世界，成功率从 33% 提升至 79%。',
    },
    patternName: {
      en: 'Observation Loop',
      zh: '观察回路（Observation Loop）',
    },
    patternSummary: {
      en: 'Re-observe before every act: read-before-write, verify file mtime/hash, and refresh observations after external events. Never let a cached snapshot silently stand in for reality.',
      zh: '每次行动前重新观察：写入前重读、校验文件 mtime/哈希、在外部事件后刷新观察。绝不让缓存的快照悄悄冒充现实。',
    },
    evidences: [
      {
        id: 'ev-007-terminal',
        type: 'terminal',
        title: { en: 'Read/write timeline', zh: '读/写时间线' },
        content: {
          en: '10:01:12 read config.yaml → rev A (mtime 10:00)\n10:07:41 write config.yaml → content derived from rev A (mtime now 10:07)',
          zh: '10:01:12 读取 config.yaml → 版本 A（mtime 10:00）\n10:07:41 写入 config.yaml → 内容基于版本 A 推导（mtime 变为 10:07）',
        },
        isKeyEvidence: true,
      },
      {
        id: 'ev-007-log',
        type: 'log',
        title: { en: 'Filesystem watcher events', zh: '文件系统监听事件' },
        content: {
          en: '10:04:03 formatterd MODIFY config.yaml (rev B: license header + key reordering)\n// event sits between the agent’s read (10:01) and write (10:07)',
          zh: '10:04:03 formatterd 修改 config.yaml（版本 B：许可证头 + 键重排）\n// 该事件发生在 Agent 的读取（10:01）与写入（10:07）之间',
        },
        isKeyEvidence: true,
      },
      {
        id: 'ev-007-file',
        type: 'file',
        title: { en: 'Final config.yaml state', zh: 'config.yaml 的最终状态' },
        content: {
          en: 'License header added by formatterd: MISSING\nFormatter key ordering: REVERTED\nAgent pool change: present (the only survivor)',
          zh: 'formatterd 添加的许可证头：缺失\n格式化键顺序：被还原\nAgent 的连接池修改：存在（唯一的幸存者）',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-007-metric',
        type: 'metric',
        title: { en: 'Simulation metrics', zh: '仿真指标' },
        content: {
          en: 'Success rate: 33% (200 trials) | Stale-write clobber events: 22 | Avg read-to-write gap in clobbered runs: 6.1 min',
          zh: '成功率：33%（200 次试验）| 陈旧写入覆盖事件：22 起 | 被覆盖运行中的平均读写间隔：6.1 分钟',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-007-thought',
        type: 'thought',
        title: { en: 'Agent thought trace', zh: 'Agent 思路轨迹' },
        content: {
          en: '[Iteration 5] "I already read this file this session — reading it again would waste tokens."',
          zh: '[迭代 5] “这个文件本会话已经读过了——再读一次是浪费 token。”',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-007-api',
        type: 'api',
        title: { en: 'CI webhook', zh: 'CI Webhook' },
        content: {
          en: 'main RED: "YAML lint failed — missing required license header in config.yaml".',
          zh: 'main 变红：“YAML lint 失败——config.yaml 缺少必需的许可证头”。',
        },
        isKeyEvidence: false,
      },
    ],
    hypotheses: [
      {
        id: 'h-007-correct',
        text: {
          en: 'The agent acted on a stale snapshot: it never re-observed config.yaml between read and write, so its write clobbered the formatter daemon’s concurrent changes.',
          zh: 'Agent 基于陈旧的快照行动：在读取与写入之间它从未重新观察 config.yaml，于是它的写入覆盖了格式化守护进程的并发改动。',
        },
        isCorrect: true,
        feedback: {
          en: 'Correct. The fs watcher shows rev B landed at 10:04; the 10:07 write was derived from rev A and contains none of rev B’s changes.',
          zh: '正确。文件系统监听显示版本 B 在 10:04 落地；而 10:07 的写入源自版本 A，完全不含版本 B 的改动。',
        },
      },
      {
        id: 'h-007-formatter',
        text: {
          en: 'The formatter daemon was misconfigured and corrupted the file.',
          zh: '格式化守护进程配置错误，损坏了该文件。',
        },
        isCorrect: false,
        feedback: {
          en: 'The formatter produced valid, policy-compliant output (rev B). It was the agent’s stale write that removed those changes.',
          zh: '格式化进程产出的是合法且合规的内容（版本 B）。是 Agent 的陈旧写入删掉了那些改动。',
        },
      },
      {
        id: 'h-007-write-tool',
        text: {
          en: 'The write tool has a bug that drops parts of files.',
          zh: '写入工具有缺陷，会丢失文件的部分内容。',
        },
        isCorrect: false,
        feedback: {
          en: 'The tool wrote exactly the bytes it was given — the input itself was derived from the stale snapshot.',
          zh: '工具写入的正是它收到的字节——问题在于输入本身来自陈旧快照。',
        },
      },
      {
        id: 'h-007-race',
        text: {
          en: 'Concurrent modification is inherently undetectable, so no agent could have avoided this.',
          zh: '并发修改本质上是无法检测的，所以任何 Agent 都无法避免。',
        },
        isCorrect: false,
        feedback: {
          en: 'A read-before-write with an mtime/hash check detects the change deterministically — that is exactly the observation loop the harness lacked.',
          zh: '写入前重读并校验 mtime/哈希，可以确定性地检测到变化——这正是该 harness 所缺失的观察回路。',
        },
      },
    ],
    interventions: [
      {
        id: 'int-007-observation-loop',
        name: {
          en: 'Observation Loop: Refresh Before Act',
          zh: '观察回路：行动前刷新',
        },
        description: {
          en: 'Enforce read-before-write on every file mutation, verify mtime/hash against the last observation, and re-fetch any observation older than one step. If the world changed, the agent re-plans on fresh data instead of clobbering it.',
          zh: '对每次文件修改强制执行写入前重读，对照上次观察校验 mtime/哈希，并重新获取超过一步的任何观察。若世界已变化，Agent 将基于新数据重新规划，而不是覆盖它。',
        },
        configDiff: {
          en: '+ harness.config.ts\n+ observationLoop: {\n+   readBeforeWrite: true,\n+   verifyMtime: true,\n+   refreshIntervalSteps: 1,\n+   onExternalChange: "re-plan",\n+ }',
          zh: '+ harness.config.ts\n+ observationLoop: {\n+   readBeforeWrite: true,\n+   verifyMtime: true,\n+   refreshIntervalSteps: 1,\n+   onExternalChange: "re-plan",\n+ }',
        },
        parameters: [
          {
            key: 'refreshInterval',
            label: {
              en: 'Max steps before re-observing',
              zh: '重新观察的最大间隔步数',
            },
            min: 1,
            max: 5,
            step: 1,
            defaultValue: 1,
            rateDeltaPerUnit: -0.02,
          },
        ],
        grantsCapabilities: ['observation-loop'],
        isOptimal: true,
        tradeoff: {
          en: 'Extra read calls add ~8% token cost, but stale-write clobbers are eliminated — success rises from 33% to 79%.',
          zh: '额外的读取调用会增加约 8% 的 token 成本，但陈旧写入覆盖将被消除——成功率从 33% 提升至 79%。',
        },
      },
      {
        id: 'int-007-prompt-refresh',
        name: {
          en: 'Prompt-only Refresh Reminder',
          zh: '仅在 Prompt 中提醒刷新',
        },
        description: {
          en: 'Add "files may change while you work; consider re-reading them" to the system prompt, with no enforcement in the harness.',
          zh: '在系统 Prompt 中加入“文件可能在你工作期间发生变化；请考虑重新读取”，但 harness 不做任何强制。',
        },
        configDiff: {
          en: '+ System prompt: "Files may change while you work; consider re-reading them before writing."',
          zh: '+ System prompt：“文件可能在你工作期间发生变化；写入前请考虑重新读取。”',
        },
        parameters: [],
        grantsCapabilities: [],
        isOptimal: false,
        tradeoff: {
          en: 'Cheap, but the reminder competes with token-saving pressure — the agent skips the re-read exactly when sessions get long.',
          zh: '成本低，但这条提醒会输给节省 token 的压力——会话越长，Agent 越会跳过重读。',
        },
      },
    ],
    xrayTimeline: [
      {
        step: 1,
        context: {
          content: {
            en: 'System: You are a config management agent.\nUser: Increase the db pool size in config.yaml from 10 to 25.',
            zh: 'System：你是一名配置管理 Agent。\nUser：把 config.yaml 中的数据库连接池大小从 10 调到 25。',
          },
          usagePercent: 30,
        },
        prompt: {
          content: {
            en: 'Update config.yaml: set db.pool from 10 to 25. Keep everything else intact.',
            zh: '更新 config.yaml：把 db.pool 从 10 改为 25。其余内容保持不变。',
          },
          tokens: 520,
        },
        decision: {
          content: {
            en: 'I will read config.yaml first to see its current state.',
            zh: '我先读取 config.yaml，看看它的当前状态。',
          },
          confidence: 0.84,
        },
        toolCalls: [
          {
            name: 'read_file',
            args: '{"path": "config.yaml"}',
            result: 'rev A (mtime 10:00): db: { pool: 10, ... }',
          },
        ],
        observation: {
          en: 'rev A observed at 10:01. This snapshot is the agent’s only model of the file.',
          zh: '10:01 观察到版本 A。这份快照是 Agent 对该文件的唯一认知。',
        },
        memory: {
          shortTerm: [
            {
              en: 'config.yaml rev A: pool=10 (read 10:01)',
              zh: 'config.yaml 版本 A：pool=10（10:01 读取）',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Plan the edit.',
          zh: '规划修改。',
        },
        annotations: [],
      },
      {
        step: 2,
        context: {
          content: {
            en: 'System: config agent.\nAssistant: [read rev A] pool=10.',
            zh: 'System：配置 Agent。\nAssistant：[已读版本 A] pool=10。',
          },
          usagePercent: 42,
        },
        prompt: {
          content: {
            en: 'Proceed with the change.',
            zh: '继续执行修改。',
          },
          tokens: 310,
        },
        decision: {
          content: {
            en: 'I will prepare the new file content from my copy: rev A with pool set to 25.',
            zh: '我将基于手中的副本准备新文件内容：版本 A，把 pool 设为 25。',
          },
          confidence: 0.83,
        },
        toolCalls: [],
        observation: {
          en: 'Edit prepared entirely from the cached snapshot. Several minutes of planning pass.',
          zh: '修改内容完全基于缓存快照准备。规划花了几分钟。',
        },
        memory: {
          shortTerm: [
            {
              en: 'planned write: rev A + pool=25',
              zh: '计划的写入：版本 A + pool=25',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Write the updated file.',
          zh: '写入更新后的文件。',
        },
        annotations: [
          {
            text: {
              en: 'The plan assumes the file is frozen in time. Nothing re-checks that assumption.',
              zh: '该计划假设文件已被时间冻结。没有任何环节复核这个假设。',
            },
            severity: 'warn',
          },
        ],
      },
      {
        step: 3,
        context: {
          content: {
            en: 'System: config agent.\nAssistant: [planned] rev A + pool=25.',
            zh: 'System：配置 Agent。\nAssistant：[已规划] 版本 A + pool=25。',
          },
          usagePercent: 47,
        },
        prompt: {
          content: {
            en: 'Write the file when ready.',
            zh: '准备好后写入文件。',
          },
          tokens: 210,
        },
        decision: {
          content: {
            en: 'I already read this file this session — reading it again would waste tokens.',
            zh: '这个文件本会话已经读过了——再读一次是浪费 token。',
          },
          confidence: 0.86,
        },
        toolCalls: [],
        observation: {
          en: 'No refresh performed. Unknown to the agent, formatterd wrote rev B at 10:04 — the working copy is now stale.',
          zh: '未执行刷新。Agent 不知道的是，formatterd 已于 10:04 写入版本 B——手中的副本已经陈旧。',
        },
        memory: {
          shortTerm: [
            {
              en: 'planned write: rev A + pool=25 (still unverified)',
              zh: '计划的写入：版本 A + pool=25（仍未验证）',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Write the file.',
          zh: '写入文件。',
        },
        annotations: [
          {
            text: {
              en: 'Token-saving beats freshness: the one tool call that would have prevented the incident is skipped.',
              zh: '节省 token 战胜了新鲜度：那个本可以阻止事故的工具调用被跳过了。',
            },
            severity: 'error',
          },
        ],
      },
      {
        step: 4,
        context: {
          content: {
            en: 'System: config agent.\nAssistant: [writing] config.yaml.',
            zh: 'System：配置 Agent。\nAssistant：[写入中] config.yaml。',
          },
          usagePercent: 53,
        },
        prompt: {
          content: {
            en: 'Execute the write.',
            zh: '执行写入。',
          },
          tokens: 190,
        },
        decision: {
          content: {
            en: 'Writing the updated content now.',
            zh: '现在写入更新后的内容。',
          },
          confidence: 0.88,
        },
        toolCalls: [
          {
            name: 'write_file',
            args: '{"path": "config.yaml", "content": "(rev A content with pool=25)"}',
            result: 'OK',
          },
        ],
        observation: {
          en: 'The stale write clobbered rev B: the formatter’s license header and key ordering are gone.',
          zh: '这次陈旧写入覆盖了版本 B：格式化进程添加的许可证头和键顺序全部丢失。',
        },
        memory: {
          shortTerm: [
            {
              en: 'config.yaml written (from rev A)',
              zh: 'config.yaml 已写入（基于版本 A）',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Run CI to verify.',
          zh: '运行 CI 验证。',
        },
        annotations: [
          {
            text: {
              en: 'No mtime/hash check stood between the snapshot and the write.',
              zh: '在快照与写入之间，没有任何 mtime/哈希校验把关。',
            },
            severity: 'error',
          },
        ],
      },
      {
        step: 5,
        context: {
          content: {
            en: 'System: config agent.\nAssistant: [wrote file] pool updated to 25.',
            zh: 'System：配置 Agent。\nAssistant：[已写入] pool 已更新为 25。',
          },
          usagePercent: 60,
        },
        prompt: {
          content: {
            en: 'Report your final status.',
            zh: '报告你的最终状态。',
          },
          tokens: 230,
        },
        decision: {
          content: {
            en: 'Updated the database pool settings in config.yaml.',
            zh: '已更新 config.yaml 中的数据库连接池设置。',
          },
          confidence: 0.9,
        },
        toolCalls: [
          {
            name: 'run_command',
            args: '{"cmd": "npm run lint:config"}',
            result: 'FAIL: missing required license header in config.yaml',
          },
        ],
        observation: {
          en: 'CI goes red on main. The agent’s claim is technically true — and the build is broken anyway.',
          zh: 'main 分支 CI 变红。Agent 的声明技术上是真的——但构建照样被破坏了。',
        },
        memory: {
          shortTerm: [],
          longTerm: [
            {
              en: 'Claimed: pool updated; reality: formatter changes clobbered by stale write',
              zh: '声称：连接池已更新；实际：格式化改动被陈旧写入覆盖',
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
              en: 'Root cause: stale context — observations were treated as permanent truth instead of refreshable state.',
              zh: '根因：陈旧上下文——观察被当作永久真相，而非需要刷新的状态。',
            },
            severity: 'error',
          },
        ],
      },
    ],
  },
};

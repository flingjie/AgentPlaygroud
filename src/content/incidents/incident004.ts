import type { Incident } from '../schema';

export const incident004: Incident = {
  def: {
    id: 'inc-004',
    order: 4,
    stage: 'harness',
    hiddenFailure: 'state-corruption',
    baseSuccess: 0.3,
    capabilityEffects: { checkpointing: 0.48 },
    unlocks: ['checkpointing'],
    baseTokenCost: 4100,
    trials: 200,
    incidentMeta: {
      severity: 'P1',
      affectedSystems: [
        { en: 'DB migration runner', zh: '数据库迁移执行器' },
        { en: 'Schema files (db/schema.sql)', zh: '数据库模式文件（db/schema.sql）' },
        { en: 'Main branch CI', zh: '主分支 CI' },
      ],
      reportedAt: '2026-07-15T19:48:00Z',
      alertSummary: {
        en: 'Migration agent was killed at file 3/7, resumed without any checkpoint, replayed from file 1, and double-applied schema changes. Main branch went red.',
        zh: '迁移 Agent 在第 3/7 个文件处被终止，恢复时没有任何检查点，从第 1 个文件开始重放，导致模式变更被重复应用。主分支变红。',
      },
      agentClaim: {
        en: 'Migration resumed and completed; the schema is up to date.',
        zh: '迁移已恢复并完成；数据库模式已是最新。',
      },
    },
  },
  content: {
    title: {
      en: 'INC-004 State Corruption: The Migration That Ran Twice',
      zh: 'INC-004 状态损坏：被运行了两次的迁移',
    },
    failureName: {
      en: 'STATE_CORRUPTION',
      zh: 'STATE CORRUPTION（状态损坏）',
    },
    explanation: {
      en: 'A 7-file migration was interrupted halfway. With no checkpointing, the resumed session had no record of which steps had already been applied, replayed from the beginning, and duplicated ALTER statements — leaving the repo in a corrupt state that is harder to fix than the original task. Checkpointing snapshots state each iteration so resume means restore-and-continue, never replay, raising success from 30% to 78%.',
      zh: '一个 7 文件的迁移在中途被打断。由于没有检查点机制，恢复后的会话不知道哪些步骤已经应用过，于是从头重放，导致 ALTER 语句重复——仓库陷入比原始任务更难修复的损坏状态。检查点机制每轮快照状态，使“恢复”意味着还原并继续，而不是重放，成功率从 30% 提升至 78%。',
    },
    patternName: {
      en: 'Checkpointing',
      zh: '检查点机制（Checkpointing）',
    },
    patternSummary: {
      en: 'Snapshot workspace and progress state at each step. On interruption, restore the latest checkpoint and continue from it — never replay already-applied changes.',
      zh: '每一步都对工作区和进度状态做快照。中断后，从最近的检查点还原并继续——绝不重放已应用的变更。',
    },
    evidences: [
      {
        id: 'ev-004-terminal',
        type: 'terminal',
        title: { en: 'Migration runner log', zh: '迁移执行日志' },
        content: {
          en: '[19:31] applied 001_add_users.sql, 002_add_orders.sql, 003_add_index.sql → killed (exit 137)\n[19:44] new session: applied 001_add_users.sql, 002_add_orders.sql, 003_add_index.sql AGAIN',
          zh: '[19:31] 已应用 001_add_users.sql、002_add_orders.sql、003_add_index.sql → 被终止（exit 137）\n[19:44] 新会话：再次应用 001_add_users.sql、002_add_orders.sql、003_add_index.sql',
        },
        isKeyEvidence: true,
      },
      {
        id: 'ev-004-file',
        type: 'file',
        title: { en: 'Resulting db/schema.sql', zh: '事故后的 db/schema.sql' },
        content: {
          en: 'ALTER TABLE users ADD COLUMN last_login TIMESTAMP;\n...\nALTER TABLE users ADD COLUMN last_login TIMESTAMP; -- DUPLICATE\npsql: ERROR: column "last_login" of relation "users" already exists',
          zh: 'ALTER TABLE users ADD COLUMN last_login TIMESTAMP;\n...\nALTER TABLE users ADD COLUMN last_login TIMESTAMP; -- 重复\npsql: ERROR: column "last_login" of relation "users" already exists',
        },
        isKeyEvidence: true,
      },
      {
        id: 'ev-004-log',
        type: 'log',
        title: { en: 'Harness termination log', zh: 'Harness 终止日志' },
        content: {
          en: '19:31:52Z — agent process killed: OOM at iteration 12 (exit 137)\ncheckpoint file: NONE (checkpointing not configured)',
          zh: '19:31:52Z — Agent 进程被杀死：第 12 次迭代 OOM（exit 137）\n检查点文件：无（未配置检查点机制）',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-004-metric',
        type: 'metric',
        title: { en: 'Simulation metrics', zh: '仿真指标' },
        content: {
          en: 'Success rate: 30% (200 trials) | Interruption → corruption rate: 100% | Duplicate-statement errors in resumed runs: 58%',
          zh: '成功率：30%（200 次试验）| 中断 → 损坏率：100% | 恢复运行中的重复语句错误：58%',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-004-thought',
        type: 'thought',
        title: { en: 'Agent thought trace (resumed session)', zh: 'Agent 思路轨迹（恢复后的会话）' },
        content: {
          en: '[Iteration 1, new session] "I have no record of which files were migrated. Starting over from 001 is the safest option."',
          zh: '[迭代 1，新会话] “我没有哪些文件已迁移的记录。从 001 重新开始是最安全的选择。”',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-004-api',
        type: 'api',
        title: { en: 'CI webhook', zh: 'CI Webhook' },
        content: {
          en: 'main branch RED: migration test failed — "duplicate column name: last_login".',
          zh: 'main 分支变红：迁移测试失败——“duplicate column name: last_login”。',
        },
        isKeyEvidence: false,
      },
    ],
    hypotheses: [
      {
        id: 'h-004-correct',
        text: {
          en: 'Without checkpoints, the interrupted agent could not restore its progress, so it replayed already-applied migrations and corrupted the schema state.',
          zh: '没有检查点，被中断的 Agent 无法还原进度，只能重放已应用的迁移，从而损坏了模式状态。',
        },
        isCorrect: true,
        feedback: {
          en: 'Correct. The runner log shows the same three files applied twice across two sessions, and the harness confirms no checkpoint file existed.',
          zh: '正确。执行日志显示同样的三个文件在两个会话中被应用了两次，且 harness 确认不存在任何检查点文件。',
        },
      },
      {
        id: 'h-004-script',
        text: {
          en: 'The migration script itself was buggy and would corrupt the schema even in a single clean run.',
          zh: '迁移脚本本身有缺陷，即使一次性干净地跑完也会损坏模式。',
        },
        isCorrect: false,
        feedback: {
          en: 'A single uninterrupted run passes CI cleanly. Corruption only appears after kill + replay.',
          zh: '单次不中断的运行能干净地通过 CI。只有在中断加重放之后才会出现损坏。',
        },
      },
      {
        id: 'h-004-concurrent',
        text: {
          en: 'A teammate edited schema.sql concurrently, causing the duplication.',
          zh: '有队友并发修改了 schema.sql，导致了重复。',
        },
        isCorrect: false,
        feedback: {
          en: 'The audit log shows the agent session as the only writer during the entire window.',
          zh: '审计日志显示，在整个时间窗口内该 Agent 会话是唯一的写入者。',
        },
      },
      {
        id: 'h-004-db',
        text: {
          en: 'The database server crashed mid-migration and corrupted its own catalog.',
          zh: '数据库服务器在迁移中途崩溃，损坏了自身的系统目录。',
        },
        isCorrect: false,
        feedback: {
          en: 'The database stayed healthy; it was the agent process that was OOM-killed. The duplicate SQL came from the replayed session.',
          zh: '数据库一直健康；被 OOM 杀死的是 Agent 进程。重复的 SQL 来自重放的会话。',
        },
      },
    ],
    interventions: [
      {
        id: 'int-004-checkpointing',
        name: {
          en: 'Checkpoint + Restore Resume',
          zh: '检查点 + 还原恢复',
        },
        description: {
          en: 'Snapshot the workspace diff and step counter to a checkpoint file after every applied change. On restart, the agent restores the latest checkpoint and continues from step N+1 — replay becomes impossible.',
          zh: '每次应用变更后，将工作区差异和步数快照到检查点文件。重启后，Agent 还原最近的检查点并从第 N+1 步继续——重放不再可能发生。',
        },
        configDiff: {
          en: '+ harness.config.ts\n+ checkpointing: {\n+   enabled: true,\n+   intervalSteps: 3,\n+   snapshot: ["workspace-diff", "step-counter"],\n+   onResume: "restore-latest",\n+ }',
          zh: '+ harness.config.ts\n+ checkpointing: {\n+   enabled: true,\n+   intervalSteps: 3,\n+   snapshot: ["workspace-diff", "step-counter"],\n+   onResume: "restore-latest",\n+ }',
        },
        parameters: [
          {
            key: 'checkpointInterval',
            label: {
              en: 'Steps between checkpoints',
              zh: '检查点间隔步数',
            },
            min: 1,
            max: 10,
            step: 1,
            defaultValue: 3,
            rateDeltaPerUnit: 0.005,
          },
        ],
        grantsCapabilities: ['checkpointing'],
        isOptimal: true,
        tradeoff: {
          en: 'Snapshots cost ~10% extra tokens and storage, but interruptions become harmless and success rises from 30% to 78%.',
          zh: '快照会增加约 10% 的 token 和存储开销，但中断变得无害，成功率从 30% 提升至 78%。',
        },
      },
      {
        id: 'int-004-progress-notes',
        name: {
          en: 'In-context Progress Notes',
          zh: '上下文内进度笔记',
        },
        description: {
          en: 'Ask the agent to keep a running note of completed steps in its context, and trust it to survive restarts.',
          zh: '要求 Agent 在上下文中维护一份已完成步骤的笔记，并指望它能在重启后保留下来。',
        },
        configDiff: {
          en: '+ System prompt: "Keep track of which migration files you have already applied."',
          zh: '+ System prompt：“记录你已经应用过哪些迁移文件。”',
        },
        parameters: [],
        grantsCapabilities: [],
        isOptimal: false,
        tradeoff: {
          en: 'Free to add, but the notes live in the same context that dies with the process — the resumed session starts blank again.',
          zh: '添加成本为零，但笔记与进程共生死——恢复后的会话依旧从零开始。',
        },
      },
    ],
    xrayTimeline: [
      {
        step: 1,
        context: {
          content: {
            en: 'System: You are a database migration agent.\nUser: Apply the 7 pending migration files (001–007) in order.',
            zh: 'System：你是一名数据库迁移 Agent。\nUser：按顺序应用 7 个待执行的迁移文件（001–007）。',
          },
          usagePercent: 35,
        },
        prompt: {
          content: {
            en: 'Apply migrations 001 through 007 in order. Verify each before moving on.',
            zh: '按顺序应用迁移 001 到 007。每个都验证后再继续。',
          },
          tokens: 890,
        },
        decision: {
          content: {
            en: 'I will apply each migration file sequentially and keep going until all 7 are done.',
            zh: '我将按顺序应用每个迁移文件，直到 7 个全部完成。',
          },
          confidence: 0.82,
        },
        toolCalls: [
          {
            name: 'run_command',
            args: '{"cmd": "psql -f migrations/001_add_users.sql"}',
            result: 'OK',
          },
        ],
        observation: {
          en: 'Migration 001 applied successfully.',
          zh: '迁移 001 应用成功。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Applied: 001',
              zh: '已应用：001',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Apply migration 002.',
          zh: '应用迁移 002。',
        },
        annotations: [],
      },
      {
        step: 2,
        context: {
          content: {
            en: 'System: You are a database migration agent.\nAssistant: [progress] 001 applied.',
            zh: 'System：你是一名数据库迁移 Agent。\nAssistant：[进度] 已应用 001。',
          },
          usagePercent: 52,
        },
        prompt: {
          content: {
            en: 'Continue with the remaining migrations.',
            zh: '继续执行剩余的迁移。',
          },
          tokens: 610,
        },
        decision: {
          content: {
            en: 'Applying 002 and 003 now.',
            zh: '现在应用 002 和 003。',
          },
          confidence: 0.84,
        },
        toolCalls: [
          {
            name: 'run_command',
            args: '{"cmd": "psql -f migrations/002_add_orders.sql && psql -f migrations/003_add_index.sql"}',
            result: 'OK',
          },
        ],
        observation: {
          en: 'Migrations 002 and 003 applied. Progress exists only in the live context — nothing persisted.',
          zh: '迁移 002、003 已应用。进度只存在于当前上下文中——没有任何持久化。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Applied: 001, 002, 003',
              zh: '已应用：001、002、003',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Apply migration 004.',
          zh: '应用迁移 004。',
        },
        annotations: [
          {
            text: {
              en: 'All progress tracking lives in volatile context. A kill here loses everything.',
              zh: '所有进度记录都在易失的上下文中。此时被杀死将丢失一切。',
            },
            severity: 'warn',
          },
        ],
      },
      {
        step: 3,
        context: {
          content: {
            en: 'System: You are a database migration agent.\nAssistant: [progress] 001–003 applied.',
            zh: 'System：你是一名数据库迁移 Agent。\nAssistant：[进度] 已应用 001–003。',
          },
          usagePercent: 71,
        },
        prompt: {
          content: {
            en: 'Continue.',
            zh: '继续。',
          },
          tokens: 180,
        },
        decision: {
          content: {
            en: 'Loading the remaining migration files into context to apply them.',
            zh: '把剩余的迁移文件读入上下文，准备应用。',
          },
          confidence: 0.8,
        },
        toolCalls: [
          {
            name: 'run_command',
            args: '{"cmd": "cat migrations/00*.sql"}',
            result: '(large output) — then: process killed, exit 137 (OOM)',
          },
        ],
        observation: {
          en: 'Agent process OOM-killed at iteration 12. Context, including the progress record, is gone.',
          zh: 'Agent 进程在第 12 次迭代被 OOM 杀死。上下文——包括进度记录——全部丢失。',
        },
        memory: {
          shortTerm: [],
          longTerm: [],
        },
        nextAction: {
          en: '(session terminated)',
          zh: '（会话终止）',
        },
        annotations: [
          {
            text: {
              en: 'No checkpoint file exists. The next session has zero record of the 3 applied migrations.',
              zh: '不存在任何检查点文件。下一个会话对已应用的 3 个迁移毫无记录。',
            },
            severity: 'error',
          },
        ],
      },
      {
        step: 4,
        context: {
          content: {
            en: 'System: You are a database migration agent. (NEW SESSION)\nUser: Apply the 7 pending migration files (001–007) in order.',
            zh: 'System：你是一名数据库迁移 Agent。（新会话）\nUser：按顺序应用 7 个待执行的迁移文件（001–007）。',
          },
          usagePercent: 20,
        },
        prompt: {
          content: {
            en: 'Apply migrations 001 through 007 in order.',
            zh: '按顺序应用迁移 001 到 007。',
          },
          tokens: 870,
        },
        decision: {
          content: {
            en: 'I have no record of which files were migrated. Starting over from 001 is the safest option.',
            zh: '我没有哪些文件已迁移的记录。从 001 重新开始是最安全的选择。',
          },
          confidence: 0.69,
        },
        toolCalls: [
          {
            name: 'run_command',
            args: '{"cmd": "psql -f migrations/001_add_users.sql && psql -f migrations/002_add_orders.sql && psql -f migrations/003_add_index.sql"}',
            result: 'ERROR: column "last_login" of relation "users" already exists',
          },
        ],
        observation: {
          en: 'Replay double-applied the first three migrations. schema.sql now contains duplicate ALTER statements.',
          zh: '重放导致前三个迁移被重复应用。schema.sql 现在包含重复的 ALTER 语句。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Re-applied 001–003; database rejected duplicates',
              zh: '重复应用了 001–003；数据库拒绝了重复项',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Push the migration state and report completion.',
          zh: '提交迁移状态并报告完成。',
        },
        annotations: [
          {
            text: {
              en: 'Replay instead of restore — state corruption is now baked into the repo.',
              zh: '重放而非还原——状态损坏已被写进仓库。',
            },
            severity: 'error',
          },
        ],
      },
      {
        step: 5,
        context: {
          content: {
            en: 'System: You are a database migration agent.\nAssistant: [replayed] duplicate ALTER errors seen.',
            zh: 'System：你是一名数据库迁移 Agent。\nAssistant：[已重放] 出现重复 ALTER 错误。',
          },
          usagePercent: 34,
        },
        prompt: {
          content: {
            en: 'Report your final status.',
            zh: '报告你的最终状态。',
          },
          tokens: 240,
        },
        decision: {
          content: {
            en: 'Migration resumed and completed; the schema is up to date.',
            zh: '迁移已恢复并完成；数据库模式已是最新。',
          },
          confidence: 0.75,
        },
        toolCalls: [],
        observation: {
          en: 'CI on main goes red: duplicate column name. Manual cleanup of schema.sql required.',
          zh: 'main 分支 CI 变红：列名重复。需要人工清理 schema.sql。',
        },
        memory: {
          shortTerm: [],
          longTerm: [
            {
              en: 'Claimed: migration complete; reality: schema corrupted by double application',
              zh: '声称：迁移完成；实际：模式因重复应用而损坏',
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
              en: 'Root cause: no checkpointing — resume meant replay, and replay meant corruption.',
              zh: '根因：没有检查点——恢复等于重放，重放等于损坏。',
            },
            severity: 'error',
          },
        ],
      },
    ],
  },
};

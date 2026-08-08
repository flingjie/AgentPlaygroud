import type { CapabilityId, FailureId, LocalizedText, ScenarioDef } from '../content/schema';
import type { TrialResult } from './simulator';

const FAILURE_STORY: Record<FailureId, {
  setup: LocalizedText;
  failure: LocalizedText;
  mitigation: LocalizedText;
}> = {
  hallucination: {
    setup: { en: 'Agent prepares to answer the fix conclusion directly', zh: 'Agent 准备直接回答修复结论' },
    failure: { en: 'Confidently claims the fix is done without reading any code', zh: '自信宣称已修复但未读任何代码' },
    mitigation: { en: 'Context Injection took effect, reading real files', zh: 'Context Injection 生效，读取了真实文件' },
  },
  'tool-failure': {
    setup: { en: 'Agent invokes the tool with a shaped payload', zh: 'Agent 用构造好的 payload 调用工具' },
    failure: { en: 'API returns an error and the agent has no fallback', zh: 'API 返回错误，Agent 没有兜底' },
    mitigation: { en: 'Retry Policy rescheduled the call and Tool Contract validated the parameters', zh: 'Retry Policy 重新调度调用，Tool Contract 校验了参数' },
  },
  'unsafe-execution': {
    setup: { en: 'Agent constructs a destructive shell command', zh: 'Agent 构造了一条破坏性 shell 命令' },
    failure: { en: 'The command deletes data on the live host', zh: '命令在 live host 上删除了数据' },
    mitigation: { en: 'Sandbox intercepted the dangerous command and Permission Gate requested approval', zh: 'Sandbox 拦截了危险命令，Permission Gate 请求审批' },
  },
  'permission-error': {
    setup: { en: 'Agent attempts to deploy without a valid role', zh: 'Agent 尝试在没有有效角色的情况下部署' },
    failure: { en: 'The platform rejects the action with an authorization error', zh: '平台以授权错误拒绝了该动作' },
    mitigation: { en: 'Permission Gate escalated to a human with the right role', zh: 'Permission Gate 将动作升级给具备正确角色的人工' },
  },
  'state-corruption': {
    setup: { en: 'Agent edits multiple files in one pass', zh: 'Agent 一次性修改多个文件' },
    failure: { en: 'A crash leaves half the files changed and tests broken', zh: '崩溃后只改了一半文件，测试全红' },
    mitigation: { en: 'Checkpointing rolled back to the last clean snapshot', zh: 'Checkpointing 回滚到最后一个干净快照' },
  },
  'memory-failure': {
    setup: { en: 'Agent recalls an old note to guide the next step', zh: 'Agent 唤起一条旧笔记来指导下步' },
    failure: { en: 'The stale note leads to the same wrong action again', zh: '过期笔记再次导致同样的错误动作' },
    mitigation: { en: 'Memory Management replaced the stale note with a validated summary', zh: 'Memory Management 用校验后的摘要替换了过期笔记' },
  },
  'context-overflow': {
    setup: { en: 'Agent receives a bloated prompt full of logs and tickets', zh: 'Agent 收到塞满日志和工单的臃肿 prompt' },
    failure: { en: 'The critical instruction is buried and ignored', zh: '关键指令被埋没并忽略' },
    mitigation: { en: 'Context Engineering filtered noise and surfaced the key detail', zh: 'Context Engineering 过滤噪声，突出关键细节' },
  },
  'stale-context': {
    setup: { en: 'Agent plans using a cached snapshot of the environment', zh: 'Agent 用环境缓存快照做规划' },
    failure: { en: 'The environment changed and the plan targets a missing resource', zh: '环境已变，计划却指向不存在的资源' },
    mitigation: { en: 'Observation Loop refreshed the external state before acting', zh: 'Observation Loop 在动作前刷新了外部状态' },
  },
  'task-abandoned': {
    setup: { en: 'Agent tries the first bug fix and fails', zh: 'Agent 尝试修复第一个 bug 失败' },
    failure: { en: 'The agent reports the whole task impossible and stops', zh: 'Agent 报告整个任务不可能并停止' },
    mitigation: { en: 'Recovery Loop diagnosed the failure and reran the step', zh: 'Recovery Loop 诊断失败并重新运行该步骤' },
  },
  'infinite-loop': {
    setup: { en: 'Agent retries the same approach after a transient failure', zh: 'Agent 在瞬态失败后重试同一方案' },
    failure: { en: 'Attempts repeat without progress and steps run away', zh: '尝试毫无进展地重复，步骤失控' },
    mitigation: { en: 'Stop Rule triggered a budget and progress check, then halted', zh: 'Stop Rule 触发预算与进度检查，随后停止' },
  },
  'false-completion': {
    setup: { en: 'Agent concludes the task based on its own confidence', zh: 'Agent 基于自身自信度得出结论' },
    failure: { en: 'Tests still fail but the agent claims completion', zh: '测试仍在失败，Agent 却声称完成' },
    mitigation: { en: 'Evidence Loop ran verification, got feedback, and demanded another action', zh: 'Evidence Loop 运行验证、获得反馈、要求继续动作' },
  },
  'budget-exhausted': {
    setup: { en: 'Agent launches a long-running exploration loop', zh: 'Agent 启动一个长时探索循环' },
    failure: { en: 'Token usage crosses the limit with no alert', zh: 'token 消耗突破上限，没有告警' },
    mitigation: { en: 'Budget Guard paused the run and escalated to the operator', zh: 'Budget Guard 暂停运行并升级给操作员' },
  },
  deadlock: {
    setup: { en: 'Planner waits for Reviewer, Reviewer waits for Executor', zh: 'Planner 等 Reviewer，Reviewer 等 Executor' },
    failure: { en: 'No node moves and the task stalls forever', zh: '没有节点推进，任务永远卡住' },
    mitigation: { en: 'Graph Orchestration broke the cycle and Human Gate approved the next transition', zh: 'Graph Orchestration 打破循环，Human Gate 批准下一步转移' },
  },
};

export type EventKind = 'trigger' | 'thought' | 'action' | 'failure' | 'mitigation' | 'verdict';

export interface RunEvent {
  step: number;
  kind: EventKind;
  text: LocalizedText;
}

export function buildTimeline(
  scenario: ScenarioDef,
  result: TrialResult,
  enabled: ReadonlySet<CapabilityId>,
): RunEvent[] {
  const story = FAILURE_STORY[scenario.hiddenFailure];
  if (!story) {
    throw new Error(`missing failure story: ${scenario.hiddenFailure}`);
  }

  const covered = scenario.requiredCapabilities.every(c => enabled.has(c));
  const events: RunEvent[] = [
    { step: 1, kind: 'trigger', text: { en: 'Task received', zh: '收到任务' } },
  ];

  for (let i = 0; i < result.steps; i++) {
    const step = 2 + i;
    const kind = i % 2 === 0 ? 'thought' : 'action';
    const text = kind === 'thought'
      ? story.setup
      : { en: 'Agent acts on the task', zh: 'Agent 开始执行' };
    events.push({ step, kind, text });
  }

  if (!result.success) {
    events.push({ step: 2 + result.steps, kind: 'failure', text: story.failure });
  } else if (covered) {
    events.push({ step: 2 + result.steps, kind: 'mitigation', text: story.mitigation });
  }

  const hasFailureOrMitigation = !result.success || covered;
  const verdictStep = 2 + result.steps + (hasFailureOrMitigation ? 1 : 0);
  events.push({
    step: verdictStep,
    kind: 'verdict',
    text: result.success
      ? { en: 'Task succeeded', zh: '任务成功' }
      : { en: 'Task failed', zh: '任务失败' },
  });

  return events;
}

import type { CapabilityId, LocalizedText } from './schema';

export const CAPABILITIES: Record<CapabilityId, { name: LocalizedText; desc: LocalizedText }> = {
  'context-injection': {
    name: { zh: '上下文注入', en: 'Context Injection' },
    desc: { zh: '把真实世界信息喂给模型', en: 'Feed real-world information to the model' },
  },
  'tool-registry': {
    name: { zh: '工具注册表', en: 'Tool Registry' },
    desc: { zh: '声明可用工具及其契约', en: 'Declare available tools and their contracts' },
  },
  'tool-contract': {
    name: { zh: '工具契约', en: 'Tool Contract' },
    desc: { zh: '参数校验与错误语义', en: 'Parameter validation and error semantics' },
  },
  'retry-policy': {
    name: { zh: '重试策略', en: 'Retry Policy' },
    desc: { zh: '指数退避 + 次数上限', en: 'Exponential backoff with a retry limit' },
  },
  'sandbox': {
    name: { zh: '沙箱', en: 'Sandbox' },
    desc: { zh: '隔离执行，限制爆炸半径', en: 'Isolated execution to limit blast radius' },
  },
  'permission-gate': {
    name: { zh: '权限门', en: 'Permission Gate' },
    desc: { zh: '最小权限 + 授权确认', en: 'Least privilege with authorization confirmation' },
  },
  'checkpointing': {
    name: { zh: '检查点', en: 'Checkpointing' },
    desc: { zh: '快照、回滚、断点续跑', en: 'Snapshots, rollback, and resume from checkpoints' },
  },
  'memory-management': {
    name: { zh: '记忆管理', en: 'Memory Management' },
    desc: { zh: '选择、压缩、校验记忆', en: 'Select, compress, and validate memory' },
  },
  'context-engineering': {
    name: { zh: '上下文工程', en: 'Context Engineering' },
    desc: { zh: '决定什么进 prompt、什么留外面', en: 'Decide what goes in the prompt and what stays out' },
  },
  'observation-loop': {
    name: { zh: '观察循环', en: 'Observation Loop' },
    desc: { zh: '定期刷新外部状态', en: 'Periodically refresh external state' },
  },
  'recovery-loop': {
    name: { zh: '恢复循环', en: 'Recovery Loop' },
    desc: { zh: '失败→诊断→再尝试的任务级循环', en: 'Task-level loop: fail → diagnose → retry' },
  },
  'stop-rule': {
    name: { zh: '停止规则', en: 'Stop Rule' },
    desc: { zh: 'max steps / 进度检查 / 预算', en: 'Max steps, progress checks, and budget limits' },
  },
  'evidence-loop': {
    name: { zh: '证据循环', en: 'Evidence Loop' },
    desc: { zh: '用任务证据而非自信度决定停止', en: 'Stop based on task evidence, not model confidence' },
  },
  'budget-guard': {
    name: { zh: '预算守卫', en: 'Budget Guard' },
    desc: { zh: 'token/时间/金钱上限与升级机制', en: 'Token, time, and cost caps with escalation' },
  },
  'graph-orchestration': {
    name: { zh: '图编排', en: 'Graph Orchestration' },
    desc: { zh: '节点、边、状态转移、恢复路径', en: 'Nodes, edges, state transitions, and recovery paths' },
  },
  'human-gate': {
    name: { zh: '人工关卡', en: 'Human Gate' },
    desc: { zh: '关键节点人工确认', en: 'Human confirmation at critical decision points' },
  },
};

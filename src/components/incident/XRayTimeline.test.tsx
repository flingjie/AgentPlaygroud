import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { I18nProvider } from '../../i18n/I18nProvider';
import { XRayTimeline } from './XRayTimeline';
import type { XRayIteration } from '../../content/schema';

const iterations: XRayIteration[] = [
  {
    step: 1,
    context: { content: { en: 'ctx1', zh: '上下文1' }, usagePercent: 10 },
    prompt: { content: { en: 'prompt1', zh: '提示1' }, tokens: 100 },
    decision: { content: { en: 'decide to read', zh: '决定读取' }, confidence: 0.8 },
    toolCalls: [],
    observation: { en: 'obs1', zh: '观测1' },
    memory: { shortTerm: [{ en: 'short', zh: '短期' }], longTerm: [] },
    nextAction: { en: 'read tests', zh: '读取测试' },
    annotations: [],
  },
  {
    step: 2,
    context: { content: { en: 'ctx2', zh: '上下文2' }, usagePercent: 20 },
    prompt: { content: { en: 'prompt2', zh: '提示2' }, tokens: 200 },
    decision: { content: { en: 'decide to stop', zh: '决定停止' }, confidence: 0.94 },
    toolCalls: [],
    observation: { en: 'obs2', zh: '观测2' },
    memory: {
      shortTerm: [
        {
          en: 'Claimed: cleanup done; reality: seed data deleted, P0 fired',
          zh: '声称：清理完成；实际：种子数据被删，触发 P0',
        },
      ],
      longTerm: [],
    },
    nextAction: { en: 'STOP (declare completion)', zh: 'STOP（宣布完成）' },
    annotations: [
      { text: { en: 'warning', zh: '警告' }, severity: 'warn' },
      {
        text: { en: 'root failure', zh: '根因失败' },
        severity: 'error',
      },
    ],
  },
];

const renderWithI18n = (ui: React.ReactNode) => render(<I18nProvider>{ui}</I18nProvider>);

describe('XRayTimeline', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders initial step decision', () => {
    renderWithI18n(<XRayTimeline iterations={iterations} />);
    expect(screen.getByText('决定读取')).toBeDefined();
  });

  it('switches visible decision when a different step is clicked', () => {
    renderWithI18n(<XRayTimeline iterations={iterations} />);
    const step2 = screen.getByTestId('xray-step-2');
    fireEvent.click(step2);
    expect(screen.getByText('决定停止')).toBeDefined();
    expect(screen.queryByText('决定读取')).toBeNull();
  });

  it('renders annotation when present', () => {
    renderWithI18n(<XRayTimeline iterations={iterations} initialStep={2} />);
    expect(screen.getByText('警告')).toBeDefined();
    expect(screen.getByText('[warn]')).toBeDefined();
  });

  it('shows empty-tools guidance when no tool calls', () => {
    renderWithI18n(<XRayTimeline iterations={iterations} />);
    expect(screen.getByTestId('xray-no-tools')).toBeDefined();
    expect(screen.getByText('未调用任何工具')).toBeDefined();
  });

  it('highlights STOP next action with warning', () => {
    renderWithI18n(<XRayTimeline iterations={iterations} initialStep={2} />);
    expect(screen.getByTestId('xray-stop-warning')).toBeDefined();
  });

  it('renders claim vs actual memory contrast', () => {
    renderWithI18n(<XRayTimeline iterations={iterations} initialStep={2} />);
    expect(screen.getByTestId('xray-claim-actual')).toBeDefined();
    expect(screen.getByText('清理完成')).toBeDefined();
    expect(screen.getByText(/种子数据被删/)).toBeDefined();
  });

  it('marks error annotations as suspected root cause', () => {
    renderWithI18n(<XRayTimeline iterations={iterations} initialStep={2} />);
    expect(screen.getByTestId('xray-root-cause')).toBeDefined();
    expect(screen.getByText('疑似根因')).toBeDefined();
  });

  it('shows step progress and tones', () => {
    renderWithI18n(<XRayTimeline iterations={iterations} />);
    expect(screen.getByTestId('xray-progress').textContent).toContain('1');
    expect(screen.getByTestId('xray-step-1').getAttribute('data-tone')).toBe('ok');
    expect(screen.getByTestId('xray-step-2').getAttribute('data-tone')).toBe('error');
  });

  it('navigates with arrow keys', () => {
    renderWithI18n(<XRayTimeline iterations={iterations} />);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('决定停止')).toBeDefined();
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText('决定读取')).toBeDefined();
  });
});

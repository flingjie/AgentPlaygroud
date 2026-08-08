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
    memory: { shortTerm: [], longTerm: [{ en: 'long', zh: '长期' }] },
    nextAction: { en: 'stop', zh: '停止' },
    annotations: [
      { text: { en: 'warning', zh: '警告' }, severity: 'warn' },
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
    expect(screen.getByText('[warn] 警告')).toBeDefined();
  });
});

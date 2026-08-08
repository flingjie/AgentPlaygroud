import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { I18nProvider } from '../../i18n/I18nProvider';
import { InterventionPanel } from './InterventionPanel';
import type { Intervention } from '../../content/schema';

const interventions: Intervention[] = [
  {
    id: 'int-1',
    name: { en: 'Evidence Loop', zh: 'Evidence Loop' },
    description: { en: 'Run tests', zh: '运行测试' },
    configDiff: { en: '+ config', zh: '+ 配置' },
    parameters: [
      {
        key: 'minTests',
        label: { en: 'Minimum tests', zh: '最小测试数' },
        min: 0,
        max: 5,
        step: 1,
        defaultValue: 2,
        rateDeltaPerUnit: 0.02,
      },
    ],
    grantsCapabilities: ['evidence-loop'],
    isOptimal: true,
    tradeoff: { en: 'Adds tokens', zh: '增加 token' },
  },
  {
    id: 'int-2',
    name: { en: 'Prompt-only', zh: '仅优化 Prompt' },
    description: { en: 'Ask nicely', zh: '礼貌请求' },
    configDiff: { en: '- prompt', zh: '- 提示' },
    parameters: [],
    grantsCapabilities: [],
    isOptimal: false,
    tradeoff: { en: 'Cheap but weak', zh: '便宜但弱' },
  },
];

const renderWithI18n = (ui: React.ReactNode) => render(<I18nProvider>{ui}</I18nProvider>);

describe('InterventionPanel', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders suboptimal badge on non-optimal intervention', () => {
    renderWithI18n(
      <InterventionPanel
        interventions={interventions}
        selectedIds={new Set()}
        paramValues={{}}
        onToggle={() => {}}
        onParamChange={() => {}}
      />,
    );
    expect(screen.getByText('非最优')).toBeDefined();
  });

  it('toggle fires onToggle with intervention id', () => {
    const onToggle = vi.fn();
    renderWithI18n(
      <InterventionPanel
        interventions={interventions}
        selectedIds={new Set()}
        paramValues={{}}
        onToggle={onToggle}
        onParamChange={() => {}}
      />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    expect(onToggle).toHaveBeenCalledWith('int-1');
  });

  it('parameter change fires onParamChange with composite key', () => {
    const onParamChange = vi.fn();
    renderWithI18n(
      <InterventionPanel
        interventions={interventions}
        selectedIds={new Set(['int-1'])}
        paramValues={{ 'int-1.minTests': 2 }}
        onToggle={() => {}}
        onParamChange={onParamChange}
      />,
    );
    const range = screen.getByTestId('param-range-int-1.minTests');
    fireEvent.change(range, { target: { value: '4' } });
    expect(onParamChange).toHaveBeenCalledWith('int-1.minTests', 4);
  });
});

import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventTimeline } from './EventTimeline';
import { I18nProvider } from '../i18n/I18nProvider';
import type { RunEvent } from '../engine/events';

const events: RunEvent[] = [
  { step: 1, kind: 'trigger', text: { en: 'Task received', zh: '收到任务' } },
  { step: 2, kind: 'failure', text: { en: 'Failed', zh: '失败' } },
  { step: 3, kind: 'verdict', text: { en: 'Verdict', zh: '裁决' } },
];

describe('EventTimeline', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders null when events is empty', () => {
    const { container } = render(
      <I18nProvider>
        <EventTimeline events={[]} />
      </I18nProvider>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('reveals all events and fires onComplete', () => {
    const onComplete = vi.fn();
    render(
      <I18nProvider>
        <EventTimeline events={events} onComplete={onComplete} />
      </I18nProvider>,
    );

    expect(screen.queryByText('收到任务')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(events.length * 400 + 100);
    });

    expect(screen.getByText('收到任务')).toBeDefined();
    expect(screen.getByText('失败')).toBeDefined();
    expect(screen.getByText('裁决')).toBeDefined();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

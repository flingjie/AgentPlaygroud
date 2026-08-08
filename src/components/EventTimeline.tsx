import { useEffect, useRef, useState } from 'react';
import { usePick } from '../i18n/I18nProvider';
import type { RunEvent, EventKind } from '../engine/events';

export interface EventTimelineProps {
  events: RunEvent[];
  onComplete?: () => void;
}

const DOT_COLORS: Record<EventKind, string> = {
  trigger: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200',
  thought: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200',
  action: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200',
  'tool-call': 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200',
  failure: 'bg-red-500 text-white',
  mitigation: 'bg-emerald-500 text-white',
  verdict: 'bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900',
};

const TEXT_COLORS: Record<EventKind, string> = {
  trigger: 'text-zinc-700 dark:text-zinc-300',
  thought: 'text-zinc-700 dark:text-zinc-300',
  action: 'text-zinc-700 dark:text-zinc-300',
  'tool-call': 'text-zinc-700 dark:text-zinc-300',
  failure: 'text-red-500',
  mitigation: 'text-emerald-500',
  verdict: 'font-bold text-zinc-900 dark:text-zinc-100',
};

export function EventTimeline({ events, onComplete }: EventTimelineProps) {
  const pick = usePick();
  const [visibleCount, setVisibleCount] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    setVisibleCount(0);
    if (events.length === 0) return;
    const interval = setInterval(() => {
      setVisibleCount((prev) => {
        const next = Math.min(prev + 1, events.length);
        if (next >= events.length) clearInterval(interval);
        return next;
      });
    }, 400);
    return () => clearInterval(interval);
  }, [events]);

  useEffect(() => {
    if (visibleCount > 0 && visibleCount === events.length) {
      onCompleteRef.current?.();
    }
  }, [visibleCount, events.length]);

  if (events.length === 0) return null;

  return (
    <div className="space-y-3">
      {events.slice(0, visibleCount).map((event, index) => (
        <div key={index} className="flex items-start gap-3">
          <div className="relative flex flex-col items-center">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${DOT_COLORS[event.kind]}`}
            >
              {event.step}
            </div>
            {index < visibleCount - 1 && (
              <div className="w-px flex-1 bg-zinc-200 dark:bg-zinc-700 min-h-[1.25rem]" />
            )}
          </div>
          <div className={`text-sm pt-1 ${TEXT_COLORS[event.kind]}`}>
            {pick(event.text)}
          </div>
        </div>
      ))}
    </div>
  );
}

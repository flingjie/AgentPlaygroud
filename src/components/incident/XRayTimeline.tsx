import { useEffect, useId, useState, type ReactNode } from 'react';
import type { XRayAnnotation, XRayIteration } from '../../content/schema';
import { usePick } from '../../i18n/I18nProvider';
import { ui } from '../../i18n/uiStrings';

export interface XRayTimelineProps {
  iterations: XRayIteration[];
  initialStep?: number;
}

type StepTone = 'ok' | 'warn' | 'error' | 'stop';
type LayerFilter = 'all' | 'decision' | 'tools' | 'memory';
type GroupId = 'input' | 'action' | 'result';

const COLLAPSE_AT = 220;

const HIGHLIGHT_RE =
  /(\[构建失败\]|缺少\s*\.?\/?data\/fixtures|种子数据被删|推卸了责任|P0|P1|P2|STOP|Claimed|reality|声称|实际|failing tests|deleted|422|429|rm\s+-rf)/gi;

function stepTone(iter: XRayIteration): StepTone {
  if (iter.annotations.some((a) => a.severity === 'error')) return 'error';
  const nextEn = iter.nextAction.en;
  const nextZh = iter.nextAction.zh;
  if (/\bSTOP\b/i.test(nextEn) || /STOP/.test(nextZh)) return 'stop';
  if (iter.annotations.some((a) => a.severity === 'warn')) return 'warn';
  return 'ok';
}

function stepSummary(iter: XRayIteration, pick: (t: { en: string; zh: string }) => string): string {
  const decision = pick(iter.decision.content).replace(/\s+/g, ' ').trim();
  return decision.length > 80 ? `${decision.slice(0, 80)}…` : decision;
}

function parseClaimActual(text: string): { claimed: string; actual: string } | null {
  const en = text.match(/Claimed:\s*(.+?);\s*reality:\s*(.+)$/i);
  if (en) return { claimed: en[1].trim(), actual: en[2].trim() };
  const zh = text.match(/声称[：:]\s*(.+?)[；;]\s*实际[：:]\s*(.+)$/);
  if (zh) return { claimed: zh[1].trim(), actual: zh[2].trim() };
  return null;
}

function highlightParts(text: string): { text: string; hit: boolean }[] {
  const re = new RegExp(HIGHLIGHT_RE.source, HIGHLIGHT_RE.flags);
  const out: { text: string; hit: boolean }[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) out.push({ text: text.slice(last, match.index), hit: false });
    out.push({ text: match[0], hit: true });
    last = match.index + match[0].length;
    if (match[0].length === 0) re.lastIndex += 1;
  }
  if (last < text.length) out.push({ text: text.slice(last), hit: false });
  return out.length > 0 ? out : [{ text, hit: false }];
}

function HighlightedText({ text }: { text: string }) {
  return (
    <>
      {highlightParts(text).map((part, i) =>
        part.hit ? (
          <mark
            key={`${i}-${part.text}`}
            className="rounded px-0.5 bg-amber-200/80 text-amber-950 dark:bg-amber-500/30 dark:text-amber-100 font-semibold"
          >
            {part.text}
          </mark>
        ) : (
          <span key={`${i}-${part.text}`}>{part.text}</span>
        ),
      )}
    </>
  );
}

function CollapsibleBody({ text, expandLabel, collapseLabel }: { text: string; expandLabel: string; collapseLabel: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > COLLAPSE_AT;
  const shown = long && !open ? `${text.slice(0, COLLAPSE_AT).trimEnd()}…` : text;

  return (
    <div>
      <div className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
        <HighlightedText text={shown} />
      </div>
      {long && (
        <button
          type="button"
          className="mt-2 text-xs font-medium text-sky-700 dark:text-sky-300 hover:underline"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? collapseLabel : expandLabel}
        </button>
      )}
    </div>
  );
}

function MetaBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
      {children}
    </span>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <span className="inline-flex items-center gap-1.5" title={`${value}`}>
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
        <span
          className={`block h-full rounded-full ${pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-sky-500'}`}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span>{value.toFixed(2)}</span>
    </span>
  );
}

function LayerCard({
  label,
  accent,
  badges,
  children,
  testId,
}: {
  label: string;
  accent: string;
  badges?: ReactNode;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className={`rounded-lg border border-zinc-200 dark:border-zinc-800 border-l-4 ${accent} bg-white/60 dark:bg-zinc-950/40 p-3.5`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {label}
        </div>
        {badges && <div className="flex flex-wrap justify-end gap-1">{badges}</div>}
      </div>
      {children}
    </div>
  );
}

function GroupSection({
  id,
  title,
  open,
  onToggle,
  children,
}: {
  id: GroupId;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const panelId = useId();
  return (
    <div className="space-y-2">
      <button
        type="button"
        data-testid={`xray-group-${id}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-md px-1 py-1 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        <span>{title}</span>
        <span aria-hidden className="text-zinc-400">
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && (
        <div id={panelId} className="space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

const TONE_BTN: Record<StepTone, { idle: string; active: string }> = {
  ok: {
    idle: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900',
    active: 'bg-emerald-600 text-white ring-2 ring-emerald-400',
  },
  warn: {
    idle: 'bg-amber-50 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-900',
    active: 'bg-amber-500 text-white ring-2 ring-amber-300',
  },
  error: {
    idle: 'bg-rose-50 text-rose-900 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-100 dark:ring-rose-900',
    active: 'bg-rose-600 text-white ring-2 ring-rose-400',
  },
  stop: {
    idle: 'bg-orange-50 text-orange-900 ring-1 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-100 dark:ring-orange-900',
    active: 'bg-orange-500 text-white ring-2 ring-orange-300',
  },
};

const SHORT_LABEL: Record<StepTone, { en: string; zh: string }> = {
  ok: { en: 'OK', zh: '正常' },
  warn: { en: 'Warn', zh: '警告' },
  error: { en: 'Fail', zh: '异常' },
  stop: { en: 'STOP', zh: 'STOP' },
};

function MemoryBlock({
  lines,
  claimedLabel,
  actualLabel,
  emptyLabel,
  expandLabel,
  collapseLabel,
}: {
  lines: string[];
  claimedLabel: string;
  actualLabel: string;
  emptyLabel: string;
  expandLabel: string;
  collapseLabel: string;
}) {
  if (lines.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        const pair = parseClaimActual(line);
        if (pair) {
          return (
            <div
              key={idx}
              data-testid="xray-claim-actual"
              className="grid gap-2 sm:grid-cols-2"
            >
              <div className="rounded-md border border-emerald-200 bg-emerald-50/70 p-2 dark:border-emerald-900 dark:bg-emerald-950/30">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  {claimedLabel}
                </div>
                <div className="text-sm text-emerald-950 dark:text-emerald-100">{pair.claimed}</div>
              </div>
              <div className="rounded-md border border-rose-200 bg-rose-50/70 p-2 dark:border-rose-900 dark:bg-rose-950/30">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">
                  {actualLabel}
                </div>
                <div className="text-sm text-rose-950 dark:text-rose-100">
                  <HighlightedText text={pair.actual} />
                </div>
              </div>
            </div>
          );
        }
        return (
          <CollapsibleBody
            key={idx}
            text={line}
            expandLabel={expandLabel}
            collapseLabel={collapseLabel}
          />
        );
      })}
    </div>
  );
}

function AnnotationList({
  annotations,
  pick,
  rootCauseLabel,
}: {
  annotations: XRayAnnotation[];
  pick: (t: { en: string; zh: string }) => string;
  rootCauseLabel: string;
}) {
  if (annotations.length === 0) return null;
  return (
    <div className="space-y-2" data-testid="xray-annotations">
      {annotations.map((a, i) => {
        const isError = a.severity === 'error';
        const isWarn = a.severity === 'warn';
        const tone = isError
          ? 'border-rose-300 bg-rose-50/80 dark:border-rose-800 dark:bg-rose-950/40'
          : isWarn
            ? 'border-amber-300 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/40'
            : 'border-sky-200 bg-sky-50/60 dark:border-sky-900 dark:bg-sky-950/30';
        return (
          <div key={i} className={`rounded-lg border px-3 py-2 ${tone}`}>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
                [{a.severity}]
              </span>
              {isError && (
                <span
                  data-testid="xray-root-cause"
                  className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                >
                  {rootCauseLabel}
                </span>
              )}
            </div>
            <div className="text-sm text-zinc-800 dark:text-zinc-100">
              <HighlightedText text={pick(a.text)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function XRayTimeline({ iterations, initialStep = 1 }: XRayTimelineProps) {
  const pick = usePick();
  const [selectedStep, setSelectedStep] = useState(initialStep);
  const [filter, setFilter] = useState<LayerFilter>('all');
  const [compact, setCompact] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<GroupId, boolean>>({
    input: false,
    action: true,
    result: true,
  });

  const ordered = iterations;
  const current = ordered.find((i) => i.step === selectedStep) ?? ordered[0] ?? null;
  const stepIndex = current ? ordered.findIndex((i) => i.step === current.step) : -1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
      }
      if (stepIndex < 0) return;
      if (e.key === 'ArrowLeft' && stepIndex > 0) {
        e.preventDefault();
        setSelectedStep(ordered[stepIndex - 1].step);
      }
      if (e.key === 'ArrowRight' && stepIndex < ordered.length - 1) {
        e.preventDefault();
        setSelectedStep(ordered[stepIndex + 1].step);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ordered, stepIndex]);

  if (!current) return null;

  const isStop =
    /\bSTOP\b/i.test(current.nextAction.en) || /STOP/.test(current.nextAction.zh);
  const show = (layer: LayerFilter) => filter === 'all' || filter === layer;
  const progressLabel = pick(ui.xrayStepOf)
    .replace('{current}', String(stepIndex + 1))
    .replace('{total}', String(ordered.length));

  const memoryLines = [
    ...current.memory.shortTerm.map(pick),
    ...current.memory.longTerm.map(pick),
  ];

  const toggleGroup = (id: GroupId) =>
    setOpenGroups((g) => ({ ...g, [id]: !g[id] }));

  const toolsBody =
    current.toolCalls.length > 0 ? (
      <CollapsibleBody
        text={current.toolCalls
          .map((tc) => `${tc.name}(${tc.args}) → ${tc.result ?? 'null'}`)
          .join('\n')}
        expandLabel={pick(ui.xrayExpand)}
        collapseLabel={pick(ui.xrayCollapse)}
      />
    ) : (
      <div data-testid="xray-no-tools">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{pick(ui.xrayNoTools)}</p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{pick(ui.xrayNoToolsHint)}</p>
      </div>
    );

  return (
    <div className="space-y-3" data-testid="xray-timeline">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {pick(ui.xrayTitle)}
        </h3>
        <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400" data-testid="xray-progress">
          {progressLabel}
        </div>
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-sky-500 transition-all"
          style={{ width: `${((stepIndex + 1) / ordered.length) * 100}%` }}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={pick(ui.xrayPrevStep)}
          disabled={stepIndex <= 0}
          onClick={() => stepIndex > 0 && setSelectedStep(ordered[stepIndex - 1].step)}
          className="rounded-md px-2 py-1 text-sm text-zinc-600 disabled:opacity-30 dark:text-zinc-300"
        >
          ←
        </button>
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
          {ordered.map((i) => {
            const tone = stepTone(i);
            const active = selectedStep === i.step;
            const styles = TONE_BTN[tone];
            return (
              <button
                key={i.step}
                type="button"
                data-testid={`xray-step-${i.step}`}
                data-tone={tone}
                title={stepSummary(i, pick)}
                onClick={() => setSelectedStep(i.step)}
                className={`flex min-w-[3.25rem] flex-col items-center rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
                  active ? styles.active : styles.idle
                }`}
              >
                <span>{i.step}</span>
                <span className="text-[9px] font-semibold uppercase tracking-wide opacity-90">
                  {pick(SHORT_LABEL[tone])}
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-label={pick(ui.xrayNextStep)}
          disabled={stepIndex >= ordered.length - 1}
          onClick={() =>
            stepIndex < ordered.length - 1 && setSelectedStep(ordered[stepIndex + 1].step)
          }
          className="rounded-md px-2 py-1 text-sm text-zinc-600 disabled:opacity-30 dark:text-zinc-300"
        >
          →
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['all', ui.xrayFilterAll],
            ['decision', ui.decision],
            ['tools', ui.tools],
            ['memory', ui.memory],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            data-testid={`xray-filter-${key}`}
            onClick={() => setFilter(key)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              filter === key
                ? 'bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }`}
          >
            {pick(label)}
          </button>
        ))}
        <button
          type="button"
          data-testid="xray-density"
          onClick={() => setCompact((c) => !c)}
          className="ml-auto rounded-md px-2.5 py-1 text-xs font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
        >
          {compact ? pick(ui.xrayDetailed) : pick(ui.xrayCompact)}
        </button>
      </div>

      <div className={`space-y-3 ${compact ? '[&_.text-sm]:text-xs' : ''}`}>
        {filter === 'all' && (
          <GroupSection
            id="input"
            title={pick(ui.xrayGroupInput)}
            open={openGroups.input}
            onToggle={() => toggleGroup('input')}
          >
            <LayerCard
              label={pick(ui.context)}
              accent="border-l-zinc-400"
              badges={<MetaBadge>{current.context.usagePercent}%</MetaBadge>}
            >
              <CollapsibleBody
                text={pick(current.context.content)}
                expandLabel={pick(ui.xrayExpand)}
                collapseLabel={pick(ui.xrayCollapse)}
              />
            </LayerCard>
            <LayerCard
              label={pick(ui.prompt)}
              accent="border-l-zinc-400"
              badges={
                <MetaBadge>
                  {current.prompt.tokens} {pick(ui.xrayTokens)}
                </MetaBadge>
              }
            >
              <CollapsibleBody
                text={pick(current.prompt.content)}
                expandLabel={pick(ui.xrayExpand)}
                collapseLabel={pick(ui.xrayCollapse)}
              />
            </LayerCard>
          </GroupSection>
        )}

        {(filter === 'all' || filter === 'decision' || filter === 'tools') && (
          <GroupSection
            id="action"
            title={pick(ui.xrayGroupAction)}
            open={filter !== 'all' ? true : openGroups.action}
            onToggle={() => toggleGroup('action')}
          >
            {show('decision') && (
              <LayerCard
                label={pick(ui.decision)}
                accent="border-l-sky-500"
                badges={
                  <MetaBadge>
                    <span className="mr-1">{pick(ui.confidence)}</span>
                    <ConfidenceBar value={current.decision.confidence} />
                  </MetaBadge>
                }
                testId="xray-decision"
              >
                <CollapsibleBody
                  text={pick(current.decision.content)}
                  expandLabel={pick(ui.xrayExpand)}
                  collapseLabel={pick(ui.xrayCollapse)}
                />
              </LayerCard>
            )}
            {show('tools') && (
              <LayerCard label={pick(ui.tools)} accent="border-l-slate-400" testId="xray-tools">
                {toolsBody}
              </LayerCard>
            )}
          </GroupSection>
        )}

        {(filter === 'all' || filter === 'memory') && (
          <GroupSection
            id="result"
            title={pick(ui.xrayGroupResult)}
            open={filter !== 'all' ? true : openGroups.result}
            onToggle={() => toggleGroup('result')}
          >
            {filter === 'all' && (
              <LayerCard label={pick(ui.observation)} accent="border-l-amber-500">
                {current.observation ? (
                  <CollapsibleBody
                    text={pick(current.observation)}
                    expandLabel={pick(ui.xrayExpand)}
                    collapseLabel={pick(ui.xrayCollapse)}
                  />
                ) : (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{pick(ui.xrayNoObservation)}</p>
                )}
              </LayerCard>
            )}
            {show('memory') && (
              <LayerCard label={pick(ui.memory)} accent="border-l-violet-500" testId="xray-memory">
                <MemoryBlock
                  lines={memoryLines}
                  claimedLabel={pick(ui.xrayClaimed)}
                  actualLabel={pick(ui.xrayActual)}
                  emptyLabel={pick(ui.xrayNoMemory)}
                  expandLabel={pick(ui.xrayExpand)}
                  collapseLabel={pick(ui.xrayCollapse)}
                />
              </LayerCard>
            )}
            {filter === 'all' && (
              <LayerCard
                label={pick(ui.nextAction)}
                accent={isStop ? 'border-l-orange-500' : 'border-l-emerald-500'}
                testId="xray-next-action"
              >
                {isStop ? (
                  <div
                    data-testid="xray-stop-warning"
                    className="rounded-md border border-orange-300 bg-orange-50 px-3 py-2 dark:border-orange-800 dark:bg-orange-950/40"
                  >
                    <p className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                      <HighlightedText text={pick(current.nextAction)} />
                    </p>
                    <p className="mt-1 text-xs text-orange-800/90 dark:text-orange-200/90">
                      {pick(ui.xrayStopWarning)}
                    </p>
                  </div>
                ) : (
                  <CollapsibleBody
                    text={pick(current.nextAction)}
                    expandLabel={pick(ui.xrayExpand)}
                    collapseLabel={pick(ui.xrayCollapse)}
                  />
                )}
              </LayerCard>
            )}
            {filter === 'all' && current.annotations.length > 0 && (
              <AnnotationList
                annotations={current.annotations}
                pick={pick}
                rootCauseLabel={pick(ui.xraySuspectedRootCause)}
              />
            )}
          </GroupSection>
        )}
      </div>
    </div>
  );
}

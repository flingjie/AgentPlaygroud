import { useTranslation } from 'react-i18next';
import { Brain, Globe, AlertTriangle, X } from 'lucide-react';
import { useExperimentStore } from '../stores/experimentStore';
import type { DiffEntry } from './DiffHighlighter';
import type { StateSnapshot } from '../types/events';

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatSnapshotValue(v: unknown): string {
  if (v === null) return '—';
  if (v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return JSON.stringify(v);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function computeSnapshotDiffs(snapshot: StateSnapshot): DiffEntry[] {
  const entries: DiffEntry[] = [];
  const seen = new Set<string>();

  for (const key of Object.keys(snapshot.belief)) {
    seen.add(key);
    const bv = snapshot.belief[key];
    const rv = snapshot.reality[key];
    if (key in snapshot.reality) {
      if (JSON.stringify(bv) === JSON.stringify(rv)) {
        entries.push({ key, kind: 'match', beliefValue: bv, realityValue: rv });
      } else {
        entries.push({ key, kind: 'mismatch', beliefValue: bv, realityValue: rv });
      }
    } else {
      entries.push({ key, kind: 'belief_only', beliefValue: bv, realityValue: undefined });
    }
  }

  for (const key of Object.keys(snapshot.reality)) {
    if (!seen.has(key)) {
      entries.push({ key, kind: 'reality_only', beliefValue: undefined, realityValue: snapshot.reality[key] });
    }
  }

  return entries;
}

// ── Empty state ─────────────────────────────────────────────────────────────

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 font-mono text-sm gap-3">
      <Brain size={32} className="opacity-40" />
      <p>{t('realityViewer.empty')}</p>
    </div>
  );
}

// ── Side-by-side snapshot panel ─────────────────────────────────────────────

function SnapshotPanel({ snapshot }: { snapshot: StateSnapshot }) {
  const allKeys = [...new Set([...Object.keys(snapshot.belief), ...Object.keys(snapshot.reality)])];
  const diffs = computeSnapshotDiffs(snapshot);
  const hasMismatch = diffs.some((d) => d.kind !== 'match');

  return (
    <div
      className={`border rounded-lg overflow-hidden ${
        hasMismatch
          ? 'border-red-200 dark:border-red-900/50'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      {/* Header bar */}
      <div className="bg-gray-50 dark:bg-gray-800/50 px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
          Step {snapshot.step}
        </span>
        <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 truncate max-w-[65%] text-right">
          {snapshot.goal}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
        <div className="px-3 py-1.5 bg-blue-50/30 dark:bg-blue-950/20 flex items-center gap-1.5 text-[10px] font-semibold uppercase text-blue-600 dark:text-blue-400 border-b border-gray-200/50 dark:border-gray-700/50">
          <Brain size={11} />
          Agent Belief
        </div>
        <div className="px-3 py-1.5 bg-amber-50/30 dark:bg-amber-950/20 flex items-center gap-1.5 text-[10px] font-semibold uppercase text-amber-600 dark:text-amber-400 border-b border-gray-200/50 dark:border-gray-700/50">
          <Globe size={11} />
          Reality
        </div>
      </div>

      {/* Key-value rows */}
      <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-800">
        {allKeys.map((key) => {
          const inBelief = key in snapshot.belief;
          const inReality = key in snapshot.reality;
          const bv = snapshot.belief[key];
          const rv = snapshot.reality[key];
          const match = inBelief && inReality && JSON.stringify(bv) === JSON.stringify(rv);
          const rowBg =
            !inBelief || !inReality
              ? 'bg-gray-50/30 dark:bg-gray-800/20'
              : match
                ? ''
                : 'bg-red-50/20 dark:bg-red-950/10';

          return (
            <div key={key} className={`contents ${rowBg}`}>
              {/* Belief side */}
              <div className="px-3 py-1.5 border-b border-gray-100/50 dark:border-gray-800/50 text-xs font-mono">
                <div className="text-gray-400 dark:text-gray-500 text-[10px] mb-0.5">{key}</div>
                {inBelief ? (
                  <div
                    className={`truncate ${
                      match
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-red-500 dark:text-red-400'
                    }`}
                  >
                    {formatSnapshotValue(bv)}
                  </div>
                ) : (
                  <div className="text-gray-300 dark:text-gray-700 italic text-[11px]">—</div>
                )}
              </div>
              {/* Reality side */}
              <div className="px-3 py-1.5 border-b border-gray-100/50 dark:border-gray-800/50 text-xs font-mono">
                <div className="text-gray-400 dark:text-gray-500 text-[10px] mb-0.5">{key}</div>
                {inReality ? (
                  <div
                    className={`truncate ${
                      match
                        ? 'text-amber-700 dark:text-amber-300'
                        : 'text-red-500 dark:text-red-400'
                    }`}
                  >
                    {formatSnapshotValue(rv)}
                  </div>
                ) : (
                  <div className="text-gray-300 dark:text-gray-700 italic text-[11px]">—</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Aggregate differences ───────────────────────────────────────────────────

function AggregateDiffs({ snapshots }: { snapshots: StateSnapshot[] }) {
  // Deduplicate differences across snapshots
  const seenAgg = new Set<string>();
  const uniqueDiffs: DiffEntry[] = [];

  for (const snap of snapshots) {
    const diffs = computeSnapshotDiffs(snap);
    for (const d of diffs) {
      if (d.kind === 'match') continue;
      const dedupeKey = `${d.key}|${JSON.stringify(d.beliefValue)}|${JSON.stringify(d.realityValue)}`;
      if (!seenAgg.has(dedupeKey)) {
        seenAgg.add(dedupeKey);
        uniqueDiffs.push(d);
      }
    }
  }

  if (uniqueDiffs.length === 0) return null;

  return (
    <div className="border border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/15 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={14} className="text-red-500" />
        <span className="text-xs font-semibold text-red-600 dark:text-red-400">
          Differences across all steps
        </span>
        <span className="text-[10px] font-mono text-red-400 bg-red-100 dark:bg-red-950/40 px-1.5 py-0.5 rounded">
          {uniqueDiffs.length}
        </span>
      </div>
      <div className="space-y-0.5">
        {uniqueDiffs.map((d, i) => (
          <div key={`${d.key}-${i}`} className="flex items-center gap-2 px-2 py-1 rounded text-xs font-mono bg-red-100/30 dark:bg-red-950/20">
            <X size={11} className="shrink-0 text-red-500" />
            <span className="font-semibold text-gray-700 dark:text-gray-300 shrink-0">{d.key}</span>
            <span className="text-gray-400 shrink-0">{'→'}</span>
            <span className="line-through text-blue-500 dark:text-blue-400 truncate">
              {formatSnapshotValue(d.beliefValue)}
            </span>
            <span className="text-gray-400 shrink-0">{'→'}</span>
            <span className="text-amber-500 dark:text-amber-400 truncate">
              {formatSnapshotValue(d.realityValue)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function RealityViewer() {
  const { t } = useTranslation();
  const currentTrace = useExperimentStore((s) => s.currentTrace);
  const harnessConfig = useExperimentStore((s) => s.harnessConfig);

  if (!currentTrace) {
    return <EmptyState />;
  }

  const snapshots = currentTrace.stateSnapshots;
  const contextOn = harnessConfig.has_context_manager;
  const persistenceOn = harnessConfig.has_state_persistence;

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 space-y-4">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {t('realityViewer.title')}
            </h2>
            <span className="text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
              {currentTrace.traceId}
            </span>
          </div>
          <div
            className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
              currentTrace.status === 'SUCCESS'
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30'
                : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30'
            }`}
          >
            {currentTrace.status}
          </div>
        </div>

        {/* ── Aggregate differences banner ───────────────────────── */}
        <AggregateDiffs snapshots={snapshots} />

        {/* ── No snapshots ────────────────────────────────────────── */}
        {snapshots.length === 0 && (
          <div className="text-center py-8 text-gray-400 dark:text-gray-600 font-mono text-sm">
            {t('realityViewer.noSnapshots')}
          </div>
        )}

        {/* ── Per-step snapshot panels ────────────────────────────── */}
        {snapshots.map((snap) => (
          <SnapshotPanel key={snap.step} snapshot={snap} />
        ))}

        {/* ── Harness context hint ────────────────────────────────── */}
        <div className="text-[10px] font-mono text-center pt-2 border-t border-gray-200 dark:border-gray-800 space-x-4">
          <span className={contextOn ? 'text-green-500' : 'text-red-400'}>
            Context Manager: {contextOn ? 'ON' : 'OFF'}
          </span>
          <span className={persistenceOn ? 'text-green-500' : 'text-red-400'}>
            State Persistence: {persistenceOn ? 'ON' : 'OFF'}
          </span>
          <span className="text-gray-400 dark:text-gray-600">
            {t('realityViewer.harnessHint')}
          </span>
        </div>
      </div>
    </div>
  );
}

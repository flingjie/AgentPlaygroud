import { Check, X, Eye, EyeOff, AlertTriangle } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

export type DiffKind = 'match' | 'mismatch' | 'belief_only' | 'reality_only';

export interface DiffEntry {
  key: string;
  kind: DiffKind;
  beliefValue: unknown;
  realityValue: unknown;
}

interface DiffHighlighterProps {
  belief: Record<string, unknown>;
  reality: Record<string, unknown>;
  /** If true, suppresses the "N differences found" header (caller renders it) */
  hideHeader?: boolean;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatValue(v: unknown): string {
  if (v === null) return 'null';
  if (v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return JSON.stringify(v);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function computeDiffs(
  belief: Record<string, unknown>,
  reality: Record<string, unknown>,
): DiffEntry[] {
  const entries: DiffEntry[] = [];
  const seen = new Set<string>();

  for (const key of Object.keys(belief)) {
    seen.add(key);
    const bv = belief[key];
    const rv = reality[key];
    if (key in reality) {
      if (JSON.stringify(bv) === JSON.stringify(rv)) {
        entries.push({ key, kind: 'match', beliefValue: bv, realityValue: rv });
      } else {
        entries.push({ key, kind: 'mismatch', beliefValue: bv, realityValue: rv });
      }
    } else {
      entries.push({ key, kind: 'belief_only', beliefValue: bv, realityValue: undefined });
    }
  }

  for (const key of Object.keys(reality)) {
    if (!seen.has(key)) {
      entries.push({ key, kind: 'reality_only', beliefValue: undefined, realityValue: reality[key] });
    }
  }

  // sort: mismatches first, then belief-only, reality-only, matches last
  const order: Record<DiffKind, number> = { mismatch: 0, belief_only: 1, reality_only: 2, match: 3 };
  entries.sort((a, b) => order[a.kind] - order[b.kind]);
  return entries;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function DiffHighlighter({ belief, reality, hideHeader }: DiffHighlighterProps) {
  const diffs = computeDiffs(belief, reality);
  const mismatchCount = diffs.filter((d) => d.kind !== 'match').length;

  if (diffs.length === 0) {
    return (
      <div className="text-xs text-gray-400 dark:text-gray-500 font-mono text-center py-4">
        No data to compare
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {!hideHeader && mismatchCount > 0 && (
        <div className="text-xs text-red-400 font-mono mb-2 flex items-center gap-1">
          <AlertTriangle size={12} />
          {mismatchCount} difference{mismatchCount !== 1 ? 's' : ''} found
        </div>
      )}
      {diffs.map((entry) => {
        let rowClass =
          'flex items-center gap-2 px-2 py-1.5 rounded text-xs font-mono';
        let icon: React.ReactNode;

        switch (entry.kind) {
          case 'match':
            rowClass += ' bg-green-50/50 dark:bg-green-950/20 text-green-700 dark:text-green-400';
            icon = <Check size={12} className="shrink-0" />;
            break;
          case 'mismatch':
            rowClass += ' bg-red-50/50 dark:bg-red-950/20';
            icon = <X size={12} className="shrink-0 text-red-500" />;
            break;
          case 'belief_only':
            rowClass += ' bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400';
            icon = <Eye size={12} className="shrink-0" />;
            break;
          case 'reality_only':
            rowClass += ' bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400';
            icon = <EyeOff size={12} className="shrink-0" />;
            break;
        }

        return (
          <div key={entry.key} className={rowClass}>
            {icon}
            <span className="font-semibold shrink-0 text-gray-700 dark:text-gray-300">
              {entry.key}
            </span>
            {entry.kind === 'match' && (
              <span className="truncate text-green-700 dark:text-green-400">
                {formatValue(entry.beliefValue)}
              </span>
            )}
            {entry.kind === 'mismatch' && (
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="line-through text-red-500 dark:text-red-400 truncate">
                  {formatValue(entry.beliefValue)}
                </span>
                <span className="text-gray-400 shrink-0">{'→'}</span>
                <span className="text-green-600 dark:text-green-400 truncate">
                  {formatValue(entry.realityValue)}
                </span>
              </span>
            )}
            {entry.kind === 'belief_only' && (
              <>
                <span className="text-blue-500 dark:text-blue-400 truncate">
                  {formatValue(entry.beliefValue)}
                </span>
                <span className="text-[10px] text-blue-400/60 ml-auto shrink-0">
                  agent assumed
                </span>
              </>
            )}
            {entry.kind === 'reality_only' && (
              <>
                <span className="text-amber-500 dark:text-amber-400 truncate">
                  {formatValue(entry.realityValue)}
                </span>
                <span className="text-[10px] text-amber-400/60 ml-auto shrink-0">
                  agent missed
                </span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

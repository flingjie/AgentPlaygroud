import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useExperimentStore } from '../stores/experimentStore';
import type { ContextSnapshot, EnvironmentSnapshot } from '../types/events';

// ── helpers ──────────────────────────────────────────────────────────────────

function last<T>(arr: T[]): T | undefined {
  return arr.length > 0 ? arr[arr.length - 1] : undefined;
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
}

function roleBadge(role: string): string {
  switch (role) {
    case 'system':
      return 'bg-blue-900/60 text-blue-300 border-blue-500/30';
    case 'user':
      return 'bg-emerald-900/60 text-emerald-300 border-emerald-500/30';
    case 'assistant':
      return 'bg-violet-900/60 text-violet-300 border-violet-500/30';
    default:
      return 'bg-gray-800 text-gray-400 border-gray-700';
  }
}

// ── empty state ──────────────────────────────────────────────────────────────

function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="flex-1 flex items-center justify-center text-gray-500 text-xs font-mono py-6">
      No {label} data available
    </div>
  );
}

// ── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ label, warning }: { label: string; warning?: string }) {
  return (
    <div className="flex items-center gap-2 mb-2 shrink-0">
      <h3 className="font-mono text-[11px] text-gray-400 uppercase tracking-wider">
        {label}
      </h3>
      {warning && (
        <span className="flex items-center gap-1 text-[10px] text-amber-500/80 font-mono">
          <AlertTriangle size={11} />
          {warning}
        </span>
      )}
    </div>
  );
}

// ── sub-components ───────────────────────────────────────────────────────────

function SystemPromptPanel({ snapshot, hasContextManager }: { snapshot: ContextSnapshot | undefined; hasContextManager: boolean }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 flex flex-col min-h-0">
      <SectionHeader
        label="System Prompt"
        warning={!hasContextManager ? 'No Context Manager active' : undefined}
      />
      {snapshot ? (
        <pre className="text-[11px] leading-relaxed text-gray-300 font-mono whitespace-pre-wrap overflow-y-auto flex-1 min-h-0">
          {snapshot.systemPrompt}
        </pre>
      ) : (
        <EmptyPanel label="system prompt" />
      )}
    </div>
  );
}

function MemoryViewer({ snapshot }: { snapshot: ContextSnapshot | undefined }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 flex flex-col min-h-0 flex-1">
      <SectionHeader label="Conversation Memory" />
      {snapshot && snapshot.memory.length > 0 ? (
        <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0">
          {snapshot.memory.map((entry, i) => (
            <div
              key={i}
              className="bg-gray-950 rounded border border-gray-800 px-2.5 py-1.5"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className={`text-[10px] font-mono px-1.5 py-px rounded border ${roleBadge(entry.role)}`}
                >
                  {entry.role}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-mono leading-snug">
                {truncate(entry.content, 120)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyPanel label="memory" />
      )}
    </div>
  );
}

function TokenGauge({ snapshot }: { snapshot: ContextSnapshot | undefined }) {
  const tokenCount = snapshot?.tokenCount ?? 0;
  const tokenLimit = snapshot?.tokenLimit ?? 0;
  const pct = tokenLimit > 0 ? (tokenCount / tokenLimit) * 100 : 0;
  const isDanger = pct > 80;
  const isWarning = pct > 60 && pct <= 80;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 flex flex-col min-h-0 w-56 shrink-0">
      <SectionHeader label="Token Usage" />
      {snapshot ? (
        <div className="flex flex-col justify-center flex-1 gap-3">
          {/* gauge bar */}
          <div>
            <div className="h-5 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isDanger
                    ? 'bg-red-500'
                    : isWarning
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-gray-500 font-mono">
              <span>0</span>
              <span className={isDanger ? 'text-red-400' : isWarning ? 'text-yellow-400' : ''}>
                {pct.toFixed(0)}%
              </span>
              <span>{tokenLimit.toLocaleString()}</span>
            </div>
            {/* 80% marker */}
            <div className="relative h-1 mt-1">
              <div
                className="absolute top-0 h-full w-px bg-red-400/30"
                style={{ left: '80%' }}
              />
              <span
                className="absolute text-[9px] text-red-500/60 font-mono"
                style={{ left: '80%', top: '2px' }}
              >
                80%
              </span>
            </div>
          </div>

          {/* numeric readout */}
          <div className="text-center">
            <span
              className={`font-mono text-lg tabular-nums ${
                isDanger
                  ? 'text-red-400'
                  : isWarning
                    ? 'text-yellow-400'
                    : 'text-green-400'
              }`}
            >
              {tokenCount.toLocaleString()}
            </span>
            <span className="text-gray-600 font-mono text-sm mx-1">/</span>
            <span className="text-gray-500 font-mono text-sm">
              {tokenLimit.toLocaleString()}
            </span>
          </div>

          {isDanger && (
            <div className="flex items-start gap-1.5 p-2 rounded bg-red-400/5 border border-red-400/10 text-[10px] text-red-400 font-mono">
              <AlertTriangle size={12} className="shrink-0 mt-px" />
              <span>Token usage above 80%. Consider reducing context or increasing budget.</span>
            </div>
          )}
        </div>
      ) : (
        <EmptyPanel label="token" />
      )}
    </div>
  );
}

function WorkspaceViewer({ envSnapshot }: { envSnapshot: EnvironmentSnapshot | undefined }) {
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const files = envSnapshot?.fileSystem ?? {};
  const filenames = Object.keys(files);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 flex flex-col min-h-0 flex-1">
      <SectionHeader label="Workspace" />
      {filenames.length > 0 ? (
        <div className="space-y-1 overflow-y-auto flex-1 min-h-0">
          {filenames.map((name) => {
            const isExpanded = expandedFile === name;
            return (
              <div key={name}>
                <button
                  onClick={() => setExpandedFile(isExpanded ? null : name)}
                  className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-gray-800 transition-colors group"
                >
                  <span className="text-[10px] text-gray-500 font-mono group-hover:text-gray-400 transition-colors w-3">
                    {isExpanded ? '▾' : '▸'}
                  </span>
                  <span className="text-[11px] text-gray-300 font-mono truncate">
                    {name}
                  </span>
                </button>
                {isExpanded && (
                  <pre className="mx-2 mb-1 ml-7 px-2.5 py-2 bg-gray-950 rounded border border-gray-800 text-[10px] text-gray-400 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto leading-relaxed">
                    {files[name]}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyPanel label="workspace" />
      )}
    </div>
  );
}

function ToolRegistryViewer({ snapshot }: { snapshot: ContextSnapshot | undefined }) {
  const tools = snapshot?.tools ?? [];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 flex flex-col min-h-0 w-64 shrink-0">
      <SectionHeader label="Available Tools" />
      {tools.length > 0 ? (
        <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0">
          {tools.map((tool) => (
            <div
              key={tool.name}
              className="bg-gray-950 rounded border border-gray-800 px-2.5 py-1.5"
            >
              <p className="text-[11px] text-gray-200 font-mono">{tool.name}</p>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5 leading-snug">
                {tool.description}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-center text-gray-500 text-xs font-mono py-6 px-2">
          No tools registered — enable Tool Registry in Harness
        </div>
      )}
    </div>
  );
}

// ── main container ───────────────────────────────────────────────────────────

export default function ContextInspector() {
  const currentTrace = useExperimentStore((s) => s.currentTrace);
  const hasContextManager = useExperimentStore((s) => s.harnessConfig.has_context_manager);

  const contextSnapshot = last(currentTrace?.contextSnapshots ?? []);
  const envSnapshot = last(currentTrace?.environmentSnapshots ?? []);

  return (
    <div className="flex-1 flex flex-col gap-3 p-4 overflow-hidden">
      {/* Row 1: System Prompt (full width) */}
      <SystemPromptPanel
        snapshot={contextSnapshot}
        hasContextManager={hasContextManager}
      />

      {/* Row 2: Memory + Token Gauge (side by side, memory flexes) */}
      <div className="flex gap-3 flex-1 min-h-0">
        <MemoryViewer snapshot={contextSnapshot} />
        <TokenGauge snapshot={contextSnapshot} />
      </div>

      {/* Row 3: Workspace + Tool Registry (side by side, workspace flexes) */}
      <div className="flex gap-3 flex-1 min-h-0">
        <WorkspaceViewer envSnapshot={envSnapshot} />
        <ToolRegistryViewer snapshot={contextSnapshot} />
      </div>
    </div>
  );
}

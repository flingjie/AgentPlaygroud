import { useGame } from '../context/GameContext';
import type { HarnessConfig } from '../types';

const TOGGLES: {
  key: keyof HarnessConfig;
  label: string;
  desc: string;
}[] = [
  {
    key: 'has_workspace',
    label: 'Workspace',
    desc: 'Isolated file system for the agent',
  },
  {
    key: 'has_sandbox',
    label: 'Sandbox',
    desc: 'Secure execution environment',
  },
  {
    key: 'has_git',
    label: 'Git',
    desc: 'Version control and branching',
  },
];

export default function HarnessConfigPanel() {
  const { blueprint, updateHarness, selectedLevel } = useGame();
  const { harness } = blueprint;

  const unlocked = selectedLevel?.unlocked_harness ?? [];

  return (
    <div className="space-y-4">
      <h3 className="font-mono text-xs text-gray-400 uppercase tracking-wider">
        Harness Configuration
      </h3>

      {/* Toggle cards */}
      <div className="grid grid-cols-1 gap-2">
        {TOGGLES.map(({ key, label, desc }) => {
          const isUnlocked = unlocked.includes(
            key === 'has_workspace'
              ? 'workspace'
              : key === 'has_sandbox'
                ? 'sandbox'
                : key === 'has_git'
                  ? 'git'
                  : '',
          );
          const enabled = harness[key] as boolean;

          return (
            <button
              key={key}
              disabled={!isUnlocked}
              onClick={() => updateHarness({ [key]: !enabled })}
              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                !isUnlocked
                  ? 'border-gray-800 bg-gray-900/30 opacity-40 cursor-not-allowed'
                  : enabled
                    ? 'border-green-500/30 bg-green-400/5'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              }`}
            >
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  !isUnlocked
                    ? 'border-gray-700'
                    : enabled
                      ? 'border-green-400 bg-green-400'
                      : 'border-gray-600'
                }`}
              >
                {enabled && (
                  <svg
                    className="w-3 h-3 text-gray-900"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <div>
                <span
                  className={`text-sm font-medium ${
                    !isUnlocked
                      ? 'text-gray-600'
                      : enabled
                        ? 'text-green-300'
                        : 'text-gray-300'
                  }`}
                >
                  {label}
                </span>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
              {!isUnlocked && (
                <span className="ml-auto text-xs text-gray-600">locked</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Memory slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-300 font-medium">
            Memory Capacity
          </label>
          <span className="font-mono text-sm text-green-400">
            {harness.memory_capacity}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={harness.memory_capacity}
          onChange={(e) =>
            updateHarness({ memory_capacity: parseInt(e.target.value) })
          }
          className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-green-400"
        />
        <div className="flex justify-between text-xs text-gray-600 font-mono">
          <span>1</span>
          <span>10</span>
        </div>
      </div>
    </div>
  );
}

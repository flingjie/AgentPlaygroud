import { useGame } from '../context/GameContext';
import type { LoopStrategy } from '../types';

const STRATEGIES: { value: LoopStrategy['type']; label: string; desc: string }[] = [
  {
    value: 'none',
    label: 'None',
    desc: 'Single-pass execution, no retries',
  },
  {
    value: 'react_reflexion',
    label: 'ReAct + Reflexion',
    desc: 'Reasoning loop with self-reflection and retry',
  },
];

export default function LoopConfigPanel() {
  const { blueprint, updateLoop, selectedLevel } = useGame();
  const { loop_strategy: loop } = blueprint;
  const unlocked = selectedLevel?.unlocked_loop ?? false;

  return (
    <div className="space-y-4">
      <h3 className="font-mono text-xs text-gray-400 uppercase tracking-wider">
        Loop Strategy
      </h3>

      {/* Strategy selector */}
      <div className="grid grid-cols-2 gap-2">
        {STRATEGIES.map(({ value, label, desc }) => {
          const selected = loop.type === value;
          const disabled = value !== 'none' && !unlocked;

          return (
            <button
              key={value}
              disabled={disabled}
              onClick={() => updateLoop({ type: value })}
              className={`p-3 rounded-lg border text-left transition-all ${
                disabled
                  ? 'border-gray-800 bg-gray-900/30 opacity-40 cursor-not-allowed'
                  : selected
                    ? 'border-purple-500/30 bg-purple-400/5'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              }`}
            >
              <span
                className={`text-sm font-medium block ${
                  disabled
                    ? 'text-gray-600'
                    : selected
                      ? 'text-purple-300'
                      : 'text-gray-300'
                }`}
              >
                {label}
                {disabled && (
                  <span className="ml-1 text-xs text-gray-600">(locked)</span>
                )}
              </span>
              <span className="text-xs text-gray-500">{desc}</span>
            </button>
          );
        })}
      </div>

      {/* Max retries slider (only when loop is enabled) */}
      {loop.type !== 'none' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-300 font-medium">
              Max Retries
            </label>
            <span className="font-mono text-sm text-purple-400">
              {loop.max_retries}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={loop.max_retries}
            onChange={(e) =>
              updateLoop({ max_retries: parseInt(e.target.value) })
            }
            className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-purple-400"
          />
          <div className="flex justify-between text-xs text-gray-600 font-mono">
            <span>1</span>
            <span>10</span>
          </div>

          {/* Stop condition */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="stop-condition"
              checked={loop.stop_condition === 'test_pass'}
              onChange={(e) =>
                updateLoop({
                  stop_condition: e.target.checked ? 'test_pass' : 'none',
                })
              }
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 accent-green-400"
            />
            <label
              htmlFor="stop-condition"
              className="text-sm text-gray-400 cursor-pointer select-none"
            >
              Stop on test pass
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

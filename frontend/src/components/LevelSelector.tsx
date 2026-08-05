import { useGame } from '../context/GameContext';

export default function LevelSelector() {
  const {
    levels,
    levelsLoading,
    levelsError,
    selectedLevelId,
    setSelectedLevelId,
    selectedLevel,
  } = useGame();

  return (
    <div className="space-y-3">
      <label className="block font-mono text-xs text-gray-400 uppercase tracking-wider">
        Select Level
      </label>

      {levelsLoading && (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <div className="w-4 h-4 border-2 border-gray-600 border-t-green-400 rounded-full animate-spin" />
          Loading levels...
        </div>
      )}

      {levelsError && (
        <div className="text-red-400 text-sm bg-red-400/10 rounded-lg p-3 border border-red-400/20">
          {levelsError}
          <button
            onClick={() => window.location.reload()}
            className="block mt-1 text-xs text-red-300 underline"
          >
            Retry
          </button>
        </div>
      )}

      {!levelsLoading && !levelsError && levels.length === 0 && (
        <p className="text-gray-500 text-sm">No levels available.</p>
      )}

      {!levelsLoading && !levelsError && levels.length > 0 && (
        <>
          <select
            value={selectedLevelId}
            onChange={(e) => setSelectedLevelId(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 font-mono focus:outline-none focus:border-green-500 transition-colors"
          >
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          {selectedLevel && (
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-2 border border-gray-700/50">
              <p className="text-sm text-gray-300 leading-relaxed">
                {selectedLevel.description}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-green-400/10 text-green-400 border border-green-400/20">
                  Target: {selectedLevel.target_success_rate}%
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-blue-400/10 text-blue-400 border border-blue-400/20">
                  Budget: {selectedLevel.token_budget.toLocaleString()} tokens
                </span>
              </div>
              <div className="pt-1">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Unlocked
                </p>
                <div className="flex flex-wrap gap-1">
                  {selectedLevel.unlocked_harness.map((h) => (
                    <span
                      key={h}
                      className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300 font-mono"
                    >
                      {h}
                    </span>
                  ))}
                  {selectedLevel.unlocked_loop && (
                    <span className="px-2 py-0.5 rounded text-xs bg-purple-700/50 text-purple-300 font-mono">
                      loop
                    </span>
                  )}
                  {selectedLevel.unlocked_graph && (
                    <span className="px-2 py-0.5 rounded text-xs bg-orange-700/50 text-orange-300 font-mono">
                      graph
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

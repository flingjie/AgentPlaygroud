import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Copy, Check } from 'lucide-react';
import { exportBlueprint } from '../api';
import { useGame } from '../context/GameContext';

export default function ExportView() {
  const { t } = useTranslation();
  const { blueprint } = useGame();
  const [langgraph, setLanggraph] = useState('');
  const [arlo, setArlo] = useState('');
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async () => {
    setExporting(true);
    setError('');
    try {
      const res = await exportBlueprint(blueprint);
      setLanggraph(res.langgraph);
      setArlo(res.arlo_yaml);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(
        `# arlo_config.yaml\n${arlo}\n\n# langgraph.py\n${langgraph}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. non-secure context) — ignore.
    }
  };

  const download = () => {
    const blob = new Blob([`${langgraph}\n`], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'langgraph.py';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-4xl mx-auto space-y-4">
        <h2 className="text-lg font-semibold">{t('export.title')}</h2>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting ? '…' : t('export.generate')}
        </button>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {(langgraph || arlo) && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button onClick={copyAll} className="flex items-center gap-1 px-3 py-1 rounded border text-xs">
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {t('export.copy')}
              </button>
              <button onClick={download} className="flex items-center gap-1 px-3 py-1 rounded border text-xs">
                <Download size={14} />
                {t('export.download')}
              </button>
            </div>
            <div>
              <h3 className="font-mono text-xs text-gray-500 uppercase tracking-wider mb-1">arlo_config.yaml</h3>
              <pre className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 text-xs overflow-auto font-mono">{arlo}</pre>
            </div>
            <div>
              <h3 className="font-mono text-xs text-gray-500 uppercase tracking-wider mb-1">langgraph.py</h3>
              <pre className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 text-xs overflow-auto font-mono">{langgraph}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

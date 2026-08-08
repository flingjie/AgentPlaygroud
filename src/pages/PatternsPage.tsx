import { usePick } from '../i18n/I18nProvider';
import { ui } from '../i18n/uiStrings';
import { useProgress } from '../state/progressStore';
import { INCIDENTS } from '../content/incidents';
import { PatternCard } from '../components/PatternCard';

export default function PatternsPage() {
  const pick = usePick();
  const isCompleted = useProgress((s) => s.isCompleted);

  const completed = INCIDENTS.filter((i) => isCompleted(i.def.id)).sort(
    (a, b) => a.def.order - b.def.order,
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{pick(ui.unlockedPatterns)}</h1>
      {completed.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {pick(ui.emptyPatterns)}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {completed.map((incident) => (
            <PatternCard key={incident.def.id} incident={incident} />
          ))}
        </div>
      )}
    </div>
  );
}

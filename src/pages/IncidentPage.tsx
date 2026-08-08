import { Link, Navigate, useParams } from 'react-router-dom';
import { getIncident } from '../content/incidents';
import { usePick } from '../i18n/I18nProvider';
import { ui } from '../i18n/uiStrings';
import { useProgress } from '../state/progressStore';
import { IncidentShell } from '../components/incident/IncidentShell';

export default function IncidentPage() {
  const pick = usePick();
  const { id } = useParams();
  const incident = id ? getIncident(id) : undefined;
  const isUnlocked = useProgress((s) => s.isUnlocked);

  if (!incident) {
    return <Navigate to="/" replace />;
  }

  if (!isUnlocked(incident.def)) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-6 text-center">
        <h2 className="text-lg font-semibold mb-2">{pick(ui.locked)}</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">{pick(ui.unlockHint)}</p>
        <Link
          to="/"
          className="inline-block rounded-lg px-4 py-2 bg-sky-600 text-white font-medium hover:bg-sky-700 dark:bg-sky-600 dark:hover:bg-sky-500 transition"
        >
          ← Home
        </Link>
      </div>
    );
  }

  return <IncidentShell key={incident.def.id} incident={incident} />;
}

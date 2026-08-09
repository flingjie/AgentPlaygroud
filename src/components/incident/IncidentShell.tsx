import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Incident, LocalizedText } from '../../content/schema';
import { INCIDENTS } from '../../content/incidents';
import { usePick } from '../../i18n/I18nProvider';
import { ui } from '../../i18n/uiStrings';
import { useInvestigation } from '../../state/investigationStore';
import { useProgress } from '../../state/progressStore';
import { runMonteCarloAtRate, type MonteCarloSummary } from '../../engine/simulator';
import { successRateWithInterventions, canCloseIncident } from '../../engine/interventionEngine';
import { IncidentHeader } from './IncidentHeader';
import { EvidenceBoard } from './EvidenceBoard';
import { HypothesisPanel } from './HypothesisPanel';
import { InterventionPanel } from './InterventionPanel';
import { VerificationPanel } from './VerificationPanel';
import { XRayTimeline } from './XRayTimeline';

type Phase = 'scene' | 'diagnose' | 'intervene' | 'verify' | 'closed';

export interface IncidentShellProps {
  incident: Incident;
}

export function IncidentShell({ incident }: IncidentShellProps) {
  const pick = usePick();
  const [phase, setPhase] = useState<Phase>('scene');
  const [selectedHypothesisId, setSelectedHypothesisId] = useState<string | null>(null);
  const [confirmedHypothesisId, setConfirmedHypothesisId] = useState<string | null>(null);
  const [selectedInterventionIds, setSelectedInterventionIds] = useState<Set<string>>(new Set());
  const [paramValues, setParamValues] = useState<Record<string, number>>({});
  const [baseline, setBaseline] = useState<MonteCarloSummary | null>(null);
  const [current, setCurrent] = useState<MonteCarloSummary | null>(null);
  const [verified, setVerified] = useState(false);

  const viewedIdsArray = useInvestigation((s) => s.viewedEvidenceIds);
  const markViewed = useInvestigation((s) => s.markViewed);
  const resetInvestigation = useInvestigation((s) => s.reset);
  const viewedIds = useMemo(() => new Set(viewedIdsArray), [viewedIdsArray]);
  const completeIncident = useProgress((s) => s.completeIncident);
  const isCompleted = useProgress((s) => s.isCompleted);

  useEffect(() => {
    resetInvestigation();
  }, [resetInvestigation, incident.def.id]);

  const alreadyCompleted = isCompleted(incident.def.id);
  const nextIncident = INCIDENTS.find((i) => i.def.order === incident.def.order + 1);

  function handleStartDiagnosis() {
    setPhase('diagnose');
  }

  function handleConfirmDiagnosis() {
    setConfirmedHypothesisId(selectedHypothesisId);
    setPhase('intervene');
  }

  function handleToggleIntervention(id: string) {
    setSelectedInterventionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleParamChange(key: string, value: number) {
    setParamValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleVerify() {
    const seed = Date.now() % 1_000_000;
    if (!baseline) {
      setBaseline(
        runMonteCarloAtRate(
          incident.def.trials,
          incident.def.baseTokenCost,
          incident.def.hiddenFailure,
          incident.def.baseSuccess,
          seed,
        ),
      );
    }
    const rate = successRateWithInterventions(
      incident.def,
      incident.content.interventions,
      selectedInterventionIds,
      paramValues,
    );
    setCurrent(
      runMonteCarloAtRate(
        incident.def.trials,
        incident.def.baseTokenCost,
        incident.def.hiddenFailure,
        rate,
        seed + 1,
      ),
    );
    setVerified(true);
  }

  function handleClose() {
    if (!canCloseIncident(incident.content.interventions, selectedInterventionIds, verified)) return;
    completeIncident(incident.def);
    setPhase('closed');
  }

  const confirmedHypothesis = incident.content.hypotheses.find((h) => h.id === confirmedHypothesisId);
  const showWrongHypothesisBanner =
    confirmedHypothesisId !== null && confirmedHypothesis !== undefined && !confirmedHypothesis.isCorrect;

  const retrospective = buildRetrospective(incident, selectedInterventionIds);
  const canClose = canCloseIncident(incident.content.interventions, selectedInterventionIds, verified);

  if (phase === 'closed' || alreadyCompleted) {
    const closedSummary = phase === 'closed' ? retrospective : incident.content.patternSummary;
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/20 p-4">
          <h3 className="font-semibold text-emerald-800 dark:text-emerald-200">{pick(ui.incidentClosed)}</h3>
          <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">{pick(closedSummary)}</p>
        </div>
        {nextIncident ? (
          <Link
            to={`/incident/${nextIncident.def.id}`}
            data-testid="next-incident"
            className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 dark:bg-sky-600 dark:hover:bg-sky-500 transition"
          >
            {pick(ui.nextIncident)} → {pick(nextIncident.content.title)}
          </Link>
        ) : (
          <Link
            to="/patterns"
            data-testid="all-complete"
            className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 transition"
          >
            {pick(ui.allComplete)} →
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <IncidentHeader incident={incident} />

      {showWrongHypothesisBanner && (
        <div
          data-testid="wrong-hypothesis-banner"
          className="rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 p-4"
        >
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {pick(confirmedHypothesis!.feedback)}
          </p>
        </div>
      )}

      {phase === 'scene' && (
        <div className="space-y-6">
          <EvidenceBoard evidences={incident.content.evidences} viewedIds={viewedIds} onView={markViewed} />
          <XRayTimeline iterations={incident.content.xrayTimeline} />
          <div className="sticky bottom-0 z-10 -mx-4 mt-2 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
            <button
              type="button"
              data-testid="start-diagnosis"
              onClick={handleStartDiagnosis}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
            >
              {pick(ui.startDiagnosis)}
            </button>
          </div>
        </div>
      )}

      {phase === 'diagnose' && (
        <HypothesisPanel
          hypotheses={incident.content.hypotheses}
          selectedId={selectedHypothesisId}
          confirmed={confirmedHypothesisId !== null}
          onSelect={setSelectedHypothesisId}
          onConfirm={handleConfirmDiagnosis}
        />
      )}

      {phase === 'intervene' && (
        <div className="space-y-6">
          <InterventionPanel
            interventions={incident.content.interventions}
            selectedIds={selectedInterventionIds}
            paramValues={paramValues}
            onToggle={handleToggleIntervention}
            onParamChange={handleParamChange}
          />
          <div className="sticky bottom-0 z-10 -mx-4 mt-2 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
            <button
              type="button"
              data-testid="go-verify"
              disabled={selectedInterventionIds.size === 0}
              onClick={() => setPhase('verify')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                selectedInterventionIds.size > 0
                  ? 'bg-sky-600 text-white hover:bg-sky-700'
                  : 'bg-zinc-200 text-zinc-500 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-500'
              }`}
            >
              {pick(ui.verifyFix)}
            </button>
          </div>
        </div>
      )}

      {phase === 'verify' && (
        <VerificationPanel
          baseline={baseline}
          current={current}
          retrospective={retrospective}
          canClose={canClose}
          onVerify={handleVerify}
          onClose={handleClose}
        />
      )}
    </div>
  );
}

function buildRetrospective(incident: Incident, selectedIds: ReadonlySet<string>): LocalizedText {
  const selected = incident.content.interventions.filter((i) => selectedIds.has(i.id));
  const optimal = incident.content.interventions.filter((i) => i.isOptimal);
  const none: LocalizedText = { en: 'None', zh: '无' };

  function joinNames(items: typeof selected, locale: 'en' | 'zh') {
    return items.length > 0 ? items.map((i) => i.name[locale]).join(', ') : none[locale];
  }

  return {
    en: `Selected: ${joinNames(selected, 'en')}. Optimal: ${joinNames(optimal, 'en')}.`,
    zh: `已选：${joinNames(selected, 'zh')}。最优：${joinNames(optimal, 'zh')}。`,
  };
}

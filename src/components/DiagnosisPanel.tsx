import { useTranslation } from 'react-i18next';
import { AlertTriangle, Search, Lightbulb } from 'lucide-react';
import { useExperimentStore } from '../stores/experimentStore';
import { experimentById } from '../experiments/registry';

// ── Sub-components ──────────────────────────────────────────────────────────

function RootCauseBlock({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 border-l-2 border-red-500 pl-3 py-1">
      <Search size={16} className="text-red-400 shrink-0 mt-0.5" />
      <div>
        <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">
          Root Cause
        </h4>
        <p className="text-sm text-gray-300 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

function MissingCapabilityBlock({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 border-l-2 border-amber-500 pl-3 py-1">
      <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
      <div>
        <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
          Missing Capability
        </h4>
        <p className="text-sm text-gray-300 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

function RecommendedFixBlock({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 border-l-2 border-green-500 pl-3 py-1">
      <Lightbulb size={16} className="text-green-400 shrink-0 mt-0.5" />
      <div>
        <h4 className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-1">
          Recommended Fix
        </h4>
        <p className="text-sm text-gray-300 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

// ── Generic unexpected failure ──────────────────────────────────────────────

function GenericFailure() {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-3">
      <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-amber-300">
          Unexpected Failure
        </h4>
        <div className="space-y-2">
          <RootCauseBlock text={t('diagnosis.generic.rootCause')} />
          <MissingCapabilityBlock text={t('diagnosis.generic.missingCapability')} />
          <RecommendedFixBlock text={t('diagnosis.generic.recommendedFix')} />
        </div>
      </div>
    </div>
  );
}

// ── Specific failure diagnosis ──────────────────────────────────────────────

function SpecificFailure({
  reason,
  rootCause,
  missingCapability,
  recommendedFix,
}: {
  reason: string;
  rootCause: string;
  missingCapability: string;
  recommendedFix: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} className="text-red-400" />
        <span className="text-xs font-mono text-red-400 font-semibold uppercase">
          Experiment Failed — {reason}
        </span>
      </div>
      <RootCauseBlock text={rootCause} />
      <MissingCapabilityBlock text={missingCapability} />
      <RecommendedFixBlock text={recommendedFix} />
    </div>
  );
}

// ── Main panel ──────────────────────────────────────────────────────────────

export default function DiagnosisPanel() {
  const { t } = useTranslation();
  const currentTrace = useExperimentStore((s) => s.currentTrace);
  const activeExperimentId = useExperimentStore((s) => s.activeExperimentId);

  if (!currentTrace || currentTrace.status !== 'FAILED') {
    return null;
  }

  const experiment = activeExperimentId
    ? experimentById(activeExperimentId)
    : undefined;

  const expectedFailure = experiment?.expectedFailure;

  return (
    <section className="border-t border-gray-700/50 bg-gray-900/60 px-5 py-4">
      {expectedFailure ? (
        <SpecificFailure
          reason={expectedFailure.reason}
          rootCause={t(expectedFailure.rootCauseKey)}
          missingCapability={t(expectedFailure.missingCapabilityKey)}
          recommendedFix={t(expectedFailure.recommendedFixKey)}
        />
      ) : (
        <GenericFailure />
      )}
    </section>
  );
}

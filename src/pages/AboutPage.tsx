import { usePick } from '../i18n/I18nProvider';
import { ui } from '../i18n/uiStrings';
import { stageAccent } from '../components/stageAccent';
import type { StageId } from '../content/schema';

const STAGE_ORDER: StageId[] = ['harness', 'loop', 'graph'];

export default function AboutPage() {
  const pick = usePick();

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{pick(ui.about)}</h1>
        <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {pick(ui.aboutIntro)}
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{pick(ui.aboutCoreLoop)}</h2>
        <ol className="relative border-l-2 border-zinc-200 dark:border-zinc-800 ml-3 space-y-6">
          {ui.aboutLoop.map((step, index) => (
            <li key={index} className="pl-6">
              <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                {index + 1}
              </span>
              <p className="text-zinc-800 dark:text-zinc-200">{pick(step)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{pick(ui.aboutThreeStages)}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {STAGE_ORDER.map((id) => (
            <div
              key={id}
              className={`rounded-r-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 border-l-4 ${stageAccent[id]}`}
            >
              <h3 className="font-semibold">{pick(ui.stages[id])}</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                {pick(ui.aboutStages[id])}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-3 font-medium">
                {pick(ui.aboutKeywords[id])}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

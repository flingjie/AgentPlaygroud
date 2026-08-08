import { usePick } from '../i18n/I18nProvider';
import { ui } from '../i18n/uiStrings';

export default function AboutPage() {
  const pick = usePick();
  return (
    <div>
      <h1 className="text-xl font-semibold">{pick(ui.about)}</h1>
    </div>
  );
}

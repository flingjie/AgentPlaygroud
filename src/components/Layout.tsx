import { Link, Outlet } from 'react-router-dom';
import { useLocale, usePick } from '../i18n/I18nProvider';
import { useTheme } from '../theme/ThemeProvider';
import { ui } from '../i18n/uiStrings';

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

export default function Layout() {
  const pick = usePick();
  const { locale, setLocale } = useLocale();
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg hover:opacity-80">
            {pick(ui.appTitle)}
          </Link>
          <nav className="flex items-center gap-3">
            <Link to="/patterns" className="hover:underline">
              {pick(ui.unlockedPatterns)}
            </Link>
            <button
              type="button"
              onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
              className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="toggle language"
            >
              {locale === 'zh' ? 'EN' : '中'}
            </button>
            <button
              type="button"
              onClick={toggle}
              className="p-2 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="toggle theme"
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

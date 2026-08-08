import { createContext, useContext, useState, type ReactNode } from 'react';
import type { LocalizedText } from '../content/schema';

export type Locale = 'en' | 'zh';
const I18nCtx = createContext<{ locale: Locale; setLocale: (l: Locale) => void }>({
  locale: 'zh', setLocale: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(
    () => (localStorage.getItem('locale') as Locale) || 'zh',
  );
  const set = (l: Locale) => { setLocale(l); localStorage.setItem('locale', l); };
  return <I18nCtx.Provider value={{ locale, setLocale: set }}>{children}</I18nCtx.Provider>;
}

export const useLocale = () => useContext(I18nCtx);
export function usePick() {
  const { locale } = useLocale();
  return (t: LocalizedText) => t[locale];
}

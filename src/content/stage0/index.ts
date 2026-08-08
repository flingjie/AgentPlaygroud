import i18next from 'i18next';
import en from './en';
import zh from './zh';
import type { Stage0Content } from './types';

/** Returns Stage 0 content for the current i18next language. Falls back to 'en'. */
export function getStage0Content(): Stage0Content {
  const lang = i18next.language;
  if (lang === 'zh' || lang === 'zh-CN' || lang === 'zh-TW') {
    return zh;
  }
  return en;
}

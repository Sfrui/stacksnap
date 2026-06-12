import { LocaleConfig } from './types';
import { ProjectConfig } from '../types';

const LOCALE_PRESETS: Record<string, Omit<LocaleConfig, 'locale'>> = {
  'zh-CN': {
    uiLanguageInstruction: 'All UI text must be in Chinese',
    messageLanguageInstruction: 'Use Chinese error/success messages matching the reference',
  },
  'en-US': {
    uiLanguageInstruction: 'All UI text must be in English',
    messageLanguageInstruction: 'Use English error/success messages matching the reference',
  },
};

export function getLocaleConfig(config: ProjectConfig): LocaleConfig {
  const locale = config.locale || 'en-US';
  const preset = LOCALE_PRESETS[locale];
  if (!preset) {
    console.warn(`Unsupported locale "${locale}", falling back to en-US`);
    return { locale: 'en-US', ...LOCALE_PRESETS['en-US'] };
  }
  return { locale, ...preset };
}

import { describe, it, expect } from 'vitest';
import { getLocaleConfig } from '../../adapters/locale';
import { ProjectConfig } from '../../types';

function makeConfig(locale?: string): ProjectConfig {
  return {
    framework: 'express-vue',
    orm: 'prisma',
    typescript: true,
    directories: {},
    packageManager: 'npm',
    locale,
  };
}

describe('getLocaleConfig', () => {
  it('defaults to en-US when no locale set', () => {
    const config = makeConfig();
    const locale = getLocaleConfig(config);
    expect(locale.locale).toBe('en-US');
    expect(locale.uiLanguageInstruction).toContain('English');
    expect(locale.messageLanguageInstruction).toContain('English');
  });

  it('returns zh-CN config', () => {
    const locale = getLocaleConfig(makeConfig('zh-CN'));
    expect(locale.locale).toBe('zh-CN');
    expect(locale.uiLanguageInstruction).toBe('All UI text must be in Chinese');
  });

  it('returns en-US config', () => {
    const locale = getLocaleConfig(makeConfig('en-US'));
    expect(locale.locale).toBe('en-US');
    expect(locale.uiLanguageInstruction).toBe('All UI text must be in English');
    expect(locale.messageLanguageInstruction).toBe('Use English error/success messages matching the reference');
  });

  it('falls back to en-US for unknown locale', () => {
    const locale = getLocaleConfig(makeConfig('fr-FR'));
    expect(locale.locale).toBe('en-US');
    expect(locale.uiLanguageInstruction).toContain('English');
  });
});

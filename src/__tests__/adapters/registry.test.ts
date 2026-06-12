import { describe, it, expect } from 'vitest';
import { getAdapter, getAdapterForConfig, listAdapters } from '../../adapters/registry';
import { ProjectConfig } from '../../types';

describe('adapter registry', () => {
  it('lists all built-in adapters', () => {
    const adapters = listAdapters();
    expect(adapters).toContain('express-vue');
    expect(adapters).toContain('express-react');
    expect(adapters).toContain('nextjs');
    expect(adapters.length).toBe(3);
  });

  it('getAdapter returns correct adapter by id', () => {
    const vueAdapter = getAdapter('express-vue');
    expect(vueAdapter.id).toBe('express-vue');
    expect(vueAdapter.displayName).toBe('Express + Vue 3');

    const reactAdapter = getAdapter('express-react');
    expect(reactAdapter.id).toBe('express-react');

    const nextAdapter = getAdapter('nextjs');
    expect(nextAdapter.id).toBe('nextjs');
  });

  it('getAdapter throws for unknown adapter', () => {
    expect(() => getAdapter('unknown-framework')).toThrow('No adapter registered');
  });

  it('getAdapterForConfig returns adapter based on framework field', () => {
    const vueConfig: ProjectConfig = {
      framework: 'express-vue',
      orm: 'prisma',
      typescript: true,
      directories: {},
      packageManager: 'npm',
    };
    expect(getAdapterForConfig(vueConfig).id).toBe('express-vue');

    const reactConfig: ProjectConfig = {
      ...vueConfig,
      framework: 'express-react',
    };
    expect(getAdapterForConfig(reactConfig).id).toBe('express-react');

    const nextConfig: ProjectConfig = {
      ...vueConfig,
      framework: 'nextjs',
    };
    expect(getAdapterForConfig(nextConfig).id).toBe('nextjs');
  });
});

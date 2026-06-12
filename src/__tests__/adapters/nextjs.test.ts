import { describe, it, expect } from 'vitest';
import { NextjsAdapter } from '../../adapters/implementations/nextjs';
import { ProjectConfig, SceneDefinition } from '../../types';
import { getLocaleConfig } from '../../adapters/locale';

const adapter = new NextjsAdapter();
const locale = getLocaleConfig({} as ProjectConfig);

function makeScene(): SceneDefinition {
  return {
    name: 'test-scene',
    description: 'Test scene',
    version: '1.0.0',
    stackCompatibility: ['nextjs'],
    dependencies: [],
    entities: [
      { name: 'User', fields: { id: 'String @id @default(uuid())', email: 'String @unique' } },
    ],
    api: [
      { method: 'POST', path: '/api/auth/login', description: 'Login' },
    ],
    frontend: {
      pages: [{ path: 'auth/login', description: 'Login page' }],
      components: [{ path: 'auth/LoginForm', description: 'Login form' }],
      hooks: [{ path: 'useAuth', description: 'Auth hook' }],
    },
    types: [{ path: 'auth', description: 'Auth types' }],
  };
}

function makeConfig(): ProjectConfig {
  return {
    framework: 'nextjs',
    orm: 'prisma',
    typescript: true,
    directories: { pages: 'app', apiRoutes: 'app/api', types: 'src/types' },
    packageManager: 'npm',
  };
}

describe('NextjsAdapter', () => {
  it('has correct id and displayName', () => {
    expect(adapter.id).toBe('nextjs');
    expect(adapter.displayName).toBe('Next.js');
  });

  describe('fileExtension', () => {
    it('returns .tsx for pages', () => expect(adapter.fileExtension('page')).toBe('.tsx'));
    it('returns .tsx for components', () => expect(adapter.fileExtension('component')).toBe('.tsx'));
    it('returns .ts for all other types', () => {
      expect(adapter.fileExtension('service')).toBe('.ts');
      expect(adapter.fileExtension('hook')).toBe('.ts');
      expect(adapter.fileExtension('type')).toBe('.ts');
      expect(adapter.fileExtension('route')).toBe('.ts');
    });
  });

  describe('frontend', () => {
    it('pageFileNaming returns page.tsx', () => {
      expect(adapter.frontend.pageFileNaming('auth/login')).toBe('page.tsx');
    });

    it('routerFile returns null (file-based routing)', () => {
      expect(adapter.frontend.routerFile()).toBeNull();
    });

    it('buildApiModulePrompt returns null (uses Server Components)', () => {
      expect(adapter.frontend.buildApiModulePrompt(makeScene(), makeConfig(), '', locale)).toBeNull();
    });

    it('buildRouterPrompt returns null (file-based routing)', () => {
      expect(adapter.frontend.buildRouterPrompt(makeScene(), makeConfig(), '', locale)).toBeNull();
    });
  });

  describe('backend', () => {
    it('buildModelIndexPrompt returns null', () => {
      expect(adapter.backend.buildModelIndexPrompt(makeScene(), makeConfig(), [], '', locale)).toBeNull();
    });

    it('modelIndexFile returns null', () => {
      expect(adapter.backend.modelIndexFile()).toBeNull();
    });

    it('registrationFiles returns empty array', () => {
      expect(adapter.backend.registrationFiles()).toEqual([]);
    });

    it('buildSchemaPrompt returns Prisma prompt', () => {
      const prompt = adapter.backend.buildSchemaPrompt(makeScene(), makeConfig(), '', locale);
      expect(prompt).not.toBeNull();
      expect(prompt).toContain('Prisma schema expert');
    });

    it('buildServicePrompt returns Next.js service prompt', () => {
      const prompt = adapter.backend.buildServicePrompt(makeScene(), makeConfig(), '', '', locale);
      expect(prompt).not.toBeNull();
      expect(prompt).toContain('Next.js backend expert');
    });

    it('buildRoutePrompt returns Next.js API route prompt', () => {
      const prompt = adapter.backend.buildRoutePrompt(makeScene(), makeConfig(), '', '', '', locale);
      expect(prompt).not.toBeNull();
      expect(prompt).toContain('Next.js App Router API');
      expect(prompt).toContain('route.ts');
    });
  });

  describe('prompt generation', () => {
    it('buildPagePrompt returns Next.js page prompt', () => {
      const prompt = adapter.frontend.buildPagePrompt(makeScene(), makeConfig(), '', '', locale);
      expect(prompt).not.toBeNull();
      expect(prompt).toContain('Next.js App Router');
      expect(prompt).toContain('page.tsx');
    });

    it('buildComponentPrompt returns React component prompt', () => {
      const prompt = adapter.frontend.buildComponentPrompt(makeScene(), makeConfig(), '', '', locale);
      expect(prompt).not.toBeNull();
      expect(prompt).toContain('Next.js');
    });

    it('buildTypePrompt returns type prompt', () => {
      const prompt = adapter.frontend.buildTypePrompt(makeScene(), makeConfig(), '', locale);
      expect(prompt).not.toBeNull();
      expect(prompt).toContain('TypeScript type expert');
    });
  });

  describe('integration', () => {
    it('resolvePagePath generates Next.js app directory path', () => {
      const config = makeConfig();
      config.directories.pages = 'app';
      const resolved = adapter.integration.resolvePagePath(config, 'auth/login').replace(/\\/g, '/');
      expect(resolved).toBe('app/auth/login/page.tsx');
    });
  });
});

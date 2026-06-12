import { describe, it, expect } from 'vitest';
import { ExpressReactAdapter } from '../../adapters/implementations/express-react';
import { ProjectConfig, SceneDefinition } from '../../types';
import { getLocaleConfig } from '../../adapters/locale';

const adapter = new ExpressReactAdapter();
const locale = getLocaleConfig({} as ProjectConfig);

function makeScene(): SceneDefinition {
  return {
    name: 'test-scene',
    description: 'Test scene',
    version: '1.0.0',
    stackCompatibility: ['express-react'],
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
    framework: 'express-react',
    orm: 'prisma',
    typescript: true,
    directories: { services: 'src/services', types: 'src/types' },
    packageManager: 'npm',
  };
}

describe('ExpressReactAdapter', () => {
  it('has correct id and displayName', () => {
    expect(adapter.id).toBe('express-react');
    expect(adapter.displayName).toBe('Express + React');
  });

  describe('fileExtension', () => {
    it('returns .tsx for pages', () => expect(adapter.fileExtension('page')).toBe('.tsx'));
    it('returns .tsx for components', () => expect(adapter.fileExtension('component')).toBe('.tsx'));
    it('returns .ts for types', () => expect(adapter.fileExtension('type')).toBe('.ts'));
    it('returns .js for services', () => expect(adapter.fileExtension('service')).toBe('.js'));
  });

  describe('frontend', () => {
    it('pageFileNaming returns PascalCase + Page.tsx', () => {
      expect(adapter.frontend.pageFileNaming('auth/login')).toBe('AuthLoginPage.tsx');
      expect(adapter.frontend.pageFileNaming('admin/roles')).toBe('AdminRolesPage.tsx');
    });

    it('routerFile returns router/index.tsx', () => {
      expect(adapter.frontend.routerFile()).toBe('router/index.tsx');
    });
  });

  describe('prompt generation', () => {
    it('buildPagePrompt returns React prompt', () => {
      const prompt = adapter.frontend.buildPagePrompt(makeScene(), makeConfig(), '', '', locale);
      expect(prompt).not.toBeNull();
      expect(prompt).toContain('React');
      expect(prompt).toContain('Ant Design');
    });

    it('buildComponentPrompt returns React component prompt', () => {
      const prompt = adapter.frontend.buildComponentPrompt(makeScene(), makeConfig(), '', '', locale);
      expect(prompt).not.toBeNull();
      expect(prompt).toContain('React');
    });

    it('buildHookPrompt returns React hooks prompt', () => {
      const prompt = adapter.frontend.buildHookPrompt(makeScene(), makeConfig(), '', '', locale);
      expect(prompt).not.toBeNull();
      expect(prompt).toContain('React hooks');
    });

    it('buildTypePrompt returns type prompt', () => {
      const prompt = adapter.frontend.buildTypePrompt(makeScene(), makeConfig(), '', locale);
      expect(prompt).not.toBeNull();
      expect(prompt).toContain('TypeScript type expert');
    });

    it('buildRouterPrompt returns React Router prompt', () => {
      const prompt = adapter.frontend.buildRouterPrompt(makeScene(), makeConfig(), '', locale);
      expect(prompt).not.toBeNull();
      expect(prompt).toContain('React Router');
    });
  });

  describe('backend reuses shared Express logic', () => {
    it('buildServicePrompt returns Express service prompt', () => {
      const prompt = adapter.backend.buildServicePrompt(makeScene(), makeConfig(), '', '', locale);
      expect(prompt).not.toBeNull();
      expect(prompt).toContain('Express.js backend expert');
    });

    it('registrationFiles includes routes and models index', () => {
      const files = adapter.backend.registrationFiles();
      expect(files).toContain('routes/index.js');
      expect(files).toContain('models/index.js');
    });
  });

  describe('integration', () => {
    it('resolvePagePath generates correct React page path', () => {
      const config = makeConfig();
      config.directories.pages = 'src/pages';
      const resolved = adapter.integration.resolvePagePath(config, 'auth/login').replace(/\\/g, '/');
      expect(resolved).toBe('src/pages/AuthLoginPage.tsx');
    });
  });
});

import { describe, it, expect } from 'vitest';
import { ExpressVueAdapter } from '../../adapters/implementations/express-vue';
import { ProjectConfig, SceneDefinition } from '../../types';
import { getLocaleConfig } from '../../adapters/locale';

const adapter = new ExpressVueAdapter();
const locale = getLocaleConfig({} as ProjectConfig);

function makeScene(overrides?: Partial<SceneDefinition>): SceneDefinition {
  return {
    name: 'test-scene',
    description: 'Test scene',
    version: '1.0.0',
    stackCompatibility: ['express-vue'],
    dependencies: [],
    entities: [
      { name: 'User', fields: { id: 'String @id @default(uuid())', email: 'String @unique' } },
    ],
    api: [
      { method: 'POST', path: '/api/auth/login', description: 'Login' },
      { method: 'GET', path: '/api/auth/me', description: 'Get current user' },
    ],
    frontend: {
      pages: [{ path: 'auth/login', description: 'Login page' }],
      components: [{ path: 'auth/LoginForm', description: 'Login form' }],
      hooks: [{ path: 'useAuth', description: 'Auth hook' }],
    },
    types: [{ path: 'auth', description: 'Auth types (User, LoginInput)' }],
    ...overrides,
  };
}

function makeConfig(orm = 'prisma'): ProjectConfig {
  return {
    framework: 'express-vue',
    orm: orm as ProjectConfig['orm'],
    typescript: true,
    directories: { services: 'src/services', types: 'src/types' },
    packageManager: 'npm',
  };
}

describe('ExpressVueAdapter', () => {
  it('has correct id and displayName', () => {
    expect(adapter.id).toBe('express-vue');
    expect(adapter.displayName).toBe('Express + Vue 3');
  });

  describe('fileExtension', () => {
    it('returns .vue for pages', () => expect(adapter.fileExtension('page')).toBe('.vue'));
    it('returns .vue for components', () => expect(adapter.fileExtension('component')).toBe('.vue'));
    it('returns .js for services', () => expect(adapter.fileExtension('service')).toBe('.js'));
    it('returns .js for hooks', () => expect(adapter.fileExtension('hook')).toBe('.js'));
  });

  describe('frontend', () => {
    it('pageFileNaming returns PascalCase + View.vue', () => {
      expect(adapter.frontend.pageFileNaming('auth/login')).toBe('AuthLoginView.vue');
      expect(adapter.frontend.pageFileNaming('admin/roles')).toBe('AdminRolesView.vue');
    });

    it('routerFile returns router/index.js', () => {
      expect(adapter.frontend.routerFile()).toBe('router/index.js');
    });
  });

  describe('backend', () => {
    it('modelIndexFile returns models/index.js', () => {
      expect(adapter.backend.modelIndexFile()).toBe('models/index.js');
    });

    it('registrationFiles includes routes and models index', () => {
      const files = adapter.backend.registrationFiles();
      expect(files).toContain('routes/index.js');
      expect(files).toContain('models/index.js');
    });
  });

  describe('prompt generation', () => {
    it('buildSchemaPrompt returns prompt for new entities', () => {
      const scene = makeScene();
      const prompt = adapter.backend.buildSchemaPrompt(scene, makeConfig(), '', locale);
      expect(prompt).not.toBeNull();
      expect(prompt).toContain('Prisma schema expert');
      expect(prompt).toContain('User');
    });

    it('buildSchemaPrompt returns null when entity already exists', () => {
      const scene = makeScene();
      const existingSchema = 'model User { id String @id }';
      const prompt = adapter.backend.buildSchemaPrompt(scene, makeConfig(), existingSchema, locale);
      expect(prompt).toBeNull();
    });

    it('buildServicePrompt returns prompt with Sequelize ORM instructions', () => {
      const scene = makeScene();
      const prompt = adapter.backend.buildServicePrompt(scene, makeConfig('sequelize'), '', '', locale);
      expect(prompt).not.toBeNull();
      expect(prompt).toContain('Sequelize');
    });

    it('buildServicePrompt returns prompt with Prisma ORM instructions', () => {
      const scene = makeScene();
      const prompt = adapter.backend.buildServicePrompt(scene, makeConfig('prisma'), '', '', locale);
      expect(prompt).not.toBeNull();
      expect(prompt).toContain('Prisma');
    });

    it('buildPagePrompt returns Vue 3 prompt', () => {
      const scene = makeScene();
      const prompt = adapter.frontend.buildPagePrompt(scene, makeConfig(), '', '', locale);
      expect(prompt).not.toBeNull();
      expect(prompt).toContain('Vue 3');
      expect(prompt).toContain('Element Plus');
    });

    it('buildComponentPrompt returns Vue 3 component prompt', () => {
      const scene = makeScene();
      const prompt = adapter.frontend.buildComponentPrompt(scene, makeConfig(), '', '', locale);
      expect(prompt).not.toBeNull();
      expect(prompt).toContain('Vue 3');
    });

    it('buildTypePrompt returns type prompt', () => {
      const scene = makeScene();
      const prompt = adapter.frontend.buildTypePrompt(scene, makeConfig(), '', locale);
      expect(prompt).not.toBeNull();
      expect(prompt).toContain('TypeScript type expert');
    });

    it('buildRouterPrompt returns Vue Router prompt', () => {
      const scene = makeScene();
      const prompt = adapter.frontend.buildRouterPrompt(scene, makeConfig(), '', locale);
      expect(prompt).not.toBeNull();
      expect(prompt).toContain('Vue Router');
    });
  });

  describe('integration', () => {
    it('resolvePagePath generates correct Vue view path', () => {
      const config = makeConfig();
      config.directories.pages = 'frontend/src/views';
      const resolved = adapter.integration.resolvePagePath(config, 'auth/login').replace(/\\/g, '/');
      expect(resolved).toBe('frontend/src/views/AuthLoginView.vue');
    });
  });
});

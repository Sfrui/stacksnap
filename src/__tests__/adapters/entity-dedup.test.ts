import { describe, it, expect } from 'vitest';
import { ExpressVueAdapter } from '../../adapters/implementations/express-vue';
import { ExpressReactAdapter } from '../../adapters/implementations/express-react';
import { NextjsAdapter } from '../../adapters/implementations/nextjs';
import { ProjectConfig, SceneDefinition } from '../../types';
import { getLocaleConfig } from '../../adapters/locale';

function makeScene(entities: SceneDefinition['entities']): SceneDefinition {
  return {
    name: 'test',
    description: 'test',
    version: '1.0.0',
    stackCompatibility: [],
    dependencies: [],
    entities,
    api: [],
    frontend: { pages: [], components: [], hooks: [] },
    types: [],
  };
}

function makeConfig(framework: ProjectConfig['framework'] = 'express-vue'): ProjectConfig {
  return {
    framework,
    orm: 'prisma',
    typescript: true,
    directories: { schema: 'prisma/schema.prisma' },
    packageManager: 'npm',
  };
}

const locale = getLocaleConfig(makeConfig());

describe('Entity deduplication', () => {
  const adapters = [
    { name: 'ExpressVue', adapter: new ExpressVueAdapter() },
    { name: 'ExpressReact', adapter: new ExpressReactAdapter() },
    { name: 'Nextjs', adapter: new NextjsAdapter() },
  ];

  for (const { name, adapter } of adapters) {
    describe(name, () => {
      it('does NOT skip entity when schema contains entity name as substring', () => {
        // "Order" should NOT be skipped when "orderItems" exists in schema
        const scene = makeScene([{ name: 'Order', fields: { id: 'String @id' } }]);
        const existingSchema = 'model OrderItems {\n  id String @id\n}';
        const prompt = adapter.backend.buildSchemaPrompt(scene, makeConfig(), existingSchema, locale);
        expect(prompt).not.toBeNull();
        expect(prompt).toContain('Order');
      });

      it('skips entity when exact model declaration exists', () => {
        const scene = makeScene([{ name: 'User', fields: { id: 'String @id' } }]);
        const existingSchema = 'model User {\n  id String @id\n  email String\n}';
        const prompt = adapter.backend.buildSchemaPrompt(scene, makeConfig(), existingSchema, locale);
        expect(prompt).toBeNull();
      });

      it('generates prompt when model name appears only in field names', () => {
        const scene = makeScene([{ name: 'User', fields: { id: 'String @id' } }]);
        const existingSchema = 'model Post {\n  id String @id\n  userId String\n  username String\n}';
        const prompt = adapter.backend.buildSchemaPrompt(scene, makeConfig(), existingSchema, locale);
        expect(prompt).not.toBeNull();
      });
    });
  }
});

describe('buildModelIndexPrompt with Prisma ORM', () => {
  it('returns null for Prisma ORM (ExpressVue)', () => {
    const adapter = new ExpressVueAdapter();
    const config = makeConfig();
    const prompt = adapter.backend.buildModelIndexPrompt(
      makeScene([]), config, ['User'], '', locale,
    );
    expect(prompt).toBeNull();
  });

  it('returns null for Prisma ORM (ExpressReact)', () => {
    const adapter = new ExpressReactAdapter();
    const config = makeConfig('express-react');
    const prompt = adapter.backend.buildModelIndexPrompt(
      makeScene([]), config, ['User'], '', locale,
    );
    expect(prompt).toBeNull();
  });

  it('returns prompt for Sequelize ORM (ExpressVue)', () => {
    const adapter = new ExpressVueAdapter();
    const config = makeConfig();
    config.orm = 'sequelize';
    const prompt = adapter.backend.buildModelIndexPrompt(
      makeScene([]), config, ['User'], '', locale,
    );
    expect(prompt).not.toBeNull();
    expect(prompt).toContain('Sequelize');
  });

  it('returns prompt for Drizzle ORM (ExpressVue)', () => {
    const adapter = new ExpressVueAdapter();
    const config = makeConfig();
    config.orm = 'drizzle';
    const prompt = adapter.backend.buildModelIndexPrompt(
      makeScene([]), config, ['User'], '', locale,
    );
    expect(prompt).not.toBeNull();
    expect(prompt).toContain('Drizzle');
  });
});

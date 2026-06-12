import { describe, it, expect } from 'vitest';
import { extractModelBlocks, injectPrismaModels } from '../../core/injector/schema-injector';

describe('extractModelBlocks', () => {
  it('extracts a single model block', () => {
    const raw = `model User {
  id    String @id @default(uuid())
  email String @unique
  name  String?
}`;
    const blocks = extractModelBlocks(raw);
    expect(blocks.length).toBe(1);
    expect(blocks[0]).toContain('model User');
    expect(blocks[0]).toContain('email String @unique');
  });

  it('extracts multiple model blocks', () => {
    const raw = `model User {
  id String @id @default(uuid())
}

model Post {
  id     String @id @default(uuid())
  userId String
}`;
    const blocks = extractModelBlocks(raw);
    expect(blocks.length).toBe(2);
    expect(blocks[0]).toContain('model User');
    expect(blocks[1]).toContain('model Post');
  });

  it('throws when no model blocks found', () => {
    expect(() => extractModelBlocks('no models here')).toThrow();
  });
});

describe('injectPrismaModels', () => {
  it('appends models to existing schema', () => {
    const existing = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}`;
    const newModels = `model User {
  id    String @id @default(uuid())
  email String @unique
}`;
    const result = injectPrismaModels(existing, newModels);
    expect(result).toContain('generator client');
    expect(result).toContain('model User');
    expect(result).toContain('@stacksnap added');
    expect(result).toContain('@stacksnap end');
  });

  it('creates schema from scratch when empty', () => {
    const newModels = `model User {
  id String @id @default(uuid())
}`;
    const result = injectPrismaModels('', newModels);
    expect(result).toContain('model User');
    expect(result).toContain('@stacksnap added');
  });

  it('preserves existing models', () => {
    const existing = `model Post {
  id String @id @default(uuid())
}`;
    const newModels = `model User {
  id String @id @default(uuid())
}`;
    const result = injectPrismaModels(existing, newModels);
    expect(result).toContain('model Post');
    expect(result).toContain('model User');
  });

  it('throws when no model blocks in input', () => {
    expect(() => injectPrismaModels('', 'no models')).toThrow();
  });
});

import { describe, it, expect } from 'vitest';
import { detectFramework, detectOrm, detectUiLibrary } from '../core/detector';

describe('detectFramework', () => {
  it('detects nextjs', () => {
    expect(detectFramework({ next: '^14.0.0' })).toBe('nextjs');
  });

  it('detects express-vue', () => {
    expect(detectFramework({ express: '^4.18.0', vue: '^3.4.0' })).toBe('express-vue');
  });

  it('detects express-react', () => {
    expect(detectFramework({ express: '^4.18.0', react: '^18.0.0' })).toBe('express-react');
  });

  it('returns unknown for unrecognized', () => {
    expect(detectFramework({})).toBe('unknown');
    expect(detectFramework({ express: '^4.0.0' })).toBe('unknown');
    expect(detectFramework({ react: '^18.0.0' })).toBe('unknown');
  });

  it('nextjs takes priority over express', () => {
    expect(detectFramework({ next: '^14.0.0', react: '^18.0.0' })).toBe('nextjs');
  });
});

describe('detectOrm', () => {
  it('detects prisma via @prisma/client', () => {
    expect(detectOrm({ '@prisma/client': '^5.0.0' })).toBe('prisma');
  });

  it('detects prisma via prisma', () => {
    expect(detectOrm({ prisma: '^5.0.0' })).toBe('prisma');
  });

  it('detects drizzle', () => {
    expect(detectOrm({ 'drizzle-orm': '^0.29.0' })).toBe('drizzle');
  });

  it('detects sequelize', () => {
    expect(detectOrm({ sequelize: '^6.35.0' })).toBe('sequelize');
  });

  it('returns none for empty deps', () => {
    expect(detectOrm({})).toBe('none');
  });
});

describe('detectUiLibrary', () => {
  it('detects element-plus', () => {
    expect(detectUiLibrary({ 'element-plus': '^2.4.0' })).toBe('element-plus');
  });

  it('detects ant-design', () => {
    expect(detectUiLibrary({ antd: '^5.12.0' })).toBe('ant-design');
  });

  it('detects @ant-design/pro-components', () => {
    expect(detectUiLibrary({ '@ant-design/pro-components': '^2.0.0' })).toBe('ant-design');
  });

  it('detects mui', () => {
    expect(detectUiLibrary({ '@mui/material': '^5.15.0' })).toBe('mui');
  });

  it('detects chakra-ui', () => {
    expect(detectUiLibrary({ '@chakra-ui/react': '^2.8.0' })).toBe('chakra-ui');
  });

  it('returns undefined for unknown', () => {
    expect(detectUiLibrary({})).toBeUndefined();
  });
});

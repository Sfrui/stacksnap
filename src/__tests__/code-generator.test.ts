import { describe, it, expect } from 'vitest';
import { stripMarkdownFences, parseMultiFileOutput, parseSpecialBlock } from '../core/code-generator';

describe('stripMarkdownFences', () => {
  it('strips ```js fences', () => {
    const input = '```js\nconst x = 1;\n```';
    expect(stripMarkdownFences(input)).toBe('const x = 1;');
  });

  it('strips ``` fences without language', () => {
    const input = '```\nhello world\n```';
    expect(stripMarkdownFences(input)).toBe('hello world');
  });

  it('strips ```typescript fences', () => {
    const input = '```typescript\nexport const x = 1;\n```';
    expect(stripMarkdownFences(input)).toBe('export const x = 1;');
  });

  it('returns input unchanged when no fences', () => {
    const input = '// FILE: test.js\nconst x = 1;';
    expect(stripMarkdownFences(input)).toBe(input);
  });

  it('handles whitespace around fences', () => {
    const input = '  ```js\nconst x = 1;\n```  ';
    expect(stripMarkdownFences(input)).toBe('const x = 1;');
  });

  it('returns empty string for empty input', () => {
    expect(stripMarkdownFences('')).toBe('');
  });
});

describe('parseMultiFileOutput', () => {
  it('parses multiple files', () => {
    const output = `// FILE: auth.js
const login = () => {};
const register = () => {};

// FILE: user.js
const getUser = () => {};`;
    const files = parseMultiFileOutput(output, 'src/services');
    expect(files.length).toBe(2);
    expect(files[0].filePath).toContain('auth.js');
    expect(files[0].action).toBe('create');
    expect(files[1].filePath).toContain('user.js');
  });

  it('skips __ blocks', () => {
    const output = `// FILE: __ROUTE_REGISTRATION__
router.use('/auth', authRoutes);

// FILE: auth.js
const login = () => {};`;
    const files = parseMultiFileOutput(output, 'src/routes');
    expect(files.length).toBe(1);
    expect(files[0].filePath).toContain('auth.js');
  });

  it('normalizes extension when expectedExtension provided', () => {
    const output = `// FILE: LoginPage.js
const x = 1;`;
    const files = parseMultiFileOutput(output, 'src/views', undefined, '.vue');
    expect(files[0].filePath).toContain('LoginPage.vue');
  });

  it('returns empty array for empty input', () => {
    expect(parseMultiFileOutput('', 'src/')).toEqual([]);
  });

  it('adds extension when file has none', () => {
    const output = `// FILE: LoginPage
const x = 1;`;
    const files = parseMultiFileOutput(output, 'src/views', undefined, '.vue');
    expect(files[0].filePath).toContain('LoginPage.vue');
  });
});

describe('parseSpecialBlock', () => {
  it('parses __ROUTE_REGISTRATION__ block', () => {
    const output = `// FILE: auth.js
const login = () => {};

// FILE: __ROUTE_REGISTRATION__
const authRoutes = require('./auth');
router.use('/auth', authRoutes);`;
    const block = parseSpecialBlock(output, '__ROUTE_REGISTRATION__');
    expect(block).not.toBeNull();
    expect(block).toContain('authRoutes');
    expect(block).toContain('router.use');
  });

  it('returns null when block not found', () => {
    const output = `// FILE: auth.js
const login = () => {};`;
    expect(parseSpecialBlock(output, '__MISSING__')).toBeNull();
  });
});

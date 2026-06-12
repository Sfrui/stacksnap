import { describe, it, expect } from 'vitest';
import { pascalCase, toPascalCasePath } from '../../adapters/utils';

describe('pascalCase', () => {
  it('capitalizes single word', () => {
    expect(pascalCase('login')).toBe('Login');
  });

  it('handles hyphenated words', () => {
    expect(pascalCase('forgot-password')).toBe('ForgotPassword');
  });

  it('handles already capitalized input', () => {
    expect(pascalCase('Login')).toBe('Login');
  });

  it('handles empty string', () => {
    expect(pascalCase('')).toBe('');
  });
});

describe('toPascalCasePath', () => {
  it('converts single segment', () => {
    expect(toPascalCasePath('login')).toBe('Login');
  });

  it('converts multi-segment path', () => {
    expect(toPascalCasePath('auth/login')).toBe('AuthLogin');
  });

  it('converts deeply nested path', () => {
    expect(toPascalCasePath('admin/user/roles')).toBe('AdminUserRoles');
  });

  it('handles hyphenated segments', () => {
    expect(toPascalCasePath('auth/forgot-password')).toBe('AuthForgotPassword');
  });

  it('handles single-segment hyphenated path', () => {
    expect(toPascalCasePath('user-profile')).toBe('UserProfile');
  });
});

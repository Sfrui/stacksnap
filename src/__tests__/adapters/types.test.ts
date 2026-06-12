import { describe, it, expect } from 'vitest';
import { formatRoutesForPrompt, groupRoutesByPrefix } from '../../adapters/types';
import { SceneApiRoute } from '../../types';

describe('formatRoutesForPrompt', () => {
  it('formats routes as indented lines', () => {
    const routes: SceneApiRoute[] = [
      { method: 'POST', path: '/api/auth/login', description: 'Login' },
      { method: 'GET', path: '/api/auth/me', description: 'Get current user' },
    ];
    const result = formatRoutesForPrompt(routes);
    expect(result).toBe(
      '  POST /api/auth/login — Login\n  GET /api/auth/me — Get current user',
    );
  });

  it('returns empty string for empty array', () => {
    expect(formatRoutesForPrompt([])).toBe('');
  });
});

describe('groupRoutesByPrefix', () => {
  it('groups routes by first path segment after /api/', () => {
    const routes: SceneApiRoute[] = [
      { method: 'POST', path: '/api/auth/login', description: 'Login' },
      { method: 'POST', path: '/api/auth/register', description: 'Register' },
      { method: 'GET', path: '/api/users', description: 'List users' },
    ];
    const groups = groupRoutesByPrefix(routes);
    expect(groups.has('auth')).toBe(true);
    expect(groups.has('users')).toBe(true);
    expect(groups.get('auth')!.length).toBe(2);
    expect(groups.get('users')!.length).toBe(1);
  });

  it('handles paths without /api/ prefix', () => {
    const routes: SceneApiRoute[] = [
      { method: 'GET', path: '/health', description: 'Health check' },
    ];
    const groups = groupRoutesByPrefix(routes);
    // Without /api/ prefix, the first segment after split is empty, so it falls into 'default'
    expect(groups.has('default')).toBe(true);
    expect(groups.get('default')!.length).toBe(1);
  });
});

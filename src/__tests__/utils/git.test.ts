import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import simpleGit from 'simple-git';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { rollback, setupGitBranch } from '../../utils/git';

let tmpDir: string;
let defaultBranch: string;

beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stacksnap-test-'));
  const g = simpleGit(tmpDir);
  await g.init();
  await g.addConfig('user.email', 'test@test.com');
  await g.addConfig('user.name', 'Test');
  fs.writeFileSync(path.join(tmpDir, 'README.md'), '# test');
  await g.add('.');
  await g.commit('initial');
  defaultBranch = (await g.status()).current!;
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('setupGitBranch', () => {
  it('creates and checks out a new branch', async () => {
    const result = await setupGitBranch(tmpDir, 'stacksnap/test');
    expect(result).toBe(true);

    const g = simpleGit(tmpDir);
    expect((await g.status()).current).toBe('stacksnap/test');
  });

  it('handles pre-existing branch by deleting and recreating', async () => {
    const g = simpleGit(tmpDir);
    await g.checkoutLocalBranch('stacksnap/existing');
    await g.checkout(defaultBranch);

    const result = await setupGitBranch(tmpDir, 'stacksnap/existing');
    expect(result).toBe(true);

    expect((await g.status()).current).toBe('stacksnap/existing');
  });
});

describe('rollback', () => {
  it('switches back to default branch and deletes scene branch', async () => {
    await setupGitBranch(tmpDir, 'stacksnap/auth');

    await rollback(tmpDir, 'stacksnap/auth');

    const g = simpleGit(tmpDir);
    expect((await g.status()).current).toBe(defaultBranch);

    const branches = await g.branchLocal();
    expect(branches.all).not.toContain('stacksnap/auth');
  });

  it('returns to main when it exists as a branch', async () => {
    const g = simpleGit(tmpDir);
    // Create a 'main' branch from current default
    await g.checkoutLocalBranch('main');
    await g.checkout(defaultBranch);
    await g.checkoutLocalBranch('stacksnap/test');

    await rollback(tmpDir, 'stacksnap/test');

    expect((await g.status()).current).toBe('main');
  });
});

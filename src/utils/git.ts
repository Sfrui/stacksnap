import simpleGit, { SimpleGit } from 'simple-git';

function git(cwd?: string): SimpleGit {
  return simpleGit(cwd);
}

export async function isGitRepo(cwd: string): Promise<boolean> {
  try {
    await git(cwd).status();
    return true;
  } catch {
    return false;
  }
}

export async function setupGitBranch(cwd: string, branchName: string): Promise<boolean> {
  try {
    const g = git(cwd);
    const branches = await g.branchLocal();
    if (branches.all.includes(branchName)) {
      await g.deleteLocalBranch(branchName, true);
    }
    await g.checkoutLocalBranch(branchName);
    return true;
  } catch (err) {
    console.warn(`Failed to create branch "${branchName}": ${(err as Error).message}`);
    return false;
  }
}

export async function commitChanges(cwd: string, message: string): Promise<boolean> {
  try {
    const g = git(cwd);
    await g.add('.');
    await g.commit(message);
    return true;
  } catch (err) {
    console.warn(`Failed to commit: ${(err as Error).message}`);
    return false;
  }
}

export async function rollback(cwd: string, branchName: string): Promise<void> {
  try {
    const g = git(cwd);
    const branches = await g.branchLocal();
    const defaultBranch = branches.all.includes('main') ? 'main' : 'master';
    await g.checkout(defaultBranch);
    await g.deleteLocalBranch(branchName, true);
    console.log(`Rolled back: switched to ${defaultBranch}, deleted branch "${branchName}"`);
  } catch (err) {
    console.error(`Rollback failed: ${(err as Error).message}. You may need to clean up manually.`);
  }
}

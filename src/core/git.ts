import { simpleGit, SimpleGit } from 'simple-git';

const git: SimpleGit = simpleGit();

export async function getStagedDiff(): Promise<string> {
  return git.diff(['--cached']);
}

export async function getBranchDiff(baseBranch?: string): Promise<string> {
  const base = baseBranch || (await getDefaultBranch());
  return git.diff([`${base}...HEAD`]);
}

export async function getRecentCommits(
  n: number = 20,
): Promise<Array<{ hash: string; message: string; author: string }>> {
  const log = await git.log({ maxCount: n });
  return log.all.map((c) => ({
    hash: c.hash.slice(0, 7),
    message: c.message,
    author: c.author_name,
  }));
}

export async function getCurrentBranch(): Promise<string> {
  return (await git.branchLocal()).current;
}

export async function getRemoteUrl(): Promise<string | null> {
  try {
    const remotes = await git.getRemotes(true);
    const origin = remotes.find((r) => r.name === 'origin');
    return origin?.refs?.push || origin?.refs?.fetch || null;
  } catch {
    return null;
  }
}

export async function getStagedFiles(): Promise<string[]> {
  const status = await git.status();
  return [...status.staged, ...status.created.filter((f) => status.staged.includes(f))];
}

export async function hasStagedChanges(): Promise<boolean> {
  const status = await git.status();
  return status.staged.length > 0 || status.created.length > 0;
}

export async function getRepoRoot(): Promise<string> {
  return git.revparse(['--show-toplevel']);
}

export async function createCommit(message: string): Promise<void> {
  await git.commit(message);
}

export async function getCommitsBetween(
  from: string,
  to: string = 'HEAD',
): Promise<Array<{ hash: string; message: string; date: string }>> {
  const log = await git.log({ from, to });
  return log.all.map((c) => ({
    hash: c.hash.slice(0, 7),
    message: c.message,
    date: c.date,
  }));
}

export async function getLatestTag(): Promise<string | null> {
  try {
    const tag = await git.raw(['describe', '--tags', '--abbrev=0']);
    return tag.trim() || null;
  } catch {
    return null;
  }
}

export async function stageAll(): Promise<void> {
  await git.add('-A');
}

export async function push(): Promise<void> {
  const branch = await getCurrentBranch();
  await git.push('origin', branch);
}

async function getDefaultBranch(): Promise<string> {
  try {
    const branches = await git.branchLocal();
    if (branches.all.includes('main')) return 'main';
    if (branches.all.includes('master')) return 'master';
    return 'main';
  } catch {
    return 'main';
  }
}

export async function getDiffStats(): Promise<string> {
  return git.diff(['--cached', '--stat']);
}

export async function getBranchCommits(baseBranch?: string): Promise<string[]> {
  const base = baseBranch || (await getDefaultBranch());
  const log = await git.log({ from: base, to: 'HEAD' });
  return log.all.map((c) => c.message);
}

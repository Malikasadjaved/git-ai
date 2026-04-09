import { describe, it, expect } from 'vitest';
import { learnCommitStyle, buildStyleInstruction } from '../src/core/style-learner.js';

describe('learnCommitStyle', () => {
  it('detects conventional commits format', async () => {
    const commits = [
      { message: 'feat: add login page' },
      { message: 'fix: resolve memory leak' },
      { message: 'chore: update deps' },
      { message: 'feat(auth): add JWT support' },
      { message: 'fix: handle null pointer' },
    ];
    const style = await learnCommitStyle(commits);
    expect(style.format).toBe('conventional');
    expect(style.preferredTypes).toContain('feat');
    expect(style.preferredTypes).toContain('fix');
  });

  it('detects plain format', async () => {
    const commits = [
      { message: 'Add login page' },
      { message: 'Fix memory leak in pool' },
      { message: 'Update dependencies' },
    ];
    const style = await learnCommitStyle(commits);
    expect(style.format).toBe('plain');
  });

  it('returns defaults for empty history', async () => {
    const style = await learnCommitStyle([]);
    expect(style.format).toBe('conventional');
    expect(style.preferredTypes).toEqual(['feat', 'fix', 'chore']);
  });

  it('detects scope usage', async () => {
    const commits = [
      { message: 'feat(auth): add login' },
      { message: 'fix(api): handle errors' },
      { message: 'chore(deps): update packages' },
    ];
    const style = await learnCommitStyle(commits);
    expect(style.usesScope).toBe(true);
  });
});

describe('buildStyleInstruction', () => {
  it('generates instruction string', async () => {
    const style = await learnCommitStyle([
      { message: 'feat: add feature' },
      { message: 'fix: fix bug' },
      { message: 'feat: another feature' },
    ]);
    const instruction = buildStyleInstruction(style);
    expect(instruction).toContain('Conventional Commits');
    expect(instruction).toContain('feat');
  });
});

import { describe, it, expect } from 'vitest';
import { buildCommitPrompt, buildReviewPrompt, buildChangelogPrompt } from '../src/core/prompt-builder.js';
import type { CommitStyle } from '../src/core/style-learner.js';

const mockStyle: CommitStyle = {
  format: 'conventional',
  usesEmoji: false,
  averageLength: 50,
  usesScope: false,
  preferredTypes: ['feat', 'fix', 'chore'],
  exampleMessages: ['feat: add auth', 'fix: resolve crash'],
  casing: 'lower',
  language: 'en',
};

describe('buildCommitPrompt', () => {
  it('includes diff and files', () => {
    const prompt = buildCommitPrompt({
      diff: '+ new line',
      stagedFiles: ['src/index.ts'],
      branch: 'feature/add-auth',
      style: mockStyle,
    });
    expect(prompt).toContain('+ new line');
    expect(prompt).toContain('src/index.ts');
    expect(prompt).toContain('feature/add-auth');
  });

  it('includes ticket ID when present', () => {
    const prompt = buildCommitPrompt({
      diff: '+ change',
      stagedFiles: ['file.ts'],
      branch: 'main',
      style: mockStyle,
      ticketId: 'PROJ-123',
    });
    expect(prompt).toContain('PROJ-123');
  });
});

describe('buildReviewPrompt', () => {
  it('includes diff and review criteria', () => {
    const prompt = buildReviewPrompt('+ some code');
    expect(prompt).toContain('+ some code');
    expect(prompt).toContain('CRITICAL');
    expect(prompt).toContain('WARNING');
  });
});

describe('buildChangelogPrompt', () => {
  it('includes commits', () => {
    const prompt = buildChangelogPrompt([
      { message: 'feat: add login', date: '2024-01-01' },
      { message: 'fix: memory leak', date: '2024-01-02' },
    ]);
    expect(prompt).toContain('feat: add login');
    expect(prompt).toContain('fix: memory leak');
  });
});

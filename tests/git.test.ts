import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockDiff,
  mockLog,
  mockBranchLocal,
  mockStatus,
  mockCommit,
  mockAdd,
  mockPush,
  mockGetRemotes,
  mockRevparse,
  mockRaw,
} = vi.hoisted(() => ({
  mockDiff: vi.fn(),
  mockLog: vi.fn(),
  mockBranchLocal: vi.fn(),
  mockStatus: vi.fn(),
  mockCommit: vi.fn(),
  mockAdd: vi.fn(),
  mockPush: vi.fn(),
  mockGetRemotes: vi.fn(),
  mockRevparse: vi.fn(),
  mockRaw: vi.fn(),
}));

vi.mock('simple-git', () => ({
  simpleGit: () => ({
    diff: mockDiff,
    log: mockLog,
    branchLocal: mockBranchLocal,
    status: mockStatus,
    commit: mockCommit,
    add: mockAdd,
    push: mockPush,
    getRemotes: mockGetRemotes,
    revparse: mockRevparse,
    raw: mockRaw,
  }),
}));

import {
  getStagedDiff,
  getCurrentBranch,
  getRecentCommits,
  hasStagedChanges,
  getRemoteUrl,
  getLatestTag,
  createCommit,
  stageAll,
  getDiffStats,
} from '../src/core/git.js';

describe('git operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStagedDiff', () => {
    it('calls git diff --cached', async () => {
      mockDiff.mockResolvedValue('+ added line');
      const result = await getStagedDiff();
      expect(mockDiff).toHaveBeenCalledWith(['--cached']);
      expect(result).toBe('+ added line');
    });
  });

  describe('getCurrentBranch', () => {
    it('returns current branch name', async () => {
      mockBranchLocal.mockResolvedValue({ current: 'feature/auth' });
      const result = await getCurrentBranch();
      expect(result).toBe('feature/auth');
    });
  });

  describe('getRecentCommits', () => {
    it('maps commits with truncated hash', async () => {
      mockLog.mockResolvedValue({
        all: [
          { hash: 'abcdef1234567890', message: 'feat: add login', author_name: 'John' },
          { hash: '1234567890abcdef', message: 'fix: bug', author_name: 'Jane' },
        ],
      });
      const result = await getRecentCommits(2);
      expect(result).toEqual([
        { hash: 'abcdef1', message: 'feat: add login', author: 'John' },
        { hash: '1234567', message: 'fix: bug', author: 'Jane' },
      ]);
    });

    it('defaults to 20 commits', async () => {
      mockLog.mockResolvedValue({ all: [] });
      await getRecentCommits();
      expect(mockLog).toHaveBeenCalledWith({ maxCount: 20 });
    });
  });

  describe('hasStagedChanges', () => {
    it('returns true when files are staged', async () => {
      mockStatus.mockResolvedValue({ staged: ['file.ts'], created: [] });
      expect(await hasStagedChanges()).toBe(true);
    });

    it('returns true when files are created', async () => {
      mockStatus.mockResolvedValue({ staged: [], created: ['new.ts'] });
      expect(await hasStagedChanges()).toBe(true);
    });

    it('returns false when nothing is staged', async () => {
      mockStatus.mockResolvedValue({ staged: [], created: [] });
      expect(await hasStagedChanges()).toBe(false);
    });
  });

  describe('getRemoteUrl', () => {
    it('returns push URL for origin', async () => {
      mockGetRemotes.mockResolvedValue([
        { name: 'origin', refs: { push: 'https://github.com/user/repo.git', fetch: 'https://github.com/user/repo.git' } },
      ]);
      const result = await getRemoteUrl();
      expect(result).toBe('https://github.com/user/repo.git');
    });

    it('returns null when no remotes', async () => {
      mockGetRemotes.mockResolvedValue([]);
      const result = await getRemoteUrl();
      expect(result).toBeNull();
    });

    it('returns null on error', async () => {
      mockGetRemotes.mockRejectedValue(new Error('no git'));
      const result = await getRemoteUrl();
      expect(result).toBeNull();
    });
  });

  describe('getLatestTag', () => {
    it('returns tag when exists', async () => {
      mockRaw.mockResolvedValue('v1.0.0\n');
      const result = await getLatestTag();
      expect(result).toBe('v1.0.0');
    });

    it('returns null when no tags', async () => {
      mockRaw.mockRejectedValue(new Error('no tags'));
      const result = await getLatestTag();
      expect(result).toBeNull();
    });
  });

  describe('createCommit', () => {
    it('calls git commit with message', async () => {
      mockCommit.mockResolvedValue({});
      await createCommit('feat: test');
      expect(mockCommit).toHaveBeenCalledWith('feat: test');
    });
  });

  describe('stageAll', () => {
    it('calls git add -A', async () => {
      mockAdd.mockResolvedValue({});
      await stageAll();
      expect(mockAdd).toHaveBeenCalledWith('-A');
    });
  });

  describe('getDiffStats', () => {
    it('calls git diff --cached --stat', async () => {
      mockDiff.mockResolvedValue(' 1 file changed, 5 insertions(+)');
      const result = await getDiffStats();
      expect(mockDiff).toHaveBeenCalledWith(['--cached', '--stat']);
      expect(result).toContain('1 file changed');
    });
  });
});

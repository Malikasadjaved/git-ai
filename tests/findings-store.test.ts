import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetRepoRoot, mockExistsSync, mockReadFileSync, mockWriteFileSync } = vi.hoisted(() => {
  let fsStore: Record<string, string> = {};

  return {
    mockGetRepoRoot: vi.fn().mockResolvedValue('/fake/repo'),
    mockExistsSync: vi.fn(
      (path: string) => path in fsStore || path.includes('.git-ai'),
    ),
    mockReadFileSync: vi.fn((path: string, _enc: string) => {
      if (path in fsStore) return fsStore[path];
      throw new Error('ENOENT');
    }),
    mockWriteFileSync: vi.fn((path: string, data: string, _enc: string) => {
      fsStore[path] = data;
    }),
  };
});

vi.mock('../src/core/git.js', () => ({
  getRepoRoot: mockGetRepoRoot,
  getStagedDiff: vi.fn(),
  getBranchDiff: vi.fn(),
  getCurrentBranch: vi.fn(),
  getStagedFiles: vi.fn(),
  hasStagedChanges: vi.fn(),
  createCommit: vi.fn(),
  push: vi.fn(),
  stageAll: vi.fn(),
  getDiffStats: vi.fn(),
  getBranchCommits: vi.fn(),
  getCommitsBetween: vi.fn(),
  getRecentCommits: vi.fn(),
  getRemoteUrl: vi.fn(),
  getLatestTag: vi.fn(),
  getHeadHash: vi.fn(),
}));

vi.mock('node:fs', () => ({
  existsSync: mockExistsSync,
  mkdirSync: vi.fn(),
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
}));

import { loadFindings, saveFindings, acknowledgeFinding, clearFindings } from '../src/core/findings-store.js';
import type { FindingRecord } from '../src/core/findings-store.js';

const sampleFinding: FindingRecord = {
  id: 'abc12345',
  fingerprint: 'abc12345deadbeef',
  severity: 'CRITICAL',
  location: 'src/api/users.ts:42',
  description: 'SQL injection risk',
  commit: 'a1b2c3d',
  timestamp: '2026-05-29T00:00:00.000Z',
  acknowledged: false,
};

describe('findings-store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRepoRoot.mockResolvedValue('/fake/repo');
  });

  it('loads empty array when no file exists', async () => {
    mockExistsSync.mockReturnValue(false);
    const findings = await loadFindings();
    expect(findings).toEqual([]);
  });

  it('saves and loads findings', async () => {
    mockExistsSync.mockReturnValue(false);

    await saveFindings([sampleFinding]);

    // Verify writeFileSync was called
    expect(mockWriteFileSync).toHaveBeenCalled();

    // Extract what was written and feed it back to readFileSync
    const writeCall = mockWriteFileSync.mock.calls[0] as [string, string, string];
    const writtenPath = writeCall[0];
    const writtenData = writeCall[1];

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation((path: string) => {
      if (typeof path === 'string' && path.includes('.git-ai')) return writtenData;
      throw new Error('ENOENT');
    });

    const findings = await loadFindings();
    expect(findings).toHaveLength(1);
    expect(findings[0].id).toBe('abc12345');
    expect(findings[0].severity).toBe('CRITICAL');
  });

  it('acknowledgeFinding marks acknowledged', async () => {
    mockExistsSync.mockReturnValue(false);
    await saveFindings([sampleFinding]);

    const writeCall = mockWriteFileSync.mock.calls[0] as [string, string, string];
    const writtenData = writeCall[1];

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation((path: string) => {
      if (typeof path === 'string' && path.includes('.git-ai')) return writtenData;
      throw new Error('ENOENT');
    });

    const ok = await acknowledgeFinding('abc12345');
    expect(ok).toBe(true);
  });

  it('acknowledgeFinding returns false for unknown id', async () => {
    mockExistsSync.mockReturnValue(false);
    await saveFindings([sampleFinding]);

    const writeCall = mockWriteFileSync.mock.calls[0] as [string, string, string];
    const writtenData = writeCall[1];

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation((path: string) => {
      if (typeof path === 'string' && path.includes('.git-ai')) return writtenData;
      throw new Error('ENOENT');
    });

    const ok = await acknowledgeFinding('nonexistent');
    expect(ok).toBe(false);
  });

  it('clearFindings removes all findings', async () => {
    mockExistsSync.mockReturnValue(false);
    await saveFindings([sampleFinding]);

    await clearFindings();

    // After clear, the written data should be an empty array
    const writeCall = mockWriteFileSync.mock.calls[mockWriteFileSync.mock.calls.length - 1] as [string, string, string];
    const clearedData = writeCall[1];

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation((path: string) => {
      if (typeof path === 'string' && path.includes('.git-ai')) return clearedData;
      throw new Error('ENOENT');
    });

    const findings = await loadFindings();
    expect(findings).toEqual([]);
  });

  it('loads empty array when findings.json is corrupted', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('not valid json {{{');

    const findings = await loadFindings();
    expect(findings).toEqual([]);
  });
});

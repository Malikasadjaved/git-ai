import { describe, it, expect } from 'vitest';
import { extractTicketId, getBranchType } from '../src/utils/branch-parser.js';

describe('extractTicketId', () => {
  it('extracts JIRA-style ticket IDs', () => {
    expect(extractTicketId('feature/PROJ-123-add-auth')).toBe('PROJ-123');
    expect(extractTicketId('ENG-456/update-dashboard')).toBe('ENG-456');
  });

  it('extracts GitHub issue numbers', () => {
    expect(extractTicketId('fix/GH-42-memory-leak')).toBe('#42');
    expect(extractTicketId('feature/#99-new-login')).toBe('#99');
  });

  it('returns null when no ticket found', () => {
    expect(extractTicketId('main')).toBeNull();
    expect(extractTicketId('feature/add-auth')).toBeNull();
  });
});

describe('getBranchType', () => {
  it('detects branch types', () => {
    expect(getBranchType('main')).toBe('main');
    expect(getBranchType('master')).toBe('main');
    expect(getBranchType('feature/add-auth')).toBe('feature');
    expect(getBranchType('fix/memory-leak')).toBe('hotfix');
    expect(getBranchType('hotfix/urgent')).toBe('hotfix');
    expect(getBranchType('release/1.0')).toBe('release');
    expect(getBranchType('chore/update-deps')).toBe('chore');
    expect(getBranchType('random-branch')).toBe('other');
  });
});

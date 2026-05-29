import { describe, it, expect } from 'vitest';
import { parseReview, shouldFail, highestSeverity, fingerprintFinding } from '../src/utils/review-parser.js';

describe('parseReview', () => {
  it('parses a CRITICAL finding', () => {
    const raw = '[CRITICAL] SQL injection risk in user input — src/api/users.ts:42';
    const result = parseReview(raw);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].severity).toBe('CRITICAL');
    expect(result.findings[0].description).toContain('SQL injection');
    expect(result.findings[0].location).toBe('src/api/users.ts:42');
  });

  it('parses a WARNING finding', () => {
    const raw = '[WARNING] Missing error handling in async function fetchData()';
    const result = parseReview(raw);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].severity).toBe('WARNING');
    expect(result.findings[0].location).toBeUndefined();
  });

  it('parses a SUGGESTION finding', () => {
    const raw = '[SUGGESTION] Consider memoizing this expensive computation — src/utils/calc.ts:10';
    const result = parseReview(raw);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].severity).toBe('SUGGESTION');
    expect(result.findings[0].location).toBe('src/utils/calc.ts:10');
  });

  it('parses [SUGGEST] alias', () => {
    const raw = '[SUGGEST] Use a constant instead of a magic number';
    const result = parseReview(raw);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].severity).toBe('SUGGESTION');
  });

  it('parses multiple findings in one review', () => {
    const raw = `
[CRITICAL] SQL injection risk — src/db.ts:12
[WARNING] Unhandled promise rejection — src/api.ts:55
[SUGGESTION] Extract helper function
    `.trim();
    const result = parseReview(raw);
    expect(result.findings).toHaveLength(3);
    expect(result.summary.critical).toBe(1);
    expect(result.summary.warning).toBe(1);
    expect(result.summary.suggestion).toBe(1);
    expect(result.summary.total).toBe(3);
  });

  it('returns clean=true for positive-only response with no findings', () => {
    const raw = 'The code looks good. No issues found.';
    const result = parseReview(raw);
    expect(result.findings).toHaveLength(0);
    expect(result.clean).toBe(true);
  });

  it('returns clean=false and empty findings for neutral text', () => {
    const raw = 'Here is the review result summary.';
    const result = parseReview(raw);
    expect(result.findings).toHaveLength(0);
    expect(result.clean).toBe(false);
  });

  it('preserves the raw string', () => {
    const raw = '[WARNING] Something is off';
    const result = parseReview(raw);
    expect(result.raw).toBe(raw);
  });

  it('is case-insensitive for severity tags', () => {
    const raw = '[critical] lowercase severity tag — src/foo.ts:1';
    const result = parseReview(raw);
    expect(result.findings[0].severity).toBe('CRITICAL');
  });

  it('handles em-dash and regular dash as location separator', () => {
    const emDash = '[WARNING] Issue — src/foo.ts:5';
    const regularDash = '[WARNING] Issue - src/foo.ts:5';
    expect(parseReview(emDash).findings[0].location).toBe('src/foo.ts:5');
    expect(parseReview(regularDash).findings[0].location).toBe('src/foo.ts:5');
  });

  it('returns zero summary counts when no findings', () => {
    const result = parseReview('Everything is fine.');
    expect(result.summary).toEqual({ critical: 0, warning: 0, suggestion: 0, total: 0 });
  });
});

describe('highestSeverity', () => {
  it('returns CRITICAL when present', () => {
    const parsed = parseReview('[CRITICAL] Bad — src/a.ts:1\n[WARNING] Medium');
    expect(highestSeverity(parsed)).toBe('CRITICAL');
  });

  it('returns WARNING when no CRITICAL', () => {
    const parsed = parseReview('[WARNING] Medium\n[SUGGESTION] Minor');
    expect(highestSeverity(parsed)).toBe('WARNING');
  });

  it('returns SUGGESTION when only suggestions', () => {
    const parsed = parseReview('[SUGGESTION] Minor tweak');
    expect(highestSeverity(parsed)).toBe('SUGGESTION');
  });

  it('returns null when no findings', () => {
    const parsed = parseReview('Looks good.');
    expect(highestSeverity(parsed)).toBeNull();
  });
});

describe('shouldFail', () => {
  const mixedReview = parseReview('[CRITICAL] Bad\n[WARNING] Medium\n[SUGGESTION] Minor');

  it('fails on critical when threshold is critical', () => {
    expect(shouldFail(mixedReview, 'critical')).toBe(true);
  });

  it('fails on warning when threshold is warning', () => {
    expect(shouldFail(mixedReview, 'warning')).toBe(true);
  });

  it('fails on suggestion when threshold is suggestion', () => {
    expect(shouldFail(mixedReview, 'suggestion')).toBe(true);
  });

  it('does not fail when there are only suggestions and threshold is warning', () => {
    const suggestionOnly = parseReview('[SUGGESTION] Minor tweak');
    expect(shouldFail(suggestionOnly, 'warning')).toBe(false);
  });

  it('does not fail when there are only warnings and threshold is critical', () => {
    const warningOnly = parseReview('[WARNING] Medium issue');
    expect(shouldFail(warningOnly, 'critical')).toBe(false);
  });

  it('does not fail when no findings regardless of threshold', () => {
    const clean = parseReview('Looks great!');
    expect(shouldFail(clean, 'suggestion')).toBe(false);
  });

  it('returns false for unknown threshold', () => {
    expect(shouldFail(mixedReview, 'unknown')).toBe(false);
  });
});

describe('fingerprintFinding', () => {
  it('produces the same hash for semantically identical findings', () => {
    const a = { severity: 'CRITICAL' as const, description: 'SQL injection risk', location: 'src/api/users.ts:42' };
    const b = { severity: 'CRITICAL' as const, description: 'SQL injection risk', location: 'src/api/users.ts:42' };
    expect(fingerprintFinding(a)).toBe(fingerprintFinding(b));
  });

  it('ignores case in descriptions', () => {
    const a = { severity: 'WARNING' as const, description: 'Unhandled Promise', location: 'src/x.ts:1' };
    const b = { severity: 'WARNING' as const, description: 'unhandled promise', location: 'src/x.ts:1' };
    expect(fingerprintFinding(a)).toBe(fingerprintFinding(b));
  });

  it('ignores punctuation in descriptions', () => {
    const a = { severity: 'SUGGESTION' as const, description: 'Use a constant here!', location: undefined };
    const b = { severity: 'SUGGESTION' as const, description: 'Use a constant here', location: undefined };
    expect(fingerprintFinding(a)).toBe(fingerprintFinding(b));
  });

  it('produces different hashes for different severities', () => {
    const a = { severity: 'CRITICAL' as const, description: 'Same issue', location: 'src/x.ts:1' };
    const b = { severity: 'WARNING' as const, description: 'Same issue', location: 'src/x.ts:1' };
    expect(fingerprintFinding(a)).not.toBe(fingerprintFinding(b));
  });

  it('produces different hashes for different locations', () => {
    const a = { severity: 'WARNING' as const, description: 'Issue', location: 'src/a.ts:1' };
    const b = { severity: 'WARNING' as const, description: 'Issue', location: 'src/b.ts:1' };
    expect(fingerprintFinding(a)).not.toBe(fingerprintFinding(b));
  });

  it('produces different hashes for different descriptions', () => {
    const a = { severity: 'SUGGESTION' as const, description: 'Fix typo', location: undefined };
    const b = { severity: 'SUGGESTION' as const, description: 'Add comment', location: undefined };
    expect(fingerprintFinding(a)).not.toBe(fingerprintFinding(b));
  });

  it('handles missing location gracefully', () => {
    const a = { severity: 'WARNING' as const, description: 'Missing error handling', location: undefined };
    const b = { severity: 'WARNING' as const, description: 'Missing error handling', location: undefined };
    expect(fingerprintFinding(a)).toBe(fingerprintFinding(b));
  });
});

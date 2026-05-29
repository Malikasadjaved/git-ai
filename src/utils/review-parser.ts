import { createHash } from 'node:crypto';

export type Severity = 'CRITICAL' | 'WARNING' | 'SUGGESTION';

export interface ReviewFinding {
  severity: Severity;
  description: string;
  location?: string; // e.g. "src/api/users.ts:42"
}

export interface ReviewSummary {
  critical: number;
  warning: number;
  suggestion: number;
  total: number;
}

export interface ParsedReview {
  findings: ReviewFinding[];
  summary: ReviewSummary;
  raw: string;
  clean: boolean; // true when AI said code looks good with no findings
}

const SEVERITY_PATTERNS: Array<{ severity: Severity; pattern: RegExp }> = [
  { severity: 'CRITICAL', pattern: /\[CRITICAL\]/i },
  { severity: 'WARNING', pattern: /\[WARNING\]/i },
  { severity: 'SUGGESTION', pattern: /\[SUGGESTION\]|\[SUGGEST\]/i },
];

// Matches trailing "— src/file.ts:42" or "- src/file.ts:42"
const LOCATION_RE = /[—\-–]\s*([\w./\\:]+:\d+)\s*$/;

export function parseReview(raw: string): ParsedReview {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const findings: ReviewFinding[] = [];

  for (const line of lines) {
    for (const { severity, pattern } of SEVERITY_PATTERNS) {
      if (pattern.test(line)) {
        // Strip the severity tag from the description
        const description = line
          .replace(/\[CRITICAL\]/gi, '')
          .replace(/\[WARNING\]/gi, '')
          .replace(/\[SUGGESTION\]/gi, '')
          .replace(/\[SUGGEST\]/gi, '')
          .replace(LOCATION_RE, '')
          .trim()
          .replace(/^[—\-–:]\s*/, ''); // strip leading dash/em-dash

        // Extract optional location
        const locationMatch = line.match(LOCATION_RE);
        const location = locationMatch ? locationMatch[1].trim() : undefined;

        findings.push({ severity, description, location });
        break; // only match one severity per line
      }
    }
  }

  const summary: ReviewSummary = {
    critical: findings.filter((f) => f.severity === 'CRITICAL').length,
    warning: findings.filter((f) => f.severity === 'WARNING').length,
    suggestion: findings.filter((f) => f.severity === 'SUGGESTION').length,
    total: findings.length,
  };

  // Heuristic: if no findings were parsed and raw text contains positive language
  const clean =
    findings.length === 0 &&
    /looks? good|no issues?|no findings?|clean|lgtm/i.test(raw);

  return { findings, summary, raw, clean };
}

/**
 * Returns the highest severity level found in a ParsedReview.
 * Returns null if there are no findings.
 */
export function highestSeverity(parsed: ParsedReview): Severity | null {
  if (parsed.summary.critical > 0) return 'CRITICAL';
  if (parsed.summary.warning > 0) return 'WARNING';
  if (parsed.summary.suggestion > 0) return 'SUGGESTION';
  return null;
}

export function fingerprintFinding(finding: ReviewFinding): string {
  const normalized = finding.description
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');
  const raw = `${finding.severity}|${finding.location || ''}|${normalized}`;
  return createHash('sha256').update(raw, 'utf-8').digest('hex');
}

const SEVERITY_RANK: Record<Severity, number> = {
  CRITICAL: 3,
  WARNING: 2,
  SUGGESTION: 1,
};

/**
 * Returns true when the parsed review breaches the given fail threshold.
 * e.g. failOn='warning' → fails on WARNING or CRITICAL findings.
 */
export function shouldFail(parsed: ParsedReview, failOn: string): boolean {
  const threshold = failOn.toUpperCase() as Severity;
  if (!SEVERITY_RANK[threshold]) return false;

  return parsed.findings.some(
    (f) => SEVERITY_RANK[f.severity] >= SEVERITY_RANK[threshold],
  );
}

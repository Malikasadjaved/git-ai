import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'node:child_process';
import { getStagedDiff, getBranchDiff, getCurrentBranch, getHeadHash } from '../core/git.js';
import { buildReviewPrompt } from '../core/prompt-builder.js';
import { generate } from '../providers/index.js';
import { withSpinner } from '../ui/spinner.js';
import { displayReview, displayReviewSummary } from '../ui/diff-display.js';
import { parseReview, shouldFail, fingerprintFinding } from '../utils/review-parser.js';
import { loadFindings, saveFindings } from '../core/findings-store.js';
import type { FindingRecord } from '../core/findings-store.js';

export const reviewCommand = new Command('review')
  .alias('r')
  .description('AI code review of your staged changes')
  .option('--full', 'Review entire branch diff, not just staged')
  .option('-b, --base <branch>', 'Base branch for --full mode')
  .option('--json', 'Output structured JSON instead of colored text')
  .option(
    '--fail-on <severity>',
    'Exit with code 1 if findings meet this severity (critical|warning|suggestion)',
  )
  .option('--gh-comment', 'Post review as a GitHub PR comment via gh CLI')
  .option('--no-dedup', 'Disable duplicate finding suppression')
  .action(runReview);

export async function runReview(opts: {
  full?: boolean;
  base?: string;
  json?: boolean;
  failOn?: string;
  ghComment?: boolean;
  dedup?: boolean;
}) {
  try {
    const diff = opts.full ? await getBranchDiff(opts.base) : await getStagedDiff();

    if (!diff.trim()) {
      console.log(chalk.red('✗ No changes to review.'));
      console.log(
        chalk.dim(opts.full ? '  No diff between branches.' : '  Stage changes first: git add <files>'),
      );
      process.exit(1);
    }

    const prompt = buildReviewPrompt(diff);
    const raw = await withSpinner('Reviewing code...', () => generate(prompt));
    const parsed = parseReview(raw);

    // ── Deduplication ─────────────────────────────────────────────────────────
    let suppressedCount = 0;
    if (opts.dedup !== false && parsed.findings.length > 0) {
      const existing = await loadFindings();
      const seen = new Set(existing.filter((f) => !f.acknowledged).map((f) => f.fingerprint));
      const newFindings = parsed.findings.filter((f) => !seen.has(fingerprintFinding(f)));

      suppressedCount = parsed.findings.length - newFindings.length;

      if (newFindings.length > 0) {
        const headHash = await getHeadHash().catch(() => 'unknown');
        const newRecords: FindingRecord[] = newFindings.map((f) => ({
          id: fingerprintFinding(f).slice(0, 8),
          fingerprint: fingerprintFinding(f),
          severity: f.severity,
          location: f.location,
          description: f.description,
          commit: headHash,
          timestamp: new Date().toISOString(),
          acknowledged: false,
        }));

        await saveFindings([...existing, ...newRecords]);

        if (suppressedCount > 0) {
          parsed.findings.length = 0;
          parsed.findings.push(...newFindings);
          parsed.summary.critical = newFindings.filter((f) => f.severity === 'CRITICAL').length;
          parsed.summary.warning = newFindings.filter((f) => f.severity === 'WARNING').length;
          parsed.summary.suggestion = newFindings.filter((f) => f.severity === 'SUGGESTION').length;
          parsed.summary.total = newFindings.length;
          parsed.raw = newFindings.length > 0
            ? newFindings.map((f) => `[${f.severity}] ${f.description}${f.location ? ` — ${f.location}` : ''}`).join('\n')
            : parsed.raw;
        }
      }
    }

    // ── JSON output ────────────────────────────────────────────────────────────
    if (opts.json) {
      process.stdout.write(JSON.stringify(parsed, null, 2) + '\n');
    } else {
      // ── Human-readable output ────────────────────────────────────────────────
      console.log(chalk.cyan.bold('\n  Code Review\n'));
      displayReviewSummary(parsed);
      displayReview(parsed.raw);
      if (suppressedCount > 0) {
        console.log(chalk.dim(`\n  (${suppressedCount} duplicate finding${suppressedCount > 1 ? 's' : ''} suppressed)`));
      }
      console.log();
    }

    // ── GitHub PR comment ──────────────────────────────────────────────────────
    if (opts.ghComment) {
      try {
        const branch = await getCurrentBranch();
        const commentBody = buildPRCommentBody(parsed, parsed.raw, branch);
        execSync(
          `gh pr comment --body ${JSON.stringify(commentBody)}`,
          { stdio: 'inherit' },
        );
        if (!opts.json) {
          console.log(chalk.green('  ✓ Review posted as PR comment\n'));
        }
      } catch (ghError) {
        const msg = (ghError as Error).message;
        if (!opts.json) {
          console.error(
            chalk.yellow(
              `  ⚠  Could not post PR comment: ${msg}\n  Make sure gh is installed and authenticated.`,
            ),
          );
        }
      }
    }

    // ── Severity gating ────────────────────────────────────────────────────────
    if (opts.failOn) {
      const threshold = opts.failOn.toLowerCase();
      if (!['critical', 'warning', 'suggestion'].includes(threshold)) {
        console.error(
          chalk.red(`  ✗ Invalid --fail-on value: "${opts.failOn}". Use: critical | warning | suggestion`),
        );
        process.exit(2);
      }

      if (shouldFail(parsed, threshold)) {
        if (!opts.json) {
          const count = parsed.findings.filter(
            (f) => f.severity.toLowerCase() === threshold || isSeverityAbove(f.severity, threshold),
          ).length;
          console.error(
            chalk.red(
              `\n  ✗ Review failed: ${count} ${threshold}+ finding${count > 1 ? 's' : ''} found (--fail-on ${threshold})\n`,
            ),
          );
        }
        process.exit(1);
      } else if (!opts.json) {
        console.log(chalk.green(`  ✓ No ${threshold}+ findings — review passed\n`));
      }
    }
  } catch (error) {
    console.error(chalk.red(`\n  ✗ ${(error as Error).message}`));
    process.exit(1);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isSeverityAbove(severity: string, threshold: string): boolean {
  const rank: Record<string, number> = { critical: 3, warning: 2, suggestion: 1 };
  return (rank[severity.toLowerCase()] ?? 0) >= (rank[threshold] ?? 0);
}

function buildPRCommentBody(
  parsed: ReturnType<typeof parseReview>,
  raw: string,
  branch: string,
): string {
  const { summary } = parsed;

  const headerParts: string[] = [];
  if (summary.critical > 0) headerParts.push(`🔴 ${summary.critical} critical`);
  if (summary.warning > 0) headerParts.push(`🟡 ${summary.warning} warning${summary.warning > 1 ? 's' : ''}`);
  if (summary.suggestion > 0) headerParts.push(`🟢 ${summary.suggestion} suggestion${summary.suggestion > 1 ? 's' : ''}`);

  const header = headerParts.length > 0 ? headerParts.join(' · ') : '✅ No issues found';

  // Format findings as a table if we have structured data
  let body = '';
  if (parsed.findings.length > 0) {
    body = '\n| Severity | Finding | Location |\n|----------|---------|----------|\n';
    for (const f of parsed.findings) {
      const icon = f.severity === 'CRITICAL' ? '🔴' : f.severity === 'WARNING' ? '🟡' : '🟢';
      const loc = f.location ? `\`${f.location}\`` : '—';
      body += `| ${icon} ${f.severity} | ${f.description} | ${loc} |\n`;
    }
  } else {
    body = `\n${raw}`;
  }

  return `## 🤖 git-ai Code Review — \`${branch}\`\n\n**${header}**\n${body}\n\n---\n*Generated by [git-ai](https://github.com/Malikasadjaved/git-ai)*`;
}

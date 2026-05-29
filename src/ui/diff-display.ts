import chalk from 'chalk';
import type { ParsedReview } from '../utils/review-parser.js';

export function displayDiffStats(stats: string): void {
  if (!stats.trim()) return;
  const lines = stats.trim().split('\n');
  const summary = lines[lines.length - 1];
  console.log(chalk.dim(`  ${summary.trim()}`));
}

export function displayReviewSummary(parsed: ParsedReview): void {
  if (parsed.summary.total === 0) {
    if (parsed.clean) {
      console.log(chalk.green('  ✓ No issues found — code looks good.\n'));
    }
    return;
  }

  const parts: string[] = [];
  if (parsed.summary.critical > 0)
    parts.push(chalk.red(`🔴 ${parsed.summary.critical} critical`));
  if (parsed.summary.warning > 0)
    parts.push(chalk.yellow(`🟡 ${parsed.summary.warning} warning${parsed.summary.warning > 1 ? 's' : ''}`));
  if (parsed.summary.suggestion > 0)
    parts.push(chalk.green(`🟢 ${parsed.summary.suggestion} suggestion${parsed.summary.suggestion > 1 ? 's' : ''}`));

  console.log(`  ${parts.join('  ')}\n`);
}

export function displayReview(review: string): void {
  const lines = review.split('\n');
  for (const line of lines) {
    if (line.includes('[CRITICAL]')) {
      console.log(chalk.red(`  ${line.replace('[CRITICAL]', '🔴 [CRITICAL]')}`));
    } else if (line.includes('[WARNING]')) {
      console.log(chalk.yellow(`  ${line.replace('[WARNING]', '🟡 [WARNING]')}`));
    } else if (line.includes('[SUGGESTION]') || line.includes('[SUGGEST]')) {
      console.log(
        chalk.green(
          `  ${line.replace('[SUGGESTION]', '🟢 [SUGGESTION]').replace('[SUGGEST]', '🟢 [SUGGESTION]')}`,
        ),
      );
    } else {
      console.log(chalk.white(`  ${line}`));
    }
  }
}

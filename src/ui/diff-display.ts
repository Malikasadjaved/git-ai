import chalk from 'chalk';

export function displayDiffStats(stats: string): void {
  if (!stats.trim()) return;
  const lines = stats.trim().split('\n');
  const summary = lines[lines.length - 1];
  console.log(chalk.dim(`  ${summary.trim()}`));
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

import { Command } from 'commander';
import chalk from 'chalk';
import { getStagedDiff, getBranchDiff } from '../core/git.js';
import { buildReviewPrompt } from '../core/prompt-builder.js';
import { generate } from '../providers/index.js';
import { withSpinner } from '../ui/spinner.js';
import { displayReview } from '../ui/diff-display.js';

export const reviewCommand = new Command('review')
  .alias('r')
  .description('AI code review of your staged changes')
  .option('--full', 'Review entire branch diff, not just staged')
  .option('-b, --base <branch>', 'Base branch for --full mode')
  .action(runReview);

async function runReview(opts: { full?: boolean; base?: string }) {
  try {
    const diff = opts.full ? await getBranchDiff(opts.base) : await getStagedDiff();

    if (!diff.trim()) {
      console.log(chalk.red('✗ No changes to review.'));
      console.log(chalk.dim(opts.full ? '  No diff between branches.' : '  Stage changes first: git add <files>'));
      process.exit(1);
    }

    const prompt = buildReviewPrompt(diff);
    const review = await withSpinner('Reviewing code...', () => generate(prompt));

    console.log(chalk.cyan.bold('\n  Code Review\n'));
    displayReview(review);
    console.log();
  } catch (error) {
    console.error(chalk.red(`\n  ✗ ${(error as Error).message}`));
    process.exit(1);
  }
}

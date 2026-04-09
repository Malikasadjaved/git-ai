import { Command } from 'commander';
import chalk from 'chalk';
import { writeFileSync } from 'node:fs';
import {
  getStagedDiff,
  getStagedFiles,
  hasStagedChanges,
  getCurrentBranch,
  getRecentCommits,
  createCommit,
  stageAll,
  push,
  getDiffStats,
} from '../core/git.js';
import { learnCommitStyle } from '../core/style-learner.js';
import { buildCommitPrompt } from '../core/prompt-builder.js';
import { generate } from '../providers/index.js';
import { extractTicketId } from '../utils/branch-parser.js';
import { get } from '../core/config.js';
import { withSpinner } from '../ui/spinner.js';
import { promptCommitAction } from '../ui/confirm.js';
import { displayDiffStats } from '../ui/diff-display.js';

export const commitCommand = new Command('commit')
  .alias('c')
  .description('Generate an AI commit message for staged changes')
  .option('-a, --all', 'Stage all changes before committing')
  .option('-p, --push', 'Push after committing')
  .option('-y, --yes', 'Skip confirmation and commit immediately')
  .option('-n, --count <n>', 'Generate N alternatives to choose from', '1')
  .option('--hook-mode <file>', 'Hook mode: write message to file instead of committing')
  .action(runCommit);

export async function runCommit(opts: {
  all?: boolean;
  push?: boolean;
  yes?: boolean;
  count?: string;
  hookMode?: string;
}) {
  try {
    if (opts.all) await stageAll();

    if (!(await hasStagedChanges())) {
      console.log(chalk.red('✗ No staged changes found.'));
      console.log(chalk.dim('  Run: git add <files> to stage your changes'));
      process.exit(1);
    }

    const [diff, files, branch, recentCommits, stats] = await Promise.all([
      getStagedDiff(),
      getStagedFiles(),
      getCurrentBranch(),
      getRecentCommits(20),
      getDiffStats(),
    ]);

    console.log(chalk.cyan('\n  git-ai commit\n'));
    displayDiffStats(stats);

    const style =
      get('commit_style') === 'auto'
        ? await learnCommitStyle(recentCommits)
        : await learnCommitStyle([]); // uses defaults for non-auto

    const ticketId = extractTicketId(branch);

    const count = parseInt(opts.count || '1', 10);

    const generateMessage = async () => {
      const prompt = buildCommitPrompt({
        diff,
        stagedFiles: files,
        branch,
        style,
        ticketId: ticketId || undefined,
        customInstructions: get('custom_instructions'),
      });
      return generate(prompt);
    };

    let message: string;

    if (count > 1) {
      const messages = await withSpinner(`Generating ${count} options...`, async () => {
        const promises = Array.from({ length: count }, () => generateMessage());
        return Promise.all(promises);
      });

      const { select } = await import('@inquirer/prompts');
      message = await select({
        message: 'Pick a commit message:',
        choices: messages.map((m, i) => ({
          name: `${i + 1}. ${m.split('\n')[0]}`,
          value: m,
        })),
      });
    } else {
      message = await withSpinner('Generating commit message...', generateMessage);
    }

    // Hook mode: write to file and exit
    if (opts.hookMode) {
      writeFileSync(opts.hookMode, message);
      return;
    }

    // Auto-commit mode
    if (opts.yes) {
      await createCommit(message);
      console.log(chalk.green(`\n  ✓ Committed: ${message.split('\n')[0]}`));
      if (opts.push) {
        await push();
        console.log(chalk.green('  ✓ Pushed'));
      }
      return;
    }

    // Interactive loop
    let done = false;
    while (!done) {
      const result = await promptCommitAction(message);

      switch (result.action) {
        case 'commit': {
          const finalMessage = result.editedMessage || message;
          await createCommit(finalMessage);
          console.log(chalk.green(`\n  ✓ Committed: ${finalMessage.split('\n')[0]}`));
          if (opts.push) {
            await push();
            console.log(chalk.green('  ✓ Pushed'));
          }
          done = true;
          break;
        }
        case 'regenerate':
          message = await withSpinner('Regenerating...', generateMessage);
          break;
        case 'cancel':
          console.log(chalk.dim('  Cancelled.'));
          done = true;
          break;
      }
    }
  } catch (error) {
    console.error(chalk.red(`\n  ✗ ${(error as Error).message}`));
    process.exit(1);
  }
}

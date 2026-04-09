import { Command } from 'commander';
import chalk from 'chalk';
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { getBranchDiff, getCurrentBranch, getBranchCommits } from '../core/git.js';
import { buildPRPrompt } from '../core/prompt-builder.js';
import { generate } from '../providers/index.js';
import { extractTicketId } from '../utils/branch-parser.js';
import { withSpinner } from '../ui/spinner.js';
import { promptPRAction } from '../ui/confirm.js';

export const prCommand = new Command('pr')
  .description('Generate a pull request title and body')
  .option('-b, --base <branch>', 'Base branch (default: main)')
  .option('--gh', 'Create PR using GitHub CLI (gh)')
  .action(runPR);

async function runPR(opts: { base?: string; gh?: boolean }) {
  try {
    const branch = await getCurrentBranch();
    const targetBranch = opts.base || 'main';
    const [diff, commits] = await Promise.all([
      getBranchDiff(targetBranch),
      getBranchCommits(targetBranch),
    ]);

    if (!diff.trim()) {
      console.log(chalk.red('✗ No changes found between branches.'));
      process.exit(1);
    }

    const ticketId = extractTicketId(branch);
    const prompt = buildPRPrompt({ diff, commits, branch, targetBranch, ticketId: ticketId || undefined });

    const result = await withSpinner('Generating PR description...', () => generate(prompt));

    // Parse title and body
    const titleMatch = result.match(/TITLE:\s*(.+)/);
    const bodyMatch = result.match(/BODY:\s*([\s\S]+)/);
    const title = titleMatch?.[1]?.trim() || `PR: ${branch}`;
    const body = bodyMatch?.[1]?.trim() || result;

    console.log(chalk.gray('\n' + '─'.repeat(50)));
    console.log(chalk.bold.cyan('  PR Title: ') + chalk.white(title));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.white(body));
    console.log(chalk.gray('─'.repeat(50)));

    if (opts.gh) {
      execSync(`gh pr create --title "${title.replace(/"/g, '\\"')}" --body "${body.replace(/"/g, '\\"')}"`, {
        stdio: 'inherit',
      });
      return;
    }

    const action = await promptPRAction();
    switch (action) {
      case 'gh':
        execSync(`gh pr create --title "${title.replace(/"/g, '\\"')}" --body "${body.replace(/"/g, '\\"')}"`, {
          stdio: 'inherit',
        });
        break;
      case 'save':
        writeFileSync('PR_DESCRIPTION.md', `# ${title}\n\n${body}`);
        console.log(chalk.green('  ✓ Saved to PR_DESCRIPTION.md'));
        break;
      case 'cancel':
        console.log(chalk.dim('  Cancelled.'));
        break;
    }
  } catch (error) {
    console.error(chalk.red(`\n  ✗ ${(error as Error).message}`));
    process.exit(1);
  }
}

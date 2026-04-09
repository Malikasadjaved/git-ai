import { Command } from 'commander';
import chalk from 'chalk';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { getCommitsBetween, getLatestTag } from '../core/git.js';
import { buildChangelogPrompt } from '../core/prompt-builder.js';
import { generate } from '../providers/index.js';
import { withSpinner } from '../ui/spinner.js';

export const changelogCommand = new Command('changelog')
  .description('Generate or update CHANGELOG.md from git history')
  .option('--from <tag>', 'Start from this tag (default: latest tag)')
  .option('--to <ref>', 'End at this ref (default: HEAD)')
  .option('--output <file>', 'Output file (default: CHANGELOG.md)', 'CHANGELOG.md')
  .option('--append', 'Prepend to existing CHANGELOG.md')
  .action(runChangelog);

async function runChangelog(opts: { from?: string; to?: string; output: string; append?: boolean }) {
  try {
    const from = opts.from || (await getLatestTag());
    if (!from) {
      console.log(chalk.red('✗ No tags found. Use --from <ref> to specify a starting point.'));
      process.exit(1);
    }

    const to = opts.to || 'HEAD';
    const commits = await getCommitsBetween(from, to);

    if (commits.length === 0) {
      console.log(chalk.yellow('No commits found between the specified range.'));
      return;
    }

    const prompt = buildChangelogPrompt(commits);
    const changelog = await withSpinner(
      `Generating changelog (${commits.length} commits)...`,
      () => generate(prompt),
    );

    const today = new Date().toISOString().split('T')[0];
    const header = `## [Unreleased] - ${today}\n\n`;
    const content = header + changelog + '\n';

    if (opts.append && existsSync(opts.output)) {
      const existing = readFileSync(opts.output, 'utf-8');
      const marker = '# Changelog';
      if (existing.startsWith(marker)) {
        writeFileSync(opts.output, marker + '\n\n' + content + '\n' + existing.slice(marker.length + 1));
      } else {
        writeFileSync(opts.output, content + '\n' + existing);
      }
    } else {
      writeFileSync(opts.output, '# Changelog\n\n' + content);
    }

    console.log(chalk.green(`\n  ✓ Changelog written to ${opts.output}`));
    console.log(chalk.dim(`  ${commits.length} commits processed\n`));
  } catch (error) {
    console.error(chalk.red(`\n  ✗ ${(error as Error).message}`));
    process.exit(1);
  }
}

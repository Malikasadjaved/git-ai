#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { commitCommand, runCommit } from './commands/commit.js';
import { prCommand } from './commands/pr.js';
import { reviewCommand } from './commands/review.js';
import { changelogCommand } from './commands/changelog.js';
import { hookCommand } from './commands/hook.js';
import { setupCommand } from './commands/setup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

const program = new Command();

program
  .name('git-ai')
  .description('AI that lives inside your Git workflow')
  .version(pkg.version);

program.addCommand(commitCommand);
program.addCommand(prCommand);
program.addCommand(reviewCommand);
program.addCommand(changelogCommand);
program.addCommand(hookCommand);
program.addCommand(setupCommand);

// Shorthand: `git-ai` with no subcommand = commit
program.action(async () => {
  await runCommit({});
});

program.parse();

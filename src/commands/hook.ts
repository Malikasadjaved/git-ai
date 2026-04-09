import { Command } from 'commander';
import chalk from 'chalk';
import { writeFileSync, existsSync, unlinkSync, chmodSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getRepoRoot } from '../core/git.js';
import { homedir } from 'node:os';

const HOOK_CONTENT = `#!/bin/sh
# git-ai — AI commit message generator hook
# Installed by: git-ai hook install

COMMIT_MSG_FILE="$1"
COMMIT_SOURCE="$2"

# Only generate if no message was provided (not -m, not merge, not squash)
if [ -z "$COMMIT_SOURCE" ]; then
  if command -v git-ai > /dev/null 2>&1; then
    git-ai commit --hook-mode "$COMMIT_MSG_FILE"
  fi
fi
`;

export const hookCommand = new Command('hook')
  .description('Manage git hooks for automatic AI generation')
  .argument('<action>', 'install | uninstall | status')
  .option('--global', 'Install globally via git template')
  .action(runHook);

export async function runHook(action: string, opts: { global?: boolean }) {
  try {
    if (opts.global) {
      const templateDir = join(homedir(), '.git-templates', 'hooks');
      const hookPath = join(templateDir, 'prepare-commit-msg');

      switch (action) {
        case 'install':
          mkdirSync(templateDir, { recursive: true });
          writeFileSync(hookPath, HOOK_CONTENT);
          try { chmodSync(hookPath, 0o755); } catch { /* Windows */ }
          console.log(chalk.green('  ✓ Hook installed globally'));
          console.log(chalk.dim(`  Run: git config --global init.templateDir ~/.git-templates`));
          break;
        case 'uninstall':
          if (existsSync(hookPath)) unlinkSync(hookPath);
          console.log(chalk.green('  ✓ Global hook removed'));
          break;
        case 'status':
          console.log(existsSync(hookPath) ? chalk.green('  ✓ Global hook installed') : chalk.dim('  No global hook'));
          break;
      }
      return;
    }

    const root = await getRepoRoot();
    const hooksDir = join(root, '.git', 'hooks');
    const hookPath = join(hooksDir, 'prepare-commit-msg');

    switch (action) {
      case 'install':
        mkdirSync(hooksDir, { recursive: true });
        writeFileSync(hookPath, HOOK_CONTENT);
        try { chmodSync(hookPath, 0o755); } catch { /* Windows */ }
        console.log(chalk.green('  ✓ Hook installed for this repo'));
        break;
      case 'uninstall':
        if (existsSync(hookPath)) unlinkSync(hookPath);
        console.log(chalk.green('  ✓ Hook removed'));
        break;
      case 'status':
        console.log(
          existsSync(hookPath)
            ? chalk.green('  ✓ Hook installed in this repo')
            : chalk.dim('  No hook installed'),
        );
        break;
      default:
        console.log(chalk.red(`  ✗ Unknown action: ${action}. Use: install | uninstall | status`));
    }
  } catch (error) {
    console.error(chalk.red(`\n  ✗ ${(error as Error).message}`));
    process.exit(1);
  }
}

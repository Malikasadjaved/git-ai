import { select, input } from '@inquirer/prompts';
import chalk from 'chalk';

export type CommitAction = 'commit' | 'edit' | 'regenerate' | 'cancel';

export async function promptCommitAction(message: string): Promise<{ action: CommitAction; editedMessage?: string }> {
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.bold.yellow('  Generated commit message:\n'));
  for (const line of message.split('\n')) {
    console.log(chalk.white(`  ${line}`));
  }
  console.log(chalk.gray('\n' + '─'.repeat(50)));

  const action = await select<CommitAction>({
    message: 'What would you like to do?',
    choices: [
      { name: `${chalk.green('Commit')} with this message`, value: 'commit' },
      { name: `${chalk.blue('Edit')} message`, value: 'edit' },
      { name: `${chalk.yellow('Regenerate')}`, value: 'regenerate' },
      { name: `${chalk.red('Cancel')}`, value: 'cancel' },
    ],
  });

  if (action === 'edit') {
    const editedMessage = await input({
      message: 'Edit commit message:',
      default: message,
    });
    return { action: 'commit', editedMessage };
  }

  return { action };
}

export async function promptPRAction(): Promise<'copy' | 'gh' | 'save' | 'cancel'> {
  return select({
    message: 'What would you like to do?',
    choices: [
      { name: 'Create PR with GitHub CLI (gh)', value: 'gh' as const },
      { name: 'Save to file', value: 'save' as const },
      { name: 'Cancel', value: 'cancel' as const },
    ],
  });
}

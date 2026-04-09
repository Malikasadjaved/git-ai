import ora, { Ora } from 'ora';
import chalk from 'chalk';

export function createSpinner(text: string): Ora {
  return ora({ text: chalk.cyan(text), color: 'cyan' });
}

export async function withSpinner<T>(text: string, fn: () => Promise<T>): Promise<T> {
  const spinner = createSpinner(text);
  spinner.start();
  try {
    const result = await fn();
    spinner.succeed(chalk.green('Done!'));
    return result;
  } catch (error) {
    spinner.fail(chalk.red('Failed'));
    throw error;
  }
}

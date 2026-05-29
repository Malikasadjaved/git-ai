import { Command } from 'commander';
import chalk from 'chalk';
import { loadFindings, acknowledgeFinding, clearFindings } from '../core/findings-store.js';

export const findingsCommand = new Command('findings')
  .alias('f')
  .description('Manage code review findings')
  .option('-a, --acknowledge <id>', 'Mark a finding as acknowledged')
  .option('--clear', 'Dismiss all stored findings')
  .action(runFindings);

async function runFindings(opts: { acknowledge?: string; clear?: boolean }) {
  try {
    if (opts.acknowledge) {
      const success = await acknowledgeFinding(opts.acknowledge);
      if (success) {
        console.log(chalk.green(`  ✓ Finding ${opts.acknowledge} acknowledged`));
      } else {
        console.log(chalk.red(`  ✗ Finding not found: ${opts.acknowledge}`));
        process.exit(1);
      }
      return;
    }

    if (opts.clear) {
      await clearFindings();
      console.log(chalk.green('  ✓ All findings cleared'));
      return;
    }

    const findings = await loadFindings();
    if (findings.length === 0) {
      console.log(chalk.dim('  No stored findings.'));
      return;
    }

    const acked = findings.filter((f) => f.acknowledged).length;
    console.log(chalk.cyan(`\n  Findings (${findings.length} total, ${acked} acknowledged)\n`));

    for (const f of findings) {
      const ackTag = f.acknowledged ? chalk.dim(' [acknowledged]') : '';
      const sevColor =
        f.severity === 'CRITICAL' ? chalk.red(f.severity)
        : f.severity === 'WARNING' ? chalk.yellow(f.severity)
        : chalk.green(f.severity);

      const loc = f.location ? chalk.dim(` — ${f.location}`) : '';
      console.log(`  ${chalk.bold(f.id)}  ${sevColor}  ${f.description}${loc}${ackTag}`);
    }
    console.log();
  } catch (error) {
    console.error(chalk.red(`\n  ✗ ${(error as Error).message}`));
    process.exit(1);
  }
}

import { Command } from 'commander';
import { select, input, password, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { set } from '../core/config.js';
import type { Provider } from '../providers/index.js';

export const setupCommand = new Command('setup')
  .description('Interactive first-time configuration wizard')
  .action(runSetup);

export async function runSetup() {
  console.log(chalk.cyan.bold('\n  Welcome to git-ai! Let\'s get you set up. 🚀\n'));

  // Step 1: Provider
  const provider = await select<Provider>({
    message: 'Step 1/4: Choose your AI provider',
    choices: [
      { name: 'Claude (Anthropic) — Best quality', value: 'anthropic' },
      { name: 'GPT-4o-mini (OpenAI) — Fast and cheap', value: 'openai' },
      { name: 'Gemini Flash (Google) — Free tier available', value: 'gemini' },
      { name: 'Ollama (Local) — 100% free, runs offline', value: 'ollama' },
    ],
  });

  set('provider', provider);

  // Step 2: API key or Ollama URL
  if (provider === 'ollama') {
    const url = await input({
      message: 'Step 2/4: Ollama URL (press Enter for default)',
      default: 'http://localhost:11434',
    });
    set('ollama_url', url);

    const model = await input({
      message: 'Ollama model name',
      default: 'llama3.2',
    });
    set('model', model);
  } else {
    const keyName = provider === 'anthropic' ? 'ANTHROPIC_API_KEY'
      : provider === 'openai' ? 'OPENAI_API_KEY'
      : 'GEMINI_API_KEY';

    const apiKey = await password({
      message: `Step 2/4: Enter your ${keyName}`,
    });

    if (provider === 'anthropic') {
      set('anthropic_api_key', apiKey);
      const model = await select({
        message: 'Choose model',
        choices: [
          { name: 'Claude Haiku 4.5 (fast, cheap)', value: 'claude-haiku-4-5' },
          { name: 'Claude Sonnet 4.5 (better quality)', value: 'claude-sonnet-4-5' },
        ],
      });
      set('model', model);
    } else if (provider === 'openai') {
      set('openai_api_key', apiKey);
      const model = await select({
        message: 'Choose model',
        choices: [
          { name: 'GPT-4o-mini (fast, cheap)', value: 'gpt-4o-mini' },
          { name: 'GPT-4o (better quality)', value: 'gpt-4o' },
        ],
      });
      set('model', model);
    } else {
      set('gemini_api_key', apiKey);
      const model = await select({
        message: 'Choose model',
        choices: [
          { name: 'Gemini 1.5 Flash (fast)', value: 'gemini-1.5-flash' },
          { name: 'Gemini 1.5 Pro (better quality)', value: 'gemini-1.5-pro' },
        ],
      });
      set('model', model);
    }
  }

  // Step 3: Commit style
  const commitStyle = await select({
    message: 'Step 3/4: Choose commit style',
    choices: [
      { name: 'Auto-detect from your repo history', value: 'auto' as const },
      { name: 'Conventional Commits (feat:, fix:, chore:)', value: 'conventional' as const },
      { name: 'Gitmoji (✨ feat, 🐛 fix)', value: 'gitmoji' as const },
      { name: 'Plain English', value: 'plain' as const },
    ],
  });
  set('commit_style', commitStyle);

  // Step 4: Git hooks
  const installHooks = await confirm({
    message: 'Step 4/4: Install git hooks? (AI writes commit messages inside `git commit`)',
    default: false,
  });

  if (installHooks) {
    const { runHook } = await import('./hook.js');
    await runHook('install', {});
  }

  console.log(chalk.green.bold('\n  ✅ Setup complete!'));
  console.log(chalk.dim('  Try it with: git add . && git-ai commit\n'));
}

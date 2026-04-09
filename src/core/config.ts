import Conf from 'conf';

export interface GitAIConfig {
  provider: 'anthropic' | 'openai' | 'gemini' | 'ollama';
  model: string;
  anthropic_api_key?: string;
  openai_api_key?: string;
  gemini_api_key?: string;
  ollama_url?: string;
  commit_style?: 'auto' | 'conventional' | 'gitmoji' | 'plain';
  locale?: string;
  max_diff_tokens?: number;
  auto_stage?: boolean;
  push_after_commit?: boolean;
  custom_instructions?: string;
}

export const config = new Conf<GitAIConfig>({
  projectName: 'git-ai',
  defaults: {
    provider: 'anthropic',
    model: 'claude-haiku-4-5',
    commit_style: 'auto',
    locale: 'en',
    max_diff_tokens: 3000,
    auto_stage: false,
    push_after_commit: false,
  },
});

export function get<K extends keyof GitAIConfig>(key: K): GitAIConfig[K] {
  return config.get(key);
}

export function set<K extends keyof GitAIConfig>(key: K, value: GitAIConfig[K]): void {
  config.set(key, value);
}

export function getAll(): GitAIConfig {
  return config.store;
}

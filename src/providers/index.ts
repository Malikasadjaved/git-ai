import { get } from '../core/config.js';
import { generateWithClaude } from './anthropic.js';
import { generateWithOpenAI } from './openai.js';
import { generateWithGemini } from './gemini.js';
import { generateWithOllama } from './ollama.js';

export type Provider = 'anthropic' | 'openai' | 'gemini' | 'ollama';

export async function generate(prompt: string): Promise<string> {
  const provider = (get('provider') || 'anthropic') as Provider;
  const model = get('model');

  switch (provider) {
    case 'anthropic':
      return generateWithClaude(prompt, model);
    case 'openai':
      return generateWithOpenAI(prompt, model);
    case 'gemini':
      return generateWithGemini(prompt, model);
    case 'ollama':
      return generateWithOllama(prompt, model);
    default:
      throw new Error(`Unknown provider: ${provider}. Run: git-ai setup`);
  }
}

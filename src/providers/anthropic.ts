import Anthropic from '@anthropic-ai/sdk';
import { get } from '../core/config.js';

export async function generateWithClaude(
  prompt: string,
  model: string = 'claude-haiku-4-5',
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY || get('anthropic_api_key');
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY not set.\n  Run: git-ai setup to configure your provider\n  Or set ANTHROPIC_API_KEY environment variable',
    );
  }

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  return message.content[0].type === 'text' ? message.content[0].text.trim() : '';
}

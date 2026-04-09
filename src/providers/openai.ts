import OpenAI from 'openai';
import { get } from '../core/config.js';

export async function generateWithOpenAI(
  prompt: string,
  model: string = 'gpt-4o-mini',
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY || get('openai_api_key');
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY not set.\n  Run: git-ai setup to configure your provider\n  Or set OPENAI_API_KEY environment variable',
    );
  }

  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.choices[0]?.message?.content?.trim() || '';
}

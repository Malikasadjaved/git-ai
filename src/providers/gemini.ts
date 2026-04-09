import { GoogleGenerativeAI } from '@google/generative-ai';
import { get } from '../core/config.js';

export async function generateWithGemini(
  prompt: string,
  model: string = 'gemini-1.5-flash',
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || get('gemini_api_key');
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY not set.\n  Run: git-ai setup to configure your provider\n  Or set GEMINI_API_KEY environment variable',
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const genModel = genAI.getGenerativeModel({ model });
  const result = await genModel.generateContent(prompt);
  return result.response.text().trim();
}

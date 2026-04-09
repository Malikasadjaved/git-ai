import { get } from '../core/config.js';

export async function generateWithOllama(
  prompt: string,
  model: string = 'llama3.2',
): Promise<string> {
  const baseUrl = get('ollama_url') || 'http://localhost:11434';

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, stream: false }),
  });

  if (!response.ok) {
    throw new Error(
      `Ollama request failed (${response.status}).\n  Make sure Ollama is running: ollama serve\n  And the model is pulled: ollama pull ${model}`,
    );
  }

  const data = (await response.json()) as { response: string };
  return data.response.trim();
}

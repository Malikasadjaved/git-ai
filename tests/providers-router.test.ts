import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/core/config.js', () => {
  let provider = 'anthropic';
  let model = 'claude-haiku-4-5';
  return {
    get: vi.fn((key: string) => {
      if (key === 'provider') return provider;
      if (key === 'model') return model;
      return undefined;
    }),
    set: vi.fn((key: string, value: string) => {
      if (key === 'provider') provider = value;
      if (key === 'model') model = value;
    }),
  };
});

vi.mock('../src/providers/anthropic.js', () => ({
  generateWithClaude: vi.fn().mockResolvedValue('claude response'),
}));

vi.mock('../src/providers/openai.js', () => ({
  generateWithOpenAI: vi.fn().mockResolvedValue('openai response'),
}));

vi.mock('../src/providers/gemini.js', () => ({
  generateWithGemini: vi.fn().mockResolvedValue('gemini response'),
}));

vi.mock('../src/providers/ollama.js', () => ({
  generateWithOllama: vi.fn().mockResolvedValue('ollama response'),
}));

import { generate } from '../src/providers/index.js';
import { get } from '../src/core/config.js';
import { generateWithClaude } from '../src/providers/anthropic.js';
import { generateWithOpenAI } from '../src/providers/openai.js';
import { generateWithGemini } from '../src/providers/gemini.js';
import { generateWithOllama } from '../src/providers/ollama.js';

describe('provider router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes to anthropic by default', async () => {
    vi.mocked(get).mockImplementation((key: string) => {
      if (key === 'provider') return 'anthropic';
      if (key === 'model') return 'claude-haiku-4-5';
      return undefined as any;
    });

    const result = await generate('test prompt');
    expect(generateWithClaude).toHaveBeenCalledWith('test prompt', 'claude-haiku-4-5');
    expect(result).toBe('claude response');
  });

  it('routes to openai', async () => {
    vi.mocked(get).mockImplementation((key: string) => {
      if (key === 'provider') return 'openai';
      if (key === 'model') return 'gpt-4o-mini';
      return undefined as any;
    });

    const result = await generate('test prompt');
    expect(generateWithOpenAI).toHaveBeenCalledWith('test prompt', 'gpt-4o-mini');
    expect(result).toBe('openai response');
  });

  it('routes to gemini', async () => {
    vi.mocked(get).mockImplementation((key: string) => {
      if (key === 'provider') return 'gemini';
      if (key === 'model') return 'gemini-1.5-flash';
      return undefined as any;
    });

    const result = await generate('test prompt');
    expect(generateWithGemini).toHaveBeenCalledWith('test prompt', 'gemini-1.5-flash');
    expect(result).toBe('gemini response');
  });

  it('routes to ollama', async () => {
    vi.mocked(get).mockImplementation((key: string) => {
      if (key === 'provider') return 'ollama';
      if (key === 'model') return 'llama3';
      return undefined as any;
    });

    const result = await generate('test prompt');
    expect(generateWithOllama).toHaveBeenCalledWith('test prompt', 'llama3');
    expect(result).toBe('ollama response');
  });

  it('throws for unknown provider', async () => {
    vi.mocked(get).mockImplementation((key: string) => {
      if (key === 'provider') return 'unknown';
      return undefined as any;
    });

    await expect(generate('test')).rejects.toThrow('Unknown provider');
  });
});

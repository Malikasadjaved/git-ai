import { describe, it, expect } from 'vitest';
import { estimateTokens } from '../src/utils/token-counter.js';

describe('estimateTokens', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('estimates tokens for short text', () => {
    // "hello" = 5 chars / 4 = ceil(1.25) = 2
    expect(estimateTokens('hello')).toBe(2);
  });

  it('estimates tokens for exact multiples', () => {
    // 8 chars / 4 = 2
    expect(estimateTokens('abcdefgh')).toBe(2);
  });

  it('rounds up partial tokens', () => {
    // 5 chars / 4 = ceil(1.25) = 2
    expect(estimateTokens('abcde')).toBe(2);
    // 1 char / 4 = ceil(0.25) = 1
    expect(estimateTokens('a')).toBe(1);
  });

  it('handles longer text', () => {
    const text = 'a'.repeat(400);
    expect(estimateTokens(text)).toBe(100);
  });

  it('handles code-like text', () => {
    const code = 'function add(a: number, b: number): number { return a + b; }';
    expect(estimateTokens(code)).toBe(Math.ceil(code.length / 4));
  });
});

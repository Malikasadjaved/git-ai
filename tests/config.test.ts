import { describe, it, expect, vi } from 'vitest';

vi.mock('conf', () => {
  const store: Record<string, unknown> = {};
  return {
    default: class MockConf {
      store: Record<string, unknown>;
      constructor(opts: { defaults?: Record<string, unknown> }) {
        Object.assign(store, opts.defaults || {});
        this.store = store;
      }
      get(key: string) {
        return this.store[key];
      }
      set(key: string | Record<string, unknown>, value?: unknown) {
        if (typeof key === 'string') {
          this.store[key] = value;
        }
      }
    },
  };
});

import { get, set, getAll } from '../src/core/config.js';

describe('config', () => {
  it('returns default provider', () => {
    expect(get('provider')).toBe('anthropic');
  });

  it('returns default model', () => {
    expect(get('model')).toBe('claude-haiku-4-5');
  });

  it('returns default commit_style', () => {
    expect(get('commit_style')).toBe('auto');
  });

  it('returns default locale', () => {
    expect(get('locale')).toBe('en');
  });

  it('returns default max_diff_tokens', () => {
    expect(get('max_diff_tokens')).toBe(3000);
  });

  it('returns default auto_stage as false', () => {
    expect(get('auto_stage')).toBe(false);
  });

  it('returns default push_after_commit as false', () => {
    expect(get('push_after_commit')).toBe(false);
  });

  it('sets and retrieves a value', () => {
    set('provider', 'openai');
    expect(get('provider')).toBe('openai');
    set('provider', 'anthropic');
  });

  it('getAll returns the full config store', () => {
    const all = getAll();
    expect(all).toHaveProperty('provider');
    expect(all).toHaveProperty('model');
    expect(all).toHaveProperty('commit_style');
    expect(all).toHaveProperty('locale');
  });
});

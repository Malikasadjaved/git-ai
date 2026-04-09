import { describe, it, expect } from 'vitest';
import { filterDiff, truncateDiff } from '../src/utils/diff-truncator.js';

describe('filterDiff', () => {
  it('removes lockfiles', () => {
    const diff = `diff --git a/package-lock.json b/package-lock.json
+++ some stuff
diff --git a/src/index.ts b/src/index.ts
+++ real code`;
    const filtered = filterDiff(diff);
    expect(filtered).not.toContain('package-lock.json');
    expect(filtered).toContain('src/index.ts');
  });
});

describe('truncateDiff', () => {
  it('returns small diffs unchanged', () => {
    const diff = 'diff --git a/file.ts b/file.ts\n+ small change';
    expect(truncateDiff(diff, 5000)).toContain('small change');
  });
});

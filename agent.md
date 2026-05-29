# Agent Guide — git-ai

> **For AI coding assistants working on this repository.**  
> This document provides architectural context, code conventions, contribution patterns, and actionable guidance for making correct changes to `git-ai`.

---

## What Is git-ai?

`git-ai` is a **TypeScript CLI tool** (`@malikasadjaved/git-ai`, Node.js ≥ 20, ESM) that integrates AI language models into a Git workflow. It auto-generates commit messages, pull request descriptions, changelogs, and code reviews by reading the actual Git state (staged diff, branch name, commit history) and sending structured prompts to the configured AI provider.

**Supported providers:** Claude (Anthropic), GPT (OpenAI), Gemini (Google), Ollama (local/free).

**v1.2 highlights:** CI workflow generation, SHA-256 finding dedup, severity gating (`--fail-on`), JSON output, GitHub PR comments, findings management CLI.

**Key differentiator:** Style learning — it analyzes the last 20 commits to mirror the team's existing commit format, scope, casing, and preferred types.

---

## Repository Structure

```
d:\git-ai\
├── src/
│   ├── index.ts                   # CLI entry point (commander)
│   ├── commands/
│   │   ├── commit.ts              # git-ai commit
│   │   ├── pr.ts                  # git-ai pr
│   │   ├── review.ts              # git-ai review (dedup, JSON, PR comments, severity gate)
│   │   ├── changelog.ts           # git-ai changelog
│   │   ├── ci.ts                  # git-ai ci — generate GitHub Actions workflow
│   │   ├── findings.ts            # git-ai findings — list/acknowledge/clear
│   │   ├── hook.ts                # git-ai hook (install/uninstall prepare-commit-msg)
│   │   └── setup.ts               # git-ai setup (interactive wizard)
│   ├── core/
│   │   ├── config.ts              # Typed conf-based config store
│   │   ├── git.ts                 # simple-git wrappers (+ getHeadHash)
│   │   ├── prompt-builder.ts      # All prompt templates
│   │   ├── style-learner.ts       # CommitStyle detection from git history
│   │   └── findings-store.ts      # .git-ai/findings.json persistence (per-repo)
│   ├── providers/
│   │   ├── index.ts               # generate() router + Provider type
│   │   ├── anthropic.ts           # Claude via @anthropic-ai/sdk
│   │   ├── openai.ts              # GPT via openai
│   │   ├── gemini.ts              # Gemini via @google/generative-ai
│   │   └── ollama.ts              # Ollama via native fetch()
│   ├── ui/
│   │   ├── confirm.ts             # Inquirer TUI: Commit/Edit/Regenerate/Cancel
│   │   ├── diff-display.ts        # Chalk display: diff stats, review summary + findings
│   │   └── spinner.ts             # ora spinner wrapper withSpinner()
│   └── utils/
│       ├── branch-parser.ts       # extractTicketId() + getBranchType()
│       ├── diff-truncator.ts      # filterDiff() + truncateDiff()
│       ├── review-parser.ts       # parseReview(), fingerprintFinding(), shouldFail()
│       └── token-counter.ts       # estimateTokens() — chars / 4
├── tests/                         # vitest tests (10 files, 85 tests)
├── hooks/                         # prepare-commit-msg shell script
├── package.json                   # @malikasadjaved/git-ai v1.2.3
├── tsconfig.json                  # ES2022 / NodeNext / strict
└── vitest.config.ts
```

---

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| TypeScript | ^5.5.0 | Language (strict mode, ES2022 target) |
| Node.js | ≥ 20 | Runtime |
| ESM | — | Module system (`"type": "module"`) |
| commander | ^12.0.0 | CLI argument parsing |
| @inquirer/prompts | ^6.0.0 | Interactive TUI prompts |
| simple-git | ^3.27.0 | Git operations |
| chalk | ^5.3.0 | Terminal colors |
| ora | ^8.1.0 | Spinner |
| conf | ^13.0.0 | Persistent config (~/.config/git-ai/) |
| tiktoken | ^1.0.17 | Token estimation |
| vitest | ^2.0.0 | Test runner |

---

## Critical Conventions

### 1. ESM Import Extensions

All imports **must** use `.js` extensions, even for `.ts` source files:

```typescript
// ✅ Correct
import { get } from '../core/config.js';
import { generate } from '../providers/index.js';

// ❌ Wrong
import { get } from '../core/config';
import { generate } from '../providers/index';
```

This is required because `tsconfig.json` uses `"module": "NodeNext"` and `"moduleResolution": "NodeNext"`.

### 2. Single Integration Point for AI

**Never call provider functions directly from commands.** Always go through `generate()` in `src/providers/index.ts`:

```typescript
// ✅ Correct (from any command)
import { generate } from '../providers/index.js';
const result = await generate(prompt);

// ❌ Wrong
import { generateWithClaude } from '../providers/anthropic.js';
const result = await generateWithClaude(prompt);
```

### 3. All Prompts in prompt-builder.ts

Build all prompts in `src/core/prompt-builder.ts`. Commands should call a `build*Prompt()` function, not inline prompt strings:

```typescript
// ✅ Correct
const prompt = buildCommitPrompt({ diff, stagedFiles, branch, style, ticketId });
const message = await generate(prompt);

// ❌ Wrong (inlining prompts in commands)
const prompt = `Write a commit message for: ${diff}`;
```

### 4. Config Access Pattern

Use typed getters/setters from `src/core/config.ts`:

```typescript
import { get, set, getAll } from '../core/config.js';

const provider = get('provider');          // typed: Provider
set('model', 'claude-haiku-4-5');          // type-checked
const allConfig = getAll();                 // full GitAIConfig
```

### 5. Git Operations via simple-git Wrappers

All git interactions go through `src/core/git.ts`. Do not call `child_process.exec('git ...')` directly (except in the `pr.ts` `gh` CLI integration, which is intentional).

---

## Data Flow

### Commit Generation Flow

```
git-ai commit
    ↓
commands/commit.ts: runCommit()
    ↓ parallel
    ├── git.ts: getStagedDiff()       → raw diff string
    ├── git.ts: getStagedFiles()      → string[]
    ├── git.ts: getCurrentBranch()   → branch name
    ├── git.ts: getRecentCommits(20) → [{hash, message, author}]
    └── git.ts: getDiffStats()       → stat string
    ↓
utils/branch-parser.ts: extractTicketId(branch)  → "PROJ-123" | null
    ↓
core/style-learner.ts: learnCommitStyle(commits) → CommitStyle
    ↓
core/prompt-builder.ts: buildCommitPrompt({diff, files, branch, style, ticketId})
    ├── utils/diff-truncator.ts: truncateDiff(diff, 3000)
    └── style-learner.ts: buildStyleInstruction(style)
    ↓
providers/index.ts: generate(prompt)
    └── providers/anthropic.ts | openai.ts | gemini.ts | ollama.ts
    ↓
ui/confirm.ts: promptCommitAction(message)  → {action, editedMessage?}
    ↓
git.ts: createCommit(finalMessage)
```

### Style Learning Flow

```
getRecentCommits(20)                → [{message: "feat(auth): add JWT..."}]
    ↓
learnCommitStyle(commits)
    ├── Detect format: conventional | gitmoji | plain
    ├── Count type frequencies: feat > fix > chore
    ├── Detect scope usage: "feat(auth):" → usesScope = true
    ├── Compute average message length
    ├── Detect casing: "Fix: ..." → sentence, "fix: ..." → lower
    └── Pick 3 example messages
    ↓
CommitStyle { format, usesEmoji, averageLength, usesScope, preferredTypes, exampleMessages, casing, language }
    ↓
buildStyleInstruction(style)  → string injected into prompt
```

---

## Adding a New Provider

1. **Create** `src/providers/newprovider.ts`:

```typescript
import { get } from '../core/config.js';

export async function generateWithNewProvider(
  prompt: string,
  model: string = 'default-model',
): Promise<string> {
  const apiKey = process.env.NEW_API_KEY || get('new_api_key');
  if (!apiKey) throw new Error('NEW_API_KEY not set.\n  Run: git-ai setup');
  // ... call the API
  return responseText.trim();
}
```

2. **Update** `src/providers/index.ts`:

```typescript
export type Provider = 'anthropic' | 'openai' | 'gemini' | 'ollama' | 'newprovider';
// add case in generate() switch
```

3. **Update** `src/core/config.ts`:

```typescript
export interface GitAIConfig {
  provider: 'anthropic' | 'openai' | 'gemini' | 'ollama' | 'newprovider';
  new_api_key?: string;
  // ...
}
```

4. **Update** `src/commands/setup.ts` — add the provider to the selection list and the key/model input flow.

5. **Add tests** in `tests/providers-router.test.ts`.

---

## Adding a New Command

1. **Create** `src/commands/mycommand.ts`:

```typescript
import { Command } from 'commander';
import { generate } from '../providers/index.js';

export const myCommand = new Command('mycommand')
  .description('...')
  .option('-f, --flag', 'Some flag')
  .action(runMyCommand);

async function runMyCommand(opts: { flag?: boolean }) {
  const prompt = buildMyPrompt({ /* ... */ });
  const result = await generate(prompt);
  console.log(result);
}
```

2. **Add the prompt builder** in `src/core/prompt-builder.ts`:

```typescript
export function buildMyPrompt(params: { /* ... */ }): string {
  return `You are... Output ONLY the result.`;
}
```

3. **Register** in `src/index.ts`:

```typescript
import { myCommand } from './commands/mycommand.js';
program.addCommand(myCommand);
```

---

## Testing

```bash
npm test                    # run all tests
npm test -- --reporter=verbose   # verbose output
npm test -- tests/git.test.ts    # single file
```

### Test Patterns

- Tests live in `tests/*.test.ts`
- Provider calls are mocked via `vi.mock`
- Use `vi.fn()` for git module mocking
- Import from `vitest`: `describe`, `it`, `expect`, `vi`, `beforeEach`

Example test structure:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/providers/index.js', () => ({
  generate: vi.fn().mockResolvedValue('feat: add something'),
}));

describe('myCommand', () => {
  it('should generate a message', async () => {
    const result = await someFunction();
    expect(result).toBe('feat: add something');
  });
});
```

---

## Configuration Reference

**Location:** `~/.config/git-ai/config.json`  
**Managed by:** `conf` npm package  
**Access:** `get(key)` / `set(key, value)` from `src/core/config.ts`

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `provider` | `string` | `'anthropic'` | Active AI provider |
| `model` | `string` | `'claude-haiku-4-5'` | Model name for current provider |
| `anthropic_api_key` | `string?` | — | Claude API key |
| `openai_api_key` | `string?` | — | OpenAI API key |
| `gemini_api_key` | `string?` | — | Gemini API key |
| `ollama_url` | `string?` | `'http://localhost:11434'` | Ollama server URL |
| `commit_style` | `string` | `'auto'` | `auto` / `conventional` / `gitmoji` / `plain` |
| `locale` | `string` | `'en'` | Language for messages |
| `max_diff_tokens` | `number` | `3000` | Max diff tokens in commit prompts |
| `auto_stage` | `boolean` | `false` | Auto `git add -A` before commit |
| `push_after_commit` | `boolean` | `false` | Auto-push after commit |
| `custom_instructions` | `string?` | — | Extra rules appended to all prompts |

---

## Git Hook Integration

The `prepare-commit-msg` hook installed by `git-ai hook install` runs:

```sh
git-ai commit --hook-mode "$COMMIT_MSG_FILE"
```

In hook mode (`opts.hookMode` is set), `commit.ts` writes the generated message directly to the file and exits — no interactive TUI. This is transparent to the user who typed `git commit`.

Hook file location: `.git/hooks/prepare-commit-msg` (local) or `~/.git-templates/hooks/prepare-commit-msg` (global).

---

## Diff Handling Details

### File: [`src/utils/diff-truncator.ts`](file:///d:/git-ai/src/utils/diff-truncator.ts)

**Excluded files** (always skipped):
- `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
- `*.min.js`, `*.min.css`, `*.map`
- `dist/` directory contents

**Prioritized extensions** (shown first):
`.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.go`, `.rs`, `.java`

**Truncation:** Per-file, first 50 diff lines kept + `[... N lines truncated ...]` marker.

**Token estimation:** `chars / 4` (fast approximation, not exact).

---

## Branch Intelligence

### File: [`src/utils/branch-parser.ts`](file:///d:/git-ai/src/utils/branch-parser.ts)

`extractTicketId(branchName)` detection order:
1. GitHub issues: `GH-42` or `#42` → returns `#42`
2. JIRA-style: `PROJ-123` (2+ char prefix) → returns `PROJ-123`

`getBranchType(branchName)`:
- `main`/`master` → `'main'`
- `feature/*`, `feat/*` → `'feature'`
- `fix/*`, `hotfix/*`, `bugfix/*` → `'hotfix'`
- `release/*` → `'release'`
- `chore/*` → `'chore'`
- anything else → `'other'`

---

## Build & Release

```bash
npm run build          # tsc → dist/
npm run lint           # eslint src --ext .ts
npm test               # vitest run
npm run release        # build + npm publish
```

The `prepublishOnly` script runs build, lint, and tests before every `npm publish`.

Binary entry: `dist/index.js` registered as `git-ai` in `package.json#bin`.

---

## Common Pitfalls for AI Agents

1. **Missing `.js` extensions** — The #1 cause of module resolution errors. Always use `.js` in imports.

2. **Direct provider calls** — Always use `generate()` from `providers/index.ts`, not individual provider functions.

3. **Inline prompt strings** — Add prompts to `prompt-builder.ts`, not inside command files.

4. **Forgetting to update the `Provider` type** — When adding a provider, update the union type in `providers/index.ts` AND the `GitAIConfig` interface in `config.ts`.

5. **Using `require()` or CommonJS** — This is a pure ESM project (`"type": "module"`). Do not use `require()`.

6. **Importing from `jest`** — Tests use `vitest`. Import from `'vitest'`, not `'jest'`.

7. **Not running `npm run build` before testing the CLI** — The CLI runs from `dist/`, not `src/`. Run `npm run build` after making changes.

8. **Hardcoding model names in commands** — Model names come from `get('model')` in the provider router. Update defaults in the provider file's default parameter, not in commands.

---

## Quick Reference: Key Functions

| Function | File | Purpose |
|----------|------|---------|
| `generate(prompt)` | `providers/index.ts` | Single AI call entrypoint |
| `getStagedDiff()` | `core/git.ts` | Get `git diff --cached` |
| `getBranchDiff(base?)` | `core/git.ts` | Get `git diff <base>...HEAD` |
| `getRecentCommits(n)` | `core/git.ts` | Last N commit messages |
| `getCurrentBranch()` | `core/git.ts` | Current branch name |
| `getHeadHash()` | `core/git.ts` | Current HEAD commit SHA |
| `getRepoRoot()` | `core/git.ts` | Absolute path to repo root |
| `learnCommitStyle(commits)` | `core/style-learner.ts` | Detect repo commit conventions |
| `buildCommitPrompt(params)` | `core/prompt-builder.ts` | Commit message prompt |
| `buildPRPrompt(params)` | `core/prompt-builder.ts` | PR description prompt |
| `buildReviewPrompt(diff)` | `core/prompt-builder.ts` | Code review prompt |
| `buildChangelogPrompt(commits)` | `core/prompt-builder.ts` | Changelog prompt |
| `extractTicketId(branch)` | `utils/branch-parser.ts` | JIRA/GH ticket from branch |
| `truncateDiff(diff, maxTokens)` | `utils/diff-truncator.ts` | Safe diff for AI prompt |
| `parseReview(raw)` | `utils/review-parser.ts` | Parse AI output → typed findings |
| `fingerprintFinding(f)` | `utils/review-parser.ts` | SHA-256 hash for dedup |
| `shouldFail(parsed, level)` | `utils/review-parser.ts` | Severity threshold check |
| `highestSeverity(parsed)` | `utils/review-parser.ts` | Max severity in a review |
| `loadFindings()` | `core/findings-store.ts` | Load persisted findings |
| `saveFindings(records)` | `core/findings-store.ts` | Persist findings to JSON |
| `acknowledgeFinding(id)` | `core/findings-store.ts` | Dismiss a finding |
| `clearFindings()` | `core/findings-store.ts` | Remove all stored findings |
| `withSpinner(label, fn)` | `ui/spinner.ts` | Wrap async op with spinner |
| `displayReview(text)` | `ui/diff-display.ts` | Color-coded review output |
| `displayReviewSummary(p)` | `ui/diff-display.ts` | Finding count header |
| `get(key)` / `set(key, val)` | `core/config.ts` | Read/write persistent config |

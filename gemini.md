# Gemini (Google) Provider — git-ai

## Overview

This document describes how the **Gemini / Google Generative AI** provider is integrated into `git-ai`, plus everything needed to work with or extend the Gemini integration in this codebase.

---

## Project Summary

`git-ai` is a TypeScript CLI tool (Node.js ≥ 20, ESM) published to npm as `@malikasadjaved/git-ai`. It plugs AI language models directly into a developer's Git workflow to auto-generate:

- **Commit messages** — reads staged diff + last 20 commits, learns repo style, generates a contextual message
- **Pull request descriptions** — structured PR body with Summary, Changes, Testing checklist
- **Code reviews** — severity-classified findings (CRITICAL / WARNING / SUGGESTION) with SHA-256 dedup
- **Changelogs** — `keepachangelog.com`-format output grouped by category
- **CI integration** — auto-generated GitHub Actions workflow (Gemini is the default CI provider — free tier)

Providers supported: `anthropic` (Claude), `openai` (GPT), `gemini` (Google), `ollama` (local).

---

## Gemini Provider Implementation

### File: [`src/providers/gemini.ts`](file:///d:/git-ai/src/providers/gemini.ts)

```typescript
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
```

### Key Details

| Setting | Value |
|---------|-------|
| **SDK** | `@google/generative-ai ^0.19.0` |
| **Default model** | `gemini-1.5-flash` (fast, free tier available) |
| **Alternative model** | `gemini-1.5-pro` (higher quality) |
| **Max output tokens** | SDK default (no explicit cap set) |
| **API key env var** | `GEMINI_API_KEY` |
| **Fallback config key** | `gemini_api_key` (stored in `~/.config/git-ai/config.json`) |

### Authentication Priority

1. `process.env.GEMINI_API_KEY` (environment variable — preferred)
2. `get('gemini_api_key')` (persisted config via `conf` package)

Get a free Gemini API key at [Google AI Studio](https://makersuite.google.com/app/apikey).

---

## Provider Router

### File: [`src/providers/index.ts`](file:///d:/git-ai/src/providers/index.ts)

```typescript
export type Provider = 'anthropic' | 'openai' | 'gemini' | 'ollama';

export async function generate(prompt: string): Promise<string> {
  const provider = (get('provider') || 'anthropic') as Provider;
  const model = get('model');

  switch (provider) {
    case 'gemini':
      return generateWithGemini(prompt, model);
    // ...
  }
}
```

Set Gemini as the active provider via `git-ai setup` or:

```bash
# Direct config edit
echo '{"provider":"gemini","model":"gemini-1.5-flash","gemini_api_key":"YOUR_KEY"}' \
  > ~/.config/git-ai/config.json
```

---

## Setup Wizard (Gemini Path)

### File: [`src/commands/setup.ts`](file:///d:/git-ai/src/commands/setup.ts)

When the user selects Gemini in `git-ai setup`:

1. Prompts for `GEMINI_API_KEY` (password input, masked)
2. Stores it as `gemini_api_key` in config
3. Offers model choice:
   - `gemini-1.5-flash` — fast
   - `gemini-1.5-pro` — better quality

```bash
git-ai setup
# Step 1/4: Choose your AI provider
# > Gemini Flash (Google) — Free tier available
#
# Step 2/4: Enter your GEMINI_API_KEY
# > **********************
#
# Choose model
# > Gemini 1.5 Flash (fast)
#   Gemini 1.5 Pro (better quality)
```

---

## Prompts Sent to Gemini

All prompts are built in [`src/core/prompt-builder.ts`](file:///d:/git-ai/src/core/prompt-builder.ts). The same prompts are sent to all providers — provider selection is transparent to the prompt layer.

### Commit Prompt (sent as a single user message)

```
You are an expert software engineer writing a git commit message.

STYLE GUIDE (STRICTLY follow this — it matches the existing repo style):
[auto-detected style: conventional/gitmoji/plain, scope, casing, length]
Examples from this repo:
  - "feat(auth): add JWT refresh token rotation"
  - ...

BRANCH: feature/PROJ-123-my-feature
TICKET: PROJ-123

STAGED FILES:
src/api/auth.ts
src/utils/token.ts

DIFF:
[filtered + truncated diff, max 3000 tokens by default]

Rules:
- First line max 72 characters
- Be specific: name the component/function/module that changed
- Use active voice ("add feature" not "added feature")
- Do NOT include "Co-authored-by" or AI attribution
- Output ONLY the commit message, nothing else
```

> **Note for Gemini**: The `generateContent` call passes the entire prompt as a single string. The `@google/generative-ai` SDK handles this as a `text` part automatically.

### Review Prompt (formatted findings with SHA-256 dedup)

```
You are a senior software engineer performing a code review.

Review this diff for:
1. Bugs and logic errors
2. Security vulnerabilities
3. Performance issues
4. Missing error handling
5. Code style and readability concerns

DIFF:
[filtered + truncated diff]

Format your review as a list of findings. Each finding should follow this format:
[SEVERITY] Description — file:line (if applicable)

Severity levels:
- CRITICAL: Bugs, security issues, data loss risks
- WARNING: Performance issues, missing error handling, potential problems
- SUGGESTION: Style improvements, better approaches, minor enhancements

Output ONLY the review findings.
```

Findings are parsed by `review-parser.ts` into `ReviewFinding[]`, fingerprinted via SHA-256
(`severity|location|normalized_description`), and persisted in `.git-ai/findings.json` for
cross-run deduplication. The `--fail-on` flag gates CI on severity thresholds.

### Prompt Token Budget

| Config Key | Default | Description |
|-----------|---------|-------------|
| `max_diff_tokens` | `3000` | Max tokens in the diff portion of commit prompts |
| PR / Review prompts | `4000` | Hard-coded in `buildPRPrompt` / `buildReviewPrompt` |

Diffs are intelligently truncated in [`src/utils/diff-truncator.ts`](file:///d:/git-ai/src/utils/diff-truncator.ts):
- Lock files excluded (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`)
- Minified files excluded (`.min.js`, `.min.css`, `.map`, `dist/`)
- Source files prioritized (`.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.go`, `.rs`, `.java`)

---

## Codebase Architecture

```
src/
├── index.ts                  # CLI entry — commander setup, shorthand git-ai → commit
├── commands/
│   ├── commit.ts             # git-ai commit — interactive TUI, hook-mode support
│   ├── pr.ts                 # git-ai pr — PR description + gh CLI integration
│   ├── review.ts             # git-ai review — code review + dedup + JSON/PR-comment
│   ├── changelog.ts          # git-ai changelog — CHANGELOG.md generation
│   ├── ci.ts                 # git-ai ci — generate GitHub Actions workflow
│   ├── findings.ts           # git-ai findings — list/acknowledge/clear stored findings
│   ├── hook.ts               # git-ai hook — install/uninstall prepare-commit-msg
│   └── setup.ts              # git-ai setup — first-time wizard (Gemini path on line 69-79)
├── core/
│   ├── config.ts             # Typed config store via conf package
│   ├── git.ts                # simple-git wrappers: diff, log, branch, commit, push, getHeadHash
│   ├── prompt-builder.ts     # Builds all prompts (provider-agnostic)
│   ├── style-learner.ts      # Analyzes last 20 commits → CommitStyle
│   └── findings-store.ts     # Persist findings in .git-ai/findings.json (per-repo)
├── providers/
│   ├── index.ts              # generate() router — single entry point for all commands
│   ├── anthropic.ts          # Claude via @anthropic-ai/sdk
│   ├── openai.ts             # GPT via openai
│   ├── gemini.ts             # ← Gemini via @google/generative-ai
│   └── ollama.ts             # Ollama via fetch()
├── ui/
│   ├── confirm.ts            # Inquirer prompts: Commit/Edit/Regenerate/Cancel
│   ├── diff-display.ts       # Chalk-colored diff stats, review summary + findings
│   └── spinner.ts            # ora spinner wrapper
└── utils/
    ├── branch-parser.ts      # extractTicketId (JIRA/GH/Linear) + getBranchType
    ├── diff-truncator.ts     # filterDiff + truncateDiff
    ├── review-parser.ts      # parseReview → structured findings, fingerprintFinding, shouldFail
    └── token-counter.ts      # estimateTokens (character-based: chars / 4)
```

---

## Configuration Schema

### File: [`src/core/config.ts`](file:///d:/git-ai/src/core/config.ts)

```typescript
export interface GitAIConfig {
  provider: 'anthropic' | 'openai' | 'gemini' | 'ollama';
  model: string;                        // e.g. 'gemini-1.5-flash'
  gemini_api_key?: string;              // stored via conf
  openai_api_key?: string;
  anthropic_api_key?: string;
  ollama_url?: string;
  commit_style?: 'auto' | 'conventional' | 'gitmoji' | 'plain';
  locale?: string;                      // default: 'en'
  max_diff_tokens?: number;             // default: 3000
  auto_stage?: boolean;                 // default: false
  push_after_commit?: boolean;          // default: false
  custom_instructions?: string;         // appended to every prompt
}
```

---

## CI Integration (Gemini Default)

Gemini is the **default provider for `git-ai ci`** because of its free tier:

```bash
git-ai ci --write                  # writes .github/workflows/git-ai-review.yml
git-ai ci --provider gemini        # explicit (default)
git-ai ci --fail-on critical       # only block on CRITICAL findings
```

Generated workflow runs on every PR:
```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened]
jobs:
  review:
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g @malikasadjaved/git-ai
      - run: git-ai review --full --json --fail-on critical --gh-comment
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
```

Review findings are parsed, deduplicated via SHA-256 fingerprinting, and posted as a PR comment
with a markdown severity table. Dedup state persists in `.git-ai/findings.json` so repeated
PR pushes don't flood the review with duplicate findings.

---

## Development Workflow

```bash
npm install          # Install dependencies (includes @google/generative-ai)
npm run build        # tsc → dist/
npm test             # vitest run (10 test files, 85 tests)
npm run lint         # eslint src --ext .ts
```

### Test Files

| Test | Coverage |
|------|----------|
| `tests/branch-parser.test.ts` | `extractTicketId`, `getBranchType` |
| `tests/config.test.ts` | Config get/set/getAll |
| `tests/diff-truncator.test.ts` | `filterDiff`, `truncateDiff` |
| `tests/findings-store.test.ts` | `load/save/acknowledge/clear` |
| `tests/git.test.ts` | git wrappers (mocked) |
| `tests/prompt-builder.test.ts` | All four prompt builders |
| `tests/providers-router.test.ts` | Provider dispatch |
| `tests/review-parser.test.ts` | `parseReview`, `fingerprintFinding`, `shouldFail` |
| `tests/style-learner.test.ts` | `learnCommitStyle` |
| `tests/token-counter.test.ts` | `estimateTokens` |

### Environment Setup for Gemini Testing

```bash
export GEMINI_API_KEY=your-key-here
git-ai setup         # configure provider=gemini
git add .
git-ai commit        # test Gemini commit generation
```

---

## Extending the Gemini Provider

### Upgrade to Gemini 2.x

In [`src/providers/gemini.ts`](file:///d:/git-ai/src/providers/gemini.ts), update the default:

```typescript
export async function generateWithGemini(
  prompt: string,
  model: string = 'gemini-2.0-flash-exp',  // ← new model
)
```

And in [`src/commands/setup.ts`](file:///d:/git-ai/src/commands/setup.ts), update the choices:

```typescript
choices: [
  { name: 'Gemini 2.0 Flash (fast)', value: 'gemini-2.0-flash-exp' },
  { name: 'Gemini 1.5 Pro (stable)', value: 'gemini-1.5-pro' },
],
```

### Add Generation Config (temperature, max tokens)

```typescript
const genModel = genAI.getGenerativeModel({
  model,
  generationConfig: {
    maxOutputTokens: 1024,
    temperature: 0.3,      // lower = more deterministic commit messages
    topP: 0.9,
  },
});
```

### Add System Instructions

```typescript
const genModel = genAI.getGenerativeModel({
  model,
  systemInstruction: 'You are an expert software engineer. Be concise and precise.',
});
```

### Enable Safety Settings Override

```typescript
import { HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const genModel = genAI.getGenerativeModel({
  model,
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  ],
});
```

---

## Common Error Patterns

| Error | Cause | Fix |
|-------|-------|-----|
| `GEMINI_API_KEY not set` | No API key configured | `git-ai setup` or `export GEMINI_API_KEY=...` |
| `400 Bad Request` | Invalid model name | Check available models at AI Studio |
| `429 Resource exhausted` | Free tier rate limit | Wait or upgrade to paid tier |
| Empty response | Safety filter triggered | Check content or adjust safety settings |
| `Unknown provider: gemini` | Corrupted config | Delete `~/.config/git-ai/config.json` and re-run setup |

---

## Free Tier Notes

Gemini Flash is the only provider in `git-ai` with a **free tier**:

- `gemini-1.5-flash`: 15 RPM, 1M TPM, 1500 RPD (as of 2024)
- Perfect for personal use and occasional commit message generation
- No credit card required for the free tier

Get your key at: https://makersuite.google.com/app/apikey

---

## Notes for AI Assistants (Gemini)

- **All imports use `.js` extensions** even for `.ts` files — required for ESM/NodeNext.
- **The `@google/generative-ai` SDK** uses `generateContent()` with a text string, not a messages array.
- **No streaming** is implemented; the full response is awaited before display.
- **Token estimation** is character-based (`chars / 4`) in `token-counter.ts` — not using the Gemini `countTokens` API.
- **The `generate()` function** in `src/providers/index.ts` is the single integration point.
- When modifying prompts, change `src/core/prompt-builder.ts` — changes apply to all providers.
- The `vitest` test suite mocks provider calls — tests in `tests/providers-router.test.ts` cover the routing logic.

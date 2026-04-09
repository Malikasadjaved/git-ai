import { CommitStyle, buildStyleInstruction } from './style-learner.js';
import { truncateDiff } from '../utils/diff-truncator.js';

export function buildCommitPrompt(params: {
  diff: string;
  stagedFiles: string[];
  branch: string;
  style: CommitStyle;
  ticketId?: string;
  customInstructions?: string;
}): string {
  const styleInstruction = buildStyleInstruction(params.style);
  const truncated = truncateDiff(params.diff);

  return `You are an expert software engineer writing a git commit message.

STYLE GUIDE (STRICTLY follow this — it matches the existing repo style):
${styleInstruction}

BRANCH: ${params.branch}
${params.ticketId ? `TICKET: ${params.ticketId} — reference it in the commit message` : ''}

STAGED FILES:
${params.stagedFiles.join('\n')}

DIFF:
${truncated}

${params.customInstructions ? `ADDITIONAL INSTRUCTIONS:\n${params.customInstructions}\n` : ''}
Rules:
- First line max 72 characters
- Be specific: name the component/function/module that changed
- Use active voice ("add feature" not "added feature")
- Do NOT include "Co-authored-by" or AI attribution
- If the change warrants a body, add it after a blank line
- Output ONLY the commit message, nothing else`;
}

export function buildPRPrompt(params: {
  diff: string;
  commits: string[];
  branch: string;
  targetBranch: string;
  ticketId?: string;
}): string {
  const truncated = truncateDiff(params.diff, 4000);

  return `You are an expert software engineer writing a pull request description.

BRANCH: ${params.branch} → ${params.targetBranch}
${params.ticketId ? `TICKET: ${params.ticketId}` : ''}

COMMITS ON THIS BRANCH:
${params.commits.map((c) => `- ${c}`).join('\n')}

DIFF:
${truncated}

Generate a PR title and body in this exact format:

TITLE: [concise title under 72 chars]

BODY:
## Summary
[2-3 sentence description of what this PR does and why]

## Changes
- [bullet list of key changes]

## Testing
- [ ] Unit tests pass
- [ ] Manual testing done on: [relevant areas]

${params.ticketId ? `## Related\nCloses ${params.ticketId}` : ''}

Output ONLY the title and body as specified above.`;
}

export function buildReviewPrompt(diff: string): string {
  const truncated = truncateDiff(diff, 4000);

  return `You are a senior software engineer performing a code review.

Review this diff for:
1. Bugs and logic errors
2. Security vulnerabilities
3. Performance issues
4. Missing error handling
5. Code style and readability concerns

DIFF:
${truncated}

Format your review as a list of findings. Each finding should follow this format:
[SEVERITY] Description — file:line (if applicable)

Severity levels:
- CRITICAL: Bugs, security issues, data loss risks
- WARNING: Performance issues, missing error handling, potential problems
- SUGGESTION: Style improvements, better approaches, minor enhancements

If the code looks good, say so briefly. Be specific and actionable.
Output ONLY the review findings.`;
}

export function buildChangelogPrompt(
  commits: Array<{ message: string; date: string }>,
): string {
  const commitList = commits.map((c) => `- ${c.message} (${c.date})`).join('\n');

  return `You are generating a CHANGELOG.md section from git commits.

COMMITS:
${commitList}

Group these commits into the following categories (skip empty categories):
### Breaking Changes
### Added
### Fixed
### Changed
### Performance
### Documentation
### Other

Format each entry as: - description (from the commit message, cleaned up for readability)
Use the keepachangelog.com format.
Output ONLY the grouped changelog entries, starting with the category headers.`;
}

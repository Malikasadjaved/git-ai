export function extractTicketId(branchName: string): string | null {
  // GitHub issue: #42 or GH-42 (check before JIRA since GH-42 matches JIRA pattern)
  const ghMatch = branchName.match(/(?:GH-|#)(\d+)/i);
  if (ghMatch) return `#${ghMatch[1]}`;

  // JIRA-style: PROJ-123 (at least 2-char prefix to avoid matching GH-)
  const jiraMatch = branchName.match(/([A-Z][A-Z0-9]+-\d+)/);
  if (jiraMatch) return jiraMatch[1];

  return null;
}

export type BranchType = 'feature' | 'hotfix' | 'release' | 'chore' | 'main' | 'other';

export function getBranchType(branchName: string): BranchType {
  if (branchName === 'main' || branchName === 'master') return 'main';
  if (/^feature[/\-]/.test(branchName) || /^feat[/\-]/.test(branchName)) return 'feature';
  if (/^(hot)?fix[/\-]/.test(branchName) || /^bugfix[/\-]/.test(branchName)) return 'hotfix';
  if (/^release[/\-]/.test(branchName)) return 'release';
  if (/^chore[/\-]/.test(branchName)) return 'chore';
  return 'other';
}

export interface CommitStyle {
  format: 'conventional' | 'gitmoji' | 'plain' | 'custom';
  usesEmoji: boolean;
  averageLength: number;
  usesScope: boolean;
  preferredTypes: string[];
  exampleMessages: string[];
  casing: 'lower' | 'upper' | 'sentence';
  language: string;
}

const CONVENTIONAL_RE = /^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)(\(.+?\))?[!]?:\s/;
const GITMOJI_RE = /^[\u{1F300}-\u{1FAD6}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

export async function learnCommitStyle(
  commits: Array<{ message: string }>,
): Promise<CommitStyle> {
  if (commits.length === 0) {
    return defaultStyle();
  }

  const messages = commits.map((c) => c.message.split('\n')[0]);
  const conventionalCount = messages.filter((m) => CONVENTIONAL_RE.test(m)).length;
  const emojiCount = messages.filter((m) => GITMOJI_RE.test(m)).length;

  // Detect format
  let format: CommitStyle['format'] = 'plain';
  if (conventionalCount / messages.length > 0.5) format = 'conventional';
  else if (emojiCount / messages.length > 0.5) format = 'gitmoji';

  // Count types
  const typeCounts: Record<string, number> = {};
  for (const m of messages) {
    const match = m.match(CONVENTIONAL_RE);
    if (match) typeCounts[match[1]] = (typeCounts[match[1]] || 0) + 1;
  }
  const preferredTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t);

  // Scope detection
  const scopeCount = messages.filter((m) => /^[a-z]+\(.+?\):/.test(m)).length;

  // Average length
  const averageLength = Math.round(messages.reduce((s, m) => s + m.length, 0) / messages.length);

  // Casing of first word after prefix
  const firstWords = messages.map((m) => {
    const stripped = m.replace(CONVENTIONAL_RE, '').replace(GITMOJI_RE, '').trim();
    return stripped.charAt(0);
  });
  const upperCount = firstWords.filter((c) => /[A-Z]/.test(c)).length;
  const casing: CommitStyle['casing'] =
    upperCount / messages.length > 0.7 ? 'sentence' : 'lower';

  // Pick 3 representative examples
  const exampleMessages = messages
    .filter((m) => m.length > 10 && m.length < 100)
    .slice(0, 3);

  return {
    format,
    usesEmoji: emojiCount / messages.length > 0.3,
    averageLength,
    usesScope: scopeCount / messages.length > 0.3,
    preferredTypes: preferredTypes.length > 0 ? preferredTypes : ['feat', 'fix', 'chore'],
    exampleMessages: exampleMessages.length > 0 ? exampleMessages : ['fix: resolve login issue'],
    casing,
    language: 'en',
  };
}

export function buildStyleInstruction(style: CommitStyle): string {
  const lines: string[] = [];

  switch (style.format) {
    case 'conventional':
      lines.push(
        `Use Conventional Commits format: type${style.usesScope ? '(scope)' : ''}: description`,
      );
      lines.push(`Preferred types: ${style.preferredTypes.join(', ')}`);
      break;
    case 'gitmoji':
      lines.push('Use gitmoji format: start with a relevant emoji');
      break;
    case 'plain':
      lines.push('Use plain commit message format (no prefix convention)');
      break;
  }

  lines.push(`First line should be around ${style.averageLength} characters`);
  lines.push(`Use ${style.casing === 'sentence' ? 'Sentence case' : 'lowercase'} for the description`);

  if (style.exampleMessages.length > 0) {
    lines.push('');
    lines.push('Examples from this repo:');
    for (const ex of style.exampleMessages) {
      lines.push(`  - "${ex}"`);
    }
  }

  return lines.join('\n');
}

function defaultStyle(): CommitStyle {
  return {
    format: 'conventional',
    usesEmoji: false,
    averageLength: 50,
    usesScope: false,
    preferredTypes: ['feat', 'fix', 'chore'],
    exampleMessages: [],
    casing: 'lower',
    language: 'en',
  };
}

import { estimateTokens } from './token-counter.js';

const SKIP_PATTERNS = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.min.js',
  '.min.css',
  'dist/',
  '.map',
];

const PRIORITY_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java'];

export function filterDiff(diff: string): string {
  const files = diff.split(/^diff --git /m).filter(Boolean);
  const kept = files.filter((file) => {
    const firstLine = file.split('\n')[0] || '';
    return !SKIP_PATTERNS.some((p) => firstLine.includes(p));
  });
  return kept.map((f) => 'diff --git ' + f).join('');
}

export function truncateDiff(diff: string, maxTokens: number = 3000): string {
  const filtered = filterDiff(diff);
  if (estimateTokens(filtered) <= maxTokens) return filtered;

  const files = filtered.split(/^diff --git /m).filter(Boolean);

  // Sort: priority extensions first
  const sorted = files.sort((a, b) => {
    const aExt = getExtension(a);
    const bExt = getExtension(b);
    const aPri = PRIORITY_EXTENSIONS.includes(aExt) ? 0 : 1;
    const bPri = PRIORITY_EXTENSIONS.includes(bExt) ? 0 : 1;
    return aPri - bPri;
  });

  let result = '';
  let tokens = 0;

  for (const file of sorted) {
    const lines = file.split('\n');
    const header = lines.slice(0, 4).join('\n');
    const body = lines.slice(4);
    const truncatedBody = body.slice(0, 50);
    const truncatedLines = body.length > 50 ? body.length - 50 : 0;

    const chunk =
      'diff --git ' +
      header +
      '\n' +
      truncatedBody.join('\n') +
      (truncatedLines > 0 ? `\n[... ${truncatedLines} lines truncated ...]` : '');

    const chunkTokens = estimateTokens(chunk);
    if (tokens + chunkTokens > maxTokens) break;

    result += chunk + '\n';
    tokens += chunkTokens;
  }

  return result || filtered.slice(0, maxTokens * 4);
}

function getExtension(fileChunk: string): string {
  const match = fileChunk.match(/a\/(.+?)\s/);
  if (!match) return '';
  const name = match[1];
  const dotIdx = name.lastIndexOf('.');
  return dotIdx >= 0 ? name.slice(dotIdx) : '';
}

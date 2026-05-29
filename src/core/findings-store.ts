import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getRepoRoot } from './git.js';
import type { Severity } from '../utils/review-parser.js';

export interface FindingRecord {
  id: string;
  fingerprint: string;
  severity: Severity;
  location?: string;
  description: string;
  commit: string;
  timestamp: string;
  acknowledged: boolean;
}

interface FindingsFile {
  version: 1;
  findings: FindingRecord[];
}

const FINDINGS_DIR = '.git-ai';
const FINDINGS_FILE = 'findings.json';
const CURRENT_VERSION = 1;

export async function getStorePath(): Promise<string> {
  const root = await getRepoRoot();
  return join(root, FINDINGS_DIR, FINDINGS_FILE);
}

export async function loadFindings(): Promise<FindingRecord[]> {
  let storePath: string;
  try {
    storePath = await getStorePath();
  } catch {
    return [];
  }

  if (!existsSync(storePath)) return [];

  try {
    const raw = readFileSync(storePath, 'utf-8');
    const parsed: FindingsFile = JSON.parse(raw);
    if (parsed.version === CURRENT_VERSION && Array.isArray(parsed.findings)) {
      return parsed.findings;
    }
    return [];
  } catch {
    return [];
  }
}

export async function saveFindings(findings: FindingRecord[]): Promise<void> {
  const storePath = await getStorePath();
  const dir = join(storePath, '..');

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const data: FindingsFile = { version: CURRENT_VERSION, findings };
  writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function acknowledgeFinding(id: string): Promise<boolean> {
  const findings = await loadFindings();
  const idx = findings.findIndex((f) => f.id === id);
  if (idx === -1) return false;

  findings[idx].acknowledged = true;
  await saveFindings(findings);
  return true;
}

export async function clearFindings(): Promise<void> {
  const storePath = await getStorePath();
  const dir = join(storePath, '..');

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(
    storePath,
    JSON.stringify({ version: CURRENT_VERSION, findings: [] }, null, 2),
    'utf-8',
  );
}

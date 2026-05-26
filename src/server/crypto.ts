import { createHash } from 'node:crypto';

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function hashArtifact(value: unknown): `0x${string}` {
  return `0x${sha256Hex(canonicalJson(value))}`;
}

export function normalizeBytes32Hash(value: string): `0x${string}` {
  return value.startsWith('0x') ? value as `0x${string}` : `0x${value}`;
}


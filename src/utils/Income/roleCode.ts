import type { IncomeSource } from './incomeSources';

// FNV-1a: a stable 32-bit hash, so a code depends only on its own record and never on the others.
const fnv1a = (value: string): number => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
};

export const roleCode = (sourceKey: string): string =>
  fnv1a(sourceKey).toString(36).padStart(6, '0').slice(-6);

// Sorted first, so a collision resolves the same way whatever order the roles arrived in.
export const buildRoleCodes = (sources: IncomeSource[]): Map<string, string> => {
  const codes = new Map<string, string>();
  const taken = new Set<string>();
  for (const source of [...sources].sort((a, b) => a.key.localeCompare(b.key))) {
    const base = roleCode(source.key);
    let code = base;
    let suffix = 1;
    while (taken.has(code)) {
      code = roleCode(`${source.key}#${suffix}`);
      suffix += 1;
    }
    codes.set(source.key, code);
    taken.add(code);
  }
  return codes;
};

export const codeForKey = (sources: IncomeSource[], key: string): string =>
  buildRoleCodes(sources).get(key) ?? roleCode(key);

// Takes a code, or a legacy `experience-12` key, so links shared before the codes still land.
export const keyFromRoleParam = (sources: IncomeSource[], raw: string | null): string => {
  if (!raw) return '';
  const wanted = raw.trim().toLowerCase();
  for (const [key, code] of buildRoleCodes(sources)) {
    if (code === wanted) return key;
  }
  return sources.some((source) => source.key === raw) ? raw : '';
};

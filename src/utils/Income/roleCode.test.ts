import { describe, expect, it } from 'vitest';
import { buildRoleCodes, codeForKey, keyFromRoleParam, roleCode } from './roleCode';
import type { IncomeSource } from './incomeSources';

const source = (key: string, company: string, roleTitle = ''): IncomeSource =>
  ({ key, company, roleTitle }) as IncomeSource;

const ROLES = [
  source('experience-1', 'Google', 'Software Engineer'),
  source('experience-2', 'Google', 'Software Engineer II'),
  source('offer-3', 'Netflix', 'Software Engineer II'),
];

describe('roleCode', () => {
  it('is six characters, so a URL stays short', () => {
    expect(roleCode('experience-1')).toHaveLength(6);
    expect(roleCode('offer-300000')).toHaveLength(6);
  });

  it('is the same every time for the same record', () => {
    expect(roleCode('experience-1')).toBe(roleCode('experience-1'));
  });

  it('differs between records, including across the two kinds', () => {
    expect(roleCode('experience-1')).not.toBe(roleCode('experience-2'));
    expect(roleCode('experience-1')).not.toBe(roleCode('offer-1'));
  });

  it('exposes neither the row id nor the company', () => {
    const code = roleCode('experience-25');
    expect(code).not.toContain('25');
    expect(code).not.toContain('experience');
  });
});

describe('buildRoleCodes', () => {
  it('gives every role its own code', () => {
    const codes = buildRoleCodes(ROLES);
    expect(new Set(codes.values()).size).toBe(ROLES.length);
  });

  it('does not rename a role when another is added, which slugs did', () => {
    const before = buildRoleCodes([ROLES[0]]).get('experience-1');
    const after = buildRoleCodes(ROLES).get('experience-1');
    expect(after).toBe(before);
  });

  it('resolves the same way however the roles are ordered', () => {
    const forward = buildRoleCodes(ROLES);
    const reversed = buildRoleCodes([...ROLES].reverse());
    for (const [key, code] of forward) expect(reversed.get(key)).toBe(code);
  });
});

describe('keyFromRoleParam', () => {
  it('resolves a code back to the key the app uses', () => {
    expect(keyFromRoleParam(ROLES, codeForKey(ROLES, 'offer-3'))).toBe('offer-3');
  });

  it('ignores case, since a URL gets retyped by hand', () => {
    expect(keyFromRoleParam(ROLES, codeForKey(ROLES, 'offer-3').toUpperCase())).toBe('offer-3');
  });

  it('still accepts a legacy key, so older links keep landing', () => {
    expect(keyFromRoleParam(ROLES, 'experience-1')).toBe('experience-1');
  });

  it('gives up rather than guessing, which is what applies the default', () => {
    expect(keyFromRoleParam(ROLES, 'zzzzzz')).toBe('');
    expect(keyFromRoleParam(ROLES, '')).toBe('');
    expect(keyFromRoleParam(ROLES, null)).toBe('');
  });

  it('round-trips every role through its own code', () => {
    for (const entry of ROLES) {
      expect(keyFromRoleParam(ROLES, codeForKey(ROLES, entry.key))).toBe(entry.key);
    }
  });
});

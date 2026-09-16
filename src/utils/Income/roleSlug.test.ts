import { describe, expect, it } from 'vitest';
import { buildRoleSlugs, keyFromRoleParam, slugForKey } from './roleSlug';
import type { IncomeSource } from './incomeSources';

const source = (key: string, company: string, roleTitle = ''): IncomeSource =>
  ({ key, company, roleTitle }) as IncomeSource;

describe('buildRoleSlugs', () => {
  it('names a role by its company while that is unique', () => {
    const slugs = buildRoleSlugs([
      source('experience-1', 'Google', 'Software Engineer'),
      source('offer-2', 'Netflix', 'Software Engineer II'),
    ]);
    expect(slugs.get('experience-1')).toBe('google');
    expect(slugs.get('offer-2')).toBe('netflix');
  });

  it('adds the title when one company holds two roles in the same year', () => {
    const slugs = buildRoleSlugs([
      source('experience-1', 'Google', 'Software Engineer'),
      source('experience-2', 'Google', 'Software Engineer II'),
      source('offer-3', 'Netflix', 'Software Engineer II'),
    ]);
    expect(slugs.get('experience-1')).toBe('google-software-engineer');
    expect(slugs.get('experience-2')).toBe('google-software-engineer-ii');
    expect(slugs.get('offer-3')).toBe('netflix');
  });

  it('counts off a stint that repeats the same company and title', () => {
    const slugs = buildRoleSlugs([
      source('experience-1', 'Google', 'Software Engineer'),
      source('experience-2', 'Google', 'Software Engineer'),
    ]);
    expect(slugs.get('experience-1')).toBe('google-software-engineer');
    expect(slugs.get('experience-2')).toBe('google-software-engineer-2');
  });

  it('keeps the raw key when a company has nothing sluggable in it', () => {
    const slugs = buildRoleSlugs([source('experience-9', '株式会社')]);
    expect(slugs.get('experience-9')).toBe('experience-9');
  });

  it('strips punctuation and accents rather than escaping them into the URL', () => {
    const slugs = buildRoleSlugs([source('experience-1', 'Ámbar & Co.')]);
    expect(slugs.get('experience-1')).toBe('ambar-co');
  });
});

describe('the same company across two years', () => {
  // Each year is slugged on its own, so a promotion logged as a second role keeps the short form.
  it('keeps the short slug while only one role is in the year', () => {
    const earlier = [source('experience-1', 'Google', 'Software Engineer')];
    const later = [source('experience-2', 'Google', 'Software Engineer II')];
    expect(buildRoleSlugs(earlier).get('experience-1')).toBe('google');
    expect(buildRoleSlugs(later).get('experience-2')).toBe('google');
  });
});

describe('keyFromRoleParam', () => {
  const sources = [
    source('experience-1', 'Google', 'Software Engineer'),
    source('offer-2', 'Netflix', 'Software Engineer II'),
  ];

  it('resolves a slug back to the key the app uses', () => {
    expect(keyFromRoleParam(sources, 'netflix')).toBe('offer-2');
  });

  it('ignores case, since a URL gets retyped by hand', () => {
    expect(keyFromRoleParam(sources, 'Netflix')).toBe('offer-2');
  });

  it('still accepts a legacy key, so links shared before the slugs keep working', () => {
    expect(keyFromRoleParam(sources, 'experience-1')).toBe('experience-1');
  });

  it('gives up rather than guessing, which is what applies the default', () => {
    expect(keyFromRoleParam(sources, 'stripe')).toBe('');
    expect(keyFromRoleParam(sources, '')).toBe('');
    expect(keyFromRoleParam(sources, null)).toBe('');
  });

  it('round-trips every source through its own slug', () => {
    for (const entry of sources) {
      expect(keyFromRoleParam(sources, slugForKey(sources, entry.key))).toBe(entry.key);
    }
  });
});

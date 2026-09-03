import { describe, expect, it } from 'vitest';

// AGENTS.md → Real Data → Substitutes is the source of truth: full-time pair, internship pair.
const SANCTIONED = ['Google', 'Netflix', 'Stripe', 'Airbnb'];
const ALLOWED = new Set(SANCTIONED);

// Names live in an untracked file: a committed denylist publishes what it exists to keep out.
const DENYLIST = import.meta.glob('../.private-denylist', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const offLimits = () =>
  Object.values(DENYLIST)
    .flatMap((contents) => contents.split('\n'))
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

// Vite's raw glob, because the app tsconfig carries no Node types.
const TESTS = import.meta.glob('./**/*.test.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// Everything shipped or written down, not just fixtures: the first leak of this kind was in a README.
const EVERYTHING = {
  ...(import.meta.glob('./**/*.{ts,tsx,css}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
  ...(import.meta.glob('../*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
  ...(import.meta.glob('../../*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
};

// `company: 'X'`, `company="X"`, `company={'X'}`. The `[^=]` keeps `company === 'string'` out.
const COMPANY_LITERAL = /company['"]?\s*[:=][^=]\s*\{?\s*['"]([^'"]+)['"]/g;

const namesIn = (contents: string) =>
  [...contents.matchAll(COMPANY_LITERAL)].map((match) => match[1]);

describe('company fixtures', () => {
  it('only ever name the agreed substitutes', () => {
    const offenders = Object.entries(TESTS)
      .filter(([file]) => !file.endsWith('companyFixtures.test.ts'))
      .flatMap(([file, contents]) =>
        namesIn(contents)
          .filter((name) => !ALLOWED.has(name))
          .map((name) => `${file}: ${name}`)
      );

    expect(offenders, `Use ${SANCTIONED.join(' or ')} instead`).toEqual([]);
  });

  it('never names a real employer, in code or in prose', () => {
    const banned = offLimits();
    const offenders = Object.entries(EVERYTHING)
      .filter(([file]) => !file.endsWith('companyFixtures.test.ts'))
      .flatMap(([file, contents]) =>
        banned
          .filter((name) => new RegExp(`\\b${name}\\b`).test(contents))
          .map(() => `${file} names a real employer`)
      );

    expect(offenders, `Use ${SANCTIONED.join(' or ')} instead`).toEqual([]);
  });

  it('reads the markdown, which is where the first leak of this kind landed', () => {
    const docs = Object.keys(EVERYTHING).filter((file) => file.endsWith('.md'));
    expect(docs.some((file) => file.includes('README'))).toBe(true);
    expect(docs.some((file) => file.includes('AGENTS'))).toBe(true);
  });

  it('catches a company that is not a substitute', () => {
    expect(namesIn("source({ company: 'Acme Corp', annualSalary: 90000 })")).toEqual(['Acme Corp']);
    expect(namesIn("company: 'Google'").every((name) => ALLOWED.has(name))).toBe(true);
  });

  it('ignores a type comparison rather than reading it as a fixture', () => {
    expect(namesIn("typeof snapshot.company === 'string' ? snapshot.company : ''")).toEqual([]);
  });
});

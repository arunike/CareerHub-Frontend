import { describe, expect, it } from 'vitest';

// AGENTS.md → Real Data → Substitutes is the source of truth: full-time pair, internship pair.
const SANCTIONED = ['Google', 'Netflix', 'Stripe', 'Airbnb'];
const ALLOWED = new Set(SANCTIONED);

// Vite's raw glob, because the app tsconfig carries no Node types.
const TESTS = import.meta.glob('./**/*.test.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

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

  it('catches a company that is not a substitute', () => {
    expect(namesIn("source({ company: 'Acme Corp', annualSalary: 90000 })")).toEqual(['Acme Corp']);
    expect(namesIn("company: 'Google'").every((name) => ALLOWED.has(name))).toBe(true);
  });

  it('ignores a type comparison rather than reading it as a fixture', () => {
    expect(namesIn("typeof snapshot.company === 'string' ? snapshot.company : ''")).toEqual([]);
  });
});

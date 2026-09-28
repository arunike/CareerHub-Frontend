import { describe, expect, it } from 'vitest';

import substitutes from '../eslint-rules/substitutes.json';

// Committed inside the repo: reading it from outside broke lint, and so the build, on a fresh clone.
describe('substitutes reference', () => {
  it('carries every section its readers index', () => {
    expect(Object.keys(substitutes)).toEqual(
      expect.arrayContaining(['companies', 'people', 'titles', 'locations', 'dates', 'figures'])
    );
  });

  it('names the substitute companies the fixtures are required to use', () => {
    expect(substitutes.companies).toEqual(expect.arrayContaining(['Google', 'Netflix']));
  });
});

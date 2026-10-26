import { describe, expect, it } from 'vitest';
import { levelsFyiUrl } from './levelsFyi';

describe('levelsFyiUrl', () => {
  it('builds the company page from the role itself', () => {
    expect(levelsFyiUrl('Google')).toBe('https://www.levels.fyi/companies/google/salaries');
    expect(levelsFyiUrl('Netflix')).toBe('https://www.levels.fyi/companies/netflix/salaries');
  });

  it('keeps punctuation and accents out of the slug', () => {
    expect(levelsFyiUrl('Ámbar & Co.')).toBe('https://www.levels.fyi/companies/ambar-co/salaries');
  });

  it('has nothing to link when the company kebabs to nothing', () => {
    expect(levelsFyiUrl('株式会社')).toBeNull();
    expect(levelsFyiUrl(null)).toBeNull();
    expect(levelsFyiUrl('')).toBeNull();
  });
});

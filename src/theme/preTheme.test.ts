import { describe, expect, it } from 'vitest';
import shell from '../../index.html?raw';
import { LEGACY_PUBLIC_THEME_STORAGE_KEY, THEME_STORAGE_KEY } from './preference';

// The pre-paint script cannot import, so it repeats the key and the colour. Catch them drifting.
describe('pre-paint theme script', () => {
  it('reads the same storage keys the app writes', () => {
    expect(shell).toContain(`'${THEME_STORAGE_KEY}'`);
    expect(shell).toContain(`'${LEGACY_PUBLIC_THEME_STORAGE_KEY}'`);
  });

  it('paints the same near-black the dark page uses', () => {
    expect(shell).toContain('#08090b');
  });

  it('runs on every route now that the whole app is themed', () => {
    expect(shell).not.toContain("window.location.pathname !== '/'");
  });

  it('accepts only the three supported preferences', () => {
    for (const preference of ['light', 'dark', 'system']) {
      expect(shell).toContain(`'${preference}'`);
    }
  });
});

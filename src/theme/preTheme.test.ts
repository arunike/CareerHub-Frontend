import { describe, expect, it } from 'vitest';
import boot from '../../public/theme-boot.js?raw';
import shell from '../../index.html?raw';
import { LEGACY_PUBLIC_THEME_STORAGE_KEY, THEME_STORAGE_KEY } from './preference';

// The pre-paint script cannot import, so it repeats the key and the colour. Catch them drifting.
describe('pre-paint theme script', () => {
  it('reads the same storage keys the app writes', () => {
    expect(boot).toContain(`'${THEME_STORAGE_KEY}'`);
    expect(boot).toContain(`'${LEGACY_PUBLIC_THEME_STORAGE_KEY}'`);
  });

  it('paints the same near-black the dark page uses', () => {
    expect(boot).toContain('#08090b');
  });

  it('is loaded as a file, because the production CSP forbids inline script', () => {
    expect(shell).toContain('<script src="/theme-boot.js"></script>');
    expect(shell).not.toMatch(/<script>[^<]/);
  });

  it('accepts only the three supported preferences', () => {
    for (const preference of ['light', 'dark', 'system']) {
      expect(boot).toContain(`'${preference}'`);
    }
  });
});

import { describe, expect, it } from 'vitest';
import {
  APP_DARK_MODE_ENABLED,
  LEGACY_PUBLIC_THEME_STORAGE_KEY,
  SYSTEM_DARK_QUERY,
  THEME_STORAGE_KEY,
  isThemePreference,
  readThemePreference,
  resolveTheme,
  watchSystemTheme,
} from './preference';

const storage = (values: Record<string, string>) => ({
  getItem: (key: string) => values[key] ?? null,
});

describe('theme preference', () => {
  it('resolves an explicit choice without consulting the system', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('follows the system only when asked to', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });

  it('accepts only the three supported values', () => {
    expect(isThemePreference('system')).toBe(true);
    expect(isThemePreference('sepia')).toBe(false);
    expect(isThemePreference(null)).toBe(false);
  });

  it('defaults to system when nothing is stored', () => {
    expect(readThemePreference(storage({}))).toBe('system');
  });

  it('carries over a choice made on the public page before the shared key existed', () => {
    expect(readThemePreference(storage({ [LEGACY_PUBLIC_THEME_STORAGE_KEY]: 'dark' }))).toBe(
      'dark'
    );
  });

  it('prefers the current key over the legacy one', () => {
    expect(
      readThemePreference(
        storage({ [THEME_STORAGE_KEY]: 'light', [LEGACY_PUBLIC_THEME_STORAGE_KEY]: 'dark' })
      )
    ).toBe('light');
  });

  it('ignores a corrupt value in either key', () => {
    expect(
      readThemePreference(
        storage({ [THEME_STORAGE_KEY]: 'sepia', [LEGACY_PUBLIC_THEME_STORAGE_KEY]: 'neon' })
      )
    ).toBe('system');
  });

  it('has dark mode live for the whole app', () => {
    expect(APP_DARK_MODE_ENABLED).toBe(true);
  });

  it('names the query the browser is asked for', () => {
    expect(SYSTEM_DARK_QUERY).toBe('(prefers-color-scheme: dark)');
  });
});

describe('watchSystemTheme', () => {
  const fakeWatcher = (matches: boolean) => {
    const listeners = new Set<(event: { matches: boolean }) => void>();
    return {
      matches,
      addEventListener: (_: 'change', listener: (event: { matches: boolean }) => void) => {
        listeners.add(listener);
      },
      removeEventListener: (_: 'change', listener: (event: { matches: boolean }) => void) => {
        listeners.delete(listener);
      },
      emit: (next: boolean) => listeners.forEach((listener) => listener({ matches: next })),
      count: () => listeners.size,
    };
  };

  it('reports the current setting straight away', () => {
    const seen: boolean[] = [];
    watchSystemTheme(fakeWatcher(true), (value) => seen.push(value));
    expect(seen).toEqual([true]);
  });

  it('reports every later change', () => {
    const watcher = fakeWatcher(false);
    const seen: boolean[] = [];
    watchSystemTheme(watcher, (value) => seen.push(value));
    watcher.emit(true);
    watcher.emit(false);
    expect(seen).toEqual([false, true, false]);
  });

  it('detaches on teardown', () => {
    const watcher = fakeWatcher(false);
    const stop = watchSystemTheme(watcher, () => {});
    stop();
    expect(watcher.count()).toBe(0);
  });
});

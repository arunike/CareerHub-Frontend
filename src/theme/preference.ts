export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'careerhub-theme';

// The public page shipped first under its own key; honour it so a made choice is not lost.
export const LEGACY_PUBLIC_THEME_STORAGE_KEY = 'careerhub-public-theme';

export const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)';

export const APP_DARK_MODE_ENABLED = true;

export const isThemePreference = (value: string | null): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system';

export const resolveTheme = (
  preference: ThemePreference,
  systemPrefersDark: boolean
): ResolvedTheme => {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light';
  return preference;
};

export const readThemePreference = (storage: Pick<Storage, 'getItem'>): ThemePreference => {
  const stored = storage.getItem(THEME_STORAGE_KEY);
  if (isThemePreference(stored)) return stored;
  const legacy = storage.getItem(LEGACY_PUBLIC_THEME_STORAGE_KEY);
  return isThemePreference(legacy) ? legacy : 'system';
};

export interface SystemThemeWatcher {
  matches: boolean;
  addEventListener: (type: 'change', listener: (event: { matches: boolean }) => void) => void;
  removeEventListener: (type: 'change', listener: (event: { matches: boolean }) => void) => void;
}

// Returns the current value and a teardown, so the caller never re-reads the query itself.
export const watchSystemTheme = (
  watcher: SystemThemeWatcher,
  onChange: (prefersDark: boolean) => void
) => {
  const listener = (event: { matches: boolean }) => onChange(event.matches);
  watcher.addEventListener('change', listener);
  onChange(watcher.matches);
  return () => watcher.removeEventListener('change', listener);
};

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  SYSTEM_DARK_QUERY,
  THEME_STORAGE_KEY,
  readThemePreference,
  resolveTheme,
  watchSystemTheme,
} from './preference';
import type { ResolvedTheme, ThemePreference } from './preference';

interface ThemeValue {
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
  resolved: ResolvedTheme;
}

const ThemeContext = createContext<ThemeValue | null>(null);

// Throws rather than defaulting: a silent light fallback is how half the app stays light forever.
export const useTheme = () => {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    if (typeof window === 'undefined') return 'system';
    try {
      return readThemePreference(window.localStorage);
    } catch {
      return 'system';
    }
  });
  const [systemPrefersDark, setSystemPrefersDark] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(SYSTEM_DARK_QUERY).matches
  );

  useEffect(() => watchSystemTheme(window.matchMedia(SYSTEM_DARK_QUERY), setSystemPrefersDark), []);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      /* Storage can be blocked; the choice just does not outlive the tab. */
    }
  }, [preference]);

  const resolved = resolveTheme(preference, systemPrefersDark);
  const value = useMemo(() => ({ preference, setPreference, resolved }), [preference, resolved]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export default ThemeProvider;

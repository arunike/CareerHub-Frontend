import { useCallback, useMemo } from 'react';
import { useAccountSetting } from './useAccountSetting';

export type DashboardKey = 'jobHunt' | 'availability';

// The pre-account keys, read once so an existing browser carries its arrangement up.
const LEGACY_KEYS: Record<DashboardKey, { order: string; enabled: string }> = {
  jobHunt: { order: 'analytics_dashboard_order', enabled: 'job_hunt_analytics_enabled' },
  availability: {
    order: 'availability_analytics_order',
    enabled: 'availability_analytics_enabled',
  },
};

const ORDER_CACHE = 'careerhub.analytics.widgetOrder';
const ENABLED_CACHE = 'careerhub.analytics.widgetsEnabled';

const readLegacy = (key: string): string[] | null => {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as string[]) : null;
  } catch {
    return null;
  }
};

const legacyDict = (pick: 'order' | 'enabled') => {
  const seeded: Record<string, string[]> = {};
  for (const [dashboard, keys] of Object.entries(LEGACY_KEYS)) {
    const value = readLegacy(keys[pick]);
    if (value) seeded[dashboard] = value;
  }
  return seeded;
};

// Read once: only a first-render seed, and it cannot change after load.
const LEGACY_ORDER = legacyDict('order');
const LEGACY_ENABLED = legacyDict('enabled');

// Both dashboards share one field each, keyed by dashboard, so a save merges rather than replaces.
export const useDashboardLayout = (
  dashboard: DashboardKey,
  defaultEnabled: string[],
  normalize: (ids: string[]) => string[]
) => {
  const orders = useAccountSetting<Record<string, string[]>>(
    'analytics_widget_order',
    LEGACY_ORDER,
    ORDER_CACHE
  );
  const flags = useAccountSetting<Record<string, string[]>>(
    'analytics_widgets_enabled',
    LEGACY_ENABLED,
    ENABLED_CACHE
  );

  // Memoised: normalize builds a new array, and an effect depending on it re-runs forever.
  const enabled = useMemo(
    () => normalize(flags.value[dashboard] ?? defaultEnabled),
    [normalize, flags.value, dashboard, defaultEnabled]
  );

  const order = useMemo(() => {
    const saved = orders.value[dashboard];
    // Prune what is off and append what is newly on, so a widget added later still appears.
    const ordered = saved ? normalize(saved).filter((id) => enabled.includes(id)) : [];
    return [...ordered, ...enabled.filter((id) => !ordered.includes(id))];
  }, [normalize, orders.value, dashboard, enabled]);

  const setEnabled = useCallback(
    (next: string[]) => flags.setValue({ ...flags.value, [dashboard]: next }),
    [dashboard, flags]
  );

  const setOrder = useCallback(
    (next: string[]) => orders.setValue({ ...orders.value, [dashboard]: next }),
    [dashboard, orders]
  );

  return { enabled, order, setEnabled, setOrder, loaded: flags.loaded && orders.loaded };
};

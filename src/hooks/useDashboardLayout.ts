import { useCallback } from 'react';
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

// Both dashboards share one field each, keyed by dashboard, so a save merges rather than replaces.
export const useDashboardLayout = (
  dashboard: DashboardKey,
  defaultEnabled: string[],
  normalize: (ids: string[]) => string[]
) => {
  const orders = useAccountSetting<Record<string, string[]>>(
    'analytics_widget_order',
    legacyDict('order'),
    ORDER_CACHE
  );
  const flags = useAccountSetting<Record<string, string[]>>(
    'analytics_widgets_enabled',
    legacyDict('enabled'),
    ENABLED_CACHE
  );

  const enabled = normalize(flags.value[dashboard] ?? defaultEnabled);
  const saved = orders.value[dashboard];
  // Prune what is off and append what is newly on, so a widget added later still appears.
  const ordered = saved ? normalize(saved).filter((id) => enabled.includes(id)) : [];
  const order = [...ordered, ...enabled.filter((id) => !ordered.includes(id))];

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

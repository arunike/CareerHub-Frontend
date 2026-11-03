import type { HolidayTab, UserSettings } from '../../types';
import type { DayOff } from './ptoBalance';

// The My Time Off bucket has no tab id of its own, so the empty string stands for it.
export const UNTABBED_KEY = '';

export interface PtoTabPolicy {
  // False until settings load, when a deleted tab cannot be told from one not read yet.
  tabsKnown: boolean;
  knownTabs: ReadonlySet<string>;
  // The tabs whose days charge the allowance, My Time Off included as the empty string.
  chargingTabs: ReadonlySet<string>;
}

// Absent means a tab predating the setting, and those have never charged the allowance.
export const tabCharges = (tab: HolidayTab) => tab.counts_as_pto === true;

export type PtoTabSettings = Pick<UserSettings, 'holiday_tabs' | 'default_holiday_counts_as_pto'>;

export const ptoTabPolicyOf = (settings: PtoTabSettings | null | undefined): PtoTabPolicy => {
  const tabs = settings?.holiday_tabs ?? [];
  const chargingTabs = new Set(tabs.filter(tabCharges).map((tab) => tab.id));
  if (settings?.default_holiday_counts_as_pto !== false) chargingTabs.add(UNTABBED_KEY);
  return {
    tabsKnown: Boolean(settings?.holiday_tabs),
    knownTabs: new Set(tabs.map((tab) => tab.id)),
    chargingTabs,
  };
};

// Which bucket a day is shown under, which is not its stored tab once that tab is deleted.
export const bucketOf = (day: Pick<DayOff, 'tab'>, policy: PtoTabPolicy) => {
  if (!day.tab) return UNTABBED_KEY;
  return policy.tabsKnown && !policy.knownTabs.has(day.tab) ? UNTABBED_KEY : day.tab;
};

export const chargesAllowance = (day: Pick<DayOff, 'tab'>, policy: PtoTabPolicy) =>
  policy.chargingTabs.has(bucketOf(day, policy));

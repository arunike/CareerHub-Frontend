import {
  CalendarOutlined,
  CheckSquareOutlined,
  DashboardOutlined,
  DollarOutlined,
  FileTextOutlined,
  LineChartOutlined,
  RobotOutlined,
  ScheduleOutlined,
  SolutionOutlined,
  TrophyOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';

export const MOBILE_SMART_SLOT_KEY = '__smart__';
export const MOBILE_NAVIGATION_RECENT_STORAGE_KEY = 'careerhub.mobileNav.recent.v1';

export const MOBILE_NAVIGATION_ITEMS = [
  { key: '/', label: 'Availability', shortLabel: 'Home', icon: DashboardOutlined },
  { key: '/events', label: 'Events', shortLabel: 'Events', icon: CalendarOutlined },
  { key: '/holidays', label: 'Holidays', shortLabel: 'Holidays', icon: ScheduleOutlined },
  { key: '/applications', label: 'Applications', shortLabel: 'Apps', icon: SolutionOutlined },
  { key: '/offers', label: 'Offers', shortLabel: 'Offers', icon: DollarOutlined },
  { key: '/documents', label: 'Documents', shortLabel: 'Docs', icon: FileTextOutlined },
  { key: '/tasks', label: 'Action Items', shortLabel: 'Tasks', icon: CheckSquareOutlined },
  { key: '/experience', label: 'Experience', shortLabel: 'Experience', icon: TrophyOutlined },
  { key: '/jd-reports', label: 'JD Reports', shortLabel: 'JD Reports', icon: RobotOutlined },
  {
    key: '/ai-tools?tab=cover-letters',
    label: 'Cover Letters',
    shortLabel: 'Letters',
    icon: RobotOutlined,
  },
  {
    key: '/ai-tools?tab=negotiation-results',
    label: 'Negotiation Results',
    shortLabel: 'Negotiation',
    icon: RobotOutlined,
  },
  {
    key: '/ai-tools?tab=promotion-reviews',
    label: 'Promotion Reviews',
    shortLabel: 'Reviews',
    icon: RobotOutlined,
  },
  { key: '/analytics', label: 'Analytics', shortLabel: 'Insights', icon: LineChartOutlined },
] as const;

export const DEFAULT_MOBILE_TOOLBAR_KEYS = ['/', '/applications', '/offers', '/analytics'] as const;

export type MobileNavigationItem = (typeof MOBILE_NAVIGATION_ITEMS)[number];

export type MobileToolbarSlot = {
  key: string;
  slotKey: string;
  label: string;
  shortLabel: string;
  icon: MobileNavigationItem['icon'];
  isSmart: boolean;
};

export type ResolvedMobileToolbarItem = MobileNavigationItem & {
  slotKey: string;
  isSmart: boolean;
};

const mobileNavigationByKey = new Map<string, MobileNavigationItem>(
  MOBILE_NAVIGATION_ITEMS.map((item) => [item.key, item])
);

const SMART_SLOT: MobileToolbarSlot = {
  key: MOBILE_SMART_SLOT_KEY,
  slotKey: MOBILE_SMART_SLOT_KEY,
  label: 'Smart Slot',
  shortLabel: 'Smart',
  icon: ThunderboltOutlined,
  isSmart: true,
};

const CONTEXTUAL_SMART_KEYS: Array<[string, string]> = [
  ['/applications', '/tasks'],
  ['/offers', '/ai-tools?tab=negotiation-results'],
  ['/events', '/applications'],
  ['/documents', '/applications'],
  ['/tasks', '/applications'],
  ['/experience', '/ai-tools?tab=promotion-reviews'],
  ['/jd-reports', '/ai-tools?tab=cover-letters'],
  ['/analytics', '/applications'],
  ['/', '/events'],
];

export const normalizeMobileToolbarKeys = (keys?: string[]) => {
  const configuredKeys: readonly string[] = keys?.length ? keys : DEFAULT_MOBILE_TOOLBAR_KEYS;
  return configuredKeys
    .filter((key, index) => configuredKeys.indexOf(key) === index)
    .filter((key) => key === MOBILE_SMART_SLOT_KEY || mobileNavigationByKey.has(key))
    .slice(0, 4);
};

export const getMobileToolbarSlots = (keys?: string[]): MobileToolbarSlot[] =>
  normalizeMobileToolbarKeys(keys)
    .map((key) => {
      if (key === MOBILE_SMART_SLOT_KEY) return SMART_SLOT;
      const item = mobileNavigationByKey.get(key);
      return item ? { ...item, slotKey: item.key, isSmart: false as const } : null;
    })
    .filter((item): item is MobileToolbarSlot => Boolean(item));

export const getRecentMobileNavigationKeys = () => {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(
      window.localStorage.getItem(MOBILE_NAVIGATION_RECENT_STORAGE_KEY) || '[]'
    );
    return Array.isArray(value) ? value.filter((key) => mobileNavigationByKey.has(key)) : [];
  } catch {
    return [];
  }
};

export const recordMobileNavigationUse = (key: string) => {
  if (typeof window === 'undefined' || !mobileNavigationByKey.has(key)) return;
  const recentKeys = getRecentMobileNavigationKeys().filter((recentKey) => recentKey !== key);
  window.localStorage.setItem(
    MOBILE_NAVIGATION_RECENT_STORAGE_KEY,
    JSON.stringify([key, ...recentKeys].slice(0, 8))
  );
};

export const resolveSmartMobileNavigationKey = (
  configuredKeys: string[],
  pathname: string,
  recentKeys: string[] = []
) => {
  const fixedKeys = new Set(configuredKeys.filter((key) => key !== MOBILE_SMART_SLOT_KEY));
  const contextualKey = CONTEXTUAL_SMART_KEYS.find(([prefix]) =>
    prefix === '/' ? pathname === '/' : pathname.startsWith(prefix)
  )?.[1];
  const candidates = [...recentKeys, contextualKey, ...DEFAULT_MOBILE_TOOLBAR_KEYS, '/events'];
  return candidates.find((key): key is string =>
    Boolean(key && !fixedKeys.has(key) && mobileNavigationByKey.has(key))
  );
};

export const getMobileToolbarItems = (
  keys?: string[],
  options?: { pathname?: string; recentKeys?: string[] }
): ResolvedMobileToolbarItem[] => {
  const configuredKeys = normalizeMobileToolbarKeys(keys);
  const smartKey = configuredKeys.includes(MOBILE_SMART_SLOT_KEY)
    ? resolveSmartMobileNavigationKey(
        configuredKeys,
        options?.pathname || '/',
        options?.recentKeys || []
      )
    : undefined;

  return configuredKeys
    .map((slotKey) => {
      const key = slotKey === MOBILE_SMART_SLOT_KEY ? smartKey : slotKey;
      const item = key ? mobileNavigationByKey.get(key) : undefined;
      return item ? { ...item, slotKey, isSmart: slotKey === MOBILE_SMART_SLOT_KEY } : null;
    })
    .filter((item): item is ResolvedMobileToolbarItem => Boolean(item));
};

export const getMobileNavigationItemForLocation = (pathname: string, search: string) =>
  MOBILE_NAVIGATION_ITEMS.find((item) => matchesMobileNavigationItem(pathname, search, item.key));

export const matchesMobileNavigationItem = (pathname: string, search: string, itemKey: string) => {
  const [itemPath, itemSearch = ''] = itemKey.split('?');
  const pathMatches = itemPath === '/' ? pathname === '/' : pathname.startsWith(itemPath);
  if (!pathMatches || !itemSearch) return pathMatches;

  const currentParams = new URLSearchParams(search);
  const itemParams = new URLSearchParams(itemSearch);
  return Array.from(itemParams.entries()).every(
    ([name, value]) => currentParams.get(name) === value
  );
};

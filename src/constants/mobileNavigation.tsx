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
} from '@ant-design/icons';

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

const mobileNavigationByKey = new Map<string, MobileNavigationItem>(
  MOBILE_NAVIGATION_ITEMS.map((item) => [item.key, item])
);

export const getMobileToolbarItems = (keys?: string[]) => {
  const configuredKeys: readonly string[] = keys?.length ? keys : DEFAULT_MOBILE_TOOLBAR_KEYS;
  return configuredKeys
    .filter((key, index) => configuredKeys.indexOf(key) === index)
    .map((key) => mobileNavigationByKey.get(key))
    .filter((item): item is MobileNavigationItem => Boolean(item))
    .slice(0, 4);
};

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

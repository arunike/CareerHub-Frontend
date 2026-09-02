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
  TeamOutlined,
  TrophyOutlined,
  WalletOutlined,
} from '@ant-design/icons';

export interface NavChild {
  key: string;
  label: string;
}

export interface NavItem {
  key: string;
  label: string;
  children?: NavChild[];
}

export interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

// One entry per tab; the sidebar tree and the mobile toolbar are both derived from this.
export const NAV_REGISTRY = [
  { key: '/', group: 'grp-1', label: 'Availability', shortLabel: 'Home', icon: DashboardOutlined },
  { key: '/events', group: 'grp-1', label: 'Events', shortLabel: 'Events', icon: CalendarOutlined },
  {
    key: '/holidays',
    group: 'grp-1',
    label: 'Holidays',
    shortLabel: 'Days',
    icon: ScheduleOutlined,
  },
  {
    key: '/applications',
    group: 'grp-2',
    label: 'Applications',
    shortLabel: 'Apps',
    icon: SolutionOutlined,
  },
  {
    key: '/documents',
    group: 'grp-2',
    label: 'Documents',
    shortLabel: 'Docs',
    icon: FileTextOutlined,
  },
  {
    key: '/tasks',
    group: 'grp-2',
    label: 'Action Items',
    shortLabel: 'Tasks',
    icon: CheckSquareOutlined,
  },
  { key: '/offers', group: 'grp-2', label: 'Offers', shortLabel: 'Offers', icon: DollarOutlined },
  {
    key: '/experience',
    group: 'grp-2',
    label: 'Experience',
    shortLabel: 'Career',
    icon: TrophyOutlined,
  },
  { key: '/income', group: 'grp-2', label: 'Income', shortLabel: 'Pay', icon: WalletOutlined },
  {
    key: '/contacts',
    group: 'grp-2',
    label: 'Contacts',
    shortLabel: 'People',
    icon: TeamOutlined,
  },
  {
    key: '/jd-reports',
    group: 'grp-2',
    parent: 'intelligence',
    label: 'JD Reports',
    shortLabel: 'Reports',
    icon: RobotOutlined,
  },
  {
    key: '/ai-tools?tab=cover-letters',
    group: 'grp-2',
    parent: 'intelligence',
    label: 'Cover Letters',
    shortLabel: 'Letters',
    icon: RobotOutlined,
  },
  {
    key: '/ai-tools?tab=negotiation-results',
    group: 'grp-2',
    parent: 'intelligence',
    label: 'Negotiation Results',
    shortLabel: 'Advice',
    icon: RobotOutlined,
  },
  {
    key: '/ai-tools?tab=promotion-reviews',
    group: 'grp-2',
    parent: 'intelligence',
    label: 'Promotion Reviews',
    shortLabel: 'Reviews',
    icon: RobotOutlined,
  },
  {
    key: '/analytics',
    group: 'grp-3',
    label: 'Analytics',
    shortLabel: 'Stats',
    icon: LineChartOutlined,
  },
] as const;

export type NavEntry = (typeof NAV_REGISTRY)[number];

const GROUP_LABELS: Record<string, string> = {
  'grp-1': 'Schedule',
  'grp-2': 'Career & Growth',
  'grp-3': 'Insights',
};

const PARENT_LABELS: Record<string, string> = { intelligence: 'Intelligence' };

// A parent takes the position of its first child, so nesting needs no separate ordering.
const buildGroups = (): NavGroup[] =>
  Object.entries(GROUP_LABELS).map(([groupKey, label]) => {
    const items: NavItem[] = [];
    const parents = new Map<string, NavItem>();

    for (const entry of NAV_REGISTRY) {
      if (entry.group !== groupKey) continue;
      const parentKey = 'parent' in entry ? entry.parent : undefined;
      if (!parentKey) {
        items.push({ key: entry.key, label: entry.label });
        continue;
      }
      let parent = parents.get(parentKey);
      if (!parent) {
        parent = { key: parentKey, label: PARENT_LABELS[parentKey] ?? parentKey, children: [] };
        parents.set(parentKey, parent);
        items.push(parent);
      }
      parent.children!.push({ key: entry.key, label: entry.label });
    }

    return { key: groupKey, label, items };
  });

export const NAV_GROUPS: NavGroup[] = buildGroups();

// A saved order predates any tab added since, so an unranked item takes its built-in position.
export const applyNavOrder = <T extends { key: string }>(items: T[], order?: string[]): T[] => {
  if (!order?.length) return items;
  const rank = new Map(order.map((key, index) => [key, index]));

  const ranked = items.filter((item) => rank.has(item.key));
  ranked.sort((a, b) => rank.get(a.key)! - rank.get(b.key)!);

  const result = [...ranked];
  for (const item of items) {
    if (rank.has(item.key)) continue;
    // Slot it after whichever of its built-in predecessors survives in the saved order.
    const defaultIndex = items.indexOf(item);
    const predecessor = items
      .slice(0, defaultIndex)
      .reverse()
      .find((candidate) => result.includes(candidate));
    const at = predecessor ? result.indexOf(predecessor) + 1 : 0;
    result.splice(at, 0, item);
  }
  return result;
};

// An entry absent from the map keeps its built-in name, so a new entry needs no migration.
export const navLabel = (key: string, fallback: string, labels?: Record<string, string>) =>
  labels?.[key]?.trim() || fallback;

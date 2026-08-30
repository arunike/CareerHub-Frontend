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

export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'grp-1',
    label: 'Schedule',
    items: [
      { key: '/', label: 'Availability' },
      { key: '/events', label: 'Events' },
      { key: '/holidays', label: 'Holidays' },
    ],
  },
  {
    key: 'grp-2',
    label: 'Career & Growth',
    items: [
      { key: '/applications', label: 'Applications' },
      { key: '/offers', label: 'Offers' },
      { key: '/income', label: 'Income' },
      { key: '/documents', label: 'Documents' },
      { key: '/tasks', label: 'Action Items' },
      { key: '/experience', label: 'Experience' },
      { key: '/contacts', label: 'Contacts' },
      {
        key: 'intelligence',
        label: 'Intelligence',
        children: [
          { key: '/jd-reports', label: 'JD Reports' },
          { key: '/ai-tools?tab=cover-letters', label: 'Cover Letters' },
          { key: '/ai-tools?tab=negotiation-results', label: 'Negotiation Results' },
          { key: '/ai-tools?tab=promotion-reviews', label: 'Promotion Reviews' },
        ],
      },
    ],
  },
  {
    key: 'grp-3',
    label: 'Insights',
    items: [{ key: '/analytics', label: 'Analytics' }],
  },
];

// A key absent from the saved order keeps its built-in position rather than vanishing.
export const applyNavOrder = <T extends { key: string }>(items: T[], order?: string[]): T[] => {
  if (!order?.length) return items;
  const rank = new Map(order.map((key, index) => [key, index]));
  return [...items].sort((a, b) => {
    const aRank = rank.get(a.key);
    const bRank = rank.get(b.key);
    if (aRank == null && bRank == null) return items.indexOf(a) - items.indexOf(b);
    if (aRank == null) return 1;
    if (bRank == null) return -1;
    return aRank - bRank;
  });
};

// An entry absent from the map keeps its built-in name, so a new entry needs no migration.
export const navLabel = (key: string, fallback: string, labels?: Record<string, string>) =>
  labels?.[key]?.trim() || fallback;

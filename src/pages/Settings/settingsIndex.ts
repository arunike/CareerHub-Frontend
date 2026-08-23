import type { UserSettings } from '../../types';

export const SETTINGS_TAB_KEYS = [
  'general',
  'ai',
  'integrations',
  'security',
  'organize',
  'navigation',
] as const;

export type SettingsTab = (typeof SETTINGS_TAB_KEYS)[number];

export const TAB_LABELS: Record<SettingsTab, string> = {
  general: 'General',
  ai: 'AI Provider',
  integrations: 'Integrations',
  security: 'Security',
  organize: 'Organize',
  navigation: 'Navigation',
};

// Which saved fields each tab owns, so the Save dot only lights for a real change.
const TAB_FIELDS: Partial<Record<SettingsTab, Array<keyof UserSettings>>> = {
  general: [
    'work_days',
    'work_start_time',
    'work_end_time',
    'work_time_ranges',
    'primary_timezone',
    'buffer_time',
    'default_event_duration',
    'default_event_category',
    'ghosting_threshold_days',
    'notification_preferences',
  ],
  organize: [
    'employment_types',
    'application_stages',
    'holiday_tabs',
    'default_holiday_color',
    'federal_holiday_color',
    'ignored_federal_holidays',
  ],
  navigation: ['hidden_nav_items', 'mobile_toolbar_items', 'nav_item_order'],
};

// AI, Integrations and Security save inline and own no fields, so they never appear.
export const findDirtyTabs = (
  settings: UserSettings | null,
  originalJson: string
): SettingsTab[] => {
  if (!settings || !originalJson) return [];
  let original: Partial<UserSettings>;
  try {
    original = JSON.parse(originalJson);
  } catch {
    return [];
  }
  return (Object.keys(TAB_FIELDS) as SettingsTab[]).filter((tab) =>
    (TAB_FIELDS[tab] ?? []).some(
      (field) => JSON.stringify(settings[field]) !== JSON.stringify(original[field])
    )
  );
};

export interface SettingsSearchEntry {
  tab: SettingsTab;
  // Matches the SettingsSection id, so a result can scroll to its card.
  id: string;
  title: string;
  // Words someone might type that do not appear in the title.
  keywords: string;
}

export const SETTINGS_SEARCH_INDEX: SettingsSearchEntry[] = [
  {
    tab: 'general',
    id: 'availability',
    title: 'Availability',
    keywords: 'work days hours timezone buffer default event duration category schedule',
  },
  {
    tab: 'general',
    id: 'event-reminders',
    title: 'Event Reminders',
    keywords: 'notification bell days before repeat toast nudge alerts',
  },
  {
    tab: 'general',
    id: 'job-hunt',
    title: 'Job Hunt Settings',
    keywords: 'ghosting threshold stale days waiting follow up',
  },
  {
    tab: 'ai',
    id: 'ai-provider',
    title: 'AI Provider',
    keywords: 'claude gemini openai openrouter api key model endpoint cover letter curl',
  },
  {
    tab: 'integrations',
    id: 'integrations',
    title: 'Google Sheets Sync',
    keywords: 'google oauth sheet spreadsheet import column mapping cron worksheet',
  },
  {
    tab: 'security',
    id: 'security',
    title: 'Security',
    keywords: 'sessions devices sign in history password logout tokens',
  },
  {
    tab: 'organize',
    id: 'categories',
    title: 'Manage Categories',
    keywords: 'event category colour color interview personal work',
  },
  {
    tab: 'organize',
    id: 'employment-types',
    title: 'Employment Types',
    keywords: 'full time part time internship contract freelance',
  },
  {
    tab: 'organize',
    id: 'holiday-colors',
    title: 'Time Off Colors',
    keywords: 'holiday federal observed palette colour color time off',
  },
  {
    tab: 'organize',
    id: 'application-stages',
    title: 'Application Timeline Stages',
    keywords: 'rounds screen onsite offer rejected funnel pipeline stage order',
  },
  {
    tab: 'navigation',
    id: 'navigation',
    title: 'Navigation',
    keywords: 'sidebar order mobile toolbar hidden items menu reorder',
  },
];

export const searchSettings = (query: string) => {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  return SETTINGS_SEARCH_INDEX.filter((entry) => {
    const haystack = `${entry.title} ${entry.keywords} ${entry.tab}`.toLowerCase();
    // Every term has to appear, so extra words narrow the list instead of widening it.
    return terms.every((term) => haystack.includes(term));
  });
};

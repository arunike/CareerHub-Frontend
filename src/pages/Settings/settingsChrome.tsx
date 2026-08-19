import type { ReactNode } from 'react';
import {
  ApiOutlined,
  AppstoreOutlined,
  BellOutlined,
  CalendarOutlined,
  CloudSyncOutlined,
  MenuOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { SETTINGS_TAB_KEYS, TAB_LABELS, type SettingsTab } from './settingsIndex';

export * from './settingsIndex';

const TAB_META: Record<SettingsTab, { icon: ReactNode; description: string }> = {
  general: {
    icon: <SettingOutlined />,
    description: 'Working hours, timezone, reminders, and job hunt thresholds.',
  },
  ai: {
    icon: <ApiOutlined />,
    description: 'Bring your own provider for cover letters, JD matching, and widgets.',
  },
  integrations: {
    icon: <CloudSyncOutlined />,
    description: 'Connect Google and sync a sheet into Applications or Events.',
  },
  security: {
    icon: <SafetyCertificateOutlined />,
    description: 'Active sessions, sign-in history, and account protection.',
  },
  organize: {
    icon: <AppstoreOutlined />,
    description: 'Categories, employment types, time off colours, and pipeline stages.',
  },
  navigation: {
    icon: <MenuOutlined />,
    description: 'Reorder the sidebar and choose what sits in the mobile toolbar.',
  },
};

export const SETTINGS_TABS = SETTINGS_TAB_KEYS.map((key) => ({
  key,
  label: TAB_LABELS[key],
  ...TAB_META[key],
}));

export const SECTION_ICONS = {
  aiProvider: <ApiOutlined />,
  availability: <CalendarOutlined />,
  reminders: <BellOutlined />,
  jobHunt: <RocketOutlined />,
  categories: <TagsOutlined />,
  employment: <AppstoreOutlined />,
  holiday: <CalendarOutlined />,
  stages: <RocketOutlined />,
};

export const SettingsSection = ({
  id,
  icon,
  title,
  description,
  actions,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) => (
  <section
    id={`settings-section-${id}`}
    // scroll-mt keeps the heading clear of the page header when search jumps here.
    className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    aria-labelledby={`settings-section-${id}-title`}
  >
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-3">
      <div className="min-w-0">
        <h2
          id={`settings-section-${id}-title`}
          className="flex items-center gap-2 text-base font-semibold text-slate-950"
        >
          <span className="text-slate-400">{icon}</span>
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
    {children}
  </section>
);

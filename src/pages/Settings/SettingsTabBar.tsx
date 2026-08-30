import type React from 'react';
import { Tooltip } from 'antd';
import { SETTINGS_TABS, type SettingsTab } from './settingsChrome';

type Props = {
  activeTab: SettingsTab;
  activeTabMeta: (typeof SETTINGS_TABS)[number] | undefined;
  dirtyTabs: SettingsTab[];
  setActiveTab: React.Dispatch<React.SetStateAction<SettingsTab>>;
};

const SettingsTabBar = ({ activeTab, activeTabMeta, dirtyTabs, setActiveTab }: Props) => (
  <div className="hidden md:block">
    <div
      className="grid grid-cols-6 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1"
      role="tablist"
      aria-label="Settings sections"
    >
      {SETTINGS_TABS.map((tab) => (
        <button
          key={tab.key}
          id={`settings-tab-${tab.key}`}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.key}
          aria-controls={`settings-panel-${tab.key}`}
          onClick={() => setActiveTab(tab.key)}
          className={`flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors ${
            activeTab === tab.key
              ? 'bg-white text-slate-950 shadow-sm'
              : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
          }`}
        >
          <span className={activeTab === tab.key ? 'text-blue-600' : 'text-slate-400'}>
            {tab.icon}
          </span>
          {tab.label}
          {/* The Save button is global, so a pending edit two tabs away is otherwise invisible. */}
          {dirtyTabs.includes(tab.key) && (
            <Tooltip title="Unsaved changes in this section">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
            </Tooltip>
          )}
        </button>
      ))}
    </div>
    <p className="mt-2 px-1 text-xs text-slate-500">{activeTabMeta?.description}</p>
  </div>
);

export default SettingsTabBar;

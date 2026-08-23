import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getUserSettings, updateUserSettings } from '../../api';
import type { UserSettings } from '../../types';
import { SaveOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import { Button, message } from 'antd';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { SettingsSkeleton } from '../../components/SkeletonLoader';
import EditableNumberInput from '../../components/EditableNumberInput';
import PageActionToolbar from '../../components/PageActionToolbar';
import ConfirmModal from '../../components/ConfirmModal';
import MobileSectionPicker from '../../components/MobileSectionPicker';
import SettingsSearch from './SettingsSearch';
import SettingsTabBar from './SettingsTabBar';
import SettingsLoadError from './SettingsLoadError';
import SettingsOrganizeTab from './SettingsOrganizeTab';
import { useEmploymentTypeEditor } from './useEmploymentTypeEditor';
import { useHolidayTabEditor } from './useHolidayTabEditor';
import { useAppStageEditor } from './useAppStageEditor';
import { useAiProviderSettings } from './useAiProviderSettings';
import { useAvailabilityRanges } from './useAvailabilityRanges';
import { useEventCategoryEditor } from './useEventCategoryEditor';
import { useColorConflicts } from './useColorConflicts';
import {
  SECTION_ICONS,
  SETTINGS_TABS,
  SettingsSection,
  findDirtyTabs,
  type SettingsTab,
} from './settingsChrome';
import AIProviderSection from './AIProviderSection';
import EventRemindersSection from './EventRemindersSection';
import AvailabilitySection from './AvailabilitySection';
import GoogleSheetsSettings from './GoogleSheetsSettings';
import SecurityDashboard from './SecurityDashboard';
import NavigationSettings from './NavigationSettings';
import { resolveSettings, type ReminderSettings } from '../../utils/eventReminders';
import { DEFAULT_APPLICATION_STAGES } from '../../constants/applicationStages';

dayjs.extend(customParseFormat);

const Settings: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const reminderSettings = resolveSettings(
    (settings?.notification_preferences as Record<string, unknown> | undefined)?.eventReminders
  );
  const patchReminders = (patch: Partial<ReminderSettings>) => {
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            notification_preferences: {
              ...(prev.notification_preferences || {}),
              eventReminders: { ...reminderSettings, ...patch },
            },
          }
        : prev
    );
    setIsDirty(true);
  };
  const [loading, setLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [dirtyTabs, setDirtyTabs] = useState<SettingsTab[]>([]);
  const [saving, setSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // Must stay below activeTab: reading it above throws a TDZ ReferenceError.
  const activeTabMeta = SETTINGS_TABS.find((tab) => tab.key === activeTab);

  // A search result has to both switch tab and land on the card. The panel only mounts after
  // the tab changes, so the scroll waits a frame for the section to exist.
  const jumpToSection = (tab: SettingsTab, sectionId: string) => {
    setActiveTab(tab);
    requestAnimationFrame(() => {
      document
        .getElementById(`settings-section-${sectionId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };
  const originalSettingsRef = useRef<string>('');

  const empTypeEditor = useEmploymentTypeEditor({ settings, setSettings });

  const holidayTabEditor = useHolidayTabEditor({ settings, setSettings });

  const appStageEditor = useAppStageEditor({ settings, setSettings });

  const categoryEditor = useEventCategoryEditor({ messageApi });
  const {
    categories,
    fetchCategories,
    deletingCategoryId,
    setDeletingCategoryId,
    confirmDeleteCategory,
  } = categoryEditor;

  const {
    expandedAvailabilityRange,
    setExpandedAvailabilityRange,
    addAvailabilityRange,
    removeAvailabilityRange,
    updateAvailabilityRange,
    toggleAvailabilityRangeDay,
    applyWorkDaysToAvailabilityRange,
    clearAvailabilityRangeDays,
    updateWorkDays,
  } = useAvailabilityRanges({ settings, setSettings });

  const {
    aiSettings,
    showAiApiKey,
    setShowAiApiKey,
    aiProviderCurl,
    setAiProviderCurl,
    aiSettingsDirty,
    syncAiSettings,
    updateAiSetting,
    applyAiProviderPreset,
    handleApplyAiProviderCurl,
    handleAiProviderCurlPaste,
    handleSaveAiSettings,
    handleClearAiSettings,
  } = useAiProviderSettings({ settings, setSettings, originalSettingsRef, messageApi });

  const fetchSettings = useCallback(async () => {
    try {
      const resp = await getUserSettings();
      const data = resp.data;
      if (!data.work_days || data.work_days.length === 0) {
        data.work_days = [0, 1, 2, 3, 4];
      }
      if (!data.work_time_ranges) {
        data.work_time_ranges = [];
      }

      if (!data.employment_types || data.employment_types.length === 0) {
        data.employment_types = [
          { value: 'full_time', label: 'Full-time', color: 'blue' },
          { value: 'part_time', label: 'Part-time', color: 'teal' },
          { value: 'internship', label: 'Internship', color: 'amber' },
          { value: 'contract', label: 'Contract', color: 'purple' },
          { value: 'freelance', label: 'Freelance', color: 'orange' },
        ];
      }

      if (!data.application_stages || data.application_stages.length === 0) {
        data.application_stages = DEFAULT_APPLICATION_STAGES.map((stage) => ({ ...stage }));
      }
      originalSettingsRef.current = JSON.stringify(data);
      setSettings(data);
      setExpandedAvailabilityRange(null);
      setIsLocked(Boolean(data.is_locked));
      syncAiSettings(data);
      setIsDirty(false);
    } catch (error) {
      messageApi.error('Failed to fetch settings');
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  }, [messageApi, syncAiSettings, setExpandedAvailabilityRange]);

  useEffect(() => {
    fetchSettings();
    fetchCategories();
  }, [fetchCategories, fetchSettings]);

  useEffect(() => {
    if (!settings || !originalSettingsRef.current) return;
    setIsDirty(JSON.stringify(settings) !== originalSettingsRef.current);
    setDirtyTabs(findDirtyTabs(settings, originalSettingsRef.current));
  }, [settings]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await updateUserSettings(settings);
      originalSettingsRef.current = JSON.stringify(settings);
      setIsDirty(false);
      messageApi.success('Settings saved');
      window.dispatchEvent(new CustomEvent('settings-saved', { detail: settings }));
    } catch (error) {
      messageApi.error('Failed to save settings');
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSettingsLock = async () => {
    if (!settings) return;
    const nextLocked = !isLocked;
    const nextSettings = { ...settings, is_locked: nextLocked };
    setIsLocked(nextLocked);
    setSettings(nextSettings);

    try {
      const response = await updateUserSettings({ is_locked: nextLocked });
      const savedSettings = { ...nextSettings, ...(response.data as Partial<UserSettings>) };
      setSettings(savedSettings);
      originalSettingsRef.current = JSON.stringify(savedSettings);
      setIsDirty(false);
      window.dispatchEvent(new CustomEvent('settings-saved', { detail: savedSettings }));
    } catch (error) {
      setIsLocked(!nextLocked);
      setSettings(settings);
      messageApi.error(nextLocked ? 'Failed to lock settings' : 'Failed to unlock settings');
      console.error('Error updating settings lock:', error);
    }
  };

  const { colorConflicts, renderClashNotice, freeColorSuggestion } = useColorConflicts({
    categories,
    settings,
  });

  if (loading) {
    return <SettingsSkeleton />;
  }

  if (!settings) {
    return (
      <>
        {contextHolder}
        <SettingsLoadError
          onRetry={() => {
            setLoading(true);
            void fetchSettings();
          }}
        />
      </>
    );
  }

  const categoryPendingDeletion = categories.find((category) => category.id === deletingCategoryId);

  return (
    <div className="relative mx-auto max-w-3xl space-y-6">
      {contextHolder}
      <ConfirmModal
        isOpen={deletingCategoryId !== null}
        title="Delete category?"
        message={`Delete ${categoryPendingDeletion?.name ? `“${categoryPendingDeletion.name}”` : 'this category'}? This action cannot be undone.`}
        confirmText="Delete category"
        type="danger"
        onConfirm={() => void confirmDeleteCategory()}
        onCancel={() => setDeletingCategoryId(null)}
      />

      <PageActionToolbar
        title="Settings"
        singleRowDesktop
        extraActions={
          <>
            <SettingsSearch onJump={jumpToSection} />
            <Button
              size="large"
              icon={isLocked ? <LockOutlined /> : <UnlockOutlined />}
              onClick={handleToggleSettingsLock}
              className="toolbar-btn"
            >
              {isLocked ? 'Locked' : 'Lock'}
            </Button>
            {activeTab !== 'ai' && activeTab !== 'integrations' && activeTab !== 'security' && (
              <Button
                size="large"
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                disabled={!isDirty || saving || isLocked}
                className="toolbar-btn"
              >
                {saving ? 'Saving…' : 'Save Settings'}
              </Button>
            )}
          </>
        }
      />

      <MobileSectionPicker
        id="settings-section"
        label="Settings section"
        value={activeTab}
        options={SETTINGS_TABS.map((tab) => ({ value: tab.key, label: tab.label }))}
        onChange={setActiveTab}
        className="md:hidden"
      />

      {/* Desktop tab bar */}
      <SettingsTabBar
        activeTab={activeTab}
        activeTabMeta={activeTabMeta}
        dirtyTabs={dirtyTabs}
        setActiveTab={setActiveTab}
      />

      <div
        id={`settings-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`settings-tab-${activeTab}`}
        className={`space-y-6 ${isLocked ? 'pointer-events-none select-none opacity-60' : ''}`}
      >
        {activeTab === 'general' && settings && (
          <AvailabilitySection
            addAvailabilityRange={addAvailabilityRange}
            applyWorkDaysToAvailabilityRange={applyWorkDaysToAvailabilityRange}
            categories={categories}
            clearAvailabilityRangeDays={clearAvailabilityRangeDays}
            expandedAvailabilityRange={expandedAvailabilityRange}
            removeAvailabilityRange={removeAvailabilityRange}
            setExpandedAvailabilityRange={setExpandedAvailabilityRange}
            setSettings={setSettings}
            settings={settings}
            toggleAvailabilityRangeDay={toggleAvailabilityRangeDay}
            updateAvailabilityRange={updateAvailabilityRange}
            updateWorkDays={updateWorkDays}
          />
        )}

        {activeTab === 'general' && (
          <EventRemindersSection
            patchReminders={patchReminders}
            reminderSettings={reminderSettings}
          />
        )}

        {activeTab === 'general' && (
          <SettingsSection
            id="job-hunt"
            icon={SECTION_ICONS.jobHunt}
            title="Job Hunt Settings"
            description="Thresholds the pipeline and analytics judge applications against."
          >
            <div>
              <label
                htmlFor="settings-ghosting-threshold"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Ghosting Threshold
              </label>
              <EditableNumberInput
                id="settings-ghosting-threshold"
                unit="days"
                min={1}
                ariaDescribedBy="settings-ghosting-threshold-help"
                value={settings.ghosting_threshold_days || 30}
                fallbackValue={30}
                onCommit={(value) =>
                  setSettings((prev) => (prev ? { ...prev, ghosting_threshold_days: value } : null))
                }
              />
              <p id="settings-ghosting-threshold-help" className="text-xs text-gray-500 mt-1">
                Applications still marked "Applied" this many days after their Date Applied will
                automatically be marked as "Ghosted".
              </p>
            </div>
          </SettingsSection>
        )}

        {activeTab === 'ai' && (
          <AIProviderSection
            aiSettings={aiSettings}
            aiSettingsDirty={aiSettingsDirty}
            aiProviderCurl={aiProviderCurl}
            setAiProviderCurl={setAiProviderCurl}
            showAiApiKey={showAiApiKey}
            setShowAiApiKey={setShowAiApiKey}
            updateAiSetting={updateAiSetting}
            applyAiProviderPreset={applyAiProviderPreset}
            handleApplyAiProviderCurl={handleApplyAiProviderCurl}
            handleAiProviderCurlPaste={handleAiProviderCurlPaste}
            handleSaveAiSettings={handleSaveAiSettings}
            handleClearAiSettings={handleClearAiSettings}
          />
        )}

        {/* These two own their own cards and save inline, so they are wrapped only with an
            anchor the search can scroll to. */}
        {activeTab === 'integrations' && (
          <div id="settings-section-integrations" className="scroll-mt-24">
            <GoogleSheetsSettings />
          </div>
        )}

        {activeTab === 'security' && (
          <div id="settings-section-security" className="scroll-mt-24">
            <SecurityDashboard />
          </div>
        )}

        {/* Category Manager */}
        {activeTab === 'organize' && (
          <SettingsOrganizeTab
            categoryEditor={categoryEditor}
            empTypeEditor={empTypeEditor}
            holidayTabEditor={holidayTabEditor}
            appStageEditor={appStageEditor}
            isLocked={isLocked}
            messageApi={messageApi}
            settings={settings}
            setSettings={setSettings}
            colorConflicts={colorConflicts}
            renderClashNotice={renderClashNotice}
            freeColorSuggestion={freeColorSuggestion}
          />
        )}

        {activeTab === 'navigation' && (
          <div id="settings-section-navigation" className="scroll-mt-24">
            <NavigationSettings
              hiddenNavItems={settings.hidden_nav_items}
              onHiddenNavItemsChange={(hiddenNavItems) =>
                setSettings((prev) => (prev ? { ...prev, hidden_nav_items: hiddenNavItems } : prev))
              }
              navItemOrder={settings.nav_item_order}
              onNavItemOrderChange={(navItemOrder) =>
                setSettings((prev) => (prev ? { ...prev, nav_item_order: navItemOrder } : prev))
              }
              mobileToolbarItems={settings.mobile_toolbar_items}
              onMobileToolbarItemsChange={(mobileToolbarItems) =>
                setSettings((prev) =>
                  prev ? { ...prev, mobile_toolbar_items: mobileToolbarItems } : prev
                )
              }
              navItemLabels={settings.nav_item_labels}
              onNavItemLabelsChange={(navItemLabels) =>
                setSettings((prev) => (prev ? { ...prev, nav_item_labels: navItemLabels } : prev))
              }
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;

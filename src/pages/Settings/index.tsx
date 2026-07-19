import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  getUserSettings,
  updateUserSettings,
  getCategories,
  createCategory,
  updateCategory,
  patchCategory,
  deleteCategory,
} from '../../api';
import type { EventCategory, UserSettings, EmploymentType, HolidayTab } from '../../types';
import {
  ApiOutlined,
  SaveOutlined,
  PlusOutlined,
  CloseOutlined,
  LockOutlined,
  UnlockOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { Button, message } from 'antd';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import IconPicker from '../../components/IconPicker';
import CategoryBadge from '../../components/CategoryBadge';
import ColorSwatchPicker from '../../components/ColorSwatchPicker';
import { SettingsSkeleton } from '../../components/SkeletonLoader';
import EditableNumberInput from '../../components/EditableNumberInput';
import FriendlyTimeInput from '../../components/FriendlyTimeInput';
import PageActionToolbar from '../../components/PageActionToolbar';
import { PageState } from '../../components/PageState';
import LockableListItem from '../../components/LockableListItem';
import ConfirmModal from '../../components/ConfirmModal';
import MobileSectionPicker from '../../components/MobileSectionPicker';
import {
  buildAIProviderSettingsPatch,
  getAIProviderSettingsFromUserSettings,
  type AIProviderSettings,
} from '../../lib/llmSettings';
import GoogleSheetsSettings from './GoogleSheetsSettings';
import SecurityDashboard from './SecurityDashboard';
import MobileToolbarSettings from './MobileToolbarSettings';
import { TIMEZONE_OPTIONS, normalizeTimeZone } from '../../lib/timezones';
import { DEFAULT_HOLIDAY_TAB_COLOR, getHolidayTabColor } from '../../utils/holidayTabColors';
import {
  DEFAULT_PALETTE_COLOR,
  getPaletteColor,
  getPaletteColorFromTone,
  getToneForPaletteColor,
} from '../../utils/colorPalette';
import { DEFAULT_APPLICATION_STAGES } from '../../constants/applicationStages';

dayjs.extend(customParseFormat);

type ApplicationStage = NonNullable<UserSettings['application_stages']>[number];
type AvailabilityTimeRange = UserSettings['work_time_ranges'][number];

const WORK_DAY_OPTIONS = [
  { val: 0, label: 'Mon' },
  { val: 1, label: 'Tue' },
  { val: 2, label: 'Wed' },
  { val: 3, label: 'Thu' },
  { val: 4, label: 'Fri' },
  { val: 5, label: 'Sat' },
  { val: 6, label: 'Sun' },
];

const SETTINGS_TABS = [
  { key: 'general', label: 'General' },
  { key: 'ai', label: 'AI Provider' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'security', label: 'Security' },
  { key: 'organize', label: 'Organize' },
  { key: 'navigation', label: 'Navigation' },
] as const;

type SettingsTab = (typeof SETTINGS_TABS)[number]['key'];

const summarizeSelectedDays = (days: number[]) => {
  const sortedDays = [...new Set(days)].sort((a, b) => a - b);
  if (sortedDays.length === 0) return 'No days';

  const segments: number[][] = [];
  sortedDays.forEach((day) => {
    const currentSegment = segments[segments.length - 1];
    if (currentSegment && day === currentSegment[currentSegment.length - 1] + 1) {
      currentSegment.push(day);
    } else {
      segments.push([day]);
    }
  });

  return segments
    .map((segment) => {
      const startLabel = WORK_DAY_OPTIONS.find((day) => day.val === segment[0])?.label;
      const endLabel = WORK_DAY_OPTIONS.find(
        (day) => day.val === segment[segment.length - 1]
      )?.label;

      if (!startLabel) return '';
      if (segment.length === 1 || !endLabel) return startLabel;
      return `${startLabel}-${endLabel}`;
    })
    .filter(Boolean)
    .join(', ');
};

const unquoteShellValue = (value: string) => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const parseAIProviderCurl = (curlText: string) => {
  const normalized = curlText
    .replace(/\\\s*\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const urlMatch = normalized.match(/curl\s+(?:-[A-Za-z]\s+\S+\s+)*(['"]?)(https?:\/\/[^\s'"]+)\1/);
  const authMatch = normalized.match(/authorization:\s*bearer\s+([^'"\s]+)/i);
  const dataMatch = normalized.match(/(?:--data(?:-raw)?|-d)\s+('(?:\\'|[^'])*'|"(?:\\"|[^"])*")/i);

  let model = '';
  if (dataMatch?.[1]) {
    try {
      const payload = JSON.parse(unquoteShellValue(dataMatch[1]));
      if (typeof payload.model === 'string') {
        model = payload.model;
      }
    } catch {
      /* ignore malformed curl body */
    }
  }

  return {
    endpoint: urlMatch?.[2] || '',
    apiKey: authMatch?.[1]?.startsWith('$') ? '' : authMatch?.[1] || '',
    model,
  };
};

const maskedProviderKey = (settings: AIProviderSettings) => {
  const enteredKey = settings.apiKey.trim();
  if (enteredKey) {
    if (enteredKey.length <= 4) {
      return '•'.repeat(enteredKey.length);
    }
    return '••••••••' + enteredKey.slice(-4);
  }
  if (settings.apiKeyConfigured) return settings.apiKeyMasked || '<stored encrypted key>';
  return '<provider key>';
};

const chatMessagesPreview = '[{"role":"user","content":"Hello"}]';

const buildAIProviderCurlPreview = (settings: AIProviderSettings) => {
  const endpoint = settings.endpoint.trim() || '<endpoint>';
  const model = settings.model.trim() || '<model>';
  const key = maskedProviderKey(settings);

  if (settings.adapter === 'gemini') {
    const baseEndpoint = endpoint.endsWith(':generateContent')
      ? endpoint
      : `${endpoint.replace(/\/$/, '')}/models/${encodeURIComponent(model)}:generateContent`;
    return `curl '${baseEndpoint}' \\
  -H 'Content-Type: application/json' \\
  -H 'x-goog-api-key: ${key}' \\
  -d '{"contents":[{"role":"user","parts":[{"text":"Hello"}]}],"generationConfig":{"temperature":0.2}}'`;
  }

  if (settings.adapter === 'claude') {
    const baseEndpoint = endpoint.endsWith('/v1/messages')
      ? endpoint
      : endpoint.endsWith('/v1')
        ? `${endpoint}/messages`
        : `${endpoint.replace(/\/$/, '')}/v1/messages`;
    return `curl '${baseEndpoint}' \\
  -H 'Content-Type: application/json' \\
  -H 'x-api-key: ${key}' \\
  -H 'anthropic-version: 2023-06-01' \\
  -d '{"model":"${model}","max_tokens":4096,"messages":${chatMessagesPreview},"temperature":0.2}'`;
  }

  const extraHeaders =
    settings.adapter === 'openrouter'
      ? ` \\
  -H 'HTTP-Referer: https://careerhub.local' \\
  -H 'X-OpenRouter-Title: CareerHub'`
      : '';

  return `curl '${endpoint}' \\
  -H 'Authorization: Bearer ${key}' \\
  -H 'Content-Type: application/json'${extraHeaders} \\
  -d '{"model":"${model}","messages":${chatMessagesPreview},"temperature":0.2}'`;
};

const Settings: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [isCategoriesLocked, setIsCategoriesLocked] = useState(false);
  const [isEmpTypesLocked, setIsEmpTypesLocked] = useState(false);
  const [isHolidayTabsLocked, setIsHolidayTabsLocked] = useState(false);
  const [aiSettings, setAiSettings] = useState<AIProviderSettings>(() =>
    getAIProviderSettingsFromUserSettings(null)
  );
  const [savedAiSettings, setSavedAiSettings] = useState<AIProviderSettings>(() =>
    getAIProviderSettingsFromUserSettings(null)
  );
  const [aiApiKeyChanged, setAiApiKeyChanged] = useState(false);
  const [showAiApiKey, setShowAiApiKey] = useState(false);
  const [aiProviderCurl, setAiProviderCurl] = useState('');
  const originalSettingsRef = useRef<string>('');

  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(
    getPaletteColor(DEFAULT_PALETTE_COLOR).dot
  );
  const [newCategoryIcon, setNewCategoryIcon] = useState('tag');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EventCategory | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);

  const DEFAULT_EMP_TYPES: EmploymentType[] = [
    { value: 'full_time', label: 'Full-time', color: 'blue' },
    { value: 'part_time', label: 'Part-time', color: 'teal' },
    { value: 'internship', label: 'Internship', color: 'amber' },
    { value: 'contract', label: 'Contract', color: 'purple' },
    { value: 'freelance', label: 'Freelance', color: 'orange' },
  ];
  const [isAddingEmpType, setIsAddingEmpType] = useState(false);
  const [editingEmpType, setEditingEmpType] = useState<EmploymentType | null>(null);
  const [newEmpLabel, setNewEmpLabel] = useState('');
  const [newEmpColor, setNewEmpColor] = useState(DEFAULT_PALETTE_COLOR);

  const getEmpTypes = (): EmploymentType[] =>
    settings?.employment_types && settings.employment_types.length > 0
      ? settings.employment_types
      : DEFAULT_EMP_TYPES;

  const toSlug = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

  const handleSaveEmpType = () => {
    if (!newEmpLabel.trim() || !settings) return;
    const current = getEmpTypes();
    if (editingEmpType) {
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              employment_types: current.map((t) =>
                t.value === editingEmpType.value
                  ? { ...t, label: newEmpLabel, color: newEmpColor }
                  : t
              ),
            }
          : null
      );
    } else {
      const value = toSlug(newEmpLabel);
      if (current.some((t) => t.value === value)) return;
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              employment_types: [...current, { value, label: newEmpLabel, color: newEmpColor }],
            }
          : null
      );
    }
    setIsAddingEmpType(false);
    setEditingEmpType(null);
    setNewEmpLabel('');
    setNewEmpColor(DEFAULT_PALETTE_COLOR);
  };

  const handleEditEmpType = (t: EmploymentType) => {
    setEditingEmpType(t);
    setNewEmpLabel(t.label);
    setNewEmpColor(t.color);
    setIsAddingEmpType(true);
  };

  const handleDeleteEmpType = (value: string) => {
    const current = getEmpTypes();
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            employment_types: current.filter((t) => t.value !== value),
          }
        : null
    );
  };

  const handleCancelEmpType = () => {
    setIsAddingEmpType(false);
    setEditingEmpType(null);
    setNewEmpLabel('');
    setNewEmpColor(DEFAULT_PALETTE_COLOR);
  };

  const [isAddingHolidayTab, setIsAddingHolidayTab] = useState(false);
  const [editingHolidayTab, setEditingHolidayTab] = useState<HolidayTab | null>(null);
  const [newTabName, setNewTabName] = useState('');
  const [newTabColor, setNewTabColor] = useState(DEFAULT_HOLIDAY_TAB_COLOR);

  const getHolidayTabs = (): HolidayTab[] => settings?.holiday_tabs || [];

  const toTabId = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

  const handleSaveHolidayTab = () => {
    if (!newTabName.trim() || !settings) return;
    const current = getHolidayTabs();
    if (editingHolidayTab) {
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              holiday_tabs: current.map((t) =>
                t.id === editingHolidayTab.id ? { ...t, name: newTabName, color: newTabColor } : t
              ),
            }
          : null
      );
    } else {
      const id = toTabId(newTabName);
      if (current.some((t) => t.id === id)) return;
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              holiday_tabs: [...current, { id, name: newTabName, color: newTabColor }],
            }
          : null
      );
    }
    setIsAddingHolidayTab(false);
    setEditingHolidayTab(null);
    setNewTabName('');
    setNewTabColor(DEFAULT_HOLIDAY_TAB_COLOR);
  };

  const handleEditHolidayTab = (t: HolidayTab) => {
    setEditingHolidayTab(t);
    setNewTabName(t.name);
    setNewTabColor(t.color || DEFAULT_HOLIDAY_TAB_COLOR);
    setIsAddingHolidayTab(true);
  };

  const handleDeleteHolidayTab = (id: string) => {
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            holiday_tabs: getHolidayTabs().filter((t) => t.id !== id),
          }
        : null
    );
  };

  const handleCancelHolidayTab = () => {
    setIsAddingHolidayTab(false);
    setEditingHolidayTab(null);
    setNewTabName('');
    setNewTabColor(DEFAULT_HOLIDAY_TAB_COLOR);
  };

  const [isAppStagesLocked, setIsAppStagesLocked] = useState(true);
  const [isAddingAppStage, setIsAddingAppStage] = useState(false);
  const [editingAppStage, setEditingAppStage] = useState<ApplicationStage | null>(null);
  const [newAppStageLabel, setNewAppStageLabel] = useState('');
  const [newAppStageShortLabel, setNewAppStageShortLabel] = useState('');
  const [newAppStageTone, setNewAppStageTone] = useState(
    getToneForPaletteColor(DEFAULT_PALETTE_COLOR)
  );

  const getAppStages = (): ApplicationStage[] => settings?.application_stages || [];

  const handleSaveAppStage = () => {
    if (!newAppStageLabel.trim() || !newAppStageShortLabel.trim() || !settings) return;
    const current = getAppStages();
    if (editingAppStage) {
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              application_stages: current.map((t) =>
                t.key === editingAppStage.key
                  ? {
                      ...t,
                      label: newAppStageLabel,
                      shortLabel: newAppStageShortLabel,
                      tone: newAppStageTone,
                    }
                  : t
              ),
            }
          : null
      );
    } else {
      const key = newAppStageLabel
        .toUpperCase()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^A-Z0-9_]/g, '');
      if (current.some((t) => t.key === key)) return;
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              application_stages: [
                ...current,
                {
                  key,
                  label: newAppStageLabel,
                  shortLabel: newAppStageShortLabel,
                  tone: newAppStageTone,
                },
              ],
            }
          : null
      );
    }
    setIsAddingAppStage(false);
    setEditingAppStage(null);
    setNewAppStageLabel('');
    setNewAppStageShortLabel('');
    setNewAppStageTone(getToneForPaletteColor(DEFAULT_PALETTE_COLOR));
  };

  const handleEditAppStage = (t: ApplicationStage) => {
    setEditingAppStage(t);
    setNewAppStageLabel(t.label);
    setNewAppStageShortLabel(t.shortLabel);
    setNewAppStageTone(t.tone);
    setIsAddingAppStage(true);
  };

  const handleDeleteAppStage = (key: string) => {
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            application_stages: getAppStages().filter((t) => t.key !== key),
          }
        : null
    );
  };

  const handleCancelAppStage = () => {
    setIsAddingAppStage(false);
    setEditingAppStage(null);
    setNewAppStageLabel('');
    setNewAppStageShortLabel('');
    setNewAppStageTone(getToneForPaletteColor(DEFAULT_PALETTE_COLOR));
  };

  const syncAiSettings = useCallback((nextSettings: Partial<UserSettings> | null | undefined) => {
    const normalized = getAIProviderSettingsFromUserSettings(nextSettings);
    setAiSettings(normalized);
    setSavedAiSettings(normalized);
    setAiApiKeyChanged(false);
    setShowAiApiKey(false);
  }, []);

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
      setIsLocked(Boolean(data.is_locked));
      syncAiSettings(data);
      setIsDirty(false);
    } catch (error) {
      messageApi.error('Failed to fetch settings');
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  }, [messageApi, syncAiSettings]);

  const fetchCategories = useCallback(async () => {
    try {
      const resp = await getCategories();
      setCategories(resp.data);
    } catch (error) {
      messageApi.error('Failed to fetch categories');
      console.error('Error fetching categories:', error);
    }
  }, [messageApi]);

  useEffect(() => {
    fetchSettings();
    fetchCategories();
  }, [fetchCategories, fetchSettings]);

  useEffect(() => {
    if (!settings || !originalSettingsRef.current) return;
    setIsDirty(JSON.stringify(settings) !== originalSettingsRef.current);
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

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: newCategoryName,
          color: newCategoryColor,
          icon: newCategoryIcon,
        });
        messageApi.success('Category updated');
      } else {
        await createCategory({
          name: newCategoryName,
          color: newCategoryColor,
          icon: newCategoryIcon,
        });
        messageApi.success('Category created');
      }

      setNewCategoryName('');
      setNewCategoryColor(getPaletteColor(DEFAULT_PALETTE_COLOR).dot);
      setNewCategoryIcon('tag');
      setIsAddingCategory(false);
      setEditingCategory(null);
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      messageApi.error('Failed to save category');
      console.error('Error saving category:', error);
    }
  };

  const handleEditCategory = (cat: EventCategory) => {
    setEditingCategory(cat);
    setNewCategoryName(cat.name);
    setNewCategoryColor(cat.color);
    setNewCategoryIcon(cat.icon || 'tag');
    setIsAddingCategory(true);
  };

  const handleCancelEdit = () => {
    setIsAddingCategory(false);
    setEditingCategory(null);
    setNewCategoryName('');
    setNewCategoryColor(getPaletteColor(DEFAULT_PALETTE_COLOR).dot);
    setNewCategoryIcon('tag');
  };

  const handleDeleteCategory = (id: number) => {
    setDeletingCategoryId(id);
  };

  const aiSettingsDirty =
    aiSettings.adapter !== savedAiSettings.adapter ||
    aiSettings.endpoint.trim() !== savedAiSettings.endpoint.trim() ||
    aiSettings.model.trim() !== savedAiSettings.model.trim() ||
    aiApiKeyChanged;

  const mergeAiSettingsIntoSettings = (nextAiSettings: Partial<UserSettings>) => {
    setSettings((prev) => (prev ? { ...prev, ...nextAiSettings } : prev));
  };

  const mergeAiSettingsIntoOriginalRef = (nextAiSettings: Partial<UserSettings>) => {
    if (!originalSettingsRef.current) return;
    try {
      const parsed = JSON.parse(originalSettingsRef.current) as UserSettings;
      originalSettingsRef.current = JSON.stringify({ ...parsed, ...nextAiSettings });
    } catch (error) {
      console.error('Failed to sync AI settings snapshot', error);
    }
  };

  const updateAiSetting = (field: keyof AIProviderSettings, value: string) => {
    if (field === 'apiKey') {
      setAiApiKeyChanged(true);
    }
    setAiSettings((prev) => ({ ...prev, [field]: value }));
  };

  const applyAiProviderPreset = (adapter: AIProviderSettings['adapter']) => {
    const presets: Record<AIProviderSettings['adapter'], { endpoint: string; model: string }> = {
      claude: {
        endpoint: 'https://api.anthropic.com',
        model: 'claude-sonnet-4-20250514',
      },
      gemini: {
        endpoint: 'https://generativelanguage.googleapis.com/v1beta',
        model: 'gemini-3-flash-preview',
      },
      openai: {
        endpoint: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o-mini',
      },
      openrouter: {
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        model: 'openai/gpt-5.2',
      },
      custom: {
        endpoint: 'https://api.mistral.ai/v1/chat/completions',
        model: 'mistral-medium-latest',
      },
    };
    const preset = presets[adapter];
    setAiSettings((prev) => ({
      ...prev,
      adapter,
      endpoint: preset.endpoint,
      model: preset.model,
    }));
  };

  const applyParsedAiProviderCurl = (curlText: string, successMessage?: string) => {
    const parsed = parseAIProviderCurl(curlText);
    if (!parsed.endpoint && !parsed.model && !parsed.apiKey) {
      return false;
    }
    setAiSettings((prev) => ({
      ...prev,
      adapter: 'custom',
      endpoint: parsed.endpoint || prev.endpoint,
      model: parsed.model || prev.model,
      apiKey: parsed.apiKey || prev.apiKey,
    }));
    if (parsed.apiKey) {
      setAiApiKeyChanged(true);
    }
    if (successMessage) {
      messageApi.success(successMessage);
    }
    return true;
  };

  const handleApplyAiProviderCurl = () => {
    const applied = applyParsedAiProviderCurl(aiProviderCurl, 'Curl parsed into a custom provider');
    if (!applied) {
      messageApi.error('Could not parse endpoint, model, or Bearer key from that curl command');
    }
  };

  const handleAiProviderCurlPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = event.clipboardData.getData('text');
    if (!pastedText.trim()) return;
    window.setTimeout(() => {
      applyParsedAiProviderCurl(pastedText, 'Curl pasted and fields filled');
    }, 0);
  };

  const handleSaveAiSettings = async () => {
    try {
      const response = await updateUserSettings(
        buildAIProviderSettingsPatch(aiSettings, aiApiKeyChanged)
      );
      const nextSettings = response.data as UserSettings;
      mergeAiSettingsIntoSettings({
        ai_provider_adapter: nextSettings.ai_provider_adapter,
        ai_provider_endpoint: nextSettings.ai_provider_endpoint,
        ai_provider_model: nextSettings.ai_provider_model,
        ai_provider_api_key_configured: nextSettings.ai_provider_api_key_configured,
        ai_provider_api_key_masked: nextSettings.ai_provider_api_key_masked,
        updated_at: nextSettings.updated_at,
      });
      mergeAiSettingsIntoOriginalRef({
        ai_provider_adapter: nextSettings.ai_provider_adapter,
        ai_provider_endpoint: nextSettings.ai_provider_endpoint,
        ai_provider_model: nextSettings.ai_provider_model,
        ai_provider_api_key_configured: nextSettings.ai_provider_api_key_configured,
        ai_provider_api_key_masked: nextSettings.ai_provider_api_key_masked,
        updated_at: nextSettings.updated_at,
      });
      syncAiSettings(nextSettings);
      messageApi.success(
        nextSettings.ai_provider_api_key_configured
          ? 'AI provider saved with an encrypted server-side key.'
          : 'AI provider preset saved. Add an API key to enable AI features.'
      );
    } catch (error) {
      messageApi.error('Failed to save AI provider');
      console.error('Error saving AI provider:', error);
    }
  };

  const handleClearAiSettings = async () => {
    try {
      const response = await updateUserSettings({ ai_provider_api_key: '' });
      const nextSettings = response.data as UserSettings;
      mergeAiSettingsIntoSettings({
        ai_provider_api_key_configured: nextSettings.ai_provider_api_key_configured,
        ai_provider_api_key_masked: nextSettings.ai_provider_api_key_masked,
        updated_at: nextSettings.updated_at,
      });
      mergeAiSettingsIntoOriginalRef({
        ai_provider_api_key_configured: nextSettings.ai_provider_api_key_configured,
        ai_provider_api_key_masked: nextSettings.ai_provider_api_key_masked,
        updated_at: nextSettings.updated_at,
      });
      syncAiSettings(nextSettings);
      messageApi.success('Stored AI key cleared from the server.');
    } catch (error) {
      messageApi.error('Failed to clear AI key');
      console.error('Error clearing AI key:', error);
    }
  };

  const confirmDeleteCategory = async () => {
    if (deletingCategoryId === null) return;
    try {
      await deleteCategory(deletingCategoryId);
      fetchCategories();
      messageApi.success('Category deleted');
      setDeletingCategoryId(null);
    } catch (error) {
      messageApi.error('Failed to delete category');
      setDeletingCategoryId(null);
      console.error('Error deleting category:', error);
    }
  };

  const addAvailabilityRange = () => {
    if (!settings) return;
    const ranges = settings.work_time_ranges || [];
    const days = settings.work_days?.length ? settings.work_days : [0, 1, 2, 3, 4];
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            work_time_ranges: [...ranges, { start: '09:00:00', end: '17:00:00', days }],
          }
        : null
    );
  };

  const updateAvailabilityRange = (idx: number, patch: Partial<AvailabilityTimeRange>) => {
    if (!settings) return;
    const updated = [...settings.work_time_ranges];
    updated[idx] = { ...updated[idx], ...patch };
    setSettings((prev) => (prev ? { ...prev, work_time_ranges: updated } : null));
  };

  const toggleAvailabilityRangeDay = (range: AvailabilityTimeRange, idx: number, day: number) => {
    if (!settings) return;
    const enabledDays = settings.work_days ?? [];
    if (!enabledDays.includes(day)) return;

    const selectedDays = (range.days ?? enabledDays).filter((item) => enabledDays.includes(item));
    const nextDays = selectedDays.includes(day)
      ? selectedDays.filter((item) => item !== day)
      : [...selectedDays, day].sort();
    updateAvailabilityRange(idx, { days: nextDays });
  };

  const applyWorkDaysToAvailabilityRange = (idx: number) => {
    if (!settings) return;
    updateAvailabilityRange(idx, { days: [...(settings.work_days || [])].sort() });
  };

  const clearAvailabilityRangeDays = (idx: number) => {
    updateAvailabilityRange(idx, { days: [] });
  };

  const updateWorkDays = (nextDays: number[]) => {
    setSettings((prev) => {
      if (!prev) return null;
      const currentDays = prev.work_days || [];

      return {
        ...prev,
        work_days: nextDays,
        work_time_ranges: (prev.work_time_ranges || []).map((range) => {
          const rangeDays = (range.days ?? currentDays).filter((day) => nextDays.includes(day));
          return { ...range, days: rangeDays };
        }),
      };
    });
  };

  if (loading) {
    return <SettingsSkeleton />;
  }

  if (!settings) {
    return (
      <>
        {contextHolder}
        <PageState
          tone="error"
          title="Settings could not be loaded"
          description="No settings were changed. Check your connection and try loading them again."
          actionLabel="Retry loading settings"
          onAction={() => {
            setLoading(true);
            void fetchSettings();
          }}
          className="mt-12"
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
              className={`min-h-11 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div
        id={`settings-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`settings-tab-${activeTab}`}
        className={`space-y-6 ${isLocked ? 'pointer-events-none select-none opacity-60' : ''}`}
      >
        {activeTab === 'general' && (
          <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="border-b border-slate-200 pb-3 text-lg font-semibold text-slate-950">
              Availability
            </h2>

            {/* Work Days */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Work Days</label>
              <div className="flex flex-wrap gap-2">
                {WORK_DAY_OPTIONS.map((day) => {
                  const isSelected = (settings.work_days || []).includes(day.val);
                  return (
                    <button
                      key={day.val}
                      type="button"
                      onClick={() => {
                        const currentDays = settings.work_days || [];
                        const newDays = isSelected
                          ? currentDays.filter((d: number) => d !== day.val)
                          : [...currentDays, day.val].sort();
                        updateWorkDays(newDays);
                      }}
                      className={`min-h-11 min-w-11 rounded-lg border px-3 text-sm font-medium transition-colors ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                      aria-pressed={isSelected}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Work Hours */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-gray-700">
                  Available Time Ranges
                </label>
                <button
                  type="button"
                  onClick={addAvailabilityRange}
                  className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50"
                >
                  <PlusOutlined /> Add Range
                </button>
              </div>

              {(settings.work_time_ranges?.length ?? 0) === 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Start</label>
                    <FriendlyTimeInput
                      className="w-full text-base py-1.5 rounded-lg border-gray-300 hover:border-blue-500 focus:border-blue-500"
                      value={
                        settings.work_start_time
                          ? dayjs(settings.work_start_time, 'HH:mm:ss')
                          : dayjs('09:00:00', 'HH:mm:ss')
                      }
                      onChange={(time) => {
                        if (time)
                          setSettings((prev) =>
                            prev ? { ...prev, work_start_time: time.format('HH:mm:ss') } : null
                          );
                      }}
                      minuteStep={1}
                      allowClear={false}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">End</label>
                    <FriendlyTimeInput
                      className="w-full text-base py-1.5 rounded-lg border-gray-300 hover:border-blue-500 focus:border-blue-500"
                      value={
                        settings.work_end_time
                          ? dayjs(settings.work_end_time, 'HH:mm:ss')
                          : dayjs('17:00:00', 'HH:mm:ss')
                      }
                      onChange={(time) => {
                        if (time)
                          setSettings((prev) =>
                            prev ? { ...prev, work_end_time: time.format('HH:mm:ss') } : null
                          );
                      }}
                      minuteStep={1}
                      allowClear={false}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {settings.work_time_ranges.map((range, idx) => {
                    const enabledDays = settings.work_days || [];
                    const selectedDays = (range.days ?? enabledDays).filter((day) =>
                      enabledDays.includes(day)
                    );
                    return (
                      <div
                        key={idx}
                        className="rounded-lg border border-gray-200 bg-white p-4 space-y-3 transition hover:border-gray-300"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                              Range {idx + 1}
                            </div>
                            <div className="mt-0.5 text-sm font-medium text-gray-800">
                              {summarizeSelectedDays(selectedDays)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = settings.work_time_ranges.filter((_, i) => i !== idx);
                              setSettings((prev) =>
                                prev ? { ...prev, work_time_ranges: updated } : null
                              );
                            }}
                            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl p-2 text-gray-400 transition hover:bg-gray-50 hover:text-red-500 active:scale-[0.98] sm:min-h-9 sm:min-w-9 sm:rounded-lg"
                            aria-label="Remove availability range"
                          >
                            <CloseOutlined />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                          <div className="flex-1">
                            {idx === 0 && (
                              <label className="block text-xs text-gray-500 mb-1">Start</label>
                            )}
                            <FriendlyTimeInput
                              className="w-full text-base py-1.5 rounded-lg border-gray-300 hover:border-blue-500 focus:border-blue-500"
                              value={
                                range.start
                                  ? dayjs(range.start, 'HH:mm:ss')
                                  : dayjs('09:00:00', 'HH:mm:ss')
                              }
                              onChange={(time) => {
                                if (time) {
                                  updateAvailabilityRange(idx, {
                                    start: time.format('HH:mm:ss'),
                                  });
                                }
                              }}
                              minuteStep={1}
                              allowClear={false}
                            />
                          </div>
                          <span
                            className={`hidden text-gray-400 sm:block ${idx === 0 ? 'mt-5' : ''}`}
                          >
                            –
                          </span>
                          <div className="flex-1">
                            {idx === 0 && (
                              <label className="block text-xs text-gray-500 mb-1">End</label>
                            )}
                            <FriendlyTimeInput
                              className="w-full text-base py-1.5 rounded-lg border-gray-300 hover:border-blue-500 focus:border-blue-500"
                              value={
                                range.end
                                  ? dayjs(range.end, 'HH:mm:ss')
                                  : dayjs('17:00:00', 'HH:mm:ss')
                              }
                              onChange={(time) => {
                                if (time) {
                                  updateAvailabilityRange(idx, {
                                    end: time.format('HH:mm:ss'),
                                  });
                                }
                              }}
                              minuteStep={1}
                              allowClear={false}
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="mr-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                            Apply to
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {WORK_DAY_OPTIONS.map((day) => {
                              const isEnabledWorkDay = enabledDays.includes(day.val);
                              const isSelected = selectedDays.includes(day.val);
                              return (
                                <button
                                  key={day.val}
                                  type="button"
                                  disabled={!isEnabledWorkDay}
                                  onClick={() => toggleAvailabilityRangeDay(range, idx, day.val)}
                                  className={`min-h-11 min-w-12 rounded-xl border px-2.5 py-1 text-xs font-medium transition active:scale-[0.98] sm:min-h-8 sm:rounded-md ${
                                    isSelected
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : isEnabledWorkDay
                                        ? 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                        : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                                  }`}
                                  title={
                                    isEnabledWorkDay ? undefined : 'Enable this day in Work Days'
                                  }
                                >
                                  {day.label}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex gap-2 sm:ml-auto">
                            <button
                              type="button"
                              onClick={() => applyWorkDaysToAvailabilityRange(idx)}
                              className="min-h-11 rounded-xl border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50 active:scale-[0.98] sm:min-h-8 sm:rounded-md"
                            >
                              Use work days
                            </button>
                            <button
                              type="button"
                              onClick={() => clearAvailabilityRangeDays(idx)}
                              className="min-h-11 rounded-xl border border-gray-200 px-3 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-50 active:scale-[0.98] sm:min-h-8 sm:rounded-md"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Event Duration (minutes)
              </label>
              <EditableNumberInput
                min={15}
                step={15}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                value={settings.default_event_duration || 60}
                fallbackValue={60}
                onCommit={(value) =>
                  setSettings((prev) => (prev ? { ...prev, default_event_duration: value } : null))
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Event Category
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={settings.default_event_category || ''}
                onChange={(e) =>
                  setSettings((prev) =>
                    prev
                      ? {
                          ...prev,
                          default_event_category: e.target.value ? Number(e.target.value) : null,
                        }
                      : null
                  )
                }
              >
                <option value="">No Default Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buffer Time (minutes)
              </label>
              <EditableNumberInput
                min={0}
                step={5}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                value={settings.buffer_time || 0}
                fallbackValue={0}
                onCommit={(value) =>
                  setSettings((prev) => (prev ? { ...prev, buffer_time: value } : null))
                }
              />
              <p className="text-xs text-gray-500 mt-1">Time buffer between events</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Timezone
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={normalizeTimeZone(settings.primary_timezone)}
                onChange={(e) =>
                  setSettings((prev) =>
                    prev ? { ...prev, primary_timezone: e.target.value } : null
                  )
                }
              >
                {TIMEZONE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2 pt-4">
              Job Hunt Settings
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ghosting Threshold (Days)
              </label>
              <EditableNumberInput
                min={1}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                value={settings.ghosting_threshold_days || 30}
                fallbackValue={30}
                onCommit={(value) =>
                  setSettings((prev) => (prev ? { ...prev, ghosting_threshold_days: value } : null))
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                Applications with no activity for this many days will automatically be marked as
                "Ghosted".
              </p>
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">AI Provider</h2>

            <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-sky-50 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                  <RobotOutlined className="text-lg" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Encrypted Server-side BYOK
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-white border border-sky-200 text-sky-700">
                      Multi-provider
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    Your endpoint and model are stored with your account. Your API key is encrypted
                    at rest on the backend and used only by the authenticated server-side relay.
                  </p>
                  <p className="text-xs text-emerald-700 mt-2">
                    After save, the full key is not returned to the browser. You&apos;ll only see a
                    masked confirmation that a key is on file.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Provider Adapter
                </label>
                <select
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                  value={aiSettings.adapter}
                  onChange={(e) =>
                    applyAiProviderPreset(e.target.value as AIProviderSettings['adapter'])
                  }
                >
                  <option value="claude">Claude</option>
                  <option value="gemini">Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="custom">Custom</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Use Custom for providers with an chat completions endpoint, including Mistral and
                  other BYOK APIs.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Endpoint URL
                </label>
                <div className="relative">
                  <ApiOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="url"
                    className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                    value={aiSettings.endpoint}
                    onChange={(e) => updateAiSetting('endpoint', e.target.value)}
                    placeholder={
                      aiSettings.adapter === 'gemini'
                        ? 'https://generativelanguage.googleapis.com/v1beta'
                        : aiSettings.adapter === 'claude'
                          ? 'https://api.anthropic.com'
                          : aiSettings.adapter === 'openrouter'
                            ? 'https://openrouter.ai/api/v1/chat/completions'
                            : aiSettings.adapter === 'custom'
                              ? 'https://api.mistral.ai/v1/chat/completions'
                              : 'https://.../chat/completions'
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Model</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                  value={aiSettings.model}
                  onChange={(e) => updateAiSetting('model', e.target.value)}
                  placeholder={
                    aiSettings.adapter === 'gemini'
                      ? 'gemini-3-flash-preview'
                      : aiSettings.adapter === 'claude'
                        ? 'claude-sonnet-4-20250514'
                        : aiSettings.adapter === 'openrouter'
                          ? 'openai/gpt-5.2'
                          : aiSettings.adapter === 'custom'
                            ? 'mistral-medium-latest'
                            : 'gpt-4o-mini'
                  }
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">API Key</label>
                  {aiSettings.apiKey && (
                    <button
                      type="button"
                      onClick={() => setShowAiApiKey((current) => !current)}
                      className="text-xs font-medium text-sky-600 hover:text-sky-700"
                    >
                      {showAiApiKey ? 'Hide key' : 'Show key'}
                    </button>
                  )}
                </div>
                <input
                  type={showAiApiKey ? 'text' : 'password'}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                  value={aiSettings.apiKey}
                  onChange={(e) => updateAiSetting('apiKey', e.target.value)}
                  placeholder={
                    aiSettings.apiKeyConfigured && aiSettings.apiKeyMasked
                      ? `Stored key: ${aiSettings.apiKeyMasked}`
                      : 'Paste your provider key'
                  }
                  autoComplete="off"
                  spellCheck={false}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Used by Cover Letter generation, JD Matcher, job URL import, Negotiation Advisor,
                  and Analytics custom widgets.
                </p>
                {aiSettings.apiKeyConfigured && !aiSettings.apiKey && (
                  <p className="text-xs text-sky-600 mt-1">
                    A key is already stored securely for this account:{' '}
                    {aiSettings.apiKeyMasked || 'Saved key'}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900">
                      Request preview
                    </label>
                    <p className="text-xs text-slate-500 mt-1">
                      This is the server-side request CareerHub will make from the saved adapter,
                      endpoint, model, and encrypted key.
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {aiSettings.adapter}
                  </span>
                </div>
                <pre className="m-0 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-200/50 border border-slate-200/80 p-3 font-mono text-xs leading-relaxed text-slate-800">
                  {buildAIProviderCurlPreview(aiSettings)}
                </pre>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900">
                      Import from provider curl
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Optional shortcut. Paste a chat-completions curl command to fill endpoint,
                      Bearer key, and model.
                    </p>
                  </div>
                  <Button size="small" onClick={handleApplyAiProviderCurl}>
                    Fill fields
                  </Button>
                </div>
                <textarea
                  className="w-full min-h-[96px] rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 font-mono text-xs text-gray-700 outline-none focus:ring-2 focus:ring-sky-500"
                  value={aiProviderCurl}
                  onChange={(e) => setAiProviderCurl(e.target.value)}
                  onPaste={handleAiProviderCurlPaste}
                  placeholder={`curl https://api.mistral.ai/v1/chat/completions \\
  -H "Authorization: Bearer $MISTRAL_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"mistral-medium-latest","messages":[{"role":"user","content":"Hello"}]}'`}
                  spellCheck={false}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                <div className="text-xs text-gray-500">
                  Claude uses Messages, Gemini uses generateContent, and OpenAI/OpenRouter/Custom
                  use chat completions.
                </div>
                <div className="grid shrink-0 grid-cols-1 gap-2 sm:flex">
                  <button
                    type="button"
                    onClick={handleClearAiSettings}
                    disabled={!aiSettings.apiKeyConfigured}
                    className="min-h-11 rounded-xl border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Clear Stored Key
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAiSettings}
                    disabled={!aiSettingsDirty}
                    className="min-h-11 rounded-xl bg-sky-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Save Provider
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'integrations' && <GoogleSheetsSettings />}

        {activeTab === 'security' && <SecurityDashboard />}

        {/* Category Manager */}
        {activeTab === 'organize' && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Manage Categories</h2>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCategoriesLocked((l) => !l)}
                  className={`flex h-11 w-11 items-center justify-center rounded-lg transition-colors sm:h-9 sm:w-9 ${isCategoriesLocked ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'}`}
                  title={isCategoriesLocked ? 'Unlock section' : 'Lock section'}
                  aria-pressed={isCategoriesLocked}
                >
                  {isCategoriesLocked ? (
                    <LockOutlined className="text-base" />
                  ) : (
                    <UnlockOutlined className="text-base" />
                  )}
                </button>
                {!isCategoriesLocked && (
                  <button
                    onClick={() => {
                      if (isAddingCategory) {
                        handleCancelEdit();
                      } else {
                        setIsAddingCategory(true);
                      }
                    }}
                    className="flex min-h-11 items-center gap-1 rounded-xl bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 sm:min-h-9 sm:rounded-lg sm:py-1.5"
                  >
                    {isAddingCategory ? (
                      <CloseOutlined className="text-base" />
                    ) : (
                      <PlusOutlined className="text-base" />
                    )}
                    {isAddingCategory ? 'Cancel' : 'Add Category'}
                  </button>
                )}
              </div>
            </div>

            {isAddingCategory && !isCategoriesLocked && (
              <form
                onSubmit={handleSaveCategory}
                className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200 animate-in fade-in slide-in-from-top-2"
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Health, Finance"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Icon</label>
                      <IconPicker value={newCategoryIcon} onChange={setNewCategoryIcon} />
                    </div>
                    <button
                      type="submit"
                      disabled={!newCategoryName.trim()}
                      className="min-h-11 w-full rounded-xl bg-blue-600 px-4 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
                    >
                      {editingCategory ? 'Update' : 'Add'}
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
                    <ColorSwatchPicker
                      value={newCategoryColor}
                      onChange={setNewCategoryColor}
                      mode="hex"
                      allowCustomHex
                    />
                  </div>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {categories.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No categories defined.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categories.map((cat) => (
                    <LockableListItem
                      key={cat.id}
                      isLocked={!!cat.is_locked}
                      sectionLocked={isCategoriesLocked}
                      onToggleLock={async () => {
                        const newLocked = !cat.is_locked;

                        setCategories((prev) =>
                          prev.map((c) => (c.id === cat.id ? { ...c, is_locked: newLocked } : c))
                        );

                        try {
                          await patchCategory(cat.id, { is_locked: newLocked });
                        } catch {
                          setCategories((prev) =>
                            prev.map((c) => (c.id === cat.id ? { ...c, is_locked: !newLocked } : c))
                          );
                          messageApi.error('Failed to update lock');
                        }
                      }}
                      onEdit={() => handleEditCategory(cat)}
                      onDelete={() => handleDeleteCategory(cat.id)}
                    >
                      <CategoryBadge category={cat} />
                    </LockableListItem>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Employment Types Manager */}
        {activeTab === 'organize' && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Employment Types</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Used in Experience & Applications — saved with Settings
                </p>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEmpTypesLocked((l) => !l)}
                  className={`flex h-11 w-11 items-center justify-center rounded-lg transition-colors sm:h-9 sm:w-9 ${isEmpTypesLocked ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'}`}
                  title={isEmpTypesLocked ? 'Unlock section' : 'Lock section'}
                  aria-pressed={isEmpTypesLocked}
                >
                  {isEmpTypesLocked ? (
                    <LockOutlined className="text-base" />
                  ) : (
                    <UnlockOutlined className="text-base" />
                  )}
                </button>
                {!isEmpTypesLocked && (
                  <button
                    onClick={() => {
                      if (isAddingEmpType) {
                        handleCancelEmpType();
                      } else {
                        setIsAddingEmpType(true);
                      }
                    }}
                    className="flex min-h-11 items-center gap-1 rounded-xl bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 sm:min-h-9 sm:rounded-lg sm:py-1.5"
                  >
                    {isAddingEmpType ? (
                      <CloseOutlined className="text-base" />
                    ) : (
                      <PlusOutlined className="text-base" />
                    )}
                    {isAddingEmpType ? 'Cancel' : 'Add Type'}
                  </button>
                )}
              </div>
            </div>

            {isAddingEmpType && !isEmpTypesLocked && (
              <div className="mb-5 bg-gray-50 p-4 rounded-lg border border-gray-200 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
                      <input
                        type="text"
                        placeholder="e.g. Co-op, Volunteer"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={newEmpLabel}
                        onChange={(e) => setNewEmpLabel(e.target.value)}
                        autoFocus
                      />
                      {!editingEmpType && newEmpLabel && (
                        <p className="text-xs text-gray-400 mt-1">
                          Value: <code>{toSlug(newEmpLabel)}</code>
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleSaveEmpType}
                      disabled={!newEmpLabel.trim()}
                      className="min-h-11 w-full rounded-xl bg-blue-600 px-4 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
                    >
                      {editingEmpType ? 'Update' : 'Add'}
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
                    <ColorSwatchPicker
                      value={newEmpColor}
                      onChange={setNewEmpColor}
                      allowCustomHex
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {getEmpTypes().map((t) => {
                const colorOpt = getPaletteColor(t.color);
                return (
                  <LockableListItem
                    key={t.value}
                    isLocked={!!t.locked}
                    sectionLocked={isEmpTypesLocked}
                    onToggleLock={() => {
                      const current = getEmpTypes();
                      setSettings((prev) =>
                        prev
                          ? {
                              ...prev,
                              employment_types: current.map((x) =>
                                x.value === t.value ? { ...x, locked: !t.locked } : x
                              ),
                            }
                          : null
                      );
                    }}
                    onEdit={() => handleEditEmpType(t)}
                    onDelete={() => handleDeleteEmpType(t.value)}
                  >
                    <span
                      style={{ backgroundColor: colorOpt?.bg, color: colorOpt?.text }}
                      className="text-xs font-bold px-2.5 py-0.5 rounded-full border border-transparent"
                    >
                      {t.label}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">{t.value}</span>
                  </LockableListItem>
                );
              })}
            </div>
          </div>
        )}

        {/* Holiday Tabs Manager */}
        {activeTab === 'organize' && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Holiday Manager Tabs</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Custom tabs in Holiday Manager — saved with Settings
                </p>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsHolidayTabsLocked((l) => !l)}
                  className={`flex h-11 w-11 items-center justify-center rounded-lg transition-colors sm:h-9 sm:w-9 ${isHolidayTabsLocked ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'}`}
                  title={isHolidayTabsLocked ? 'Unlock section' : 'Lock section'}
                  aria-pressed={isHolidayTabsLocked}
                >
                  {isHolidayTabsLocked ? (
                    <LockOutlined className="text-base" />
                  ) : (
                    <UnlockOutlined className="text-base" />
                  )}
                </button>
                {!isHolidayTabsLocked && (
                  <button
                    onClick={() => {
                      if (isAddingHolidayTab) {
                        handleCancelHolidayTab();
                      } else {
                        setIsAddingHolidayTab(true);
                      }
                    }}
                    className="flex min-h-11 items-center gap-1 rounded-xl bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 sm:min-h-9 sm:rounded-lg sm:py-1.5"
                  >
                    {isAddingHolidayTab ? (
                      <CloseOutlined className="text-base" />
                    ) : (
                      <PlusOutlined className="text-base" />
                    )}
                    {isAddingHolidayTab ? 'Cancel' : 'Add Tab'}
                  </button>
                )}
              </div>
            </div>

            {isAddingHolidayTab && !isHolidayTabsLocked && (
              <div className="mb-5 bg-gray-50 p-4 rounded-lg border border-gray-200 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Tab Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Inauspicious Days, Lucky Days"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={newTabName}
                        onChange={(e) => setNewTabName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveHolidayTab()}
                        autoFocus
                      />
                      {!editingHolidayTab && newTabName && (
                        <p className="text-xs text-gray-400 mt-1">
                          ID: <code>{toTabId(newTabName)}</code>
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleSaveHolidayTab}
                      disabled={!newTabName.trim()}
                      className="min-h-11 w-full rounded-xl bg-blue-600 px-4 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
                    >
                      {editingHolidayTab ? 'Update' : 'Add'}
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
                    <ColorSwatchPicker
                      value={newTabColor}
                      onChange={setNewTabColor}
                      allowCustomHex
                    />
                  </div>
                </div>
              </div>
            )}

            {getHolidayTabs().length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                No custom tabs defined. Add one to get started.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {getHolidayTabs().map((t) => (
                  <LockableListItem
                    key={t.id}
                    isLocked={!!t.locked}
                    sectionLocked={isHolidayTabsLocked}
                    onToggleLock={() => {
                      const current = getHolidayTabs();
                      setSettings((prev) =>
                        prev
                          ? {
                              ...prev,
                              holiday_tabs: current.map((x) =>
                                x.id === t.id ? { ...x, locked: !t.locked } : x
                              ),
                            }
                          : null
                      );
                    }}
                    onEdit={() => handleEditHolidayTab(t)}
                    onDelete={() => handleDeleteHolidayTab(t.id)}
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: getHolidayTabColor(t.color).dot }}
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-gray-800">{t.name}</span>
                      <span className="block truncate text-xs text-gray-400 font-mono">{t.id}</span>
                    </span>
                  </LockableListItem>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-3">
              Deleting a tab moves its holidays back to <em>Manage Custom</em>.
            </p>
          </div>
        )}

        {/* Application Timeline Stages Manager */}
        {activeTab === 'organize' && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Application Timeline Stages</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Custom stages for your job applications pipeline
                </p>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAppStagesLocked((l) => !l)}
                  className={`flex h-11 w-11 items-center justify-center rounded-lg transition-colors sm:h-9 sm:w-9 ${isAppStagesLocked ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'}`}
                  title={isAppStagesLocked ? 'Unlock section' : 'Lock section'}
                  aria-pressed={isAppStagesLocked}
                >
                  {isAppStagesLocked ? (
                    <LockOutlined className="text-base" />
                  ) : (
                    <UnlockOutlined className="text-base" />
                  )}
                </button>
                {!isAppStagesLocked && (
                  <button
                    onClick={() => {
                      if (isAddingAppStage) {
                        handleCancelAppStage();
                      } else {
                        setIsAddingAppStage(true);
                      }
                    }}
                    className="flex min-h-11 items-center gap-1 rounded-xl bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 sm:min-h-9 sm:rounded-lg sm:py-1.5"
                  >
                    {isAddingAppStage ? (
                      <CloseOutlined className="text-base" />
                    ) : (
                      <PlusOutlined className="text-base" />
                    )}
                    {isAddingAppStage ? 'Cancel' : 'Add Stage'}
                  </button>
                )}
              </div>
            </div>

            {isAddingAppStage && !isAppStagesLocked && (
              <div className="mb-5 bg-gray-50 p-4 rounded-lg border border-gray-200 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(140px,0.55fr)_auto] lg:items-end">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Label (e.g. Online Assessment)
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={newAppStageLabel}
                        onChange={(e) => setNewAppStageLabel(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Short Label
                      </label>
                      <input
                        type="text"
                        placeholder="OA"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={newAppStageShortLabel}
                        onChange={(e) => setNewAppStageShortLabel(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={handleSaveAppStage}
                      disabled={!newAppStageLabel.trim() || !newAppStageShortLabel.trim()}
                      className="min-h-11 w-full rounded-xl bg-blue-600 px-4 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
                    >
                      {editingAppStage ? 'Update' : 'Add'}
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
                    <ColorSwatchPicker
                      value={newAppStageTone}
                      onChange={setNewAppStageTone}
                      mode="tone"
                      allowCustomHex
                    />
                  </div>
                </div>
              </div>
            )}

            {getAppStages().length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                No custom stages defined. Add one to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {getAppStages().map((t) => (
                  <LockableListItem
                    key={t.key}
                    isLocked={!!t.locked}
                    sectionLocked={isAppStagesLocked}
                    onToggleLock={() => {
                      const current = getAppStages();
                      setSettings((prev) =>
                        prev
                          ? {
                              ...prev,
                              application_stages: current.map((x) =>
                                x.key === t.key ? { ...x, locked: !t.locked } : x
                              ),
                            }
                          : null
                      );
                    }}
                    onEdit={() => handleEditAppStage(t)}
                    onDelete={() => handleDeleteAppStage(t.key)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getPaletteColorFromTone(t.tone).dot }}
                      ></div>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-800 leading-tight">{t.label}</span>
                        <span className="text-xs text-gray-400 font-mono mt-0.5">
                          {t.key} · {t.shortLabel}
                        </span>
                      </div>
                    </div>
                  </LockableListItem>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'navigation' && (
          <MobileToolbarSettings
            value={settings.mobile_toolbar_items}
            onChange={(mobileToolbarItems) =>
              setSettings((prev) =>
                prev ? { ...prev, mobile_toolbar_items: mobileToolbarItems } : prev
              )
            }
          />
        )}

        {/* Navigation Visibility */}
        {activeTab === 'navigation' && (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="border-b pb-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Navigation Visibility</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Toggle which pages appear in the sidebar
              </p>
            </div>
            {(() => {
              const groups = [
                {
                  label: 'Schedule',
                  items: [
                    { key: '/', label: 'Availability' },
                    { key: '/events', label: 'Events' },
                    { key: '/holidays', label: 'Holidays' },
                  ],
                },
                {
                  label: 'Career & Growth',
                  items: [
                    { key: '/applications', label: 'Applications' },
                    { key: '/offers', label: 'Offers' },
                    { key: '/documents', label: 'Documents' },
                    { key: '/tasks', label: 'Action Items' },
                    { key: '/experience', label: 'Experience' },
                    {
                      key: 'intelligence',
                      label: 'Intelligence',
                      children: [
                        { key: '/jd-reports', label: 'JD Reports' },
                        { key: '/ai-tools?tab=cover-letters', label: 'Cover Letters' },
                        {
                          key: '/ai-tools?tab=negotiation-results',
                          label: 'Negotiation Results',
                        },
                        { key: '/ai-tools?tab=promotion-reviews', label: 'Promotion Reviews' },
                      ],
                    },
                  ],
                },
                {
                  label: 'Insights',
                  items: [{ key: '/analytics', label: 'Analytics' }],
                },
              ];

              const hiddenKeys = settings?.hidden_nav_items || [];
              const toggleKey = (key: string) => {
                setSettings((prev) => {
                  if (!prev) return prev;
                  const current = prev.hidden_nav_items || [];
                  return {
                    ...prev,
                    hidden_nav_items: current.includes(key)
                      ? current.filter((k) => k !== key)
                      : [...current, key],
                  };
                });
              };

              const Toggle = ({ itemKey }: { itemKey: string }) => {
                const visible = !hiddenKeys.includes(itemKey);
                return (
                  <button
                    onClick={() => toggleKey(itemKey)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      visible ? 'bg-sky-500' : 'bg-gray-200'
                    }`}
                    role="switch"
                    aria-checked={visible}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                        visible ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                );
              };

              return (
                <div className="space-y-6">
                  {groups.map((group) => (
                    <div key={group.label}>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
                        {group.label}
                      </p>
                      <div className="rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                        {group.items.map((item) => {
                          const isParent = 'children' in item && item.children;
                          const hidden = hiddenKeys.includes(item.key);
                          return (
                            <React.Fragment key={item.key}>
                              <div
                                className={`flex items-center justify-between px-4 py-3 transition-colors ${hidden ? 'bg-gray-50' : 'bg-white hover:bg-gray-50/60'}`}
                              >
                                <span
                                  className={`text-sm font-medium ${hidden ? 'text-gray-400 line-through' : 'text-gray-700'}`}
                                >
                                  {item.label}
                                </span>
                                {!isParent && <Toggle itemKey={item.key} />}
                                {isParent && (
                                  <span className="text-[10px] text-gray-300 font-medium uppercase tracking-wide">
                                    group
                                  </span>
                                )}
                              </div>
                              {isParent &&
                                item.children?.map((child) => {
                                  const childHidden = hiddenKeys.includes(child.key);
                                  return (
                                    <div
                                      key={child.key}
                                      className={`flex items-center justify-between pl-8 pr-4 py-2.5 transition-colors ${childHidden ? 'bg-gray-50' : 'bg-white hover:bg-gray-50/60'}`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-200 text-xs">╰</span>
                                        <span
                                          className={`text-sm ${childHidden ? 'text-gray-400 line-through' : 'text-gray-600'}`}
                                        >
                                          {child.label}
                                        </span>
                                      </div>
                                      <Toggle itemKey={child.key} />
                                    </div>
                                  );
                                })}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-gray-400">
                    Settings and the current page are always visible.
                  </p>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;

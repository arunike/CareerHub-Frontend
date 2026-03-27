import React, { useState, useEffect, useRef } from 'react';
import {
  getUserSettings,
  updateUserSettings,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  exportAllData,
} from '../../api';
import type { EventCategory, UserSettings, EmploymentType, HolidayTab } from '../../types';
import {
  SettingOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  CloseOutlined,
  DownloadOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { message, TimePicker } from 'antd';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import IconPicker from '../../components/IconPicker';
import CategoryBadge from '../../components/CategoryBadge';

dayjs.extend(customParseFormat);

const Settings: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const originalSettingsRef = useRef<string>('');

  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#1890ff');
  const [newCategoryIcon, setNewCategoryIcon] = useState('tag');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EventCategory | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);

  // Employment type editor state
  const DEFAULT_EMP_TYPES: EmploymentType[] = [
    { value: 'full_time', label: 'Full-time', color: 'blue' },
    { value: 'part_time', label: 'Part-time', color: 'teal' },
    { value: 'internship', label: 'Internship', color: 'amber' },
    { value: 'contract', label: 'Contract', color: 'purple' },
    { value: 'freelance', label: 'Freelance', color: 'orange' },
  ];
  const EMP_COLOR_OPTIONS = [
    { value: 'blue',   label: 'Blue',   bg: '#dbeafe', text: '#1d4ed8' },
    { value: 'teal',   label: 'Teal',   bg: '#ccfbf1', text: '#0f766e' },
    { value: 'amber',  label: 'Amber',  bg: '#fef3c7', text: '#b45309' },
    { value: 'purple', label: 'Purple', bg: '#ede9fe', text: '#7c3aed' },
    { value: 'orange', label: 'Orange', bg: '#ffedd5', text: '#c2410c' },
    { value: 'green',  label: 'Green',  bg: '#dcfce7', text: '#15803d' },
    { value: 'red',    label: 'Red',    bg: '#fee2e2', text: '#b91c1c' },
    { value: 'pink',   label: 'Pink',   bg: '#fce7f3', text: '#be185d' },
    { value: 'indigo', label: 'Indigo', bg: '#e0e7ff', text: '#4338ca' },
    { value: 'gray',   label: 'Gray',   bg: '#f3f4f6', text: '#374151' },
  ];
  const [isAddingEmpType, setIsAddingEmpType] = useState(false);
  const [editingEmpType, setEditingEmpType] = useState<EmploymentType | null>(null);
  const [newEmpLabel, setNewEmpLabel] = useState('');
  const [newEmpColor, setNewEmpColor] = useState('blue');

  const getEmpTypes = (): EmploymentType[] =>
    (settings?.employment_types && settings.employment_types.length > 0)
      ? settings.employment_types
      : DEFAULT_EMP_TYPES;

  const toSlug = (s: string) =>
    s.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  const handleSaveEmpType = () => {
    if (!newEmpLabel.trim() || !settings) return;
    const current = getEmpTypes();
    if (editingEmpType) {
      setSettings(prev => prev ? {
        ...prev,
        employment_types: current.map(t =>
          t.value === editingEmpType.value ? { ...t, label: newEmpLabel, color: newEmpColor } : t
        ),
      } : null);
    } else {
      const value = toSlug(newEmpLabel);
      if (current.some(t => t.value === value)) return;
      setSettings(prev => prev ? {
        ...prev,
        employment_types: [...current, { value, label: newEmpLabel, color: newEmpColor }],
      } : null);
    }
    setIsAddingEmpType(false);
    setEditingEmpType(null);
    setNewEmpLabel('');
    setNewEmpColor('blue');
  };

  const handleEditEmpType = (t: EmploymentType) => {
    setEditingEmpType(t);
    setNewEmpLabel(t.label);
    setNewEmpColor(t.color);
    setIsAddingEmpType(true);
  };

  const handleDeleteEmpType = (value: string) => {
    const current = getEmpTypes();
    setSettings(prev => prev ? {
      ...prev,
      employment_types: current.filter(t => t.value !== value),
    } : null);
  };

  const handleCancelEmpType = () => {
    setIsAddingEmpType(false);
    setEditingEmpType(null);
    setNewEmpLabel('');
    setNewEmpColor('blue');
  };

  const [isAddingHolidayTab, setIsAddingHolidayTab] = useState(false);
  const [editingHolidayTab, setEditingHolidayTab] = useState<HolidayTab | null>(null);
  const [newTabName, setNewTabName] = useState('');

  const getHolidayTabs = (): HolidayTab[] => settings?.holiday_tabs || [];

  const toTabId = (s: string) =>
    s.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  const handleSaveHolidayTab = () => {
    if (!newTabName.trim() || !settings) return;
    const current = getHolidayTabs();
    if (editingHolidayTab) {
      setSettings(prev => prev ? {
        ...prev,
        holiday_tabs: current.map(t => t.id === editingHolidayTab.id ? { ...t, name: newTabName } : t),
      } : null);
    } else {
      const id = toTabId(newTabName);
      if (current.some(t => t.id === id)) return;
      setSettings(prev => prev ? {
        ...prev,
        holiday_tabs: [...current, { id, name: newTabName }],
      } : null);
    }
    setIsAddingHolidayTab(false);
    setEditingHolidayTab(null);
    setNewTabName('');
  };

  const handleEditHolidayTab = (t: HolidayTab) => {
    setEditingHolidayTab(t);
    setNewTabName(t.name);
    setIsAddingHolidayTab(true);
  };

  const handleDeleteHolidayTab = (id: string) => {
    setSettings(prev => prev ? {
      ...prev,
      holiday_tabs: getHolidayTabs().filter(t => t.id !== id),
    } : null);
  };

  const handleCancelHolidayTab = () => {
    setIsAddingHolidayTab(false);
    setEditingHolidayTab(null);
    setNewTabName('');
  };

  const resetMeridiemColumnScroll = (open: boolean) => {
    if (!open) return;
    const reset = () => {
      const columns = document.querySelectorAll(
        '.event-timepicker-dropdown .ant-picker-time-panel-column[data-type="meridiem"]'
      );
      columns.forEach((column) => {
        (column as HTMLElement).scrollTop = 0;
      });
    };

    requestAnimationFrame(reset);
    setTimeout(reset, 120);
  };

  const fetchSettings = async () => {
    try {
      const resp = await getUserSettings();
      const data = resp.data;
      if (!data.work_days || data.work_days.length === 0) {
        data.work_days = [0, 1, 2, 3, 4];
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
      originalSettingsRef.current = JSON.stringify(data);
      setSettings(data);
      setIsDirty(false);
    } catch (error) {
      messageApi.error('Failed to fetch settings');
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const resp = await getCategories();
      setCategories(resp.data);
    } catch (error) {
      messageApi.error('Failed to fetch categories');
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Track dirty state whenever settings change
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
      setSuccessMessage('Settings saved!');
    } catch (error) {
      messageApi.error('Failed to save settings');
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
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
      setNewCategoryColor('#1890ff');
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
    setNewCategoryColor('#1890ff');
    setNewCategoryIcon('tag');
  };

  const handleDeleteCategory = (id: number) => {
    setDeletingCategoryId(id);
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

  if (loading) {
    return <div className="text-center py-8">Loading settings...</div>;
  }

  if (!settings) {
    return <div className="text-center py-8 text-red-600">Failed to load settings</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto relative">
      {contextHolder}
      {/* Toast Notification */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-right-5 fade-in z-50">
          <div className="bg-green-100 p-1 rounded-full">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
          </div>
          <span className="font-medium">{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-2 text-green-500 hover:text-green-700"
          >
            <CloseOutlined className="text-xs" />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCategoryId !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl scale-100 opacity-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Category?</h3>
            <p className="text-gray-500 mb-6">
              Are you sure you want to delete this category? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingCategoryId(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteCategory}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SettingOutlined className="text-2xl text-gray-700" />
          <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        </div>
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition ${
            isDirty
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <SaveOutlined className="text-sm" />
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-5">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Availability</h3>

        {/* Work Hours */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <TimePicker
              className="w-full text-base py-1.5 rounded-lg border-gray-300 hover:border-blue-500 focus:border-blue-500"
              format="h:mm a"
              value={
                settings.work_start_time
                  ? dayjs(settings.work_start_time, 'HH:mm:ss')
                  : dayjs('09:00:00', 'HH:mm:ss')
              }
              onChange={(time) => {
                if (time) {
                  setSettings((prev) =>
                    prev ? { ...prev, work_start_time: time.format('HH:mm:ss') } : null
                  );
                }
              }}
              minuteStep={1}
              use12Hours
              inputReadOnly={false}
              needConfirm={false}
              allowClear={false}
              popupClassName="event-timepicker-dropdown"
              onOpenChange={resetMeridiemColumnScroll}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <TimePicker
              className="w-full text-base py-1.5 rounded-lg border-gray-300 hover:border-blue-500 focus:border-blue-500"
              format="h:mm a"
              value={
                settings.work_end_time
                  ? dayjs(settings.work_end_time, 'HH:mm:ss')
                  : dayjs('17:00:00', 'HH:mm:ss')
              }
              onChange={(time) => {
                if (time) {
                  setSettings((prev) =>
                    prev ? { ...prev, work_end_time: time.format('HH:mm:ss') } : null
                  );
                }
              }}
              minuteStep={1}
              use12Hours
              inputReadOnly={false}
              needConfirm={false}
              allowClear={false}
              popupClassName="event-timepicker-dropdown"
              onOpenChange={resetMeridiemColumnScroll}
            />
          </div>
        </div>

        {/* Work Days */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Work Days</label>
          <div className="flex flex-wrap gap-2">
            {[
              { val: 0, label: 'Mon' },
              { val: 1, label: 'Tue' },
              { val: 2, label: 'Wed' },
              { val: 3, label: 'Thu' },
              { val: 4, label: 'Fri' },
              { val: 5, label: 'Sat' },
              { val: 6, label: 'Sun' },
            ].map((day) => {
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
                    setSettings((prev) => (prev ? { ...prev, work_days: newDays } : null));
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default Event Duration (minutes)
          </label>
          <input
            type="number"
            min="15"
            step="15"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            value={settings.default_event_duration || 60}
            onChange={(e) =>
              setSettings((prev) =>
                prev ? { ...prev, default_event_duration: Number(e.target.value) } : null
              )
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
          <input
            type="number"
            min="0"
            step="5"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            value={settings.buffer_time || 0}
            onChange={(e) =>
              setSettings((prev) =>
                prev ? { ...prev, buffer_time: Number(e.target.value) } : null
              )
            }
          />
          <p className="text-xs text-gray-500 mt-1">Time buffer between events</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Primary Timezone</label>
          <select
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            value={settings.primary_timezone || 'America/Los_Angeles'}
            onChange={(e) =>
              setSettings((prev) => (prev ? { ...prev, primary_timezone: e.target.value } : null))
            }
          >
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
          </select>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 pt-4">
          Job Hunt Settings
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ghosting Threshold (Days)
          </label>
          <input
            type="number"
            min="1"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            value={settings.ghosting_threshold_days || 30}
            onChange={(e) =>
              setSettings((prev) =>
                prev ? { ...prev, ghosting_threshold_days: Number(e.target.value) } : null
              )
            }
          />
          <p className="text-xs text-gray-500 mt-1">
            Applications with no activity for this many days will automatically be marked as
            "Ghosted".
          </p>
        </div>

      </div>

      {/* Data Management */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-4 mb-4">Data Management</h3>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0">
            <h4 className="font-medium text-gray-900">Export All Data</h4>
            <p className="text-sm text-gray-500">
              Download a full backup of all your data (Events, Holidays, Applications, Settings) as
              a ZIP file.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <select
              className="w-full lg:w-auto px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              id="export-format"
              defaultValue="json"
            >
              <option value="json">JSON Backup (ZIP)</option>
              <option value="csv">CSV (ZIP)</option>
              <option value="xlsx">Excel (Multi-sheet)</option>
            </select>
            <button
              onClick={async () => {
                const fmt = (document.getElementById('export-format') as HTMLSelectElement).value;
                try {
                  const response = await exportAllData(fmt);
                  const contentType =
                    fmt === 'xlsx'
                      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                      : 'application/zip';
                  const ext = fmt === 'xlsx' ? 'xlsx' : 'zip';

                  const blob = new Blob([response.data], { type: contentType });
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute(
                    'download',
                    `availability_manager_export_${new Date().toISOString().split('T')[0]}.${ext}`
                  );
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  setSuccessMessage('Backup downloaded successfully!');
                } catch (error) {
                  messageApi.error('Export failed');
                  console.error('Export failed', error);
                }
              }}
              className="w-full lg:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 border border-blue-600 rounded-lg shadow-sm text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <DownloadOutlined className="text-base" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Category Manager */}

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center border-b pb-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Manage Categories</h3>
          <button
            onClick={() => {
              if (isAddingCategory) {
                handleCancelEdit();
              } else {
                setIsAddingCategory(true);
              }
            }}
            className="text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-1"
          >
            {isAddingCategory ? (
              <CloseOutlined className="text-base" />
            ) : (
              <PlusOutlined className="text-base" />
            )}
            {isAddingCategory ? 'Cancel' : 'Add Category'}
          </button>
        </div>

        {isAddingCategory && (
          <form
            onSubmit={handleSaveCategory}
            className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200 animate-in fade-in slide-in-from-top-2"
          >
            <div className="flex gap-3">
              <div className="flex-1">
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
                <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
                <input
                  type="color"
                  className="h-9.5 w-15 cursor-pointer rounded-lg border border-gray-300 p-1"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Icon</label>
                <IconPicker value={newCategoryIcon} onChange={setNewCategoryIcon} />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={!newCategoryName.trim()}
                  className="h-9.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingCategory ? 'Update' : 'Add'}
                </button>
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
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition group"
                >
                  <div className="flex items-center gap-3">
                    <CategoryBadge category={cat} />
                  </div>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => handleEditCategory(cat)}
                      className="text-gray-400 hover:text-blue-600 p-1 mr-1"
                      title="Edit Category"
                    >
                      <EditOutlined className="text-base" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="text-gray-400 hover:text-red-600 p-1"
                      title="Delete Category"
                    >
                      <DeleteOutlined className="text-base" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Employment Types Manager */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center border-b pb-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Employment Types</h3>
            <p className="text-xs text-gray-400 mt-0.5">Used in Experience — saved with Settings</p>
          </div>
          <button
            onClick={() => {
              if (isAddingEmpType) {
                handleCancelEmpType();
              } else {
                setIsAddingEmpType(true);
              }
            }}
            className="text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-1"
          >
            {isAddingEmpType ? (
              <CloseOutlined className="text-base" />
            ) : (
              <PlusOutlined className="text-base" />
            )}
            {isAddingEmpType ? 'Cancel' : 'Add Type'}
          </button>
        </div>

        {isAddingEmpType && (
          <div className="mb-5 bg-gray-50 p-4 rounded-lg border border-gray-200 animate-in fade-in slide-in-from-top-2">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
                <input
                  type="text"
                  placeholder="e.g. Co-op, Volunteer"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={newEmpLabel}
                  onChange={e => setNewEmpLabel(e.target.value)}
                  autoFocus
                />
                {!editingEmpType && newEmpLabel && (
                  <p className="text-xs text-gray-400 mt-1">Value: <code>{toSlug(newEmpLabel)}</code></p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
                <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                  {EMP_COLOR_OPTIONS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setNewEmpColor(c.value)}
                      title={c.label}
                      style={{ backgroundColor: c.bg, color: c.text }}
                      className={`w-7 h-7 rounded-full text-xs font-bold border-2 transition ${newEmpColor === c.value ? 'border-gray-700 scale-110' : 'border-transparent hover:border-gray-300'}`}
                    >
                      {c.label[0]}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleSaveEmpType}
                disabled={!newEmpLabel.trim()}
                className="h-9.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingEmpType ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {getEmpTypes().map(t => {
            const colorOpt = EMP_COLOR_OPTIONS.find(c => c.value === t.color);
            return (
              <div
                key={t.value}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition group"
              >
                <div className="flex items-center gap-2">
                  <span
                    style={{ backgroundColor: colorOpt?.bg, color: colorOpt?.text }}
                    className="text-xs font-bold px-2.5 py-0.5 rounded-full border border-transparent"
                  >
                    {t.label}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">{t.value}</span>
                </div>
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => handleEditEmpType(t)}
                    className="text-gray-400 hover:text-blue-600 p-1 mr-1"
                    title="Edit"
                  >
                    <EditOutlined className="text-base" />
                  </button>
                  <button
                    onClick={() => handleDeleteEmpType(t.value)}
                    className="text-gray-400 hover:text-red-600 p-1"
                    title="Delete"
                  >
                    <DeleteOutlined className="text-base" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Holiday Tabs Manager */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center border-b pb-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Holiday Manager Tabs</h3>
            <p className="text-xs text-gray-400 mt-0.5">Custom tabs in Holiday Manager — saved with Settings</p>
          </div>
          <button
            onClick={() => {
              if (isAddingHolidayTab) {
                handleCancelHolidayTab();
              } else {
                setIsAddingHolidayTab(true);
              }
            }}
            className="text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-1"
          >
            {isAddingHolidayTab ? (
              <CloseOutlined className="text-base" />
            ) : (
              <PlusOutlined className="text-base" />
            )}
            {isAddingHolidayTab ? 'Cancel' : 'Add Tab'}
          </button>
        </div>

        {isAddingHolidayTab && (
          <div className="mb-5 bg-gray-50 p-4 rounded-lg border border-gray-200 animate-in fade-in slide-in-from-top-2">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Tab Name</label>
                <input
                  type="text"
                  placeholder="e.g. Inauspicious Days, Lucky Days"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={newTabName}
                  onChange={e => setNewTabName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveHolidayTab()}
                  autoFocus
                />
                {!editingHolidayTab && newTabName && (
                  <p className="text-xs text-gray-400 mt-1">ID: <code>{toTabId(newTabName)}</code></p>
                )}
              </div>
              <button
                onClick={handleSaveHolidayTab}
                disabled={!newTabName.trim()}
                className="h-9.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingHolidayTab ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        )}

        {getHolidayTabs().length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No custom tabs defined. Add one to get started.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {getHolidayTabs().map(t => (
              <div
                key={t.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition group"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{t.name}</span>
                  <span className="text-xs text-gray-400 font-mono">{t.id}</span>
                </div>
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => handleEditHolidayTab(t)}
                    className="text-gray-400 hover:text-blue-600 p-1 mr-1"
                    title="Rename"
                  >
                    <EditOutlined className="text-base" />
                  </button>
                  <button
                    onClick={() => handleDeleteHolidayTab(t.id)}
                    className="text-gray-400 hover:text-red-600 p-1"
                    title="Delete"
                  >
                    <DeleteOutlined className="text-base" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3">Deleting a tab moves its holidays back to <em>Manage Custom</em>.</p>
      </div>

    </div>
  );
};

export default Settings;

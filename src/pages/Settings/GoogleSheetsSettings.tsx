import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircleOutlined,
  DeleteOutlined,
  ExperimentOutlined,
  LinkOutlined,
  PlusOutlined,
  SyncOutlined,
  TableOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Button, message, TimePicker } from 'antd';
import dayjs from 'dayjs';
import {
  createGoogleSheetSync,
  deleteGoogleSheetSync,
  connectGoogleOAuth,
  disconnectGoogleOAuth,
  getGoogleOAuthStatus,
  getGoogleSpreadsheetTabs,
  getGoogleSheetSyncs,
  getGoogleSpreadsheets,
  previewGoogleSheetSync,
  resyncGoogleSheetSync,
  runGoogleSheetSync,
  testGoogleSheetSync,
  updateGoogleSheetSync,
} from '../../api';
import type {
  GoogleOAuthStatus,
  GoogleSheetSyncConfig,
  GoogleSheetSyncPreview,
  GoogleSheetSyncTarget,
  GoogleSpreadsheetFile,
  GoogleSpreadsheetTab,
} from '../../types';

type Draft = {
  id?: number;
  name: string;
  sheet_url: string;
  worksheet_name: string;
  target_type: GoogleSheetSyncTarget;
  enabled: boolean;
  sync_time: string;
  sync_timezone: string;
  header_row: number;
  column_mapping: Record<string, string>;
};

const TIMEZONE_OPTIONS = [
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'UTC', label: 'UTC' },
];

const normalizeTimeInput = (value?: string | null) => (value || '22:00').slice(0, 5);
const syncTimeValue = (value: string) => dayjs(`2000-01-01T${normalizeTimeInput(value)}:00`);
const spreadsheetIdFromUrl = (url: string) => url.match(/\/spreadsheets\/d\/([^/?#]+)/)?.[1] || '';

const FIELD_OPTIONS: Record<GoogleSheetSyncTarget, Array<{ key: string; label: string; required?: boolean }>> = {
  APPLICATIONS: [
    { key: 'external_id', label: 'External ID' },
    { key: 'company_name', label: 'Company', required: true },
    { key: 'role_title', label: 'Role', required: true },
    { key: 'status', label: 'Status' },
    { key: 'job_link', label: 'Job Link' },
    { key: 'salary_range', label: 'Salary' },
    { key: 'location', label: 'Location' },
    { key: 'office_location', label: 'Office Location' },
    { key: 'date_applied', label: 'Date Applied' },
    { key: 'notes', label: 'Notes' },
  ],
  EVENTS: [
    { key: 'external_id', label: 'External ID' },
    { key: 'name', label: 'Name', required: true },
    { key: 'date', label: 'Date', required: true },
    { key: 'start_time', label: 'Start Time', required: true },
    { key: 'end_time', label: 'End Time', required: true },
    { key: 'timezone', label: 'Timezone' },
    { key: 'location_type', label: 'Location Type' },
    { key: 'location', label: 'Location' },
    { key: 'meeting_link', label: 'Meeting Link' },
    { key: 'category', label: 'Category' },
    { key: 'notes', label: 'Notes' },
  ],
};

const DEFAULT_MAPPING: Record<GoogleSheetSyncTarget, Record<string, string>> = {
  APPLICATIONS: {
    external_id: 'External ID',
    company_name: 'Company',
    role_title: 'Role',
    status: 'Status',
    job_link: 'Job Link',
    salary_range: 'Salary',
    location: 'Location',
    office_location: 'Office Location',
    date_applied: 'Date Applied',
    notes: 'Notes',
  },
  EVENTS: {
    external_id: 'External ID',
    name: 'Name',
    date: 'Date',
    start_time: 'Start Time',
    end_time: 'End Time',
    timezone: 'Timezone',
    location_type: 'Location Type',
    location: 'Location',
    meeting_link: 'Meeting Link',
    category: 'Category',
    notes: 'Notes',
  },
};

const emptyDraft = (target: GoogleSheetSyncTarget = 'APPLICATIONS'): Draft => ({
  name: '',
  sheet_url: '',
  worksheet_name: '',
  target_type: target,
  enabled: true,
  sync_time: '22:00',
  sync_timezone: 'America/Los_Angeles',
  header_row: 1,
  column_mapping: {},
});

const toDraft = (config: GoogleSheetSyncConfig): Draft => ({
  id: config.id,
  name: config.name,
  sheet_url: config.sheet_url,
  worksheet_name: config.worksheet_name || '',
  target_type: config.target_type,
  enabled: config.enabled,
  sync_time: normalizeTimeInput(config.sync_time),
  sync_timezone: config.sync_timezone || 'America/Los_Angeles',
  header_row: config.header_row || 1,
  column_mapping: config.column_mapping || {},
});

const HEADER_ALIASES: Record<GoogleSheetSyncTarget, Record<string, string[]>> = {
  APPLICATIONS: {
    external_id: ['external id', 'id', 'row id', 'sheet id'],
    company_name: ['company', 'company name', 'employer', 'organization'],
    role_title: ['role', 'role title', 'title', 'position', 'position applied', 'job title'],
    status: ['status', 'stage', 'application status'],
    job_link: ['job link', 'link', 'url', 'posting', 'posting url'],
    salary_range: ['salary', 'salary range', 'compensation', 'pay', 'pay annual', 'annual pay', 'pay annual dollars'],
    location: ['location', 'company location', 'home location', 'city'],
    office_location: ['office location', 'office', 'work location'],
    date_applied: ['date applied', 'applied date', 'application date', 'applied on'],
    notes: ['notes', 'note', 'comments', 'comment'],
  },
  EVENTS: {
    external_id: ['external id', 'id', 'row id', 'sheet id'],
    name: ['name', 'event', 'event name', 'title'],
    date: ['date', 'event date', 'interview date'],
    start_time: ['start time', 'start', 'from'],
    end_time: ['end time', 'end', 'to'],
    timezone: ['timezone', 'time zone', 'tz'],
    location_type: ['location type', 'type', 'format'],
    location: ['location', 'place', 'address'],
    meeting_link: ['meeting link', 'zoom', 'meet', 'teams', 'video link'],
    category: ['category', 'event category'],
    notes: ['notes', 'note', 'comments', 'comment'],
  },
};

const normalizeHeader = (value: string) =>
  value.toLowerCase().trim().replace(/[_-]+/g, ' ').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');

const buildAutoMapping = (target: GoogleSheetSyncTarget, headers: string[]) => {
  const normalizedHeaders = headers.map((header) => ({ raw: header, normalized: normalizeHeader(header) }));
  const mapping: Record<string, string> = {};

  FIELD_OPTIONS[target].forEach((field) => {
    const aliases = HEADER_ALIASES[target][field.key] || [field.label];
    const normalizedAliases = [field.label, field.key, ...aliases].map(normalizeHeader);
    const exact = normalizedHeaders.find((header) => normalizedAliases.includes(header.normalized));
    const fuzzy = exact || normalizedHeaders.find((header) =>
      normalizedAliases.some((alias) => header.normalized.includes(alias) || alias.includes(header.normalized)),
    );
    if (fuzzy) {
      mapping[field.key] = fuzzy.raw;
    }
  });

  return mapping;
};

const resultText = (config: GoogleSheetSyncConfig) => {
  const result = config.last_result || {};
  const pieces = [
    `${result.created || 0} created`,
    `${result.updated || 0} updated`,
    `${result.skipped || 0} skipped`,
  ];
  return pieces.join(' / ');
};

const GoogleSheetsSettings: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [configs, setConfigs] = useState<GoogleSheetSyncConfig[]>([]);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [preview, setPreview] = useState<GoogleSheetSyncPreview | null>(null);
  const [fieldToAdd, setFieldToAdd] = useState('');
  const [googleStatus, setGoogleStatus] = useState<GoogleOAuthStatus | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [spreadsheets, setSpreadsheets] = useState<GoogleSpreadsheetFile[]>([]);
  const [spreadsheetsLoading, setSpreadsheetsLoading] = useState(false);
  const [worksheetTabs, setWorksheetTabs] = useState<GoogleSpreadsheetTab[]>([]);
  const [worksheetTabsLoading, setWorksheetTabsLoading] = useState(false);

  const fields = useMemo(() => FIELD_OPTIONS[draft.target_type], [draft.target_type]);
  const requiredFields = useMemo(() => fields.filter((field) => field.required), [fields]);
  const activeFields = useMemo(
    () => fields.filter((field) => Object.prototype.hasOwnProperty.call(draft.column_mapping, field.key)),
    [draft.column_mapping, fields],
  );
  const visibleMappingFields = useMemo(() => {
    const activeOptionalFields = activeFields.filter((field) => !field.required);
    return [...requiredFields, ...activeOptionalFields];
  }, [activeFields, requiredFields]);
  const unmappedFields = useMemo(
    () => fields.filter(
      (field) => !field.required && !Object.prototype.hasOwnProperty.call(draft.column_mapping, field.key),
    ),
    [draft.column_mapping, fields],
  );
  const missingRequiredFields = useMemo(
    () => requiredFields.filter((field) => !(draft.column_mapping[field.key] || '').trim()),
    [draft.column_mapping, requiredFields],
  );
  const canSaveDraft = Boolean(draft.name.trim() && draft.sheet_url.trim() && missingRequiredFields.length === 0);
  const sheetMappingHeaders = useMemo(() => {
    const headers = preview?.headers.filter((header) => header.trim()) || [];
    const extraMappedHeaders = Object.values(draft.column_mapping)
      .filter((header) => header && !headers.includes(header));
    return [...headers, ...extraMappedHeaders];
  }, [draft.column_mapping, preview?.headers]);

  const fetchConfigs = useCallback(async () => {
    try {
      const [syncsResponse, oauthResponse] = await Promise.all([
        getGoogleSheetSyncs(),
        getGoogleOAuthStatus(),
      ]);
      setConfigs(syncsResponse.data);
      setGoogleStatus(oauthResponse.data);
    } catch (error) {
      messageApi.error('Failed to load Google Sheet syncs');
      console.error('Failed to load Google Sheet syncs', error);
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const fetchSpreadsheets = useCallback(async () => {
    if (!googleStatus?.connected || !googleStatus.can_list_spreadsheets) {
      setSpreadsheets([]);
      return;
    }
    setSpreadsheetsLoading(true);
    try {
      const response = await getGoogleSpreadsheets();
      setSpreadsheets(response.data.spreadsheets);
    } catch (error) {
      messageApi.error('Could not load your Google Sheets');
      console.error('Failed to load Google spreadsheets', error);
    } finally {
      setSpreadsheetsLoading(false);
    }
  }, [googleStatus?.can_list_spreadsheets, googleStatus?.connected, messageApi]);

  useEffect(() => {
    fetchSpreadsheets();
  }, [fetchSpreadsheets]);

  const fetchWorksheetTabs = useCallback(async (sheetUrl: string) => {
    const spreadsheetId = spreadsheetIdFromUrl(sheetUrl);
    if (!spreadsheetId || !googleStatus?.connected) {
      setWorksheetTabs([]);
      return;
    }
    setWorksheetTabsLoading(true);
    try {
      const response = await getGoogleSpreadsheetTabs(spreadsheetId);
      setWorksheetTabs(response.data.tabs);
      setDraft((current) => {
        if (!response.data.tabs.length || current.worksheet_name) {
          return current;
        }
        return { ...current, worksheet_name: response.data.tabs[0].title };
      });
    } catch (error) {
      setWorksheetTabs([]);
      console.error('Failed to load worksheet tabs', error);
    } finally {
      setWorksheetTabsLoading(false);
    }
  }, [googleStatus?.connected]);

  useEffect(() => {
    fetchWorksheetTabs(draft.sheet_url);
  }, [draft.sheet_url, fetchWorksheetTabs]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleResult = params.get('google');
    if (!googleResult) return;
    if (googleResult === 'connected') {
      messageApi.success('Google connected');
      fetchConfigs();
    } else if (googleResult === 'error') {
      messageApi.error(params.get('message') || 'Google connection failed');
    }
    params.delete('google');
    params.delete('message');
    const nextQuery = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`);
  }, [fetchConfigs, messageApi]);

  const updateDraft = (patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const resetMeridiemColumnScroll = (open: boolean) => {
    if (!open) return;
    const reset = () => {
      const columns = document.querySelectorAll(
        '.event-timepicker-dropdown .ant-picker-time-panel-column[data-type="meridiem"]',
      );
      columns.forEach((column) => {
        (column as HTMLElement).scrollTop = 0;
      });
    };

    requestAnimationFrame(reset);
    setTimeout(reset, 120);
  };

  const updateMapping = (key: string, value: string) => {
    setDraft((current) => ({
      ...current,
      column_mapping: { ...current.column_mapping, [key]: value },
    }));
  };

  const updateSheetColumnMapping = (sheetHeader: string, fieldKey: string) => {
    setDraft((current) => {
      const nextMapping = { ...current.column_mapping };
      for (const [mappedField, mappedHeader] of Object.entries(nextMapping)) {
        if (mappedHeader === sheetHeader || mappedField === fieldKey) {
          delete nextMapping[mappedField];
        }
      }
      if (fieldKey) {
        nextMapping[fieldKey] = sheetHeader;
      }
      return { ...current, column_mapping: nextMapping };
    });
  };

  const applyAutoMapping = (headers: string[], targetType = draft.target_type) => {
    const nextMapping = buildAutoMapping(targetType, headers);
    setDraft((current) => ({
      ...current,
      target_type: targetType,
      column_mapping: nextMapping,
    }));
    return nextMapping;
  };

  const addMappingField = () => {
    if (!fieldToAdd) return;
    const field = fields.find((candidate) => candidate.key === fieldToAdd);
    if (!field) return;
    setDraft((current) => ({
      ...current,
      column_mapping: {
        ...current.column_mapping,
        [field.key]: preview?.headers.find((header) => normalizeHeader(header) === normalizeHeader(field.label)) || '',
      },
    }));
    setFieldToAdd('');
  };

  const removeMappingField = (key: string) => {
    setDraft((current) => {
      const nextMapping = { ...current.column_mapping };
      delete nextMapping[key];
      return { ...current, column_mapping: nextMapping };
    });
  };

  const fieldForSheetHeader = (sheetHeader: string) =>
    Object.entries(draft.column_mapping).find(([, mappedHeader]) => mappedHeader === sheetHeader)?.[0] || '';

  const sampleForHeader = (sheetHeader: string) =>
    preview?.rows.find((row) => row[sheetHeader])?.[sheetHeader] || '';

  const changeTarget = (targetType: GoogleSheetSyncTarget) => {
    setDraft((current) => ({
      ...current,
      target_type: targetType,
      column_mapping: preview?.headers.length ? buildAutoMapping(targetType, preview.headers) : {},
    }));
    setFieldToAdd('');
  };

  const draftPayload = () => ({
    name: draft.name.trim() || 'Preview',
    sheet_url: draft.sheet_url.trim(),
    worksheet_name: draft.worksheet_name.trim() || worksheetTabs[0]?.title || '',
    target_type: draft.target_type,
    enabled: draft.enabled,
    sync_time: draft.sync_time,
    sync_timezone: draft.sync_timezone,
    header_row: draft.header_row,
    column_mapping: draft.column_mapping,
  });

  const previewDraft = async () => {
    if (!draft.sheet_url.trim()) {
      messageApi.warning('Paste a Google Sheet link first');
      return;
    }
    setPreviewing(true);
    try {
      const response = await previewGoogleSheetSync(draftPayload());
      setPreview(response.data.preview);
      const autoMapping = applyAutoMapping(response.data.preview.headers, draft.target_type);
      if (Object.keys(autoMapping).length > 0) {
        messageApi.success('Preview loaded and mapping generated');
      } else {
        messageApi.warning('Preview loaded, but no matching columns were found');
      }
    } catch (error) {
      messageApi.error('Could not preview this sheet');
      console.error('Failed to preview Google Sheet sync', error);
    } finally {
      setPreviewing(false);
    }
  };

  const saveDraft = async () => {
    if (!draft.name.trim() || !draft.sheet_url.trim()) {
      messageApi.warning('Name and Google Sheet link are required');
      return;
    }
    if (missingRequiredFields.length > 0) {
      messageApi.warning(`Map required fields first: ${missingRequiredFields.map((field) => field.label).join(', ')}`);
      return;
    }
    setSaving(true);
    try {
      const payload = draftPayload();

      if (draft.id) {
        await updateGoogleSheetSync(draft.id, payload);
        messageApi.success('Google Sheet sync updated');
      } else {
        await createGoogleSheetSync(payload);
        messageApi.success('Google Sheet sync created');
      }
      setDraft(emptyDraft(draft.target_type));
      fetchConfigs();
    } catch (error) {
      messageApi.error('Failed to save Google Sheet sync');
      console.error('Failed to save Google Sheet sync', error);
    } finally {
      setSaving(false);
    }
  };

  const testConfig = async (config: GoogleSheetSyncConfig) => {
    setBusyId(config.id);
    try {
      const response = await testGoogleSheetSync(config.id);
      setPreview(response.data.preview);
      const autoMapping = buildAutoMapping(config.target_type, response.data.preview.headers);
      if (Object.keys(autoMapping).length > 0) {
        await updateGoogleSheetSync(config.id, { column_mapping: autoMapping });
        setDraft({ ...toDraft(config), column_mapping: autoMapping });
        messageApi.success('Sheet connection works. Mapping was generated from the headers.');
        fetchConfigs();
      } else {
        setDraft(toDraft(config));
        messageApi.warning('Sheet connection works, but no matching columns were found.');
      }
    } catch (error) {
      messageApi.error('Could not read this sheet');
      console.error('Failed to test Google Sheet sync', error);
    } finally {
      setBusyId(null);
    }
  };

  const syncConfig = async (config: GoogleSheetSyncConfig, force = false) => {
    setBusyId(config.id);
    try {
      const response = force
        ? await resyncGoogleSheetSync(config.id)
        : await runGoogleSheetSync(config.id);
      messageApi.success(
        `${force ? 'Resync' : 'Sync'} finished: ${response.data.result.created || 0} created, ${response.data.result.updated || 0} updated`,
      );
      fetchConfigs();
    } catch (error) {
      messageApi.error(force ? 'Resync failed' : 'Sync failed');
      console.error('Failed to run Google Sheet sync', error);
      fetchConfigs();
    } finally {
      setBusyId(null);
    }
  };

  const removeConfig = async (config: GoogleSheetSyncConfig) => {
    setBusyId(config.id);
    try {
      await deleteGoogleSheetSync(config.id);
      messageApi.success('Google Sheet sync removed');
      if (draft.id === config.id) {
        setDraft(emptyDraft());
      }
      fetchConfigs();
    } catch (error) {
      messageApi.error('Failed to delete Google Sheet sync');
      console.error('Failed to delete Google Sheet sync', error);
    } finally {
      setBusyId(null);
    }
  };

  const connectGoogle = async () => {
    setGoogleBusy(true);
    try {
      const response = await connectGoogleOAuth(window.location.href);
      window.location.href = response.data.authorization_url;
    } catch (error) {
      messageApi.error('Google OAuth is not configured yet');
      console.error('Failed to start Google OAuth', error);
    } finally {
      setGoogleBusy(false);
    }
  };

  const selectSpreadsheet = (url: string) => {
    const sheet = spreadsheets.find((candidate) => candidate.url === url);
    setPreview(null);
    setWorksheetTabs([]);
    setDraft((current) => ({
      ...current,
      name: current.name || sheet?.name || '',
      sheet_url: url,
      worksheet_name: '',
    }));
  };

  const disconnectGoogle = async () => {
    setGoogleBusy(true);
    try {
      await disconnectGoogleOAuth();
      messageApi.success('Google disconnected');
      fetchConfigs();
    } catch (error) {
      messageApi.error('Failed to disconnect Google');
      console.error('Failed to disconnect Google', error);
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {contextHolder}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-5">
        <div className="flex items-start justify-between gap-4 border-b pb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Google Sheets</h3>
            <p className="text-sm text-gray-500 mt-1">
              Link a sheet, map columns, then let the daily maintenance job import changes.
            </p>
          </div>
          <Button icon={<PlusOutlined />} onClick={() => { setDraft(emptyDraft()); setPreview(null); }}>
            New Sync
          </Button>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">Private Google Sheets Access</div>
            <div className="text-xs text-gray-600 mt-0.5">
              {googleStatus?.connected
                ? googleStatus.can_list_spreadsheets
                  ? `Connected as ${googleStatus.email || 'Google account'} with read-only Sheets access.`
                  : `Connected as ${googleStatus.email || 'Google account'}. Reconnect once to enable sheet selection.`
                : googleStatus?.configured
                  ? 'Connect Google to read private sheets without making them public.'
                  : 'Google OAuth is not configured on the backend yet.'}
            </div>
          </div>
          {googleStatus?.connected ? (
            <div className="flex flex-wrap gap-2">
              {!googleStatus.can_list_spreadsheets && (
                <Button type="primary" loading={googleBusy} onClick={connectGoogle}>
                  Reconnect Google
                </Button>
              )}
              <Button loading={googleBusy} onClick={disconnectGoogle}>
                Disconnect
              </Button>
            </div>
          ) : (
            <Button type="primary" loading={googleBusy} disabled={!googleStatus?.configured} onClick={connectGoogle}>
              Connect Google
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sync Name</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              value={draft.name}
              onChange={(event) => updateDraft({ name: event.target.value })}
              placeholder="Applications pipeline"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Functionality</label>
            <select
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              value={draft.target_type}
              onChange={(event) => changeTarget(event.target.value as GoogleSheetSyncTarget)}
            >
              <option value="APPLICATIONS">Applications</option>
              <option value="EVENTS">Events</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {googleStatus?.connected && googleStatus.can_list_spreadsheets && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Choose from Google Sheets</label>
              <select
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                value={spreadsheets.some((sheet) => sheet.url === draft.sheet_url) ? draft.sheet_url : ''}
                onChange={(event) => selectSpreadsheet(event.target.value)}
                disabled={spreadsheetsLoading}
              >
                <option value="">{spreadsheetsLoading ? 'Loading sheets...' : 'Select a spreadsheet'}</option>
                {spreadsheets.map((sheet) => (
                  <option key={sheet.id} value={sheet.url}>
                    {sheet.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Google Sheet Link</label>
            <div className="relative">
              <LinkOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="url"
                className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                value={draft.sheet_url}
                onChange={(event) => updateDraft({ sheet_url: event.target.value })}
                placeholder="https://docs.google.com/spreadsheets/d/..."
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Worksheet Tab</label>
            {worksheetTabs.length > 0 ? (
              <>
                <select
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  value={draft.worksheet_name || worksheetTabs[0]?.title || ''}
                  onChange={(event) => updateDraft({ worksheet_name: event.target.value })}
                  disabled={worksheetTabsLoading}
                >
                  {worksheetTabs.map((tab) => (
                    <option key={tab.id} value={tab.title}>
                      {tab.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {worksheetTabs.length === 1
                    ? 'Using the only worksheet tab in this spreadsheet.'
                    : `${worksheetTabs.length} worksheet tabs found. Pick the one to sync.`}
                </p>
              </>
            ) : (
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                value={draft.worksheet_name}
                onChange={(event) => updateDraft({ worksheet_name: event.target.value })}
                placeholder={worksheetTabsLoading ? 'Loading tabs...' : 'Sheet1'}
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Header Row</label>
            <input
              type="number"
              min={1}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              value={draft.header_row}
              onChange={(event) => updateDraft({ header_row: Number(event.target.value) || 1 })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Daily Sync Time</label>
            <TimePicker
              className="w-full text-base py-1.5 rounded-lg border-gray-300 hover:border-blue-500 focus:border-blue-500"
              format="h:mm a"
              value={syncTimeValue(draft.sync_time)}
              onChange={(time) => {
                if (time) updateDraft({ sync_time: time.format('HH:mm') });
              }}
              minuteStep={1}
              use12Hours
              inputReadOnly={false}
              needConfirm={false}
              allowClear={false}
              popupClassName="event-timepicker-dropdown"
              onOpenChange={resetMeridiemColumnScroll}
            />
            <p className="text-xs text-gray-500 mt-1">
              Vercel wakes this job once daily; this time controls which syncs are due during that run.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Sync Timezone</label>
            <select
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              value={draft.sync_timezone}
              onChange={(event) => updateDraft({ sync_timezone: event.target.value })}
            >
              {TIMEZONE_OPTIONS.map((timezone) => (
                <option key={timezone.value} value={timezone.value}>
                  {timezone.label} ({timezone.value})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">Preview before creating</div>
            <div className="text-xs text-gray-600 mt-0.5">
              Test reads the sheet headers, fills the mapping, and shows sample values before anything is saved.
            </div>
          </div>
          <Button icon={<ExperimentOutlined />} loading={previewing} onClick={previewDraft}>
            Test & Auto-map
          </Button>
        </div>

        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <TableOutlined className="text-gray-500" />
              <span className="text-sm font-semibold text-gray-800">Column Mapping</span>
            </div>
            <Button
              size="small"
              icon={<ThunderboltOutlined />}
              disabled={!preview?.headers.length}
              onClick={() => {
                if (!preview?.headers.length) return;
                applyAutoMapping(preview.headers);
                messageApi.success('Mapping regenerated from sheet headers');
              }}
            >
              Auto-map
            </Button>
          </div>
          {requiredFields.length > 0 && (
            <div className="border-t border-gray-200 bg-amber-50/60 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                Required mappings
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {requiredFields.map((field) => {
                  const mappedHeader = draft.column_mapping[field.key] || '';
                  return (
                    <span
                      key={field.key}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        mappedHeader
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-white text-amber-800 ring-1 ring-amber-200'
                      }`}
                    >
                      {field.label}: {mappedHeader || 'needs column'}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {sheetMappingHeaders.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {sheetMappingHeaders.map((sheetHeader) => {
                const selectedField = fieldForSheetHeader(sheetHeader);
                const availableFields = fields.filter(
                  (field) => field.key === selectedField || !Object.prototype.hasOwnProperty.call(draft.column_mapping, field.key),
                );
                return (
                  <div key={sheetHeader} className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr_1.1fr_auto] gap-2 px-4 py-3 items-center">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{sheetHeader}</div>
                        {selectedField && fields.find((field) => field.key === selectedField)?.required && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                            Required
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">Google Sheet column</div>
                    </div>
                    <select
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedField}
                      onChange={(event) => updateSheetColumnMapping(sheetHeader, event.target.value)}
                    >
                      <option value="">Do not import</option>
                      {availableFields.map((field) => (
                        <option key={field.key} value={field.key}>
                          {field.label}{field.required ? ' *' : ''}
                        </option>
                      ))}
                    </select>
                    <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 truncate min-h-[38px] flex items-center">
                      {sampleForHeader(sheetHeader) || 'No sample value'}
                    </div>
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      disabled={!selectedField || fields.find((field) => field.key === selectedField)?.required}
                      onClick={() => selectedField && removeMappingField(selectedField)}
                    />
                  </div>
                );
              })}
            </div>
          ) : visibleMappingFields.length === 0 ? (
            <div className="px-4 py-5 text-sm text-gray-500">
              Save and test the sheet to generate the mapping from its column headers.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {visibleMappingFields.map((field) => (
              <div key={field.key} className="grid grid-cols-1 sm:grid-cols-[160px_1fr_auto] gap-2 px-4 py-3 items-center">
                <label className="text-sm text-gray-700">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <select
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={draft.column_mapping[field.key] || ''}
                  onChange={(event) => updateMapping(field.key, event.target.value)}
                >
                  <option value="">Choose sheet column</option>
                  {preview?.headers.length ? (
                    preview.headers.map((header) => (
                      <option key={header} value={header}>{header}</option>
                    ))
                  ) : (
                    <option value={draft.column_mapping[field.key] || DEFAULT_MAPPING[draft.target_type][field.key]}>
                      {draft.column_mapping[field.key] || DEFAULT_MAPPING[draft.target_type][field.key]}
                    </option>
                  )}
                </select>
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={field.required}
                  onClick={() => removeMappingField(field.key)}
                />
              </div>
              ))}
            </div>
          )}
          {unmappedFields.length > 0 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row gap-2">
              <select
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={fieldToAdd}
                onChange={(event) => setFieldToAdd(event.target.value)}
              >
                <option value="">Add another field</option>
                {unmappedFields.map((field) => (
                  <option key={field.key} value={field.key}>
                    {field.label}
                  </option>
                ))}
              </select>
              <Button icon={<PlusOutlined />} onClick={addMappingField} disabled={!fieldToAdd}>
                Add Field
              </Button>
            </div>
          )}
          {preview?.headers.length ? (
            <div className="bg-slate-50 border-t border-gray-200 px-4 py-3 text-xs text-gray-500">
              Showing {preview.headers.filter((header) => header.trim()).length} sheet columns. Columns set to "Do not import" are ignored during sync.
            </div>
          ) : null}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              className="rounded border-gray-300"
              checked={draft.enabled}
              onChange={(event) => updateDraft({ enabled: event.target.checked })}
            />
            Run this sync automatically each day
          </label>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={saving}
            disabled={!canSaveDraft}
            onClick={saveDraft}
          >
            {draft.id ? 'Update Sync' : 'Create Sync'}
          </Button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Saved Syncs</h3>
        {loading ? (
          <div className="text-sm text-gray-500">Loading syncs...</div>
        ) : configs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
            No Google Sheet syncs yet.
          </div>
        ) : (
          <div className="space-y-3">
            {configs.map((config) => (
              <div key={config.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-gray-900">{config.name}</h4>
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">
                        {config.target_type === 'APPLICATIONS' ? 'Applications' : 'Events'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          config.last_status === 'SUCCESS'
                            ? 'bg-emerald-50 text-emerald-700'
                            : config.last_status === 'ERROR'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-slate-50 text-slate-600'
                        }`}
                      >
                        {config.last_status}
                      </span>
                      {!config.enabled && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs">Paused</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 truncate">{config.sheet_url}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Daily at {normalizeTimeInput(config.sync_time)} {config.sync_timezone || 'America/Los_Angeles'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {config.last_synced_at
                        ? `Last sync ${new Date(config.last_synced_at).toLocaleString()} - ${resultText(config)}`
                        : 'Not synced yet'}
                    </p>
                    {config.last_error && <p className="text-xs text-red-600 mt-1">{config.last_error}</p>}
                    {config.share_with_email && (
                      <p className="text-xs text-blue-700 mt-1">
                        Private sheets should be shared with {config.share_with_email}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Button size="small" onClick={() => { setDraft(toDraft(config)); setPreview(null); }}>
                      Edit
                    </Button>
                    <Button
                      size="small"
                      icon={<ExperimentOutlined />}
                      loading={busyId === config.id}
                      onClick={() => testConfig(config)}
                    >
                      Test
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      icon={<SyncOutlined />}
                      loading={busyId === config.id}
                      onClick={() => syncConfig(config)}
                    >
                      Sync Now
                    </Button>
                    <Button
                      size="small"
                      icon={<SyncOutlined />}
                      loading={busyId === config.id}
                      onClick={() => syncConfig(config, true)}
                    >
                      Resync All
                    </Button>
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      loading={busyId === config.id}
                      onClick={() => removeConfig(config)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {preview && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Sheet Preview</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  {preview.headers.map((header) => (
                    <th key={header} className="py-2 pr-4 font-medium whitespace-nowrap">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, index) => (
                  <tr key={index} className="border-b last:border-b-0">
                    {preview.headers.map((header) => (
                      <td key={header} className="py-2 pr-4 text-gray-700 whitespace-nowrap">
                        {row[header] || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleSheetsSettings;

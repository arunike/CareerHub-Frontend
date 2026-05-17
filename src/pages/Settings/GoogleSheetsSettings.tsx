import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircleOutlined,
  DeleteOutlined,
  ExperimentOutlined,
  HistoryOutlined,
  MoreOutlined,
  LinkOutlined,
  PlusOutlined,
  SyncOutlined,
  TableOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  Button,
  Checkbox,
  Collapse,
  Dropdown,
  InputNumber,
  Modal,
  Segmented,
  Tag,
  message,
  Tabs,
} from 'antd';
import dayjs from 'dayjs';
import {
  applyGoogleSheetImportReview,
  createGoogleSheetSync,
  deleteGoogleSheetSync,
  connectGoogleOAuth,
  disconnectGoogleOAuth,
  getGoogleOAuthStatus,
  getGoogleSheetImportReview,
  getGoogleSpreadsheetTabs,
  getGoogleSheetSyncRuns,
  getGoogleSheetSyncs,
  getGoogleSpreadsheets,
  previewGoogleSheetSync,
  resyncGoogleSheetSync,
  rollbackGoogleSheetSyncRun,
  runGoogleSheetSync,
  testGoogleSheetSync,
  updateGoogleSheetSync,
} from '../../api';
import type {
  GoogleOAuthStatus,
  GoogleSheetDuplicateResolution,
  GoogleSheetImportReview,
  GoogleSheetImportReviewItem,
  GoogleSheetSyncConfig,
  GoogleSheetSyncPreview,
  GoogleSheetSyncTarget,
  GoogleSpreadsheetFile,
  GoogleSpreadsheetTab,
  GoogleSheetSyncRun,
} from '../../types';
import EditableNumberInput from '../../components/EditableNumberInput';
import FriendlyTimeInput from '../../components/FriendlyTimeInput';
import { DEFAULT_TIMEZONE, TIMEZONE_OPTIONS, normalizeTimeZone } from '../../lib/timezones';

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
  missing_row_strategy: 'IGNORE' | 'ARCHIVE_THEN_DELETE';
  missing_row_delete_after_days: number;
  column_mapping: Record<string, string>;
  overwrite_strategies: Record<string, string>;
};

const normalizeTimeInput = (value?: string | null) => (value || '22:00').slice(0, 5);
const syncTimeValue = (value: string) => dayjs(`2000-01-01T${normalizeTimeInput(value)}:00`);
const spreadsheetIdFromUrl = (url: string) => url.match(/\/spreadsheets\/d\/([^/?#]+)/)?.[1] || '';

const FIELD_OPTIONS: Record<
  GoogleSheetSyncTarget,
  Array<{ key: string; label: string; required?: boolean }>
> = {
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
  sync_timezone: DEFAULT_TIMEZONE,
  header_row: 1,
  missing_row_strategy: 'ARCHIVE_THEN_DELETE',
  missing_row_delete_after_days: 30,
  column_mapping: {},
  overwrite_strategies: {},
});

const toDraft = (config: GoogleSheetSyncConfig): Draft => ({
  id: config.id,
  name: config.name,
  sheet_url: config.sheet_url,
  worksheet_name: config.worksheet_name || '',
  target_type: config.target_type,
  enabled: config.enabled,
  sync_time: normalizeTimeInput(config.sync_time),
  sync_timezone: normalizeTimeZone(config.sync_timezone),
  header_row: config.header_row || 1,
  missing_row_strategy: config.missing_row_strategy || 'ARCHIVE_THEN_DELETE',
  missing_row_delete_after_days: config.missing_row_delete_after_days || 30,
  column_mapping: config.column_mapping || {},
  overwrite_strategies: config.overwrite_strategies || {},
});

const HEADER_ALIASES: Record<GoogleSheetSyncTarget, Record<string, string[]>> = {
  APPLICATIONS: {
    external_id: ['external id', 'id', 'row id', 'sheet id'],
    company_name: ['company', 'company name', 'employer', 'organization'],
    role_title: ['role', 'role title', 'title', 'position', 'position applied', 'job title'],
    status: ['status', 'stage', 'application status'],
    job_link: ['job link', 'link', 'url', 'posting', 'posting url'],
    salary_range: [
      'salary',
      'salary range',
      'compensation',
      'pay',
      'pay annual',
      'annual pay',
      'pay annual dollars',
    ],
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
  value
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ');

const buildAutoMapping = (target: GoogleSheetSyncTarget, headers: string[]) => {
  const normalizedHeaders = headers.map((header) => ({
    raw: header,
    normalized: normalizeHeader(header),
  }));
  const mapping: Record<string, string> = {};

  FIELD_OPTIONS[target].forEach((field) => {
    const aliases = HEADER_ALIASES[target][field.key] || [field.label];
    const normalizedAliases = [field.label, field.key, ...aliases].map(normalizeHeader);
    const exact = normalizedHeaders.find((header) => normalizedAliases.includes(header.normalized));
    const fuzzy =
      exact ||
      normalizedHeaders.find((header) =>
        normalizedAliases.some(
          (alias) => header.normalized.includes(alias) || alias.includes(header.normalized)
        )
      );
    if (fuzzy) {
      mapping[field.key] = fuzzy.raw;
    }
  });

  return mapping;
};

type SyncSummarySource = Partial<GoogleSheetSyncConfig['last_result']> | Record<string, unknown>;

const syncSummaryValue = (summary: SyncSummarySource | null | undefined, key: string) => {
  const value = summary?.[key];
  return typeof value === 'number' ? value : 0;
};

const syncMissingFromSheet = (summary: SyncSummarySource | null | undefined) => {
  const explicit = summary?.missing_from_sheet;
  if (typeof explicit === 'number') return explicit;
  return syncSummaryValue(summary, 'archived') + syncSummaryValue(summary, 'deleted');
};

const syncReviewItems = (summary: SyncSummarySource | null | undefined) => [
  {
    key: 'created',
    label: 'Created',
    value: syncSummaryValue(summary, 'created'),
    className: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  },
  {
    key: 'updated',
    label: 'Updated',
    value: syncSummaryValue(summary, 'updated'),
    className: 'border-blue-100 bg-blue-50 text-blue-700',
  },
  {
    key: 'archived',
    label: 'Archived',
    value: syncSummaryValue(summary, 'archived'),
    className: 'border-amber-100 bg-amber-50 text-amber-700',
  },
  {
    key: 'missing_from_sheet',
    label: 'Missing from sheet',
    value: syncMissingFromSheet(summary),
    className: 'border-orange-100 bg-orange-50 text-orange-700',
  },
  {
    key: 'deleted',
    label: 'Deleted',
    value: syncSummaryValue(summary, 'deleted'),
    className: 'border-red-100 bg-red-50 text-red-700',
  },
  {
    key: 'skipped',
    label: 'Skipped',
    value: syncSummaryValue(summary, 'skipped'),
    className: 'border-slate-100 bg-slate-50 text-slate-600',
  },
];

const SyncSummaryGrid = ({ summary }: { summary: SyncSummarySource | null | undefined }) => (
  <div className="grid grid-cols-2 gap-2 2xl:grid-cols-3">
    {syncReviewItems(summary).map((item) => (
      <div key={item.key} className={`min-w-0 rounded-xl border px-3 py-2 ${item.className}`}>
        <div className="text-xl font-semibold leading-none">{item.value}</div>
        <div className="mt-1 break-words text-[11px] font-medium uppercase tracking-[0.08em]">
          {item.label}
        </div>
      </div>
    ))}
  </div>
);

const reviewActionMeta: Record<
  GoogleSheetImportReviewItem['action'],
  { label: string; color: string }
> = {
  create: { label: 'New', color: 'green' },
  update: { label: 'Update', color: 'blue' },
  status_change: { label: 'Status', color: 'purple' },
  possible_duplicate: { label: 'Duplicate?', color: 'orange' },
};

const reviewSummaryText = (review: GoogleSheetImportReview) => {
  const { summary } = review;
  return [
    `${summary.new_applications} new applications detected`,
    `${summary.status_changes} status changes`,
    `${summary.possible_duplicates} possible duplicates`,
    `${summary.updates} other updates`,
  ].join(' / ');
};

const syncHistory = (config: GoogleSheetSyncConfig) => config.last_result?.history || [];

const syncRunErrorText = (run: GoogleSheetSyncRun) => {
  if (run.error_details) return run.error_details;
  if (run.status === 'ERROR' && !run.completed_at) {
    return 'This sync did not finish. It was likely stopped by the hosting runtime before CareerHub could save detailed error output.';
  }
  return '';
};
const duplicateCompareFields = [
  { key: 'company_name', label: 'Company' },
  { key: 'role_title', label: 'Role' },
  { key: 'status', label: 'Status' },
  { key: 'salary_range', label: 'Salary' },
  { key: 'location', label: 'Location' },
  { key: 'office_location', label: 'Office' },
  { key: 'job_link', label: 'Job Link' },
  { key: 'date_applied', label: 'Date Applied' },
  { key: 'notes', label: 'Notes' },
];

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
  const [reviewConfig, setReviewConfig] = useState<GoogleSheetSyncConfig | null>(null);
  const [importReview, setImportReview] = useState<GoogleSheetImportReview | null>(null);
  const [selectedReviewIds, setSelectedReviewIds] = useState<string[]>([]);
  const [duplicateResolutions, setDuplicateResolutions] = useState<
    Record<string, GoogleSheetDuplicateResolution>
  >({});
  const [reviewLoading, setReviewLoading] = useState(false);
  const [applyingReview, setApplyingReview] = useState(false);
  const [historyConfig, setHistoryConfig] = useState<GoogleSheetSyncConfig | null>(null);
  const [syncRuns, setSyncRuns] = useState<GoogleSheetSyncRun[]>([]);
  const [syncRunsLoading, setSyncRunsLoading] = useState(false);
  const [syncReview, setSyncReview] = useState<{
    config: GoogleSheetSyncConfig;
    result: GoogleSheetSyncConfig['last_result'];
    force: boolean;
  } | null>(null);
  const actionAbortRef = useRef<AbortController | null>(null);
  const reviewAbortRef = useRef<AbortController | null>(null);
  const historyAbortRef = useRef<AbortController | null>(null);

  const isCanceledRequest = (error: unknown) =>
    typeof error === 'object' &&
    error !== null &&
    ('code' in error || 'name' in error) &&
    ((error as { code?: string }).code === 'ERR_CANCELED' ||
      (error as { name?: string }).name === 'CanceledError' ||
      (error as { name?: string }).name === 'AbortError');

  const cancelActionRequest = useCallback(() => {
    actionAbortRef.current?.abort();
    actionAbortRef.current = null;
    setBusyId(null);
    setPreviewing(false);
  }, []);

  const cancelReviewRequest = useCallback(() => {
    reviewAbortRef.current?.abort();
    reviewAbortRef.current = null;
    setReviewLoading(false);
    setBusyId(null);
  }, []);

  const closeImportReview = useCallback(() => {
    if (applyingReview) return;
    cancelReviewRequest();
    setReviewConfig(null);
    setImportReview(null);
    setSelectedReviewIds([]);
    setDuplicateResolutions({});
  }, [applyingReview, cancelReviewRequest]);

  const closeHistory = useCallback(() => {
    historyAbortRef.current?.abort();
    historyAbortRef.current = null;
    setHistoryConfig(null);
    setSyncRuns([]);
    setSyncRunsLoading(false);
  }, []);

  const closeSyncReview = useCallback(() => {
    cancelActionRequest();
    setSyncReview(null);
  }, [cancelActionRequest]);

  useEffect(
    () => () => {
      actionAbortRef.current?.abort();
      reviewAbortRef.current?.abort();
      historyAbortRef.current?.abort();
    },
    []
  );

  const fields = useMemo(() => FIELD_OPTIONS[draft.target_type], [draft.target_type]);
  const requiredFields = useMemo(() => fields.filter((field) => field.required), [fields]);
  const activeFields = useMemo(
    () =>
      fields.filter((field) =>
        Object.prototype.hasOwnProperty.call(draft.column_mapping, field.key)
      ),
    [draft.column_mapping, fields]
  );
  const visibleMappingFields = useMemo(() => {
    const activeOptionalFields = activeFields.filter((field) => !field.required);
    return [...requiredFields, ...activeOptionalFields];
  }, [activeFields, requiredFields]);
  const unmappedFields = useMemo(
    () =>
      fields.filter(
        (field) =>
          !field.required && !Object.prototype.hasOwnProperty.call(draft.column_mapping, field.key)
      ),
    [draft.column_mapping, fields]
  );
  const missingRequiredFields = useMemo(
    () => requiredFields.filter((field) => !(draft.column_mapping[field.key] || '').trim()),
    [draft.column_mapping, requiredFields]
  );
  const canSaveDraft = Boolean(
    draft.name.trim() && draft.sheet_url.trim() && missingRequiredFields.length === 0
  );
  const sheetMappingHeaders = useMemo(() => {
    const headers = preview?.headers.filter((header) => header.trim()) || [];
    const extraMappedHeaders = Object.values(draft.column_mapping).filter(
      (header) => header && !headers.includes(header)
    );
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

  const fetchWorksheetTabs = useCallback(
    async (sheetUrl: string) => {
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
    },
    [googleStatus?.connected]
  );

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
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`
    );
  }, [fetchConfigs, messageApi]);

  const updateDraft = (patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const updateMapping = (key: string, value: string) => {
    setDraft((current) => ({
      ...current,
      column_mapping: { ...current.column_mapping, [key]: value },
    }));
  };

  const updateStrategy = (key: string, value: string) => {
    setDraft((current) => ({
      ...current,
      overwrite_strategies: { ...current.overwrite_strategies, [key]: value },
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
        [field.key]:
          preview?.headers.find(
            (header) => normalizeHeader(header) === normalizeHeader(field.label)
          ) || '',
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
    Object.entries(draft.column_mapping).find(
      ([, mappedHeader]) => mappedHeader === sheetHeader
    )?.[0] || '';

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
    missing_row_strategy: draft.missing_row_strategy,
    missing_row_delete_after_days: draft.missing_row_delete_after_days,
    column_mapping: draft.column_mapping,
    overwrite_strategies: draft.overwrite_strategies,
  });

  const previewDraft = async () => {
    if (!draft.sheet_url.trim()) {
      messageApi.warning('Paste a Google Sheet link first');
      return;
    }
    actionAbortRef.current?.abort();
    const controller = new AbortController();
    actionAbortRef.current = controller;
    setPreviewing(true);
    try {
      const response = await previewGoogleSheetSync(draftPayload(), { signal: controller.signal });
      setPreview(response.data.preview);
      const autoMapping = applyAutoMapping(response.data.preview.headers, draft.target_type);
      if (Object.keys(autoMapping).length > 0) {
        messageApi.success('Preview loaded and mapping generated');
      } else {
        messageApi.warning('Preview loaded, but no matching columns were found');
      }
    } catch (error) {
      if (isCanceledRequest(error)) return;
      messageApi.error('Could not preview this sheet');
      console.error('Failed to preview Google Sheet sync', error);
    } finally {
      if (actionAbortRef.current === controller) {
        actionAbortRef.current = null;
        setPreviewing(false);
      }
    }
  };

  const saveDraft = async () => {
    if (!draft.name.trim() || !draft.sheet_url.trim()) {
      messageApi.warning('Name and Google Sheet link are required');
      return;
    }
    if (missingRequiredFields.length > 0) {
      messageApi.warning(
        `Map required fields first: ${missingRequiredFields.map((field) => field.label).join(', ')}`
      );
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
    actionAbortRef.current?.abort();
    const controller = new AbortController();
    actionAbortRef.current = controller;
    setBusyId(config.id);
    try {
      const response = await testGoogleSheetSync(config.id, { signal: controller.signal });
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
      if (isCanceledRequest(error)) return;
      messageApi.error('Could not read this sheet');
      console.error('Failed to test Google Sheet sync', error);
    } finally {
      if (actionAbortRef.current === controller) {
        actionAbortRef.current = null;
        setBusyId(null);
      }
    }
  };

  const syncConfig = async (config: GoogleSheetSyncConfig, force = false) => {
    actionAbortRef.current?.abort();
    const controller = new AbortController();
    actionAbortRef.current = controller;
    setBusyId(config.id);
    try {
      const response = force
        ? await resyncGoogleSheetSync(config.id, { signal: controller.signal })
        : await runGoogleSheetSync(config.id, { signal: controller.signal });
      messageApi.success(`${force ? 'Resync' : 'Sync'} finished`);
      setSyncReview({ config, result: response.data.result, force });
      (response.data.result.warnings || []).forEach((warning) => {
        messageApi.warning(warning.message);
      });
      fetchConfigs();
    } catch (error) {
      if (isCanceledRequest(error)) return;
      messageApi.error(force ? 'Resync failed' : 'Sync failed');
      console.error('Failed to run Google Sheet sync', error);
      fetchConfigs();
    } finally {
      if (actionAbortRef.current === controller) {
        actionAbortRef.current = null;
        setBusyId(null);
      }
    }
  };

  const openImportReview = async (config: GoogleSheetSyncConfig, force = false) => {
    reviewAbortRef.current?.abort();
    const controller = new AbortController();
    reviewAbortRef.current = controller;
    setBusyId(config.id);
    setReviewLoading(true);
    setReviewConfig(config);
    try {
      const response = await getGoogleSheetImportReview(config.id, force, {
        signal: controller.signal,
      });
      setImportReview(response.data.review);
      setSelectedReviewIds(response.data.review.items.map((item) => item.id));
      setDuplicateResolutions(
        response.data.review.items.reduce<Record<string, GoogleSheetDuplicateResolution>>(
          (acc, item) => {
            if (item.action === 'possible_duplicate') {
              acc[item.id] = 'merge';
            }
            return acc;
          },
          {}
        )
      );
      if (response.data.review.items.length === 0) {
        messageApi.success('No import changes need review');
      }
    } catch (error) {
      if (isCanceledRequest(error)) return;
      messageApi.error('Failed to analyze sheet for import');
      console.error('Failed to load Google Sheet import review', error);
      setReviewConfig(null);
    } finally {
      if (reviewAbortRef.current === controller) {
        reviewAbortRef.current = null;
        setReviewLoading(false);
        setBusyId(null);
      }
    }
  };

  const openHistory = async (config: GoogleSheetSyncConfig) => {
    historyAbortRef.current?.abort();
    const controller = new AbortController();
    historyAbortRef.current = controller;
    setHistoryConfig(config);
    setSyncRunsLoading(true);
    setSyncRuns([]);
    try {
      const response = await getGoogleSheetSyncRuns(config.id, { signal: controller.signal });
      setSyncRuns(response.data.runs);
    } catch (error) {
      if (isCanceledRequest(error)) return;
      messageApi.error('Failed to load sync runs');
    } finally {
      if (historyAbortRef.current === controller) {
        historyAbortRef.current = null;
        setSyncRunsLoading(false);
      }
    }
  };

  const rollbackRun = async (config: GoogleSheetSyncConfig, runId: number) => {
    try {
      await rollbackGoogleSheetSyncRun(config.id, runId);
      messageApi.success('Run successfully rolled back');
      openHistory(config);
      fetchConfigs();
    } catch (error: any) {
      messageApi.error(error.response?.data?.error || 'Failed to rollback run');
    }
  };

  const applyReview = async () => {
    if (!reviewConfig || !importReview) return;
    setApplyingReview(true);
    try {
      const response = await applyGoogleSheetImportReview(
        reviewConfig.id,
        selectedReviewIds,
        duplicateResolutions
      );
      messageApi.success(
        `Import applied: ${response.data.result.created || 0} created, ${response.data.result.updated || 0} updated, ${response.data.result.rejected || 0} rejected`
      );
      setReviewConfig(null);
      setImportReview(null);
      setSelectedReviewIds([]);
      setDuplicateResolutions({});
      fetchConfigs();
    } catch (error) {
      messageApi.error('Failed to apply import review');
      console.error('Failed to apply Google Sheet import review', error);
      fetchConfigs();
    } finally {
      setApplyingReview(false);
    }
  };

  const toggleReviewItem = (itemId: string, checked: boolean) => {
    setSelectedReviewIds((current) =>
      checked ? [...current, itemId] : current.filter((id) => id !== itemId)
    );
  };

  const toggleAllReviewItems = (checked: boolean) => {
    setSelectedReviewIds(checked && importReview ? importReview.items.map((item) => item.id) : []);
  };

  const updateDuplicateResolution = (
    itemId: string,
    resolution: GoogleSheetDuplicateResolution
  ) => {
    setDuplicateResolutions((current) => ({ ...current, [itemId]: resolution }));
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
          <Button
            icon={<PlusOutlined />}
            onClick={() => {
              setDraft(emptyDraft());
              setPreview(null);
            }}
          >
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
            <Button
              type="primary"
              loading={googleBusy}
              disabled={!googleStatus?.configured}
              onClick={connectGoogle}
            >
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Choose from Google Sheets
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                value={
                  spreadsheets.some((sheet) => sheet.url === draft.sheet_url) ? draft.sheet_url : ''
                }
                onChange={(event) => selectSpreadsheet(event.target.value)}
                disabled={spreadsheetsLoading}
              >
                <option value="">
                  {spreadsheetsLoading ? 'Loading sheets...' : 'Select a spreadsheet'}
                </option>
                {spreadsheets.map((sheet) => (
                  <option key={sheet.id} value={sheet.url}>
                    {sheet.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Google Sheet Link
            </label>
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
            <EditableNumberInput
              min={1}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              value={draft.header_row}
              fallbackValue={1}
              onCommit={(value) => updateDraft({ header_row: value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Daily Sync Time</label>
            <FriendlyTimeInput
              className="w-full text-base py-1.5 rounded-lg border-gray-300 hover:border-blue-500 focus:border-blue-500"
              value={syncTimeValue(draft.sync_time)}
              onChange={(time) => {
                if (time) updateDraft({ sync_time: time.format('HH:mm') });
              }}
              minuteStep={1}
              allowClear={false}
            />
            <p className="text-xs text-gray-500 mt-1">
              Vercel wakes this job once daily; this time controls which syncs are due during that
              run.
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

        {draft.target_type === 'APPLICATIONS' && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-gray-900">Rows Removed From Sheet</div>
                <div className="text-xs text-gray-600 mt-0.5">
                  When a synced External ID disappears, archive the application first, then delete
                  it after the recovery window.
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[180px_140px] gap-3">
                <select
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={draft.missing_row_strategy}
                  onChange={(event) =>
                    updateDraft({
                      missing_row_strategy: event.target.value as Draft['missing_row_strategy'],
                    })
                  }
                >
                  <option value="ARCHIVE_THEN_DELETE">Archive then delete</option>
                  <option value="IGNORE">Ignore removals</option>
                </select>
                <InputNumber
                  min={1}
                  max={365}
                  className="w-full"
                  addonAfter="days"
                  disabled={draft.missing_row_strategy === 'IGNORE'}
                  value={draft.missing_row_delete_after_days}
                  onChange={(value) =>
                    updateDraft({ missing_row_delete_after_days: Number(value) || 30 })
                  }
                />
              </div>
            </div>
            {!draft.column_mapping.external_id && draft.target_type === 'APPLICATIONS' && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Add an External ID column mapping before relying on automatic removal. Row numbers
                can shift when a Google Sheet row is deleted.
              </div>
            )}
          </div>
        )}

        <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">Preview before creating</div>
            <div className="text-xs text-gray-600 mt-0.5">
              Test reads the sheet headers, fills the mapping, and shows sample values before
              anything is saved.
            </div>
          </div>
          <Button icon={<ExperimentOutlined />} loading={previewing} onClick={previewDraft}>
            Test & Auto-map
          </Button>
        </div>

        <Tabs
          defaultActiveKey="mapping"
          items={[
            {
              key: 'mapping',
              label: 'Column Mapping',
              children: (
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
                          (field) =>
                            field.key === selectedField ||
                            !Object.prototype.hasOwnProperty.call(draft.column_mapping, field.key)
                        );
                        return (
                          <div
                            key={sheetHeader}
                            className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr_1.1fr_auto] gap-2 px-4 py-3 items-center"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {sheetHeader}
                                </div>
                                {selectedField &&
                                  fields.find((field) => field.key === selectedField)?.required && (
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
                              onChange={(event) =>
                                updateSheetColumnMapping(sheetHeader, event.target.value)
                              }
                            >
                              <option value="">Do not import</option>
                              {availableFields.map((field) => (
                                <option key={field.key} value={field.key}>
                                  {field.label}
                                  {field.required ? ' *' : ''}
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
                              disabled={
                                !selectedField ||
                                !!fields.find((field) => field.key === selectedField)?.required
                              }
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
                        <div
                          key={field.key}
                          className="grid grid-cols-1 sm:grid-cols-[160px_1fr_auto] gap-2 px-4 py-3 items-center"
                        >
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
                                <option key={header} value={header}>
                                  {header}
                                </option>
                              ))
                            ) : (
                              <option
                                value={
                                  draft.column_mapping[field.key] ||
                                  DEFAULT_MAPPING[draft.target_type][field.key]
                                }
                              >
                                {draft.column_mapping[field.key] ||
                                  DEFAULT_MAPPING[draft.target_type][field.key]}
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
                      <Button
                        icon={<PlusOutlined />}
                        onClick={addMappingField}
                        disabled={!fieldToAdd}
                      >
                        Add Field
                      </Button>
                    </div>
                  )}
                  {preview?.headers.length ? (
                    <div className="bg-slate-50 border-t border-gray-200 px-4 py-3 text-xs text-gray-500">
                      Showing {preview.headers.filter((header) => header.trim()).length} sheet
                      columns. Columns set to "Do not import" are ignored during sync.
                    </div>
                  ) : null}
                </div>
              ),
            },
            {
              key: 'strategy',
              label: 'Overwrite Strategy',
              children: (
                <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <p className="text-sm text-gray-600">
                      Choose how we handle fields when an application already exists.
                    </p>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {visibleMappingFields.map((field) => (
                      <div
                        key={field.key}
                        className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4 px-4 py-3 items-center"
                      >
                        <label className="text-sm font-medium text-gray-700">{field.label}</label>
                        <Segmented
                          options={[
                            { label: 'Always Overwrite', value: 'always' },
                            { label: 'Only if Empty', value: 'if_empty' },
                            { label: 'Never Overwrite', value: 'never' },
                          ]}
                          value={draft.overwrite_strategies[field.key] || 'always'}
                          onChange={(value) => updateStrategy(field.key, value.toString())}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ),
            },
          ]}
        />

        <div className="pt-5 mt-2 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              checked={draft.enabled}
              onChange={(event) => updateDraft({ enabled: event.target.checked })}
            />
            Run this sync automatically each day
          </label>
          <Button
            type="primary"
            size="large"
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
            {configs.map((config) => {
              const history = syncHistory(config);
              return (
                <div key={config.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
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
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs">
                            Paused
                          </span>
                        )}
                      </div>
                      <p className="mt-2 max-w-full truncate text-sm text-gray-500">
                        {config.sheet_url}
                      </p>
                      <div className="mt-3 grid gap-2 text-xs text-gray-500 sm:grid-cols-2">
                        <div className="rounded-lg bg-gray-50 px-3 py-2">
                          <div className="font-medium text-gray-400">Daily Sync</div>
                          <div className="mt-0.5 text-gray-700">
                            {normalizeTimeInput(config.sync_time)}{' '}
                            {normalizeTimeZone(config.sync_timezone)}
                          </div>
                        </div>
                        <div className="rounded-lg bg-gray-50 px-3 py-2">
                          <div className="font-medium text-gray-400">Last Sync</div>
                          <div className="mt-0.5 text-gray-700">
                            {config.last_synced_at
                              ? new Date(config.last_synced_at).toLocaleString()
                              : 'Not synced yet'}
                          </div>
                        </div>
                        {config.target_type === 'APPLICATIONS' && (
                          <div className="rounded-lg bg-gray-50 px-3 py-2 sm:col-span-2">
                            <div className="font-medium text-gray-400">Missing Rows</div>
                            <div className="mt-0.5 text-gray-700">
                              {config.missing_row_strategy === 'ARCHIVE_THEN_DELETE'
                                ? `Archive first, delete after ${config.missing_row_delete_after_days || 30} days`
                                : 'Ignore missing rows'}
                            </div>
                          </div>
                        )}
                      </div>
                      {config.last_error && (
                        <p className="text-xs text-red-600 mt-1">{config.last_error}</p>
                      )}
                      {config.share_with_email && (
                        <p className="text-xs text-blue-700 mt-1">
                          Private sheets should be shared with {config.share_with_email}
                        </p>
                      )}
                    </div>
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap justify-start gap-2 2xl:justify-end">
                        <Button
                          size="small"
                          type="primary"
                          icon={<SyncOutlined />}
                          loading={busyId === config.id}
                          onClick={() => syncConfig(config)}
                        >
                          Sync Now
                        </Button>
                        {config.target_type === 'APPLICATIONS' && (
                          <Button
                            size="small"
                            icon={<TableOutlined />}
                            loading={busyId === config.id}
                            onClick={() => openImportReview(config)}
                          >
                            Review
                          </Button>
                        )}
                        <Button
                          size="small"
                          icon={<HistoryOutlined />}
                          disabled={history.length === 0}
                          onClick={() => openHistory(config)}
                        >
                          History{history.length > 0 ? ` (${history.length})` : ''}
                        </Button>
                        <Dropdown
                          trigger={['click']}
                          menu={{
                            items: [
                              { key: 'edit', label: 'Edit' },
                              { key: 'test', label: 'Test connection' },
                              { key: 'resync', label: 'Resync all rows' },
                              { type: 'divider' },
                              { key: 'delete', label: 'Delete sync', danger: true },
                            ],
                            onClick: ({ key }) => {
                              if (key === 'edit') {
                                setDraft(toDraft(config));
                                setPreview(null);
                              } else if (key === 'test') {
                                testConfig(config);
                              } else if (key === 'resync') {
                                syncConfig(config, true);
                              } else if (key === 'delete') {
                                removeConfig(config);
                              }
                            },
                          }}
                        >
                          <Button
                            size="small"
                            icon={<MoreOutlined />}
                            loading={busyId === config.id}
                          >
                            More
                          </Button>
                        </Dropdown>
                      </div>
                      {config.last_synced_at && <SyncSummaryGrid summary={config.last_result} />}
                    </div>
                  </div>
                  {(config.last_result?.warnings || []).length > 0 && (
                    <div className="mt-4 space-y-2">
                      {(config.last_result?.warnings || []).map((warning, index) => (
                        <div
                          key={index}
                          className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800"
                        >
                          {warning.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        title={historyConfig ? `Sync Change History: ${historyConfig.name}` : 'Sync Change History'}
        open={Boolean(historyConfig)}
        onCancel={closeHistory}
        width={780}
        footer={[
          <Button key="close" type="primary" onClick={closeHistory}>
            Done
          </Button>,
        ]}
      >
        {historyConfig ? (
          <div className="space-y-4">
            {syncRunsLoading ? (
              <div className="py-10 text-center text-sm text-gray-500">Loading sync runs...</div>
            ) : syncRuns.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                No sync runs have been recorded for this configuration yet.
              </div>
            ) : (
              <div className="max-h-[520px] space-y-4 overflow-y-auto pr-1">
                {syncRuns.map((run) => {
                  const errorText = syncRunErrorText(run);

                  return (
                    <div
                      key={run.id}
                      className="rounded-xl border border-gray-200 bg-white overflow-hidden"
                    >
                      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">
                              {new Date(run.started_at).toLocaleString()}
                            </span>
                            <Tag
                              color={
                                run.status === 'SUCCESS'
                                  ? 'green'
                                  : run.status === 'ROLLED_BACK'
                                    ? 'purple'
                                    : 'red'
                              }
                            >
                              {run.status}
                            </Tag>
                          </div>
                          <div className="mt-3 max-w-2xl">
                            <SyncSummaryGrid summary={run.summary} />
                          </div>
                          {errorText && (
                            <div className="mt-2 max-w-2xl rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                              {errorText}
                            </div>
                          )}
                        </div>
                        {run.status !== 'ROLLED_BACK' && run.changes?.length > 0 && (
                          <Button
                            size="small"
                            danger
                            onClick={() => {
                              Modal.confirm({
                                title: 'Rollback this sync?',
                                content:
                                  'This will undo creations and field updates made during this specific sync run.',
                                okText: 'Yes, rollback',
                                okButtonProps: { danger: true },
                                onOk: () => rollbackRun(historyConfig, run.id),
                              });
                            }}
                          >
                            Rollback
                          </Button>
                        )}
                      </div>
                      {run.changes?.length > 0 && (
                        <div className="border-t border-gray-100 px-4 py-3">
                          <Collapse
                            ghost
                            items={[
                              {
                                key: 'details',
                                label: (
                                  <span className="text-sm font-semibold text-gray-700">
                                    Details ({run.changes.length})
                                  </span>
                                ),
                                children: (
                                  <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
                                    {run.changes.map((change, i) => (
                                      <div key={i} className="text-sm">
                                        <span className="font-medium text-gray-700 capitalize">
                                          {change.action}
                                        </span>{' '}
                                        row {change.row_number}
                                        {change.diff && Object.keys(change.diff).length > 0 && (
                                          <div className="mt-1 space-y-1 border-l-2 border-gray-100 pl-2">
                                            {Object.entries(change.diff).map(([field, vals]) => (
                                              <div key={field} className="text-xs text-gray-600">
                                                <span className="font-medium capitalize">
                                                  {field.replace(/_/g, ' ')}:
                                                </span>{' '}
                                                {vals.old || 'blank'} {'->'} {vals.new || 'blank'}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ),
                              },
                            ]}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal
        title={
          syncReview
            ? `${syncReview.force ? 'Resync' : 'Sync'} Review: ${syncReview.config.name}`
            : 'Sync Review'
        }
        open={Boolean(syncReview)}
        onCancel={closeSyncReview}
        width={760}
        footer={[
          syncReview ? (
            <Button
              key="history"
              icon={<HistoryOutlined />}
              onClick={() => {
                const config = syncReview.config;
                setSyncReview(null);
                openHistory(config);
              }}
            >
              View History
            </Button>
          ) : null,
          <Button key="done" type="primary" onClick={closeSyncReview}>
            Done
          </Button>,
        ].filter(Boolean)}
      >
        {syncReview ? (
          <div className="space-y-4">
            <SyncSummaryGrid summary={syncReview.result} />
            {syncMissingFromSheet(syncReview.result) > 0 && (
              <div className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                {syncMissingFromSheet(syncReview.result)} row
                {syncMissingFromSheet(syncReview.result) === 1 ? '' : 's'} were missing from the
                sheet. CareerHub archived new missing records first, and only permanently deletes
                records after the configured retention window.
              </div>
            )}
            {(syncReview.result.warnings || []).length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700">
                  Warnings
                </div>
                {(syncReview.result.warnings || []).map((warning, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800"
                  >
                    {warning.message}
                  </div>
                ))}
              </div>
            )}
            {(syncReview.result.errors || []).length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-red-700">
                  Errors
                </div>
                {(syncReview.result.errors || []).map((error, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700"
                  >
                    {error.row ? `Row ${error.row}: ` : ''}
                    {error.error}
                  </div>
                ))}
              </div>
            )}
            {(syncReview.result.history || []).length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                  What Changed
                </div>
                <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
                  {(syncReview.result.history || []).slice(0, 20).map((entry, index) => (
                    <div key={index} className="rounded-lg border border-gray-100 px-3 py-2">
                      <div className="text-sm text-gray-800">{entry.message}</div>
                      {entry.row && (
                        <div className="mt-1 text-xs text-gray-400">Row {entry.row}</div>
                      )}
                    </div>
                  ))}
                  {(syncReview.result.history || []).length > 20 && (
                    <div className="text-center text-xs text-gray-400">
                      Showing the first 20 changes. Open History for the full run.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal
        title={reviewConfig ? `Review Import: ${reviewConfig.name}` : 'Review Import'}
        open={Boolean(reviewConfig)}
        onCancel={closeImportReview}
        width={860}
        footer={[
          <Button key="cancel" disabled={applyingReview} onClick={closeImportReview}>
            Cancel
          </Button>,
          <Button
            key="apply"
            type="primary"
            loading={applyingReview}
            disabled={!importReview || selectedReviewIds.length === 0}
            onClick={applyReview}
          >
            Apply Selected
          </Button>,
        ]}
      >
        {reviewLoading ? (
          <div className="py-10 text-center text-sm text-gray-500">Scanning sheet changes...</div>
        ) : importReview ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ReviewMetric
                label="New"
                value={importReview.summary.new_applications}
                tone="emerald"
              />
              <ReviewMetric
                label="Status"
                value={importReview.summary.status_changes}
                tone="blue"
              />
              <ReviewMetric
                label="Duplicates"
                value={importReview.summary.possible_duplicates}
                tone="amber"
              />
              <ReviewMetric label="Updates" value={importReview.summary.updates} tone="blue" />
            </div>
            <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {reviewSummaryText(importReview)}
                </div>
                <div className="mt-0.5 text-xs text-gray-500">
                  {importReview.scanned_rows} row(s) scanned. Unchecked rows are rejected for this
                  import run.
                </div>
              </div>
              <Checkbox
                checked={
                  selectedReviewIds.length === importReview.items.length &&
                  importReview.items.length > 0
                }
                indeterminate={
                  selectedReviewIds.length > 0 &&
                  selectedReviewIds.length < importReview.items.length
                }
                onChange={(event) => toggleAllReviewItems(event.target.checked)}
              >
                Select all
              </Checkbox>
            </div>
            {importReview.errors.length > 0 && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">
                {importReview.errors.length} row(s) could not be reviewed. Fix those rows in Google
                Sheets and scan again.
              </div>
            )}
            {importReview.items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                No new imports or updates were detected.
              </div>
            ) : (
              <div className="max-h-[440px] space-y-3 overflow-y-auto pr-1">
                {importReview.items.map((item) => {
                  const meta = reviewActionMeta[item.action];
                  const checked = selectedReviewIds.includes(item.id);
                  const changeEntries = Object.entries(item.changes || {});
                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-4 transition ${
                        checked
                          ? 'border-sky-200 bg-sky-50/70'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={checked}
                          onChange={(event) => toggleReviewItem(item.id, event.target.checked)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-gray-900">{item.title}</span>
                            <Tag color={meta.color}>{meta.label}</Tag>
                            <span className="text-xs text-gray-400">Row {item.row}</span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">{item.detail}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                            {item.status && <span>Status: {item.status}</span>}
                            {item.salary_range && <span>Salary: {item.salary_range}</span>}
                            {item.location && <span>Location: {item.location}</span>}
                          </div>
                          {changeEntries.length > 0 && (
                            <div className="mt-3 space-y-1 rounded-lg bg-white/80 px-3 py-2 text-xs text-gray-600">
                              {changeEntries.slice(0, 4).map(([field, change]) => (
                                <div key={field} className="grid grid-cols-[110px_1fr] gap-2">
                                  <span className="font-medium capitalize text-gray-500">
                                    {field.replace(/_/g, ' ')}
                                  </span>
                                  <span className="truncate">
                                    {change.from || 'blank'} {'->'} {change.to || 'blank'}
                                  </span>
                                </div>
                              ))}
                              {changeEntries.length > 4 && (
                                <div className="text-gray-400">
                                  + {changeEntries.length - 4} more change(s)
                                </div>
                              )}
                            </div>
                          )}
                          {item.action === 'possible_duplicate' && (
                            <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                  <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                                    Duplicate resolution
                                  </div>
                                  <div className="mt-1 text-xs text-amber-700">
                                    Choose how this row should be applied if selected.
                                  </div>
                                </div>
                                <Segmented
                                  size="small"
                                  value={duplicateResolutions[item.id] || 'merge'}
                                  onChange={(value) =>
                                    updateDuplicateResolution(
                                      item.id,
                                      value as GoogleSheetDuplicateResolution
                                    )
                                  }
                                  options={[
                                    { label: 'Merge', value: 'merge' },
                                    { label: 'Keep separate', value: 'keep_separate' },
                                    {
                                      label: 'Intentional duplicate',
                                      value: 'intentional_duplicate',
                                    },
                                  ]}
                                />
                              </div>
                              <div className="mt-3 overflow-x-auto rounded-lg border border-amber-100 bg-white">
                                <div className="grid min-w-[620px] grid-cols-[140px_1fr_1fr] border-b border-amber-100 bg-amber-50/70 text-xs font-semibold uppercase tracking-wide text-amber-800">
                                  <div className="px-3 py-2">Field</div>
                                  <div className="px-3 py-2">Existing / matched</div>
                                  <div className="px-3 py-2">Incoming sheet row</div>
                                </div>
                                {duplicateCompareFields.map((field) => {
                                  const existingValue =
                                    item.duplicate_candidate?.fields?.[field.key] || '';
                                  const incomingValue = item.incoming_fields?.[field.key] || '';
                                  const differs = existingValue !== incomingValue;
                                  return (
                                    <div
                                      key={field.key}
                                      className="grid min-w-[620px] grid-cols-[140px_1fr_1fr] border-b border-gray-100 last:border-b-0 text-xs"
                                    >
                                      <div className="px-3 py-2 font-medium text-gray-500">
                                        {field.label}
                                      </div>
                                      <div
                                        className={`px-3 py-2 ${differs ? 'bg-amber-50 text-gray-900' : 'text-gray-600'}`}
                                      >
                                        {existingValue || 'blank'}
                                      </div>
                                      <div
                                        className={`px-3 py-2 ${differs ? 'bg-blue-50 text-gray-900' : 'text-gray-600'}`}
                                      >
                                        {incomingValue || 'blank'}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {preview && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Sheet Preview</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  {preview.headers.map((header) => (
                    <th key={header} className="py-2 pr-4 font-medium whitespace-nowrap">
                      {header}
                    </th>
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

const ReviewMetric = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'emerald' | 'blue' | 'amber' | 'sky';
}) => {
  const classes = {
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    sky: 'border-sky-100 bg-sky-50 text-sky-700',
  }[tone];
  return (
    <div className={`rounded-xl border px-4 py-3 ${classes}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wide">{label}</div>
    </div>
  );
};

export default GoogleSheetsSettings;

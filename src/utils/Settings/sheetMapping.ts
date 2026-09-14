import dayjs from 'dayjs';
import type { GoogleSheetSyncConfig, GoogleSheetSyncTarget } from '../../types';
import { DEFAULT_TIMEZONE, normalizeTimeZone } from '../../lib/timezones';

export type Draft = {
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

export const normalizeTimeInput = (value?: string | null) => (value || '22:00').slice(0, 5);

export const syncTimeValue = (value: string) => dayjs(`2000-01-01T${normalizeTimeInput(value)}:00`);

export const spreadsheetIdFromUrl = (url: string) =>
  url.match(/\/spreadsheets\/d\/([^/?#]+)/)?.[1] || '';

export const FIELD_OPTIONS: Record<
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

export const DEFAULT_MAPPING: Record<GoogleSheetSyncTarget, Record<string, string>> = {
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

export const emptyDraft = (target: GoogleSheetSyncTarget = 'APPLICATIONS'): Draft => ({
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

export const toDraft = (config: GoogleSheetSyncConfig): Draft => ({
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

export const HEADER_ALIASES: Record<GoogleSheetSyncTarget, Record<string, string[]>> = {
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

export const normalizeHeader = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ');

export const buildAutoMapping = (target: GoogleSheetSyncTarget, headers: string[]) => {
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

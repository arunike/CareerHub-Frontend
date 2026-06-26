export interface TeamEntry {
  id: string;
  name: string;
  start_date: string;
  end_date?: string | null;
  is_current: boolean;
  norms: string;
  manager?: string;
  is_locked?: boolean;
}

export interface RaiseEntry {
  id: string;
  date: string;
  type: 'merit' | 'cola' | 'market' | 'retention' | 'other';
  label?: string;
  base_before: number;
  base_after: number;
  bonus_before: number;
  bonus_after: number;
  equity_before: number;
  equity_after: number;
  notes?: string;
}

export interface HolidayTab {
  id: string;
  name: string;
  color?: string;
  locked?: boolean;
}

export interface EmploymentType {
  value: string;
  label: string;
  color: string;
  locked?: boolean;
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  count?: number;
  until?: string;
  byweekday?: number[];
}

export interface NotificationPreferences {
  email?: boolean;
  push?: boolean;
  [key: string]: unknown;
}

export interface GlobalAvailability {
  [key: string]: unknown;
}

export interface EventCategory {
  id: number;
  name: string;
  color: string;
  icon?: string;
  is_locked?: boolean;
}

export interface Event {
  id: number;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  timezone: string;
  category?: number;
  category_details?: EventCategory;
  color?: string;
  location_type: 'in_person' | 'virtual' | 'hybrid';
  location?: string;
  meeting_link?: string;
  is_recurring: boolean;
  recurrence_rule?: RecurrenceRule | null;
  parent_event?: number;
  application?: number | null;
  application_details?: {
    id: number;
    company: string;
    role: string;
    status: string;
  };
  notes?: string;
  reminder_minutes: number;
  created_at: string;
  updated_at: string;
  is_virtual?: boolean;
  is_locked?: boolean;
}

export interface Holiday {
  id: number;
  date: string;
  group_id?: string;
  description: string;
  holiday_type?: 'custom' | 'federal';
  is_recurring: boolean;
  is_locked: boolean;
  is_ignored?: boolean;
  tab?: string | null;
  tab_color?: string;
  tab_name?: string;
}

export interface Availability {
  date: string;
  day_name: string;
  readable_date: string;
  availability: string | null;
}

export interface UserSettings {
  id: number;
  work_start_time: string;
  work_end_time: string;
  work_time_ranges: { start: string; end: string; days?: number[] }[];
  work_days: number[];
  default_event_duration: number;
  buffer_time: number;
  availability_weeks: number;
  primary_timezone: string;
  theme: 'light' | 'dark' | 'auto';
  notification_preferences: NotificationPreferences;
  global_availability: GlobalAvailability;
  ghosting_threshold_days: number;
  default_event_category?: number | null;
  ignored_federal_holidays?: string[];
  employment_types?: EmploymentType[];
  holiday_tabs?: HolidayTab[];
  application_stages?: Array<{
    key: string;
    label: string;
    shortLabel: string;
    tone: string;
    locked?: boolean;
  }>;
  hidden_nav_items?: string[];
  is_locked?: boolean;
  ai_provider_adapter?: 'claude' | 'gemini' | 'openai' | 'openrouter' | 'custom';
  ai_provider_endpoint?: string;
  ai_provider_model?: string;
  ai_provider_api_key?: string;
  ai_provider_api_key_configured?: boolean;
  ai_provider_api_key_masked?: string;
  account_deletion_requested_at?: string | null;
  account_deletion_scheduled_for?: string | null;
  display_name?: string;
  profile_picture?: string | null;
  email?: string;
  created_at: string;
  updated_at: string;
}

export type GoogleSheetSyncTarget = 'APPLICATIONS' | 'EVENTS';
export type GoogleSheetSyncStatus = 'IDLE' | 'SUCCESS' | 'ERROR';

export interface GoogleSheetSyncConfig {
  id: number;
  name: string;
  sheet_url: string;
  spreadsheet_id: string;
  worksheet_name: string;
  gid: string;
  target_type: GoogleSheetSyncTarget;
  column_mapping: Record<string, string>;
  overwrite_strategies?: Record<string, string>;
  enabled: boolean;
  sync_time: string;
  sync_timezone: string;
  header_row: number;
  missing_row_strategy: 'IGNORE' | 'ARCHIVE_THEN_DELETE';
  missing_row_delete_after_days: number;
  last_synced_at?: string | null;
  last_status: GoogleSheetSyncStatus;
  last_error: string;
  last_result: {
    created?: number;
    updated?: number;
    archived?: number;
    deleted?: number;
    missing_from_sheet?: number;
    skipped?: number;
    scanned_rows?: number;
    history?: Array<{
      type: string;
      row?: number;
      company_name?: string;
      role_title?: string;
      field?: string;
      before?: string;
      after?: string;
      message: string;
      local_object_id?: number | null;
      created_at?: string;
    }>;
    errors?: Array<{ row?: number; error: string }>;
    warnings?: Array<{ row?: number; message: string; local_object_id?: number | null }>;
    [key: string]: unknown;
  };
  share_with_email?: string;
  created_at: string;
  updated_at: string;
}

export interface GoogleSheetSyncRun {
  id: number;
  config: number;
  status: 'SUCCESS' | 'ERROR' | 'ROLLED_BACK';
  started_at: string;
  completed_at?: string | null;
  summary: Record<string, unknown>;
  changes: Array<{
    action: string;
    row_number: number;
    diff: Record<string, { old: string | null; new: string | null }>;
    history_id?: number | null;
    local_object_id?: number | null;
  }>;
  error_details?: string;
}

export interface GoogleSheetSyncPreview {
  headers: string[];
  rows: Array<Record<string, string>>;
}

export type GoogleSheetImportReviewAction =
  | 'create'
  | 'update'
  | 'status_change'
  | 'possible_duplicate';
export type GoogleSheetDuplicateResolution = 'merge' | 'keep_separate' | 'intentional_duplicate';

export interface GoogleSheetImportReviewItem {
  id: string;
  row: number;
  external_key: string;
  action: GoogleSheetImportReviewAction;
  company_name: string;
  role_title: string;
  status: string;
  salary_range: string;
  location: string;
  job_link: string;
  local_object_id?: number | null;
  duplicate_row?: number | null;
  duplicate_candidate?: {
    local_object_id?: number | null;
    row?: number | null;
    fields: Record<string, string>;
  } | null;
  incoming_fields?: Record<string, string>;
  title: string;
  detail: string;
  changes: Record<string, { from: string; to: string }>;
}

export interface GoogleSheetImportReview {
  target_type: GoogleSheetSyncTarget;
  summary: {
    new_applications: number;
    status_changes: number;
    possible_duplicates: number;
    updates: number;
    unchanged: number;
    errors: number;
  };
  items: GoogleSheetImportReviewItem[];
  errors: Array<{ row?: number; error: string }>;
  scanned_rows: number;
}

export interface GoogleOAuthStatus {
  configured: boolean;
  connected: boolean;
  email: string;
  scopes: string[];
  can_list_spreadsheets: boolean;
}

export interface GoogleSpreadsheetFile {
  id: string;
  name: string;
  url: string;
  modified_time: string;
}

export interface GoogleSpreadsheetTab {
  id: number;
  title: string;
  index: number;
}

export interface ConflictAlert {
  id: number;
  event1: number;
  event2: number;
  event1_details: Event;
  event2_details: Event;
  detected_at: string;
  resolved: boolean;
}

export interface Document {
  id: number;
  title: string;
  file: string | null;
  file_name?: string | null;
  document_type: 'RESUME' | 'COVER_LETTER' | 'PORTFOLIO' | 'OTHER';
  application?: number | null;
  root_document?: number | null;
  root_document_id?: number;
  version_number?: number;
  version_count?: number;
  is_current?: boolean;
  is_locked?: boolean;
  application_details?: {
    id: number;
    company: string;
    role: string;
  };
  created_at: string;
  updated_at: string;
}

export type ApplicationTimelineStage = string;

export interface ApplicationTimelineEntry {
  id: number;
  application: number;
  stage: ApplicationTimelineStage;
  stage_label: string;
  stage_order: number;
  event_date?: string | null;
  notes: string;
  documents: number[];
  document_details?: Array<{
    id: number;
    title: string;
    document_type: Document['document_type'];
    file_name?: string | null;
    application?: number | null;
  }>;
  created_at: string;
  updated_at: string;
}

export interface ApplicationTimelineAnalytics {
  average_time_to_interview_days: number | null;
  time_to_interview_sample_size: number;
  average_days_to_offer: number | null;
  days_to_offer_sample_size: number;
  stage_conversion: Array<{
    key: string;
    label: string;
    reached_count: number;
    current_count: number;
    conversion_rate: number;
  }>;
  stale_threshold_days: number;
  stale_in_stage: Array<{
    application_id: number;
    company: string;
    role_title: string;
    status: string;
    status_label: string;
    days_in_stage: number;
    last_stage_date?: string | null;
    source: string;
  }>;
  offer_rate_by_source: Array<{
    name: string;
    total: number;
    offers: number;
    offer_rate: number;
  }>;
  offer_rate_by_company: Array<{
    name: string;
    total: number;
    offers: number;
    offer_rate: number;
  }>;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  due_date?: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface WeeklyReviewItemApplication {
  id: number;
  company: string;
  role_title: string;
  date_applied: string;
  status: string;
}

export interface WeeklyReviewItemInterview {
  id: number;
  name: string;
  date: string;
  company?: string | null;
  role_title?: string | null;
}

export interface WeeklyReviewItemTask {
  id: number;
  title: string;
  status: 'TODO' | 'IN_PROGRESS';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  due_date?: string | null;
  is_overdue: boolean;
}

export interface WeeklyReview {
  start_date: string;
  end_date: string;
  applications_sent: number;
  interviews_done: number;
  next_actions_count: number;
  applications: WeeklyReviewItemApplication[];
  interviews: WeeklyReviewItemInterview[];
  next_actions: WeeklyReviewItemTask[];
  summary_text: string;
  generated_at: string;
}

export interface ShareLink {
  id: number;
  uuid: string;
  title: string;
  host_display_name?: string;
  host_email?: string;
  public_note?: string;
  duration_days: number;
  booking_block_minutes: number;
  buffer_minutes: number;
  max_bookings_per_day: number;
  allow_reschedule_cancel: boolean;
  reschedule_cancel_deadline_hours: number;
  intake_questions: BookingIntakeQuestion[];
  booking_analytics?: {
    total: number;
    active: number;
    canceled: number;
    upcoming: number;
  };
  created_at: string;
  expires_at: string;
  is_active: boolean;
  is_expired: boolean;
  is_locked: boolean;
}

export interface BookingIntakeQuestion {
  id: string;
  label: string;
  required?: boolean;
}

export interface PublicBooking {
  id: number;
  uuid: string;
  share_link: number;
  share_link_title?: string;
  name: string;
  email: string;
  date: string;
  start_time: string;
  end_time: string;
  timezone: string;
  notes: string;
  intake_answers?: Record<string, string>;
  cancel_reason?: string;
  status: 'active' | 'canceled';
  is_locked: boolean;
  reschedule_url?: string;
  cancel_url?: string;
  ics_url?: string;
  created_at: string;
}

export interface BookingSlot {
  start_time: string;
  end_time: string;
  label: string;
}

export interface BookingDayAvailability {
  date: string;
  day_name: string;
  readable_date: string;
  slots: BookingSlot[];
}

export interface SchedulePhase {
  id: string;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
  hourly_rate?: number | null;
  hours_per_day?: number | null;
  working_days_per_week?: number | null;
  total_hours_worked?: number | null;
  overtime_hours?: number | null;
  overtime_rate?: number | null;
  overtime_multiplier?: number | null;
  total_earnings_override?: number | null;
}

export interface Experience {
  id?: number;
  title: string;
  company: string;
  location?: string;
  start_date?: string | null;
  end_date?: string | null;
  is_current: boolean;
  description?: string;
  skills?: string[];
  logo?: string | null;
  employment_type?: 'full_time' | 'part_time' | 'internship' | 'contract' | 'freelance';
  is_promotion?: boolean;
  is_return_offer?: boolean;
  is_locked?: boolean;
  is_pinned?: boolean;
  offer?: number | null;
  hourly_rate?: number | null;
  hours_per_day?: number | null;
  working_days_per_week?: number | null;
  total_hours_worked?: number | null;
  overtime_hours?: number | null;
  overtime_rate?: number | null;
  overtime_multiplier?: number | null;
  total_earnings_override?: number | null;
  base_salary?: number | null;
  bonus?: number | null;
  equity?: number | null;
  team_history?: TeamEntry[];
  schedule_phases?: SchedulePhase[];
  created_at?: string;
  updated_at?: string;
}

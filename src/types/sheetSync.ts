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
  // Kept because postings get taken down mid-process.
  job_description?: string;
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

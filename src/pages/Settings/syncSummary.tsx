import type {
  GoogleSheetImportReview,
  GoogleSheetImportReviewItem,
  GoogleSheetSyncConfig,
  GoogleSheetSyncRun,
} from '../../types';

export type SyncSummarySource =
  | Partial<GoogleSheetSyncConfig['last_result']>
  | Record<string, unknown>;

export const syncSummaryValue = (summary: SyncSummarySource | null | undefined, key: string) => {
  const value = summary?.[key];
  return typeof value === 'number' ? value : 0;
};

export const syncMissingFromSheet = (summary: SyncSummarySource | null | undefined) => {
  const explicit = summary?.missing_from_sheet;
  if (typeof explicit === 'number') return explicit;
  return syncSummaryValue(summary, 'archived') + syncSummaryValue(summary, 'deleted');
};

export const syncReviewItems = (summary: SyncSummarySource | null | undefined) => [
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

export const SyncSummaryGrid = ({ summary }: { summary: SyncSummarySource | null | undefined }) => (
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

export const reviewActionMeta: Record<
  GoogleSheetImportReviewItem['action'],
  { label: string; color: string }
> = {
  create: { label: 'New', color: 'green' },
  update: { label: 'Update', color: 'blue' },
  status_change: { label: 'Status', color: 'purple' },
  possible_duplicate: { label: 'Duplicate?', color: 'orange' },
};

export const reviewSummaryText = (review: GoogleSheetImportReview) => {
  const { summary } = review;
  return [
    `${summary.new_applications} new applications detected`,
    `${summary.status_changes} status changes`,
    `${summary.possible_duplicates} possible duplicates`,
    `${summary.updates} other updates`,
  ].join(' / ');
};

export const syncHistory = (config: GoogleSheetSyncConfig) => config.last_result?.history || [];

export const syncRunErrorText = (run: GoogleSheetSyncRun) => {
  if (run.error_details) return run.error_details;
  if (run.status === 'ERROR' && !run.completed_at) {
    return 'This sync did not finish. It was likely stopped by the hosting runtime before CareerHub could save detailed error output.';
  }
  return '';
};

export const duplicateCompareFields = [
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

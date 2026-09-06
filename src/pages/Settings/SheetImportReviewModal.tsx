import { Button, Checkbox, Segmented, Tag } from 'antd';
import Modal from '../../components/MobileModal';
import type {
  GoogleSheetDuplicateResolution,
  GoogleSheetImportReview,
  GoogleSheetSyncConfig,
} from '../../types';
import { duplicateCompareFields, reviewActionMeta, reviewSummaryText } from './syncSummary';

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
    emerald:
      'border-emerald-100 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    blue: 'border-blue-100 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300',
    amber:
      'border-amber-100 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300',
    sky: 'border-sky-100 dark:border-sky-500/20 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300',
  }[tone];
  return (
    <div className={`rounded-xl border px-4 py-3 ${classes}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wide">{label}</div>
    </div>
  );
};

type Props = {
  applyReview: () => void;
  applyingReview: boolean;
  closeImportReview: () => void;
  duplicateResolutions: Record<string, GoogleSheetDuplicateResolution>;
  importReview: GoogleSheetImportReview | null;
  reviewConfig: GoogleSheetSyncConfig | null;
  reviewLoading: boolean;
  selectedReviewIds: string[];
  toggleAllReviewItems: (checked: boolean) => void;
  toggleReviewItem: (itemId: string, checked: boolean) => void;
  updateDuplicateResolution: (itemId: string, resolution: GoogleSheetDuplicateResolution) => void;
};

const SheetImportReviewModal = ({
  applyReview,
  applyingReview,
  closeImportReview,
  duplicateResolutions,
  importReview,
  reviewConfig,
  reviewLoading,
  selectedReviewIds,
  toggleAllReviewItems,
  toggleReviewItem,
  updateDuplicateResolution,
}: Props) => (
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
      <div className="py-10 text-center text-sm text-gray-500 dark:text-ink-400">
        Scanning sheet changes...
      </div>
    ) : importReview ? (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ReviewMetric label="New" value={importReview.summary.new_applications} tone="emerald" />
          <ReviewMetric label="Status" value={importReview.summary.status_changes} tone="blue" />
          <ReviewMetric
            label="Duplicates"
            value={importReview.summary.possible_duplicates}
            tone="amber"
          />
          <ReviewMetric label="Updates" value={importReview.summary.updates} tone="blue" />
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-ink-900 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-ink-50">
              {reviewSummaryText(importReview)}
            </div>
            <div className="mt-0.5 text-xs text-gray-500 dark:text-ink-400">
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
              selectedReviewIds.length > 0 && selectedReviewIds.length < importReview.items.length
            }
            onChange={(event) => toggleAllReviewItems(event.target.checked)}
          >
            Select all
          </Checkbox>
        </div>
        {importReview.errors.length > 0 && (
          <div className="rounded-xl border border-red-100 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-xs text-red-700 dark:text-red-300">
            {importReview.errors.length} row(s) could not be reviewed. Fix those rows in Google
            Sheets and scan again.
          </div>
        )}
        {importReview.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-white/[0.12] p-6 text-center text-sm text-gray-500 dark:text-ink-400">
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
                      ? 'border-sky-200 dark:border-sky-500/25 bg-sky-50/70 dark:bg-sky-500/10'
                      : 'border-gray-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={checked}
                      onChange={(event) => toggleReviewItem(item.id, event.target.checked)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-ink-50">
                          {item.title}
                        </span>
                        <Tag color={meta.color}>{meta.label}</Tag>
                        <span className="text-xs text-gray-400 dark:text-ink-500">
                          Row {item.row}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600 dark:text-ink-200">{item.detail}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-ink-400">
                        {item.status && <span>Status: {item.status}</span>}
                        {item.salary_range && <span>Salary: {item.salary_range}</span>}
                        {item.location && <span>Location: {item.location}</span>}
                      </div>
                      {changeEntries.length > 0 && (
                        <div className="mt-3 space-y-1 rounded-lg bg-white/80 dark:bg-ink-900/80 px-3 py-2 text-xs text-gray-600 dark:text-ink-200">
                          {changeEntries.slice(0, 4).map(([field, change]) => (
                            <div key={field} className="grid grid-cols-[110px_1fr] gap-2">
                              <span className="font-medium capitalize text-gray-500 dark:text-ink-400">
                                {field.replace(/_/g, ' ')}
                              </span>
                              <span className="truncate">
                                {change.from || 'blank'} {'->'} {change.to || 'blank'}
                              </span>
                            </div>
                          ))}
                          {changeEntries.length > 4 && (
                            <div className="text-gray-400 dark:text-ink-500">
                              + {changeEntries.length - 4} more change(s)
                            </div>
                          )}
                        </div>
                      )}
                      {item.action === 'possible_duplicate' && (
                        <div className="mt-4 rounded-xl border border-amber-100 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-500/10 p-3">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                                Duplicate resolution
                              </div>
                              <div className="mt-1 text-xs text-amber-700 dark:text-amber-300">
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
                          <div className="mt-3 overflow-x-auto rounded-lg border border-amber-100 dark:border-amber-500/20 bg-white dark:bg-ink-900">
                            <div className="grid min-w-[620px] grid-cols-[140px_1fr_1fr] border-b border-amber-100 dark:border-amber-500/20 bg-amber-50/70 dark:bg-amber-500/10 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
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
                                  className="grid min-w-[620px] grid-cols-[140px_1fr_1fr] border-b border-gray-100 dark:border-white/[0.07] last:border-b-0 text-xs"
                                >
                                  <div className="px-3 py-2 font-medium text-gray-500 dark:text-ink-400">
                                    {field.label}
                                  </div>
                                  <div
                                    className={`px-3 py-2 ${differs ? 'bg-amber-50 dark:bg-amber-500/10 text-gray-900 dark:text-ink-50' : 'text-gray-600 dark:text-ink-200'}`}
                                  >
                                    {existingValue || 'blank'}
                                  </div>
                                  <div
                                    className={`px-3 py-2 ${differs ? 'bg-blue-50 dark:bg-blue-500/10 text-gray-900 dark:text-ink-50' : 'text-gray-600 dark:text-ink-200'}`}
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
);

export default SheetImportReviewModal;

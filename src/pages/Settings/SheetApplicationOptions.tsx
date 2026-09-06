import UnitNumberInput from '../../components/UnitNumberInput';
import type { Draft } from './sheetMapping';

type Props = {
  draft: Draft;
  updateDraft: (patch: Partial<Draft>) => void;
};

const SheetApplicationOptions = ({ draft, updateDraft }: Props) => (
  <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-ink-900/70 px-4 py-3">
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <div className="text-sm font-semibold text-gray-900 dark:text-ink-50">
          Rows Removed From Sheet
        </div>
        <div className="text-xs text-gray-600 dark:text-ink-200 mt-0.5">
          When a synced External ID disappears, archive the application first, then delete it after
          the recovery window.
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_140px]">
        <div>
          <label
            htmlFor="google-sheet-sync-removal-strategy"
            className="mb-1 block text-xs font-medium text-gray-600 dark:text-ink-200"
          >
            When removed
          </label>
          <select
            id="google-sheet-sync-removal-strategy"
            className="min-h-11 w-full rounded-lg border border-gray-300 dark:border-white/[0.12] bg-white dark:bg-ink-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
        </div>
        <div>
          <label
            htmlFor="google-sheet-sync-removal-days"
            className="mb-1 block text-xs font-medium text-gray-600 dark:text-ink-200"
          >
            Delete after
          </label>
          <UnitNumberInput
            id="google-sheet-sync-removal-days"
            unit="days"
            min={1}
            max={365}
            className="min-h-11 [&_.ant-input-number-input]:h-11"
            disabled={draft.missing_row_strategy === 'IGNORE'}
            value={draft.missing_row_delete_after_days}
            onChange={(value) => updateDraft({ missing_row_delete_after_days: value ?? 30 })}
          />
        </div>
      </div>
    </div>
    {!draft.column_mapping.external_id && draft.target_type === 'APPLICATIONS' && (
      <div className="mt-3 rounded-lg border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
        Add an External ID column mapping before relying on automatic removal. Row numbers can shift
        when a Google Sheet row is deleted.
      </div>
    )}
  </div>
);

export default SheetApplicationOptions;

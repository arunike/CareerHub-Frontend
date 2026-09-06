import { HistoryOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import Modal from '../../components/MobileModal';
import type { GoogleSheetSyncConfig } from '../../types';
import { SyncSummaryGrid, syncMissingFromSheet } from './syncSummary';

type Props = {
  closeSyncReview: () => void;
  openHistory: (config: GoogleSheetSyncConfig) => void;
  setSyncReview: React.Dispatch<
    React.SetStateAction<{
      config: GoogleSheetSyncConfig;
      result: GoogleSheetSyncConfig['last_result'];
      force: boolean;
    } | null>
  >;
  syncReview: {
    config: GoogleSheetSyncConfig;
    result: GoogleSheetSyncConfig['last_result'];
    force: boolean;
  } | null;
};

const SheetSyncReviewModal = ({
  closeSyncReview,
  openHistory,
  setSyncReview,
  syncReview,
}: Props) => (
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
          <div className="rounded-xl border border-orange-100 dark:border-orange-500/20 bg-orange-50 dark:bg-orange-500/10 px-4 py-3 text-sm text-orange-800 dark:text-orange-200">
            {syncMissingFromSheet(syncReview.result)} row
            {syncMissingFromSheet(syncReview.result) === 1 ? '' : 's'} were missing from the sheet.
            CareerHub archived new missing records first, and only permanently deletes records after
            the configured retention window.
          </div>
        )}
        {(syncReview.result.warnings || []).length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700 dark:text-amber-300">
              Warnings
            </div>
            {(syncReview.result.warnings || []).map((warning, index) => (
              <div
                key={index}
                className="rounded-lg border border-amber-100 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200"
              >
                {warning.message}
              </div>
            ))}
          </div>
        )}
        {(syncReview.result.errors || []).length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-red-700 dark:text-red-300">
              Errors
            </div>
            {(syncReview.result.errors || []).map((error, index) => (
              <div
                key={index}
                className="rounded-lg border border-red-100 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300"
              >
                {error.row ? `Row ${error.row}: ` : ''}
                {error.error}
              </div>
            ))}
          </div>
        )}
        {(syncReview.result.history || []).length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-ink-400">
              What Changed
            </div>
            <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
              {(syncReview.result.history || []).slice(0, 20).map((entry, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-gray-100 dark:border-white/[0.07] px-3 py-2"
                >
                  <div className="text-sm text-gray-800 dark:text-ink-50">{entry.message}</div>
                  {entry.row && (
                    <div className="mt-1 text-xs text-gray-400 dark:text-ink-500">
                      Row {entry.row}
                    </div>
                  )}
                </div>
              ))}
              {(syncReview.result.history || []).length > 20 && (
                <div className="text-center text-xs text-gray-400 dark:text-ink-500">
                  Showing the first 20 changes. Open History for the full run.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    ) : null}
  </Modal>
);

export default SheetSyncReviewModal;

import { Button, Collapse, Tag } from 'antd';
import Modal from '../../components/MobileModal';
import type { GoogleSheetSyncConfig, GoogleSheetSyncRun } from '../../types';
import { SyncSummaryGrid, syncRunErrorText } from './syncSummary';

type Props = {
  closeHistory: () => void;
  historyConfig: GoogleSheetSyncConfig | null;
  rollbackRun: (config: GoogleSheetSyncConfig, runId: number) => void;
  syncRuns: GoogleSheetSyncRun[];
  syncRunsLoading: boolean;
};

const SheetSyncHistoryModal = ({
  closeHistory,
  historyConfig,
  rollbackRun,
  syncRuns,
  syncRunsLoading,
}: Props) => (
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
);

export default SheetSyncHistoryModal;

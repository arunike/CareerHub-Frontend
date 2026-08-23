import type React from 'react';
import { HistoryOutlined, MoreOutlined, SyncOutlined, TableOutlined } from '@ant-design/icons';
import { Button, Dropdown } from 'antd';
import type { GoogleSheetSyncConfig, GoogleSheetSyncPreview } from '../../types';
import { normalizeTimeZone } from '../../lib/timezones';
import { normalizeTimeInput, toDraft } from './sheetMapping';
import type { Draft } from './sheetMapping';
import { SyncSummaryGrid, syncHistory } from './syncSummary';

type Props = {
  busyId: number | null;
  configs: GoogleSheetSyncConfig[];
  loading: boolean;
  openHistory: (config: GoogleSheetSyncConfig) => void;
  openImportReview: (config: GoogleSheetSyncConfig, force?: boolean) => void;
  removeConfig: (config: GoogleSheetSyncConfig) => void;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  setPreview: React.Dispatch<React.SetStateAction<GoogleSheetSyncPreview | null>>;
  syncConfig: (config: GoogleSheetSyncConfig, force?: boolean) => void;
  testConfig: (config: GoogleSheetSyncConfig) => void;
};

const SavedSyncList = ({
  busyId,
  configs,
  loading,
  openHistory,
  openImportReview,
  removeConfig,
  setDraft,
  setPreview,
  syncConfig,
  testConfig,
}: Props) => (
  <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
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
                      className="min-h-11"
                      icon={<SyncOutlined />}
                      loading={busyId === config.id}
                      onClick={() => syncConfig(config)}
                    >
                      Sync Now
                    </Button>
                    {config.target_type === 'APPLICATIONS' && (
                      <Button
                        size="small"
                        className="min-h-11"
                        icon={<TableOutlined />}
                        loading={busyId === config.id}
                        onClick={() => openImportReview(config)}
                      >
                        Review
                      </Button>
                    )}
                    <Button
                      size="small"
                      className="min-h-11"
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
                        className="min-h-11"
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
);

export default SavedSyncList;

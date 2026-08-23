import { type OfferLike as Offer } from './calculations';
import { Popconfirm, Tooltip, Popover } from 'antd';
import clsx from 'clsx';

import type { DecisionRow } from './decisionScoring';

import type { ApplicationLike as Application } from './calculations';
type Props = {
  applicationsById: Record<number, Application | undefined>;
  isRowRejected: boolean;
  onDeleteClick: (offer: Offer) => void;
  onDeleteScenario: (id: string) => void;
  onEditClick: (offer: Offer) => void;
  onEditScenario: (id: string) => void;
  onNegotiateClick: (offer: Offer) => void;
  onNegotiationLogClick: ((offer: Offer) => void) | undefined;
  onRaiseHistoryClick: (offer: Offer) => void;
  onSaveSnapshotClick: (offer: Offer, row: DecisionRow) => void;
  onSnapshotsClick: (offer: Offer) => void;
  onToggleCurrent: (offer: Offer) => void;
  onToggleRejected: ((offer: Offer) => void) | undefined;
  row: DecisionRow;
};

const ScorecardActionBar = ({
  applicationsById,
  isRowRejected,
  onDeleteClick,
  onDeleteScenario,
  onEditClick,
  onEditScenario,
  onNegotiateClick,
  onNegotiationLogClick,
  onRaiseHistoryClick,
  onSaveSnapshotClick,
  onSnapshotsClick,
  onToggleCurrent,
  onToggleRejected,
  row,
}: Props) => (
  <div className="mt-auto border-t border-slate-100 bg-white px-4 py-3">
    {row.isSimulated ? (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            type="button"
            onClick={() => onEditScenario(String(row.offer.id))}
            className="min-h-11 rounded-xl px-3 py-1.5 text-xs font-semibold text-sky-600 transition-colors hover:bg-sky-50 sm:min-h-9 sm:rounded-lg"
          >
            Edit
          </button>
        </div>
        <div>
          <Popconfirm
            title="Delete custom scenario?"
            onConfirm={() => onDeleteScenario(String(row.offer.id))}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <button
              type="button"
              className="min-h-11 rounded-xl px-3 py-1.5 text-xs font-semibold text-rose-500 transition-colors hover:bg-rose-50 sm:min-h-9 sm:rounded-lg"
            >
              Delete
            </button>
          </Popconfirm>
        </div>
      </div>
    ) : (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button
            type="button"
            onClick={() => onEditClick(row.offer as Offer)}
            className="min-h-11 rounded-xl px-3 py-1.5 text-xs font-semibold text-sky-600 transition-colors hover:bg-sky-50 sm:min-h-9 sm:rounded-lg"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onToggleCurrent(row.offer as Offer)}
            className={clsx(
              'min-h-11 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors sm:min-h-9 sm:rounded-lg',
              (row.offer as Offer).is_current
                ? 'text-slate-400 hover:bg-slate-50'
                : 'text-slate-600 hover:bg-slate-50'
            )}
          >
            {(row.offer as Offer).is_current ? 'Unmark Current' : 'Mark Current'}
          </button>
          <button
            type="button"
            onClick={() => onSnapshotsClick(row.offer as Offer)}
            className="min-h-11 rounded-xl px-3 py-1.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-50 sm:min-h-9 sm:rounded-lg"
          >
            Snapshots
          </button>
          <Popover
            trigger="click"
            placement="topRight"
            content={
              <div className="flex w-44 flex-col py-1">
                <button
                  type="button"
                  onClick={() => onSaveSnapshotClick(row.offer as Offer, row)}
                  className="min-h-11 rounded-lg px-3 py-2 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                >
                  Save Snapshot
                </button>
                {(row.offer as Offer).is_current ? (
                  <button
                    type="button"
                    onClick={() => onRaiseHistoryClick(row.offer as Offer)}
                    className="min-h-11 rounded-lg px-3 py-2 text-left text-xs font-semibold text-amber-700 hover:bg-amber-50"
                  >
                    Raise History
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onNegotiateClick(row.offer as Offer)}
                    className="min-h-11 rounded-lg px-3 py-2 text-left text-xs font-semibold text-purple-700 hover:bg-purple-50"
                  >
                    Negotiate
                  </button>
                )}
                {onNegotiationLogClick && !row.isSimulated && (
                  <button
                    type="button"
                    onClick={() => onNegotiationLogClick(row.offer as Offer)}
                    className="min-h-11 rounded-lg px-3 py-2 text-left text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                  >
                    Negotiation Log
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onToggleRejected?.(row.offer as Offer)}
                  className={clsx(
                    'min-h-11 rounded-lg px-3 py-2 text-left text-xs font-semibold',
                    isRowRejected
                      ? 'text-emerald-700 hover:bg-emerald-50'
                      : 'text-rose-700 hover:bg-rose-50'
                  )}
                >
                  {isRowRejected ? 'Restore Offer' : 'Mark as Rejected'}
                </button>
                {applicationsById[row.applicationId]?.is_locked ? (
                  <Tooltip title="Unlock this application in Job Applications first.">
                    <span className="rounded-md px-3 py-2 text-xs font-semibold text-slate-300 cursor-not-allowed">
                      Delete
                    </span>
                  </Tooltip>
                ) : (
                  <Popconfirm
                    title="Delete linked application?"
                    description="This will delete the application and remove this offer from comparison."
                    okText="Delete"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => onDeleteClick(row.offer as Offer)}
                  >
                    <button
                      type="button"
                      className="min-h-11 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </Popconfirm>
                )}
              </div>
            }
          >
            <button
              type="button"
              className="min-h-11 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-50 sm:min-h-9 sm:rounded-lg"
            >
              More
            </button>
          </Popover>
        </div>
      </div>
    )}
  </div>
);

export default ScorecardActionBar;

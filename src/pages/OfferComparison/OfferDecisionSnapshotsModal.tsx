import React, { useCallback, useEffect, useState } from 'react';
import { Button, Checkbox, Empty, Popconfirm, Tag, Tooltip, message } from 'antd';
import { DeleteOutlined, LockOutlined, RollbackOutlined, UnlockOutlined } from '@ant-design/icons';
import {
  deleteOfferDecisionSnapshot,
  getOfferDecisionSnapshots,
  updateOfferDecisionSnapshot,
  type OfferDecisionSnapshot,
} from '../../api';
import BulkActionHeader from '../../components/BulkActionHeader';
import ModalShell from '../../components/ModalShell';
import { PanelSkeleton } from '../../components/PageState';
import type { OfferLike } from './calculations';

type Props = {
  open: boolean;
  offer: OfferLike | null;
  onRestoreSnapshot: (snapshot: OfferDecisionSnapshot) => Promise<void>;
  onClose: () => void;
};

const currency = (value: unknown) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const OfferDecisionSnapshotsModal: React.FC<Props> = ({
  open,
  offer,
  onRestoreSnapshot,
  onClose,
}) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [snapshots, setSnapshots] = useState<OfferDecisionSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [selectedSnapshotIds, setSelectedSnapshotIds] = useState<number[]>([]);

  const offerId = typeof offer?.id === 'number' ? offer.id : null;
  const selectedSnapshots = snapshots.filter((snapshot) =>
    selectedSnapshotIds.includes(snapshot.id)
  );
  const isAnySelectedLocked = selectedSnapshots.some((snapshot) => snapshot.is_locked);

  const loadSnapshots = useCallback(async () => {
    if (!offerId) return;
    try {
      setLoading(true);
      const response = await getOfferDecisionSnapshots(offerId);
      setSnapshots(response.data);
    } catch (error) {
      messageApi.error('Failed to load decision snapshots');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [messageApi, offerId]);

  useEffect(() => {
    if (!open || !offerId) return;
    setSelectedSnapshotIds([]);
    void loadSnapshots();
  }, [loadSnapshots, offerId, open]);

  const handleToggleLock = async (snapshot: OfferDecisionSnapshot) => {
    try {
      await updateOfferDecisionSnapshot(snapshot.id, { is_locked: !snapshot.is_locked });
      await loadSnapshots();
    } catch (error) {
      messageApi.error('Failed to update snapshot');
      console.error(error);
    }
  };

  const handleBulkToggleLock = async (lock: boolean) => {
    if (selectedSnapshotIds.length === 0) return;
    try {
      await Promise.all(
        selectedSnapshotIds.map((id) => updateOfferDecisionSnapshot(id, { is_locked: lock }))
      );
      setSelectedSnapshotIds([]);
      await loadSnapshots();
      messageApi.success(`${selectedSnapshotIds.length} snapshots ${lock ? 'locked' : 'unlocked'}`);
    } catch (error) {
      messageApi.error(`Failed to ${lock ? 'lock' : 'unlock'} snapshots`);
      console.error(error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSnapshotIds.length === 0 || isAnySelectedLocked) return;
    try {
      await Promise.all(selectedSnapshotIds.map((id) => deleteOfferDecisionSnapshot(id)));
      setSelectedSnapshotIds([]);
      await loadSnapshots();
      messageApi.success('Snapshots deleted');
    } catch (error) {
      messageApi.error('Failed to delete snapshots');
      console.error(error);
    }
  };

  const handleDelete = async (snapshot: OfferDecisionSnapshot) => {
    try {
      await deleteOfferDecisionSnapshot(snapshot.id);
      await loadSnapshots();
    } catch (error) {
      messageApi.error('Failed to delete snapshot');
      console.error(error);
    }
  };

  const handleRestore = async (snapshot: OfferDecisionSnapshot) => {
    try {
      setRestoringId(snapshot.id);
      await onRestoreSnapshot(snapshot);
      messageApi.success('Snapshot restored');
    } catch (error) {
      messageApi.error('Failed to restore snapshot');
      console.error(error);
    } finally {
      setRestoringId(null);
    }
  };

  const toggleSelected = (snapshotId: number, checked: boolean) => {
    setSelectedSnapshotIds((current) =>
      checked ? [...current, snapshotId] : current.filter((id) => id !== snapshotId)
    );
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedSnapshotIds(checked ? snapshots.map((snapshot) => snapshot.id) : []);
  };

  return (
    <ModalShell
      isOpen={open}
      title="Decision Snapshots"
      onClose={onClose}
      maxWidthClass="max-w-[860px]"
      bodyClassName="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6"
    >
      {contextHolder}
      <div className="min-h-[320px]">
        {loading && snapshots.length === 0 ? (
          <PanelSkeleton rows={5} />
        ) : snapshots.length === 0 ? (
          <div className="flex min-h-[320px] w-full items-center justify-center">
            <Empty description="No decision snapshots yet" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <BulkActionHeader
                selectedCount={selectedSnapshotIds.length}
                totalCount={snapshots.length}
                title="All Snapshots"
                onSelectAll={toggleSelectAll}
                onCancelSelection={() => setSelectedSnapshotIds([])}
                bulkActions={
                  <>
                    <Button onClick={() => handleBulkToggleLock(true)} icon={<LockOutlined />}>
                      Lock
                    </Button>
                    <Button onClick={() => handleBulkToggleLock(false)} icon={<UnlockOutlined />}>
                      Unlock
                    </Button>
                    <Tooltip
                      title={isAnySelectedLocked ? 'Unlock selected snapshots before deleting' : ''}
                    >
                      <Popconfirm
                        title="Delete selected snapshots?"
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                        disabled={isAnySelectedLocked}
                        onConfirm={handleBulkDelete}
                      >
                        <Button danger icon={<DeleteOutlined />} disabled={isAnySelectedLocked}>
                          Delete
                        </Button>
                      </Popconfirm>
                    </Tooltip>
                  </>
                }
              />
            </div>
            {snapshots.map((snapshot) => (
              <div key={snapshot.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <Checkbox
                      className="mt-1"
                      checked={selectedSnapshotIds.includes(snapshot.id)}
                      onChange={(event) => toggleSelected(snapshot.id, event.target.checked)}
                      aria-label={`Select ${snapshot.title || 'untitled snapshot'}`}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="m-0 text-sm font-semibold text-slate-900">
                          {snapshot.title || 'Untitled snapshot'}
                        </h3>
                        {snapshot.is_locked && <Tag color="gold">Locked</Tag>}
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(snapshot.captured_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-1">
                    <Popconfirm
                      title="Restore this snapshot?"
                      description="This will update the offer card to match this saved decision."
                      okText="Restore"
                      onConfirm={() => handleRestore(snapshot)}
                    >
                      <Button
                        size="middle"
                        icon={<RollbackOutlined />}
                        loading={restoringId === snapshot.id}
                        className="min-h-10"
                      >
                        Restore
                      </Button>
                    </Popconfirm>
                    <Button
                      size="middle"
                      icon={snapshot.is_locked ? <UnlockOutlined /> : <LockOutlined />}
                      onClick={() => handleToggleLock(snapshot)}
                      className="min-h-10"
                      aria-label={snapshot.is_locked ? 'Unlock snapshot' : 'Lock snapshot'}
                    />
                    <Popconfirm
                      title="Delete this snapshot?"
                      okText="Delete"
                      okButtonProps={{ danger: true }}
                      disabled={snapshot.is_locked}
                      onConfirm={() => handleDelete(snapshot)}
                    >
                      <Button
                        size="middle"
                        danger
                        icon={<DeleteOutlined />}
                        disabled={snapshot.is_locked}
                        className="min-h-10"
                        aria-label="Delete snapshot"
                      />
                    </Popconfirm>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <span className="block text-slate-400">Score</span>
                    <strong>{snapshot.decision_score ?? '-'}</strong>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <span className="block text-slate-400">Rank</span>
                    <strong>{snapshot.rank ? `#${snapshot.rank}` : '-'}</strong>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <span className="block text-slate-400">TC</span>
                    <strong>{currency(snapshot.total_comp)}</strong>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <span className="block text-slate-400">Adjusted</span>
                    <strong>
                      {snapshot.adjusted_value ? currency(snapshot.adjusted_value) : '-'}
                    </strong>
                  </div>
                </div>
                {snapshot.notes && (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                    {snapshot.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ModalShell>
  );
};

export default OfferDecisionSnapshotsModal;

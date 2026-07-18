import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Tooltip, Input, Typography, Checkbox, message } from 'antd';
import Modal from '../../components/MobileModal';
import {
  ThunderboltOutlined,
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined,
  EditOutlined,
  ArrowRightOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import PageActionToolbar from '../../components/PageActionToolbar';
import BulkActionHeader from '../../components/BulkActionHeader';
import RowActions from '../../components/RowActions';
import {
  getAllNegotiationResults,
  deleteNegotiationResult,
  deleteAllNegotiationResults,
  toggleNegotiationResultLock,
  updateNegotiationResultTitle,
} from '../../utils/negotiationStorage';
import type { StoredNegotiationResult } from '../../utils/negotiationStorage';
import {
  deleteAllArtifactsByType,
  deleteArtifactByClientId,
  loadNegotiationResultsFromArtifacts,
  setArtifactLock,
  updateArtifactTitle,
} from '../../utils/aiArtifactStorage';
import { formatPtoLabel } from '../../utils/offerTimeOff';

const { Text } = Typography;

const fmt = (n: number) => (n ? `$${Number(n).toLocaleString()}` : null);

const NegotiationResultsTab: React.FC = () => {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [results, setResults] = useState<StoredNegotiationResult[]>(getAllNegotiationResults);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingResult, setEditingResult] = useState<{ id: string; title: string } | null>(null);
  const [usingBackendArtifacts, setUsingBackendArtifacts] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const backendResults = await loadNegotiationResultsFromArtifacts();
      setResults(backendResults);
      setUsingBackendArtifacts(true);
    } catch {
      setResults(getAllNegotiationResults());
      setUsingBackendArtifacts(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  /* ── Selection ── */
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      setSelectedIds(checked ? results.map((r) => r.id) : []);
    },
    [results]
  );

  const selectedResults = useMemo(
    () => results.filter((r) => selectedIds.includes(r.id)),
    [results, selectedIds]
  );
  const hasLockedSelected = useMemo(
    () => selectedResults.some((r) => r.isLocked),
    [selectedResults]
  );

  /* ── Single-item actions ── */
  const handleDelete = useCallback(
    async (id: string) => {
      if (usingBackendArtifacts) {
        try {
          await deleteArtifactByClientId('NEGOTIATION_RESULT', id);
        } catch {
          deleteNegotiationResult(id);
        }
      } else {
        deleteNegotiationResult(id);
      }
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      refresh();
    },
    [refresh, usingBackendArtifacts]
  );

  const handleToggleLock = useCallback(
    async (id: string) => {
      const result = results.find((item) => item.id === id);
      if (usingBackendArtifacts && result) {
        try {
          await setArtifactLock('NEGOTIATION_RESULT', id, !result.isLocked);
        } catch {
          toggleNegotiationResultLock(id);
        }
      } else {
        toggleNegotiationResultLock(id);
      }
      refresh();
    },
    [refresh, results, usingBackendArtifacts]
  );

  const handleRename = useCallback(() => {
    if (!editingResult) return;
    (usingBackendArtifacts
      ? updateArtifactTitle('NEGOTIATION_RESULT', editingResult.id, editingResult.title)
      : Promise.resolve(updateNegotiationResultTitle(editingResult.id, editingResult.title))
    ).finally(() => {
      refresh();
      setEditingResult(null);
    });
  }, [editingResult, refresh, usingBackendArtifacts]);

  /* ── Bulk actions ── */
  const handleBulkDelete = useCallback(() => {
    const deletableIds = selectedIds.filter((id) => {
      const r = results.find((x) => x.id === id);
      return !r?.isLocked;
    });
    if (deletableIds.length === 0) return;
    Modal.confirm({
      title: `Delete ${deletableIds.length} negotiation result${deletableIds.length > 1 ? 's' : ''}?`,
      content: 'Locked results will be skipped.',
      okText: 'Delete',
      okType: 'danger',
      onOk: () => {
        Promise.all(
          deletableIds.map((id) =>
            usingBackendArtifacts
              ? deleteArtifactByClientId('NEGOTIATION_RESULT', id)
              : Promise.resolve(deleteNegotiationResult(id))
          )
        ).finally(refresh);
        setSelectedIds([]);
      },
    });
  }, [selectedIds, results, refresh, usingBackendArtifacts]);

  const handleBulkToggleLock = useCallback(
    (lock: boolean) => {
      selectedIds.forEach((id) => {
        const r = results.find((x) => x.id === id);
        if (r && r.isLocked !== lock) {
          if (usingBackendArtifacts) {
            void setArtifactLock('NEGOTIATION_RESULT', id, lock);
          } else {
            toggleNegotiationResultLock(id);
          }
        }
      });
      setSelectedIds([]);
      refresh();
    },
    [selectedIds, results, refresh, usingBackendArtifacts]
  );

  const handleDeleteAll = useCallback(() => {
    if (usingBackendArtifacts) {
      void deleteAllArtifactsByType('NEGOTIATION_RESULT').finally(refresh);
    } else {
      deleteAllNegotiationResults();
      refresh();
    }
    setSelectedIds([]);
  }, [refresh, usingBackendArtifacts]);

  /* ── Export ── */
  const handleExport = useCallback(
    async (format: string): Promise<{ data: Blob; headers: Record<string, string> }> => {
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(results, null, 2)], {
          type: 'application/json',
        });
        return { data: blob, headers: { 'content-type': 'application/json' } };
      }
      const escape = (v: string) => `"${String(v).replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      const header = [
        'Title',
        'Company',
        'Role',
        'Saved At',
        'Base Salary',
        'Bonus',
        'Equity',
        'Sign-On',
        'PTO Days',
        'Sick Leave Days',
        'Leverage Points',
        'Talking Points',
        'Caution Points',
      ];
      const rows = results.map((r) => [
        escape(r.title || `${r.roleTitle} @ ${r.companyName}`),
        escape(r.companyName),
        escape(r.roleTitle),
        escape(new Date(r.savedAt).toLocaleString()),
        r.offerSnapshot.base_salary,
        r.offerSnapshot.bonus,
        r.offerSnapshot.equity,
        r.offerSnapshot.sign_on,
        r.offerSnapshot.is_unlimited_pto ? 'Unlimited' : r.offerSnapshot.pto_days,
        r.offerSnapshot.is_unlimited_pto &&
        r.offerSnapshot.sick_leave_included_in_unlimited_pto !== false
          ? 'Included'
          : (r.offerSnapshot.sick_leave_days ?? 0),
        escape(r.advice.leverage_points.join('; ')),
        escape(r.advice.talking_points.join('; ')),
        escape(r.advice.caution_points.join('; ')),
      ]);
      const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      return { data: blob, headers: { 'content-type': 'text/csv' } };
    },
    [results]
  );

  void messageApi;

  return (
    <div style={{ padding: 0, width: '100%' }}>
      {contextHolder}

      <div style={{ marginBottom: 24 }}>
        <PageActionToolbar
          title="Negotiation Results"
          subtitle={`${results.length} result${results.length !== 1 ? 's' : ''} saved`}
          onDeleteAll={results.length > 0 ? handleDeleteAll : undefined}
          deleteAllConfirmTitle="Clear All Negotiation Results?"
          deleteAllConfirmDescription="Locked results will be preserved. This cannot be undone."
          onExport={results.length > 0 ? handleExport : undefined}
          exportFilename="negotiation_results"
          onPrimaryAction={() => navigate('/offers')}
          primaryActionLabel="Go to Offers"
          primaryActionIcon={<ThunderboltOutlined />}
        />
      </div>

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="enterprise-filter-bar mb-6 p-4 animate-in fade-in slide-in-from-top-2">
          <BulkActionHeader
            selectedCount={selectedIds.length}
            totalCount={results.length}
            title="Negotiation Results"
            onSelectAll={handleSelectAll}
            onCancelSelection={() => setSelectedIds([])}
            bulkActions={
              <>
                <Button icon={<LockOutlined />} onClick={() => handleBulkToggleLock(true)}>
                  Lock
                </Button>
                <Button icon={<UnlockOutlined />} onClick={() => handleBulkToggleLock(false)}>
                  Unlock
                </Button>
                <Tooltip title={hasLockedSelected ? 'Unlock selected items before deleting' : ''}>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleBulkDelete}
                    disabled={hasLockedSelected}
                  >
                    Delete
                  </Button>
                </Tooltip>
              </>
            }
          />
        </div>
      )}

      {/* Empty state */}
      {results.length === 0 && (
        <div className="enterprise-empty flex flex-col items-center justify-center gap-6 py-24">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50">
            <ThunderboltOutlined style={{ fontSize: 40, color: '#0ea5e9' }} />
          </div>
          <div className="text-center">
            <h3 className="text-gray-900 font-bold text-xl m-0 mb-2">No negotiation results yet</h3>
            <p className="text-gray-500 m-0 max-w-sm">
              Generate advice from an offer to save negotiation strategy here.
            </p>
          </div>
          <Button
            type="primary"
            size="large"
            icon={<ThunderboltOutlined />}
            onClick={() => navigate('/offers')}
            style={{ background: '#0ea5e9', borderColor: '#0ea5e9' }}
          >
            Go to Offers
          </Button>
        </div>
      )}

      {/* Card list */}
      <div className="flex flex-col gap-4">
        {results.map((result) => {
          const isSelected = selectedIds.includes(result.id);
          const displayTitle = result.title || `${result.roleTitle} @ ${result.companyName}`;
          const date = new Date(result.savedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          const snap = result.offerSnapshot;

          return (
            <article
              key={result.id}
              className={`group enterprise-card overflow-hidden ${
                isSelected ? 'border-sky-300 shadow-md ring-1 ring-sky-200' : ''
              }`}
            >
              <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
                {/* Checkbox */}
                <div className="flex min-h-11 min-w-8 shrink-0 items-start justify-center pt-2">
                  <Checkbox
                    checked={isSelected}
                    onChange={() => toggleSelect(result.id)}
                    aria-label={`Select ${displayTitle}`}
                  />
                </div>

                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
                  <DollarOutlined style={{ color: '#0ea5e9', fontSize: 18 }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/negotiation-result/${result.id}`)}
                        className="min-h-10 min-w-0 flex-1 text-left text-base font-semibold text-slate-900 hover:text-blue-600"
                      >
                        <span className="line-clamp-2">{displayTitle}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingResult({ id: result.id, title: displayTitle });
                        }}
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-100 hover:text-blue-600 sm:h-8 sm:w-8 sm:opacity-0 sm:group-hover:opacity-100"
                        aria-label={`Rename ${displayTitle}`}
                      >
                        <EditOutlined />
                      </button>
                      {result.isLocked && (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100 text-[10px] font-bold uppercase tracking-wider shrink-0">
                          <LockOutlined className="text-[10px]" /> Locked
                        </span>
                      )}
                    </div>
                    <Text type="secondary" className="shrink-0 text-xs">
                      {date}
                    </Text>
                  </div>

                  {/* Offer snapshot chips */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {[
                      { label: 'Base', value: fmt(snap.base_salary) },
                      { label: 'Bonus', value: fmt(snap.bonus) },
                      { label: 'Equity/yr', value: fmt(snap.equity) },
                      { label: 'Sign-On', value: fmt(snap.sign_on) },
                      {
                        label: 'PTO',
                        value: snap.is_unlimited_pto
                          ? 'Unlimited'
                          : snap.pto_days
                            ? formatPtoLabel(snap.pto_days, false, true)
                            : null,
                      },
                      {
                        label: 'Sick',
                        value:
                          snap.is_unlimited_pto &&
                          snap.sick_leave_included_in_unlimited_pto !== false
                            ? 'Included'
                            : snap.sick_leave_days != null
                              ? `${snap.sick_leave_days} days`
                              : null,
                      },
                    ]
                      .filter((x) => x.value)
                      .map(({ label, value }) => (
                        <span
                          key={label}
                          className="text-[11px] bg-gray-50 border border-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                        >
                          {label}: <span className="font-semibold text-gray-800">{value}</span>
                        </span>
                      ))}
                  </div>

                  {/* Advice summary */}
                  <p className="text-gray-500 text-xs m-0">
                    {result.advice.leverage_points.length} leverage points ·{' '}
                    {result.advice.talking_points.length} talking points ·{' '}
                    {result.advice.caution_points.length} cautions
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div
                className={`flex flex-col gap-2 border-t px-4 py-2 transition-colors sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3 ${
                  isSelected ? 'bg-sky-50/40 border-sky-100' : 'bg-gray-50/60 border-gray-50'
                }`}
              >
                <Button
                  size="middle"
                  icon={<ArrowRightOutlined />}
                  onClick={() => navigate(`/negotiation-result/${result.id}`)}
                  className="min-h-10 sm:min-h-0"
                >
                  View Full Report
                </Button>
                <RowActions
                  size="small"
                  isLocked={result.isLocked}
                  onToggleLock={() => handleToggleLock(result.id)}
                  onDelete={() => handleDelete(result.id)}
                  disableDelete={result.isLocked}
                  deleteButtonTooltip={result.isLocked ? 'Unlock before deleting' : undefined}
                  deleteTitle="Delete negotiation result?"
                  deleteDescription="This will permanently remove the result from your history."
                />
              </div>
            </article>
          );
        })}
      </div>

      {/* Rename modal */}
      <Modal
        open={!!editingResult}
        title="Rename Negotiation Result"
        okText="Save"
        cancelText="Cancel"
        onOk={handleRename}
        onCancel={() => setEditingResult(null)}
      >
        <div className="py-4">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">
            Title
          </label>
          <Input
            value={editingResult?.title}
            onChange={(e) =>
              setEditingResult((prev) => (prev ? { ...prev, title: e.target.value } : null))
            }
            placeholder="e.g., Google — Negotiation Round 2"
            onPressEnter={handleRename}
            autoFocus
          />
        </div>
      </Modal>
    </div>
  );
};

export default NegotiationResultsTab;

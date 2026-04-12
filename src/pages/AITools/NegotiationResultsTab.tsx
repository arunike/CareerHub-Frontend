import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Modal, Tooltip, Input, Typography, Checkbox, message } from 'antd';
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
import { formatPtoLabel } from '../../utils/offerTimeOff';

const { Text } = Typography;

const fmt = (n: number) => (n ? `$${Number(n).toLocaleString()}` : null);

const NegotiationResultsTab: React.FC = () => {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [results, setResults] = useState<StoredNegotiationResult[]>(getAllNegotiationResults);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingResult, setEditingResult] = useState<{ id: string; title: string } | null>(null);

  const refresh = useCallback(() => setResults(getAllNegotiationResults()), []);

  /* ── Selection ── */
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      setSelectedIds(checked ? results.map((r) => r.id) : []);
    },
    [results],
  );

  const selectedResults = useMemo(
    () => results.filter((r) => selectedIds.includes(r.id)),
    [results, selectedIds],
  );
  const hasLockedSelected = useMemo(
    () => selectedResults.some((r) => r.isLocked),
    [selectedResults],
  );

  /* ── Single-item actions ── */
  const handleDelete = useCallback(
    (id: string) => {
      deleteNegotiationResult(id);
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      refresh();
    },
    [refresh],
  );

  const handleToggleLock = useCallback(
    (id: string) => {
      toggleNegotiationResultLock(id);
      refresh();
    },
    [refresh],
  );

  const handleRename = useCallback(() => {
    if (!editingResult) return;
    updateNegotiationResultTitle(editingResult.id, editingResult.title);
    refresh();
    setEditingResult(null);
  }, [editingResult, refresh]);

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
        deletableIds.forEach((id) => deleteNegotiationResult(id));
        setSelectedIds([]);
        refresh();
      },
    });
  }, [selectedIds, results, refresh]);

  const handleBulkToggleLock = useCallback(
    (lock: boolean) => {
      selectedIds.forEach((id) => {
        const r = results.find((x) => x.id === id);
        if (r && r.isLocked !== lock) toggleNegotiationResultLock(id);
      });
      setSelectedIds([]);
      refresh();
    },
    [selectedIds, results, refresh],
  );

  const handleDeleteAll = useCallback(() => {
    deleteAllNegotiationResults();
    setSelectedIds([]);
    refresh();
  }, [refresh]);

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
        'Title', 'Company', 'Role', 'Saved At',
        'Base Salary', 'Bonus', 'Equity', 'Sign-On', 'PTO Days',
        'Leverage Points', 'Talking Points', 'Caution Points',
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
        escape(r.advice.leverage_points.join('; ')),
        escape(r.advice.talking_points.join('; ')),
        escape(r.advice.caution_points.join('; ')),
      ]);
      const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      return { data: blob, headers: { 'content-type': 'text/csv' } };
    },
    [results],
  );

  void messageApi; // suppress unused warning — used via contextHolder

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
        <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm mb-6 animate-in fade-in slide-in-from-top-2">
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
                <Tooltip
                  title={hasLockedSelected ? 'Unlock selected items before deleting' : ''}
                >
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-24 gap-6">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center">
            <ThunderboltOutlined style={{ fontSize: 40, color: '#6366f1' }} />
          </div>
          <div className="text-center">
            <h3 className="text-gray-900 font-bold text-xl m-0 mb-2">No negotiation results yet</h3>
            <p className="text-gray-500 m-0 max-w-sm">
              Click ⚡ Negotiate on any offer to generate AI advice and auto-save it here.
            </p>
          </div>
          <Button
            type="primary"
            size="large"
            icon={<ThunderboltOutlined />}
            onClick={() => navigate('/offers')}
            style={{ background: '#6366f1', borderColor: '#6366f1' }}
          >
            Go to Offers
          </Button>
        </div>
      )}

      {/* Card list */}
      <div className="flex flex-col gap-4">
        {results.map((result) => {
          const isSelected = selectedIds.includes(result.id);
          const displayTitle =
            result.title || `${result.roleTitle} @ ${result.companyName}`;
          const date = new Date(result.savedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          const snap = result.offerSnapshot;

          return (
            <div
              key={result.id}
              className={`group bg-white rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer ${
                isSelected
                  ? 'border-indigo-300 shadow-md ring-1 ring-indigo-200'
                  : 'border-gray-100 shadow-sm hover:shadow-md'
              }`}
              onClick={() => toggleSelect(result.id)}
            >
              <div className="p-5 flex items-start gap-4">
                {/* Checkbox */}
                <div onClick={(e) => e.stopPropagation()} className="pt-1 shrink-0">
                  <Checkbox checked={isSelected} onChange={() => toggleSelect(result.id)} />
                </div>

                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                  <DollarOutlined style={{ color: '#6366f1', fontSize: 18 }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Text strong className="truncate text-base">
                        {displayTitle}
                      </Text>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingResult({ id: result.id, title: displayTitle });
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-all shrink-0"
                      >
                        <EditOutlined className="text-xs" />
                      </button>
                      {result.isLocked && (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100 text-[10px] font-bold uppercase tracking-wider shrink-0">
                          <LockOutlined className="text-[10px]" /> Locked
                        </span>
                      )}
                    </div>
                    <Text type="secondary" className="text-xs shrink-0">
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
                        value:
                          snap.is_unlimited_pto
                            ? 'Unlimited'
                            : snap.pto_days
                              ? formatPtoLabel(snap.pto_days, false, true)
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
                className={`border-t px-5 py-3 flex items-center justify-between gap-2 transition-colors ${
                  isSelected ? 'bg-indigo-50/40 border-indigo-100' : 'bg-gray-50/60 border-gray-50'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  size="small"
                  type="link"
                  icon={<ArrowRightOutlined />}
                  onClick={() => navigate(`/negotiation-result/${result.id}`)}
                  style={{ padding: 0, color: '#6366f1' }}
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
            </div>
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

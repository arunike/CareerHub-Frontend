import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Checkbox, Tooltip, Input } from 'antd';
import Modal from '../../components/MobileModal';
import { DeleteOutlined, FileTextOutlined, LockOutlined, EditOutlined } from '@ant-design/icons';
import {
  getAllReports,
  deleteReport,
  deleteAllReports,
  toggleReportLock,
  updateReportTitle,
} from '../../utils/reportStorage';
import type { StoredReport } from '../../utils/reportStorage';
import {
  deleteAllArtifactsByType,
  deleteArtifactByClientId,
  loadReportsFromArtifacts,
  setArtifactLock,
  updateArtifactTitle,
} from '../../utils/aiArtifactStorage';
import BulkActionHeader from '../../components/BulkActionHeader';
import RowActions from '../../components/RowActions';
import { PanelSkeleton } from '../../components/PageState';
import IntelligenceSectionPicker from '../../components/IntelligenceSectionPicker';

const getScoreMeta = (score: number) => {
  if (score >= 90)
    return { label: 'Strong', color: '#10b981', bg: '#f0fdf4', border: '#a7f3d0', text: '#065f46' };
  if (score >= 70)
    return { label: 'Good', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' };
  if (score >= 50)
    return {
      label: 'Partial',
      color: '#f59e0b',
      bg: '#fffbeb',
      border: '#fde68a',
      text: '#92400e',
    };
  return { label: 'Poor', color: '#ef4444', bg: '#fef2f2', border: '#fecaca', text: '#7f1d1d' };
};

const reportSkillName = (value: unknown) =>
  value && typeof value === 'object' && !Array.isArray(value) && 'skill' in value
    ? String((value as { skill?: unknown }).skill || '')
    : String(value || '');

const ScoreBadge: React.FC<{ score: number }> = ({ score }) => {
  const meta = getScoreMeta(score);
  return (
    <div
      className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl font-black sm:h-16 sm:w-16"
      style={{
        background: meta.bg,
        border: `2px solid ${meta.border}`,
        color: meta.color,
      }}
    >
      <span className="text-xl leading-none">{score}</span>
      <span
        className="text-[9px] font-bold uppercase tracking-wide mt-0.5"
        style={{ color: meta.text }}
      >
        {meta.label}
      </span>
    </div>
  );
};

import PageActionToolbar from '../../components/PageActionToolbar';
import { PlusOutlined } from '@ant-design/icons';

const JDReportsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<StoredReport[]>([]);
  const [hasLoadedReports, setHasLoadedReports] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingReport, setEditingReport] = useState<{ id: string; title: string } | null>(null);
  const [usingBackendArtifacts, setUsingBackendArtifacts] = useState(false);

  const refreshReports = useCallback(async () => {
    try {
      const backendReports = await loadReportsFromArtifacts();
      setReports(backendReports);
      setUsingBackendArtifacts(true);
    } catch {
      setReports(getAllReports());
      setUsingBackendArtifacts(false);
    } finally {
      setHasLoadedReports(true);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshReports();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshReports]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (usingBackendArtifacts) {
        try {
          await deleteArtifactByClientId('JD_REPORT', id);
        } catch {
          deleteReport(id);
        }
      } else {
        deleteReport(id);
      }
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
      setDeletingId(null);
      refreshReports();
    },
    [refreshReports, usingBackendArtifacts]
  );

  const handleToggleLock = useCallback(
    async (id: string) => {
      const report = reports.find((item) => item.id === id);
      if (usingBackendArtifacts && report) {
        try {
          await setArtifactLock('JD_REPORT', id, !report.isLocked);
        } catch {
          toggleReportLock(id);
        }
      } else {
        toggleReportLock(id);
      }
      refreshReports();
    },
    [refreshReports, reports, usingBackendArtifacts]
  );

  const selectedReports = useMemo(
    () => reports.filter((r) => selectedIds.includes(r.id)),
    [reports, selectedIds]
  );

  const hasLockedItemsSelected = useMemo(
    () => selectedReports.some((r) => r.isLocked),
    [selectedReports]
  );

  const handleBulkDelete = useCallback(() => {
    const deletableIds = selectedIds.filter((id) => {
      const r = reports.find((report) => report.id === id);
      return !r?.isLocked;
    });

    if (deletableIds.length === 0) return;

    Modal.confirm({
      title: `Delete ${deletableIds.length} reports?`,
      content:
        'Selected unlocked reports will be permanently removed. Locked reports will be skipped.',
      okText: 'Delete Selected',
      okType: 'danger',
      onOk: () => {
        Promise.all(
          deletableIds.map((id) =>
            usingBackendArtifacts
              ? deleteArtifactByClientId('JD_REPORT', id)
              : Promise.resolve(deleteReport(id))
          )
        ).finally(refreshReports);
        setSelectedIds([]);
      },
    });
  }, [selectedIds, reports, refreshReports, usingBackendArtifacts]);

  const handleClearAll = useCallback(() => {
    const isAnyLocked = reports.some((r) => r.isLocked);
    Modal.confirm({
      title: 'Clear all reports?',
      content: isAnyLocked
        ? 'All UNLOCKED reports will be permanently deleted. Locked reports will be preserved.'
        : 'This will permanently delete all saved reports. This action cannot be undone.',
      okText: 'Clear All',
      okType: 'danger',
      onOk: () => {
        (usingBackendArtifacts
          ? deleteAllArtifactsByType('JD_REPORT')
          : Promise.resolve(deleteAllReports())
        ).finally(refreshReports);
        setSelectedIds([]);
      },
    });
  }, [reports, refreshReports, usingBackendArtifacts]);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(reports.map((r) => r.id));
      } else {
        setSelectedIds([]);
      }
    },
    [reports]
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const handleUpdateTitle = useCallback(() => {
    if (!editingReport) return;
    (usingBackendArtifacts
      ? updateArtifactTitle('JD_REPORT', editingReport.id, editingReport.title)
      : Promise.resolve(updateReportTitle(editingReport.id, editingReport.title))
    ).finally(() => {
      refreshReports();
      setEditingReport(null);
    });
  }, [editingReport, refreshReports, usingBackendArtifacts]);

  const bulkActions = (
    <Tooltip title={hasLockedItemsSelected ? 'Unlock selected reports to delete them' : ''}>
      <Button
        danger
        type="primary"
        icon={<DeleteOutlined />}
        onClick={handleBulkDelete}
        disabled={selectedIds.length === 0 || hasLockedItemsSelected}
      >
        Delete Selected
      </Button>
    </Tooltip>
  );

  return (
    <div style={{ padding: 0, width: '100%' }}>
      <div className="mb-4">
        <IntelligenceSectionPicker value="jd-reports" />
      </div>
      <div style={{ marginBottom: 24 }}>
        <PageActionToolbar
          title="Analysis Reports"
          subtitle={`${reports.length} report${reports.length !== 1 ? 's' : ''} saved from your AI matching sessions.`}
          onDeleteAll={reports.length > 0 ? handleClearAll : undefined}
          deleteAllLabel="Clear All"
          deleteAllConfirmTitle="Clear All Reports?"
          deleteAllConfirmDescription="This will delete all unlocked reports. This cannot be undone."
          onPrimaryAction={() => navigate('/experience')}
          primaryActionLabel="New Match"
          primaryActionIcon={<PlusOutlined />}
        />

        <div className="flex flex-col gap-6">
          {selectedIds.length > 0 && (
            <div className="bg-white p-4 rounded-xl border border-sky-100 shadow-sm animate-in fade-in slide-in-from-top-2">
              <BulkActionHeader
                selectedCount={selectedIds.length}
                totalCount={reports.length}
                onSelectAll={handleSelectAll}
                onCancelSelection={() => setSelectedIds([])}
                title="Management"
                bulkActions={bulkActions}
              />
            </div>
          )}

          {!hasLoadedReports ? <PanelSkeleton rows={4} /> : null}

          {/* Empty state */}
          {hasLoadedReports && reports.length === 0 && (
            <div className="enterprise-empty flex flex-col items-center justify-center gap-6 px-4 py-16 sm:py-24">
              <div className="w-20 h-20 bg-sky-50 rounded-full flex items-center justify-center">
                <FileTextOutlined style={{ fontSize: 40, color: '#0ea5e9' }} />
              </div>
              <div className="text-center">
                <h3 className="text-gray-900 font-bold text-xl m-0 mb-2">No reports yet</h3>
                <p className="text-gray-500 m-0 max-w-sm">
                  Run the AI Resume Evaluator to generate your first technical gap analysis report.
                </p>
              </div>
              <Button
                type="primary"
                size="large"
                className="bg-sky-600 hover:!bg-sky-500 border-transparent shadow-lg shadow-sky-200"
                onClick={() => navigate('/experience')}
              >
                Go to Experience Page
              </Button>
            </div>
          )}

          {/* Report Cards Grid */}
          {hasLoadedReports && (
            <div className="grid grid-cols-1 gap-6">
              {reports.map((report) => {
                const meta = getScoreMeta(report.score);
                const isSelected = selectedIds.includes(report.id);
                const date = new Date(report.savedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <article
                    key={report.id}
                    className={`group overflow-hidden rounded-2xl border bg-white transition-all duration-300 ${
                      isSelected
                        ? 'border-sky-300 shadow-md ring-1 ring-sky-200'
                        : 'border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3 p-4 sm:gap-5 sm:p-6">
                      <div className="flex min-h-11 min-w-8 shrink-0 items-start justify-center pt-2">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleSelect(report.id)}
                          aria-label={`Select ${report.title || report.jdSnippet || 'untitled report'}`}
                        />
                      </div>
                      <ScoreBadge score={report.score} />

                      <div className="flex-1 min-w-0">
                        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                              style={{
                                background: meta.bg,
                                color: meta.text,
                                border: `1px solid ${meta.border}`,
                              }}
                            >
                              {meta.label} Match
                            </span>
                            {report.isLocked && (
                              <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100">
                                <LockOutlined className="text-[10px]" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">
                                  Locked
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                              {date}
                            </span>
                          </div>
                        </div>

                        <div className="group/title mb-4 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/jd-report/${report.id}`)}
                            className="min-h-10 min-w-0 flex-1 text-left text-base font-semibold text-slate-900 hover:text-blue-600"
                          >
                            <span className="line-clamp-2">
                              {report.title || report.jdSnippet || 'Untitled Match'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingReport({
                                id: report.id,
                                title: report.title || report.jdSnippet || '',
                              });
                            }}
                            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-100 hover:text-blue-600 sm:h-8 sm:w-8 sm:opacity-0 sm:group-hover/title:opacity-100"
                            aria-label="Rename report"
                          >
                            <EditOutlined className="text-sm" />
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {report.matched_skills?.slice(0, 6).map((s, i) => (
                            <span
                              key={i}
                              className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold"
                            >
                              {reportSkillName(s)}
                            </span>
                          ))}
                          {(report.matched_skills?.length ?? 0) > 6 && (
                            <span className="text-xs px-2.5 py-1 rounded-lg bg-gray-50 text-gray-400 border border-gray-100 font-medium">
                              +{report.matched_skills.length - 6} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div
                      className={`flex flex-col gap-2 border-t px-4 py-2 transition-colors duration-300 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-3.5 ${
                        isSelected ? 'bg-sky-50/40 border-sky-100' : 'bg-gray-50/60 border-gray-50'
                      }`}
                    >
                      <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold text-gray-500 sm:flex sm:items-center sm:gap-4 sm:text-xs sm:font-bold sm:uppercase sm:tracking-widest sm:text-gray-400">
                        <span className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{' '}
                          {report.matched_skills?.length ?? 0} strengths
                        </span>
                        <span className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />{' '}
                          {report.missing_skills?.length ?? 0} gaps
                        </span>
                        <span className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />{' '}
                          {report.tailored_bullets?.length ?? 0} rewrites
                        </span>
                      </div>
                      <div className="flex justify-end">
                        <RowActions
                          isLocked={report.isLocked}
                          onToggleLock={() => handleToggleLock(report.id)}
                          onView={() => navigate(`/jd-report/${report.id}`)}
                          onDelete={() => setDeletingId(report.id)}
                          disableDelete={report.isLocked}
                          deleteButtonTooltip={report.isLocked ? 'Unlock to delete' : undefined}
                          confirmDelete={false}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirm modal */}
      <Modal
        open={!!deletingId}
        title="Delete this report?"
        okText="Delete"
        okType="danger"
        cancelText="Cancel"
        onOk={() => deletingId && handleDelete(deletingId)}
        onCancel={() => setDeletingId(null)}
      >
        <p className="text-gray-600">This report will be permanently removed from your history.</p>
      </Modal>

      {/* Edit title modal */}
      <Modal
        open={!!editingReport}
        title="Rename Match Report"
        okText="Save"
        cancelText="Cancel"
        onOk={handleUpdateTitle}
        onCancel={() => setEditingReport(null)}
      >
        <div className="py-4">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">
            Report Title
          </label>
          <Input
            value={editingReport?.title}
            onChange={(e) =>
              setEditingReport((prev) => (prev ? { ...prev, title: e.target.value } : null))
            }
            placeholder="e.g., Senior Frontend Engineer @ Google"
            className="rounded-xl"
            onPressEnter={handleUpdateTitle}
            autoFocus
          />
        </div>
      </Modal>
    </div>
  );
};

export default JDReportsListPage;

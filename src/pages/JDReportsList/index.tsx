import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Modal, Checkbox, Space, Tooltip, Input } from 'antd';
import {
  DeleteOutlined,
  FileTextOutlined,
  LockOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { getAllReports, deleteReport, deleteAllReports, toggleReportLock, updateReportTitle } from '../../utils/reportStorage';
import type { StoredReport } from '../../utils/reportStorage';
import BulkActionHeader from '../../components/BulkActionHeader';
import RowActions from '../../components/RowActions';

const getScoreMeta = (score: number) => {
  if (score >= 85) return { label: 'Excellent', color: '#10b981', bg: '#f0fdf4', border: '#a7f3d0', text: '#065f46' };
  if (score >= 70) return { label: 'Strong',    color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' };
  if (score >= 55) return { label: 'Moderate',  color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', text: '#92400e' };
  if (score >= 40) return { label: 'Partial',   color: '#f97316', bg: '#fff7ed', border: '#fed7aa', text: '#7c2d12' };
  return              { label: 'Low',         color: '#ef4444', bg: '#fef2f2', border: '#fecaca', text: '#7f1d1d' };
};

const ScoreBadge: React.FC<{ score: number }> = ({ score }) => {
  const meta = getScoreMeta(score);
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl font-black"
      style={{ width: 64, height: 64, background: meta.bg, border: `2px solid ${meta.border}`, color: meta.color, flexShrink: 0 }}
    >
      <span className="text-xl leading-none">{score}</span>
      <span className="text-[9px] font-bold uppercase tracking-wide mt-0.5" style={{ color: meta.text }}>{meta.label}</span>
    </div>
  );
};

import PageActionToolbar from '../../components/PageActionToolbar';
import { PlusOutlined } from '@ant-design/icons';

const JDReportsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<StoredReport[]>(getAllReports());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingReport, setEditingReport] = useState<{ id: string, title: string } | null>(null);

  const handleDelete = useCallback((id: string) => {
    deleteReport(id);
    setReports(getAllReports());
    setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    setDeletingId(null);
  }, []);

  const handleToggleLock = useCallback((id: string) => {
    toggleReportLock(id);
    setReports(getAllReports());
  }, []);

  const selectedReports = useMemo(() => 
    reports.filter(r => selectedIds.includes(r.id)),
    [reports, selectedIds]
  );

  const hasLockedItemsSelected = useMemo(() => 
    selectedReports.some(r => r.isLocked),
    [selectedReports]
  );

  const handleBulkDelete = useCallback(() => {
    const deletableIds = selectedIds.filter(id => {
      const r = reports.find(report => report.id === id);
      return !r?.isLocked;
    });

    if (deletableIds.length === 0) return;

    Modal.confirm({
      title: `Delete ${deletableIds.length} reports?`,
      content: 'Selected unlocked reports will be permanently removed. Locked reports will be skipped.',
      okText: 'Delete Selected',
      okType: 'danger',
      onOk: () => {
        deletableIds.forEach(id => deleteReport(id));
        setReports(getAllReports());
        setSelectedIds([]);
      },
    });
  }, [selectedIds, reports]);

  const handleClearAll = useCallback(() => {
    const isAnyLocked = reports.some(r => r.isLocked);
    Modal.confirm({
      title: 'Clear all reports?',
      content: isAnyLocked 
        ? 'All UNLOCKED reports will be permanently deleted. Locked reports will be preserved.'
        : 'This will permanently delete all saved reports. This action cannot be undone.',
      okText: 'Clear All',
      okType: 'danger',
      onOk: () => {
        deleteAllReports();
        setReports(getAllReports());
        setSelectedIds([]);
      },
    });
  }, [reports]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(reports.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  }, [reports]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  }, []);
  
  const handleUpdateTitle = useCallback(() => {
    if (!editingReport) return;
    updateReportTitle(editingReport.id, editingReport.title);
    setReports(getAllReports());
    setEditingReport(null);
  }, [editingReport]);

  const bulkActions = (
    <Tooltip title={hasLockedItemsSelected ? "Unlock selected reports to delete them" : ""}>
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
            <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm animate-in fade-in slide-in-from-top-2">
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

          {/* Empty state */}
          {reports.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-24 gap-6">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center">
                <FileTextOutlined style={{ fontSize: 40, color: '#6366f1' }} />
              </div>
              <div className="text-center">
                <h3 className="text-gray-900 font-bold text-xl m-0 mb-2">No reports yet</h3>
                <p className="text-gray-500 m-0 max-w-sm">Run the AI Resume Evaluator to generate your first technical gap analysis report.</p>
              </div>
              <Button 
                type="primary" 
                size="large"
                className="bg-indigo-600 hover:!bg-indigo-500 border-transparent shadow-lg shadow-indigo-200"
                onClick={() => navigate('/experience')}
              >
                Go to Experience Page
              </Button>
            </div>
          )}

          {/* Report Cards Grid */}
          <div className="grid grid-cols-1 gap-6">
            {reports.map((report) => {
              const meta = getScoreMeta(report.score);
              const isSelected = selectedIds.includes(report.id);
              const date = new Date(report.savedAt).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
              });

              return (
                <div
                  key={report.id}
                  className={`group bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${
                    isSelected ? 'border-indigo-300 shadow-md ring-1 ring-indigo-200' : 'border-gray-100 shadow-sm hover:shadow-md'
                  }`}
                  onClick={() => toggleSelect(report.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="p-6 flex items-start gap-5">
                    <div onClick={(e) => e.stopPropagation()} className="pt-1">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggleSelect(report.id)}
                      />
                    </div>
                    <ScoreBadge score={report.score} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                            style={{ background: meta.bg, color: meta.text, border: `1px solid ${meta.border}` }}
                          >
                            {meta.label} Match
                          </span>
                          {report.isLocked && (
                            <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100">
                              <LockOutlined className="text-[10px]" />
                              <span className="text-[10px] font-bold uppercase tracking-wider">Locked</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{date}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 group/title mb-4">
                        <h3 className="text-gray-900 font-bold m-0 text-base flex-1 truncate">
                          {report.title || report.jdSnippet || 'Untitled Match'}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingReport({ id: report.id, title: report.title || report.jdSnippet || '' });
                          }}
                          className="opacity-0 group-hover/title:opacity-100 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-all"
                        >
                          <EditOutlined className="text-sm" />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {report.matched_skills?.slice(0, 6).map((s, i) => (
                          <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold">
                            {s}
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
                  <div className={`border-t px-6 py-3.5 flex items-center justify-between transition-colors duration-300 ${
                    isSelected ? 'bg-indigo-50/40 border-indigo-100' : 'bg-gray-50/60 border-gray-50'
                  }`}>
                    <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-gray-400">
                      <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {report.matched_skills?.length ?? 0} strengths</span>
                      <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-orange-400" /> {report.missing_skills?.length ?? 0} gaps</span>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
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
                </div>
              );
            })}
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
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Report Title</label>
          <Input
            value={editingReport?.title}
            onChange={(e) => setEditingReport(prev => prev ? { ...prev, title: e.target.value } : null)}
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


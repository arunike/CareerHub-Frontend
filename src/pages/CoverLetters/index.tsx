import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Tooltip, Input, Typography, Checkbox, message, Space } from 'antd';
import Modal from '../../components/MobileModal';
import {
  FileTextOutlined,
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined,
  EditOutlined,
  CopyOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import PageActionToolbar from '../../components/PageActionToolbar';
import BulkActionHeader from '../../components/BulkActionHeader';
import RowActions from '../../components/RowActions';
import {
  getAllCoverLetters,
  deleteCoverLetter,
  deleteAllCoverLetters,
  toggleCoverLetterLock,
  updateCoverLetterTitle,
} from '../../utils/coverLetterStorage';
import type { StoredCoverLetter } from '../../utils/coverLetterStorage';

const { Text } = Typography;

const CoverLetters: React.FC = () => {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [letters, setLetters] = useState<StoredCoverLetter[]>(getAllCoverLetters);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewingLetter, setViewingLetter] = useState<StoredCoverLetter | null>(null);
  const [editingLetter, setEditingLetter] = useState<{ id: string; title: string } | null>(null);

  const refresh = useCallback(() => setLetters(getAllCoverLetters()), []);

  /* ── Selection ── */
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      setSelectedIds(checked ? letters.map((l) => l.id) : []);
    },
    [letters]
  );

  const selectedLetters = useMemo(
    () => letters.filter((l) => selectedIds.includes(l.id)),
    [letters, selectedIds]
  );
  const hasLockedSelected = useMemo(
    () => selectedLetters.some((l) => l.isLocked),
    [selectedLetters]
  );

  /* ── Single-item actions ── */
  const handleDelete = useCallback(
    (id: string) => {
      deleteCoverLetter(id);
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      refresh();
    },
    [refresh]
  );

  const handleToggleLock = useCallback(
    (id: string) => {
      toggleCoverLetterLock(id);
      refresh();
    },
    [refresh]
  );

  const handleRename = useCallback(() => {
    if (!editingLetter) return;
    updateCoverLetterTitle(editingLetter.id, editingLetter.title);
    refresh();
    setEditingLetter(null);
  }, [editingLetter, refresh]);

  /* ── Bulk actions ── */
  const handleBulkDelete = useCallback(() => {
    const deletableIds = selectedIds.filter((id) => {
      const l = letters.find((x) => x.id === id);
      return !l?.isLocked;
    });
    if (deletableIds.length === 0) return;
    Modal.confirm({
      title: `Delete ${deletableIds.length} cover letter${deletableIds.length > 1 ? 's' : ''}?`,
      content: 'Locked letters will be skipped.',
      okText: 'Delete',
      okType: 'danger',
      onOk: () => {
        deletableIds.forEach((id) => deleteCoverLetter(id));
        setSelectedIds([]);
        refresh();
      },
    });
  }, [selectedIds, letters, refresh]);

  const handleBulkToggleLock = useCallback(
    (lock: boolean) => {
      selectedIds.forEach((id) => {
        const l = letters.find((x) => x.id === id);
        if (l && l.isLocked !== lock) toggleCoverLetterLock(id);
      });
      setSelectedIds([]);
      refresh();
    },
    [selectedIds, letters, refresh]
  );

  const handleDeleteAll = useCallback(() => {
    deleteAllCoverLetters();
    setSelectedIds([]);
    refresh();
  }, [refresh]);

  /* ── Export ── */
  const handleExport = useCallback(
    async (format: string): Promise<{ data: Blob; headers: Record<string, string> }> => {
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(letters, null, 2)], {
          type: 'application/json',
        });
        return { data: blob, headers: { 'content-type': 'application/json' } };
      }

      const escape = (v: string) => `"${v.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      const header = ['Title', 'Company', 'Role', 'Saved At', 'JD Snippet', 'Cover Letter'];
      const rows = letters.map((l) => [
        escape(l.title || `${l.roleTitle} @ ${l.companyName}`),
        escape(l.companyName),
        escape(l.roleTitle),
        escape(new Date(l.savedAt).toLocaleString()),
        escape(l.jdSnippet),
        escape(l.coverLetter),
      ]);
      const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      return { data: blob, headers: { 'content-type': 'text/csv' } };
    },
    [letters]
  );

  /* ── Copy helper ── */
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    messageApi.success('Copied to clipboard');
  };

  return (
    <div style={{ padding: 0, width: '100%' }}>
      {contextHolder}

      <div style={{ marginBottom: 24 }}>
        <PageActionToolbar
          title="Cover Letters"
          subtitle={`${letters.length} cover letter${letters.length !== 1 ? 's' : ''} saved`}
          onDeleteAll={letters.length > 0 ? handleDeleteAll : undefined}
          deleteAllConfirmTitle="Clear All Cover Letters?"
          deleteAllConfirmDescription="Locked letters will be preserved. This cannot be undone."
          onExport={letters.length > 0 ? handleExport : undefined}
          exportFilename="cover_letters"
          onPrimaryAction={() => navigate('/applications')}
          primaryActionLabel="Generate New"
          primaryActionIcon={<ThunderboltOutlined />}
        />
      </div>

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="enterprise-filter-bar mb-6 p-4 animate-in fade-in slide-in-from-top-2">
          <BulkActionHeader
            selectedCount={selectedIds.length}
            totalCount={letters.length}
            title="Cover Letters"
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
      {letters.length === 0 && (
        <div className="enterprise-empty flex flex-col items-center justify-center gap-6 py-24">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50">
            <FileTextOutlined style={{ fontSize: 40, color: '#0ea5e9' }} />
          </div>
          <div className="text-center">
            <h3 className="text-gray-900 font-bold text-xl m-0 mb-2">No cover letters yet</h3>
            <p className="text-gray-500 m-0 max-w-sm">
              Generate from any application to save a tailored cover letter here.
            </p>
          </div>
          <Button
            type="primary"
            size="large"
            icon={<ThunderboltOutlined />}
            onClick={() => navigate('/applications')}
            style={{ background: '#0ea5e9', borderColor: '#0ea5e9' }}
          >
            Go to Applications
          </Button>
        </div>
      )}

      {/* Card list */}
      <div className="flex flex-col gap-4">
        {letters.map((letter) => {
          const isSelected = selectedIds.includes(letter.id);
          const displayTitle = letter.title || `${letter.roleTitle} @ ${letter.companyName}`;
          const preview = letter.coverLetter.replace(/\n+/g, ' ').trim().slice(0, 200);
          const date = new Date(letter.savedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <article
              key={letter.id}
              className={`group enterprise-card overflow-hidden ${
                isSelected ? 'border-sky-300 shadow-md ring-1 ring-sky-200' : ''
              }`}
            >
              <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
                {/* Checkbox */}
                <div className="flex min-h-11 min-w-8 shrink-0 items-start justify-center pt-2">
                  <Checkbox
                    checked={isSelected}
                    onChange={() => toggleSelect(letter.id)}
                    aria-label={`Select ${displayTitle}`}
                  />
                </div>

                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
                  <FileTextOutlined style={{ color: '#0ea5e9', fontSize: 18 }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setViewingLetter(letter)}
                        className="min-h-10 min-w-0 flex-1 text-left text-base font-semibold text-slate-900 hover:text-blue-600"
                      >
                        <span className="line-clamp-2">{displayTitle}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLetter({ id: letter.id, title: displayTitle });
                        }}
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-100 hover:text-blue-600 sm:h-8 sm:w-8 sm:opacity-0 sm:group-hover:opacity-100"
                        aria-label={`Rename ${displayTitle}`}
                      >
                        <EditOutlined />
                      </button>
                      {letter.isLocked && (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100 text-[10px] font-bold uppercase tracking-wider shrink-0">
                          <LockOutlined className="text-[10px]" /> Locked
                        </span>
                      )}
                    </div>
                    <Text type="secondary" className="shrink-0 text-xs">
                      {date}
                    </Text>
                  </div>

                  {letter.jdSnippet && (
                    <Text type="secondary" className="text-xs block mb-2 truncate">
                      JD: {letter.jdSnippet}
                    </Text>
                  )}

                  <p className="text-gray-600 text-sm m-0 leading-relaxed line-clamp-2">
                    {preview}
                    {letter.coverLetter.length > 200 ? '…' : ''}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div
                className={`flex items-center justify-end gap-2 border-t px-4 py-2 transition-colors sm:px-5 sm:py-3 ${
                  isSelected ? 'bg-sky-50/40 border-sky-100' : 'bg-gray-50/60 border-gray-50'
                }`}
              >
                <RowActions
                  size="small"
                  isLocked={letter.isLocked}
                  onToggleLock={() => handleToggleLock(letter.id)}
                  onView={() => setViewingLetter(letter)}
                  onDelete={() => handleDelete(letter.id)}
                  disableDelete={letter.isLocked}
                  deleteButtonTooltip={letter.isLocked ? 'Unlock before deleting' : undefined}
                  deleteTitle="Delete cover letter?"
                  deleteDescription="This will permanently remove the letter from your history."
                />
              </div>
            </article>
          );
        })}
      </div>

      {/* View modal */}
      <Modal
        open={!!viewingLetter}
        title={
          <Space>
            <FileTextOutlined style={{ color: '#0ea5e9' }} />
            <span>
              {viewingLetter?.title ||
                `${viewingLetter?.roleTitle} @ ${viewingLetter?.companyName}`}
            </span>
          </Space>
        }
        onCancel={() => setViewingLetter(null)}
        footer={
          <Button
            icon={<CopyOutlined />}
            onClick={() => viewingLetter && handleCopy(viewingLetter.coverLetter)}
          >
            Copy to Clipboard
          </Button>
        }
        width={720}
      >
        {viewingLetter && (
          <div
            style={{
              background: '#f9f9f9',
              border: '1px solid #e8e8e8',
              borderRadius: 6,
              padding: '20px 24px',
              whiteSpace: 'pre-wrap',
              fontFamily: 'Georgia, serif',
              lineHeight: 1.9,
              fontSize: 14,
              maxHeight: 500,
              overflowY: 'auto',
            }}
          >
            {viewingLetter.coverLetter}
          </div>
        )}
      </Modal>

      {/* Rename modal */}
      <Modal
        open={!!editingLetter}
        title="Rename Cover Letter"
        okText="Save"
        cancelText="Cancel"
        onOk={handleRename}
        onCancel={() => setEditingLetter(null)}
      >
        <div className="py-4">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">
            Title
          </label>
          <Input
            value={editingLetter?.title}
            onChange={(e) =>
              setEditingLetter((prev) => (prev ? { ...prev, title: e.target.value } : null))
            }
            placeholder="e.g., Google — Senior Frontend Engineer"
            onPressEnter={handleRename}
            autoFocus
          />
        </div>
      </Modal>
    </div>
  );
};

export default CoverLetters;

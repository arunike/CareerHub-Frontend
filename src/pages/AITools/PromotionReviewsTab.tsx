import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Checkbox, Input, Popconfirm, Space, Tag, Typography, message } from 'antd';
import Modal from '../../components/MobileModal';
import {
  DeleteOutlined,
  EditOutlined,
  LockOutlined,
  RiseOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import BulkActionHeader from '../../components/BulkActionHeader';
import PageActionToolbar from '../../components/PageActionToolbar';
import RowActions from '../../components/RowActions';
import {
  deleteAllArtifactsByType,
  deleteArtifactByClientId,
  loadPromotionReviewsFromArtifacts,
  setArtifactLock,
  updateArtifactTitle,
  type StoredPromotionReview,
} from '../../utils/aiArtifactStorage';
import { parseInlineMarkdown } from '../../utils/simpleMarkdown';
import { PageState, PanelSkeleton } from '../../components/PageState';

const { Title } = Typography;

const verdictColor = (label?: string) => {
  const normalized = (label || '').toLowerCase();
  if (normalized.includes('strong')) return 'green';
  if (normalized.includes('ready')) return 'blue';
  if (normalized.includes('building')) return 'gold';
  return 'default';
};

const ratingToneClass = (label?: string) => {
  const normalized = (label || '').toLowerCase();
  if (normalized.includes('strong') || normalized.includes('ready')) {
    return 'border-emerald-200 bg-emerald-50/30';
  }
  if (normalized.includes('building')) return 'border-amber-200 bg-amber-50/30';
  return 'border-slate-200';
};

const PromotionReviewsTab: React.FC = () => {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [reviews, setReviews] = useState<StoredPromotionReview[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingReview, setEditingReview] = useState<{ id: string; title: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoadError(false);
    try {
      setReviews(await loadPromotionReviewsFromArtifacts());
    } catch {
      setLoadError(true);
      messageApi.error('Failed to load promotion reviews');
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedReviews = useMemo(
    () => reviews.filter((review) => selectedIds.includes(review.id)),
    [reviews, selectedIds]
  );
  const handleDelete = async (id: string) => {
    if (saving) return;
    setSaving(true);
    try {
      await deleteArtifactByClientId('PROMOTION_REVIEW', id);
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      await refresh();
      messageApi.success('Promotion review deleted');
    } catch {
      messageApi.error('Could not delete this promotion review');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLock = async (review: StoredPromotionReview) => {
    if (saving) return;
    setSaving(true);
    try {
      await setArtifactLock('PROMOTION_REVIEW', review.id, !review.isLocked);
      await refresh();
      messageApi.success(review.isLocked ? 'Promotion review unlocked' : 'Promotion review locked');
    } catch {
      messageApi.error('Could not update the promotion review lock');
    } finally {
      setSaving(false);
    }
  };

  const handleRename = async () => {
    if (!editingReview || saving) return;
    const nextTitle = editingReview.title.trim();
    if (!nextTitle) {
      messageApi.error('Enter a title before saving');
      return;
    }

    setSaving(true);
    try {
      await updateArtifactTitle('PROMOTION_REVIEW', editingReview.id, nextTitle);
      setEditingReview(null);
      await refresh();
      messageApi.success('Promotion review renamed');
    } catch {
      messageApi.error('Could not rename this promotion review');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDelete = () => {
    const deletableIds = selectedReviews.filter((review) => !review.isLocked).map((r) => r.id);
    if (!deletableIds.length) return;
    Modal.confirm({
      title: `Delete ${deletableIds.length} promotion review${deletableIds.length === 1 ? '' : 's'}?`,
      content: 'Locked reviews will be skipped.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        if (saving) return;
        setSaving(true);
        try {
          await Promise.all(
            deletableIds.map((id) => deleteArtifactByClientId('PROMOTION_REVIEW', id))
          );
          setSelectedIds([]);
          await refresh();
          messageApi.success(
            `${deletableIds.length} promotion review${deletableIds.length === 1 ? '' : 's'} deleted`
          );
        } catch {
          messageApi.error('Could not delete all selected promotion reviews');
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const handleBulkToggleLock = async (lock: boolean) => {
    if (saving) return;
    setSaving(true);
    try {
      await Promise.all(
        selectedReviews
          .filter((review) => Boolean(review.isLocked) !== lock)
          .map((review) => setArtifactLock('PROMOTION_REVIEW', review.id, lock))
      );
      setSelectedIds([]);
      await refresh();
      messageApi.success(`Selected promotion reviews ${lock ? 'locked' : 'unlocked'}`);
    } catch {
      messageApi.error(`Could not ${lock ? 'lock' : 'unlock'} all selected promotion reviews`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAll = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await deleteAllArtifactsByType('PROMOTION_REVIEW');
      setSelectedIds([]);
      await refresh();
      messageApi.success('Unlocked promotion reviews deleted');
    } catch {
      messageApi.error('Could not delete promotion reviews');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (): Promise<{ data: Blob; headers: Record<string, string> }> => {
    const blob = new Blob([JSON.stringify(reviews, null, 2)], { type: 'application/json' });
    return { data: blob, headers: { 'content-type': 'application/json' } };
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {contextHolder}
      <PageActionToolbar
        title="Promotion Reviews"
        subtitle="Saved AI evaluations for promotion readiness across current and past roles."
        exportFilename="promotion_reviews"
        onExport={handleExport}
        onDeleteAll={handleDeleteAll}
        deleteAllDisabled={saving}
        deleteAllConfirmTitle="Delete all promotion reviews?"
        deleteAllConfirmDescription="Locked promotion reviews will be preserved."
      />

      {selectedIds.length > 0 && (
        <BulkActionHeader
          selectedCount={selectedIds.length}
          totalCount={reviews.length}
          title="Promotion Reviews"
          onSelectAll={(checked) =>
            setSelectedIds(checked ? reviews.map((review) => review.id) : [])
          }
          onCancelSelection={() => setSelectedIds([])}
          bulkActions={
            <Space wrap>
              <Popconfirm
                title="Delete selected promotion reviews?"
                description="Locked reviews will be skipped."
                okText="Delete"
                okType="danger"
                onConfirm={handleBulkDelete}
              >
                <Button danger icon={<DeleteOutlined />} disabled={saving}>
                  Delete
                </Button>
              </Popconfirm>
              <Button
                icon={<LockOutlined />}
                disabled={saving}
                onClick={() => handleBulkToggleLock(true)}
              >
                Lock
              </Button>
              <Button
                icon={<UnlockOutlined />}
                disabled={saving}
                onClick={() => handleBulkToggleLock(false)}
              >
                Unlock
              </Button>
            </Space>
          }
        />
      )}

      {loading && reviews.length === 0 ? (
        <PanelSkeleton rows={4} />
      ) : loadError && reviews.length === 0 ? (
        <PageState
          tone="error"
          title="Promotion reviews unavailable"
          description="We couldn't load your saved reviews. No review data was changed."
          actionLabel="Try again"
          onAction={() => {
            setLoading(true);
            void refresh();
          }}
        />
      ) : reviews.length === 0 ? (
        <PageState
          title="No promotion reviews yet"
          description="Generate a promotion review from a Career History entry to save it here."
          actionLabel="Go to Career History"
          onAction={() => navigate('/experience')}
          icon={<RiseOutlined />}
        />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4">
          {reviews.map((item) => {
            const verdict = item.review?.readiness_verdict;
            const prediction = item.review?.promotion_prediction;
            const dashboard = item.review?.readiness_dashboard;
            return (
              <article
                key={item.id}
                className={`rounded-2xl border bg-white p-4 shadow-[0_18px_48px_-42px_rgba(15,23,42,0.7)] transition-colors sm:p-5 ${ratingToneClass(
                  verdict?.label
                )}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <Checkbox
                      className="mt-1"
                      checked={selectedIds.includes(item.id)}
                      aria-label={`Select ${item.title}`}
                      onChange={() =>
                        setSelectedIds((prev) =>
                          prev.includes(item.id)
                            ? prev.filter((id) => id !== item.id)
                            : [...prev, item.id]
                        )
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Title level={4} className="!m-0 min-w-0 truncate !text-lg !leading-6">
                          {item.title}
                        </Title>
                        <Tag
                          color={verdictColor(verdict?.label)}
                          className="m-0 rounded-md px-2 py-0.5 text-[11px] font-semibold"
                        >
                          {verdict?.label || 'Review'}
                        </Tag>
                        {item.isLocked && <Tag icon={<LockOutlined />}>Locked</Tag>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                        {item.roleTitle} @ {item.companyName} ·{' '}
                        {new Date(item.savedAt).toLocaleString()}
                      </div>
                      <p className="mt-4 line-clamp-3 max-w-[96ch] text-sm leading-6 text-slate-700">
                        {parseInlineMarkdown(verdict?.summary)}
                      </p>
                      {prediction && (
                        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[120px_minmax(0,1fr)]">
                          <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                            <div className="text-xl font-black leading-none text-blue-700">
                              {prediction.probability_percent}%
                            </div>
                            <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                              {prediction.chance_label} chance
                            </div>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                              Likely timing
                            </div>
                            <div className="mt-1 text-sm font-bold text-slate-900">
                              {prediction.likely_timeline}
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Button
                          size="middle"
                          type="primary"
                          onClick={() => navigate(`/promotion-review/${item.id}`)}
                          className="min-h-10"
                        >
                          View Review
                        </Button>
                        <Tag className="m-0 rounded-md px-2.5 py-0.5 text-xs font-semibold">
                          Confidence: {verdict?.confidence || 'unknown'}
                        </Tag>
                        {dashboard && (
                          <Tag className="m-0 rounded-md px-2.5 py-0.5 text-xs font-semibold">
                            Packet: {dashboard.packet_readiness_score} ·{' '}
                            {dashboard.packet_readiness_label}
                          </Tag>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end border-t border-slate-100 pt-2 sm:border-0 sm:pt-0">
                    <RowActions
                      isLocked={item.isLocked}
                      onToggleLock={() => handleToggleLock(item)}
                      onEdit={() => setEditingReview({ id: item.id, title: item.title })}
                      onDelete={() => handleDelete(item.id)}
                      deleteTitle="Delete promotion review?"
                      deleteDescription="This removes the saved AI review."
                      disableDelete={item.isLocked}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        title="Rename promotion review"
        open={!!editingReview}
        onCancel={() => setEditingReview(null)}
        onOk={handleRename}
        okText="Save title"
        okButtonProps={{ loading: saving, disabled: !editingReview?.title.trim() }}
      >
        <Input
          value={editingReview?.title || ''}
          onChange={(event) =>
            setEditingReview((prev) => (prev ? { ...prev, title: event.target.value } : prev))
          }
          prefix={<EditOutlined />}
        />
      </Modal>
    </div>
  );
};

export default PromotionReviewsTab;

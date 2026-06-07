import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Checkbox, Input, Modal, Popconfirm, Space, Tag, Typography, message } from 'antd';
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

const { Text, Title } = Typography;

const verdictColor = (label?: string) => {
  const normalized = (label || '').toLowerCase();
  if (normalized.includes('strong')) return 'green';
  if (normalized.includes('ready')) return 'blue';
  if (normalized.includes('building')) return 'gold';
  return 'default';
};

const PromotionReviewsTab: React.FC = () => {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [reviews, setReviews] = useState<StoredPromotionReview[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingReview, setEditingReview] = useState<{ id: string; title: string } | null>(null);

  const refresh = useCallback(async () => {
    try {
      setReviews(await loadPromotionReviewsFromArtifacts());
    } catch {
      messageApi.error('Failed to load promotion reviews');
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
    await deleteArtifactByClientId('PROMOTION_REVIEW', id);
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    await refresh();
  };

  const handleToggleLock = async (review: StoredPromotionReview) => {
    await setArtifactLock('PROMOTION_REVIEW', review.id, !review.isLocked);
    await refresh();
  };

  const handleRename = async () => {
    if (!editingReview) return;
    await updateArtifactTitle('PROMOTION_REVIEW', editingReview.id, editingReview.title);
    setEditingReview(null);
    await refresh();
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
        await Promise.all(
          deletableIds.map((id) => deleteArtifactByClientId('PROMOTION_REVIEW', id))
        );
        setSelectedIds([]);
        await refresh();
      },
    });
  };

  const handleBulkToggleLock = async (lock: boolean) => {
    await Promise.all(
      selectedReviews
        .filter((review) => Boolean(review.isLocked) !== lock)
        .map((review) => setArtifactLock('PROMOTION_REVIEW', review.id, lock))
    );
    setSelectedIds([]);
    await refresh();
  };

  const handleDeleteAll = async () => {
    await deleteAllArtifactsByType('PROMOTION_REVIEW');
    setSelectedIds([]);
    await refresh();
  };

  const handleExport = async (): Promise<{ data: Blob; headers: Record<string, string> }> => {
    const blob = new Blob([JSON.stringify(reviews, null, 2)], { type: 'application/json' });
    return { data: blob, headers: { 'content-type': 'application/json' } };
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {contextHolder}
      <PageActionToolbar
        title="Promotion Reviews"
        subtitle="Saved AI evaluations for promotion readiness across current and past roles."
        exportFilename="promotion_reviews"
        onExport={handleExport}
        onDeleteAll={handleDeleteAll}
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
                <Button danger icon={<DeleteOutlined />}>
                  Delete
                </Button>
              </Popconfirm>
              <Button icon={<LockOutlined />} onClick={() => handleBulkToggleLock(true)}>
                Lock
              </Button>
              <Button icon={<UnlockOutlined />} onClick={() => handleBulkToggleLock(false)}>
                Unlock
              </Button>
            </Space>
          }
        />
      )}

      {reviews.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-gray-200 bg-white p-10 text-center">
          <RiseOutlined className="text-3xl text-blue-500 mb-3" />
          <Title level={3} className="!mt-0">
            No promotion reviews yet
          </Title>
          <Text type="secondary">Generate one from an Experience entry to save it here.</Text>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4">
          {reviews.map((item) => {
            const verdict = item.review?.readiness_verdict;
            return (
              <div
                key={item.id}
                className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <Checkbox
                      checked={selectedIds.includes(item.id)}
                      onChange={() =>
                        setSelectedIds((prev) =>
                          prev.includes(item.id)
                            ? prev.filter((id) => id !== item.id)
                            : [...prev, item.id]
                        )
                      }
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Title level={4} className="!m-0 truncate">
                          {item.title}
                        </Title>
                        <Tag color={verdictColor(verdict?.label)} className="m-0">
                          {verdict?.label || 'Review'}
                        </Tag>
                        {item.isLocked && <Tag icon={<LockOutlined />}>Locked</Tag>}
                      </div>
                      <Text type="secondary">
                        {item.roleTitle} @ {item.companyName} ·{' '}
                        {new Date(item.savedAt).toLocaleString()}
                      </Text>
                      <Text className="block mt-3 text-gray-700">{verdict?.summary}</Text>
                    </div>
                  </div>
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
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="small"
                    type="primary"
                    onClick={() => navigate(`/promotion-review/${item.id}`)}
                  >
                    View Review
                  </Button>
                  <Tag className="m-0">Confidence: {verdict?.confidence || 'unknown'}</Tag>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        title="Rename promotion review"
        open={!!editingReview}
        onCancel={() => setEditingReview(null)}
        onOk={handleRename}
        okText="Save"
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

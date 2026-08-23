import { useCallback, useEffect, useRef, useState } from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import { applyGoogleSheetImportReview, getGoogleSheetImportReview } from '../../api';
import type {
  GoogleSheetDuplicateResolution,
  GoogleSheetImportReview,
  GoogleSheetSyncConfig,
} from '../../types';
import { isCanceledRequest } from './sheetRequests';

export const useSheetImportReview = ({
  messageApi,
  refresh,
  setBusyId,
}: {
  messageApi: MessageInstance;
  refresh: () => void;
  setBusyId: (id: number | null) => void;
}) => {
  const [reviewConfig, setReviewConfig] = useState<GoogleSheetSyncConfig | null>(null);
  const [importReview, setImportReview] = useState<GoogleSheetImportReview | null>(null);
  const [selectedReviewIds, setSelectedReviewIds] = useState<string[]>([]);
  const [duplicateResolutions, setDuplicateResolutions] = useState<
    Record<string, GoogleSheetDuplicateResolution>
  >({});
  const [reviewLoading, setReviewLoading] = useState(false);
  const [applyingReview, setApplyingReview] = useState(false);
  const reviewAbortRef = useRef<AbortController | null>(null);

  useEffect(() => () => reviewAbortRef.current?.abort(), []);

  const cancelReviewRequest = useCallback(() => {
    reviewAbortRef.current?.abort();
    reviewAbortRef.current = null;
    setReviewLoading(false);
    setBusyId(null);
  }, [setBusyId]);

  const closeImportReview = useCallback(() => {
    if (applyingReview) return;
    cancelReviewRequest();
    setReviewConfig(null);
    setImportReview(null);
    setSelectedReviewIds([]);
    setDuplicateResolutions({});
  }, [applyingReview, cancelReviewRequest]);

  const openImportReview = async (config: GoogleSheetSyncConfig, force = false) => {
    reviewAbortRef.current?.abort();
    const controller = new AbortController();
    reviewAbortRef.current = controller;
    setBusyId(config.id);
    setReviewLoading(true);
    setReviewConfig(config);
    try {
      const response = await getGoogleSheetImportReview(config.id, force, {
        signal: controller.signal,
      });
      setImportReview(response.data.review);
      setSelectedReviewIds(response.data.review.items.map((item) => item.id));
      setDuplicateResolutions(
        response.data.review.items.reduce<Record<string, GoogleSheetDuplicateResolution>>(
          (acc, item) => {
            if (item.action === 'possible_duplicate') {
              acc[item.id] = 'merge';
            }
            return acc;
          },
          {}
        )
      );
      if (response.data.review.items.length === 0) {
        messageApi.success('No import changes need review');
      }
    } catch (error) {
      if (isCanceledRequest(error)) return;
      messageApi.error('Failed to analyze sheet for import');
      console.error('Failed to load Google Sheet import review', error);
      setReviewConfig(null);
    } finally {
      if (reviewAbortRef.current === controller) {
        reviewAbortRef.current = null;
        setReviewLoading(false);
        setBusyId(null);
      }
    }
  };

  const applyReview = async () => {
    if (!reviewConfig || !importReview) return;
    setApplyingReview(true);
    try {
      const response = await applyGoogleSheetImportReview(
        reviewConfig.id,
        selectedReviewIds,
        duplicateResolutions
      );
      messageApi.success(
        `Import applied: ${response.data.result.created || 0} created, ${response.data.result.updated || 0} updated, ${response.data.result.rejected || 0} rejected`
      );
      setReviewConfig(null);
      setImportReview(null);
      setSelectedReviewIds([]);
      setDuplicateResolutions({});
    } catch (error) {
      messageApi.error('Failed to apply import review');
      console.error('Failed to apply Google Sheet import review', error);
    } finally {
      setApplyingReview(false);
      refresh();
    }
  };

  const toggleReviewItem = (itemId: string, checked: boolean) => {
    setSelectedReviewIds((current) =>
      checked ? [...current, itemId] : current.filter((id) => id !== itemId)
    );
  };

  const toggleAllReviewItems = (checked: boolean) => {
    setSelectedReviewIds(checked && importReview ? importReview.items.map((item) => item.id) : []);
  };

  const updateDuplicateResolution = (
    itemId: string,
    resolution: GoogleSheetDuplicateResolution
  ) => {
    setDuplicateResolutions((current) => ({ ...current, [itemId]: resolution }));
  };

  return {
    reviewConfig,
    importReview,
    selectedReviewIds,
    duplicateResolutions,
    reviewLoading,
    applyingReview,
    openImportReview,
    applyReview,
    toggleReviewItem,
    toggleAllReviewItems,
    updateDuplicateResolution,
    closeImportReview,
  };
};

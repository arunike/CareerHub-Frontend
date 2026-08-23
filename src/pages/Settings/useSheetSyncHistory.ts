import { useCallback, useEffect, useRef, useState } from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import { getGoogleSheetSyncRuns, rollbackGoogleSheetSyncRun } from '../../api';
import type { GoogleSheetSyncConfig, GoogleSheetSyncRun } from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';
import { isCanceledRequest } from './sheetRequests';

export const useSheetSyncHistory = ({
  messageApi,
  refresh,
}: {
  messageApi: MessageInstance;
  refresh: () => void;
}) => {
  const [historyConfig, setHistoryConfig] = useState<GoogleSheetSyncConfig | null>(null);
  const [syncRuns, setSyncRuns] = useState<GoogleSheetSyncRun[]>([]);
  const [syncRunsLoading, setSyncRunsLoading] = useState(false);
  const historyAbortRef = useRef<AbortController | null>(null);

  useEffect(() => () => historyAbortRef.current?.abort(), []);

  const closeHistory = useCallback(() => {
    historyAbortRef.current?.abort();
    historyAbortRef.current = null;
    setHistoryConfig(null);
    setSyncRuns([]);
    setSyncRunsLoading(false);
  }, []);

  const openHistory = async (config: GoogleSheetSyncConfig) => {
    historyAbortRef.current?.abort();
    const controller = new AbortController();
    historyAbortRef.current = controller;
    setHistoryConfig(config);
    setSyncRunsLoading(true);
    setSyncRuns([]);
    try {
      const response = await getGoogleSheetSyncRuns(config.id, { signal: controller.signal });
      setSyncRuns(response.data.runs);
    } catch (error) {
      if (isCanceledRequest(error)) return;
      messageApi.error('Failed to load sync runs');
    } finally {
      if (historyAbortRef.current === controller) {
        historyAbortRef.current = null;
        setSyncRunsLoading(false);
      }
    }
  };

  const rollbackRun = async (config: GoogleSheetSyncConfig, runId: number) => {
    try {
      await rollbackGoogleSheetSyncRun(config.id, runId);
      messageApi.success('Run successfully rolled back');
      openHistory(config);
      refresh();
    } catch (error) {
      messageApi.error(getApiErrorMessage(error, 'Failed to rollback run'));
    }
  };

  return { historyConfig, syncRuns, syncRunsLoading, openHistory, closeHistory, rollbackRun };
};

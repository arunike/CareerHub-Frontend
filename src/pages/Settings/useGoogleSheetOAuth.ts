import { useCallback, useEffect, useState } from 'react';
import type React from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import {
  connectGoogleOAuth,
  disconnectGoogleOAuth,
  getGoogleSpreadsheetTabs,
  getGoogleSpreadsheets,
} from '../../api';
import type {
  GoogleOAuthStatus,
  GoogleSheetSyncPreview,
  GoogleSpreadsheetFile,
  GoogleSpreadsheetTab,
} from '../../types';
import { spreadsheetIdFromUrl, type Draft } from './sheetMapping';

export const useGoogleSheetOAuth = ({
  messageApi,
  refresh,
  setDraft,
  setPreview,
  sheetUrl,
}: {
  messageApi: MessageInstance;
  refresh: () => void;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  setPreview: React.Dispatch<React.SetStateAction<GoogleSheetSyncPreview | null>>;
  sheetUrl: string;
}) => {
  const [googleStatus, setGoogleStatus] = useState<GoogleOAuthStatus | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [spreadsheets, setSpreadsheets] = useState<GoogleSpreadsheetFile[]>([]);
  const [spreadsheetsLoading, setSpreadsheetsLoading] = useState(false);
  const [worksheetTabs, setWorksheetTabs] = useState<GoogleSpreadsheetTab[]>([]);
  const [worksheetTabsLoading, setWorksheetTabsLoading] = useState(false);

  const fetchSpreadsheets = useCallback(async () => {
    if (!googleStatus?.connected || !googleStatus.can_list_spreadsheets) {
      setSpreadsheets([]);
      return;
    }
    setSpreadsheetsLoading(true);
    try {
      const response = await getGoogleSpreadsheets();
      setSpreadsheets(response.data.spreadsheets);
    } catch (error) {
      messageApi.error('Could not load your Google Sheets');
      console.error('Failed to load Google spreadsheets', error);
    } finally {
      setSpreadsheetsLoading(false);
    }
  }, [googleStatus?.can_list_spreadsheets, googleStatus?.connected, messageApi]);

  useEffect(() => {
    fetchSpreadsheets();
  }, [fetchSpreadsheets]);

  const fetchWorksheetTabs = useCallback(
    async (url: string) => {
      const spreadsheetId = spreadsheetIdFromUrl(url);
      if (!spreadsheetId || !googleStatus?.connected) {
        setWorksheetTabs([]);
        return;
      }
      setWorksheetTabsLoading(true);
      try {
        const response = await getGoogleSpreadsheetTabs(spreadsheetId);
        setWorksheetTabs(response.data.tabs);
        setDraft((current) => {
          if (!response.data.tabs.length || current.worksheet_name) {
            return current;
          }
          return { ...current, worksheet_name: response.data.tabs[0].title };
        });
      } catch (error) {
        setWorksheetTabs([]);
        console.error('Failed to load worksheet tabs', error);
      } finally {
        setWorksheetTabsLoading(false);
      }
    },
    [googleStatus?.connected, setDraft]
  );

  useEffect(() => {
    fetchWorksheetTabs(sheetUrl);
  }, [sheetUrl, fetchWorksheetTabs]);

  // The OAuth callback returns here with ?google=connected|error.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleResult = params.get('google');
    if (!googleResult) return;
    if (googleResult === 'connected') {
      messageApi.success('Google connected');
      refresh();
    } else if (googleResult === 'error') {
      messageApi.error(params.get('message') || 'Google connection failed');
    }
    params.delete('google');
    params.delete('message');
    const nextQuery = params.toString();
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageApi]);

  const connectGoogle = async () => {
    setGoogleBusy(true);
    try {
      const response = await connectGoogleOAuth(window.location.href);
      window.location.href = response.data.authorization_url;
    } catch (error) {
      messageApi.error('Google OAuth is not configured yet');
      console.error('Failed to start Google OAuth', error);
    } finally {
      setGoogleBusy(false);
    }
  };

  const disconnectGoogle = async () => {
    setGoogleBusy(true);
    try {
      await disconnectGoogleOAuth();
      messageApi.success('Google disconnected');
      refresh();
    } catch (error) {
      messageApi.error('Failed to disconnect Google');
      console.error('Failed to disconnect Google', error);
    } finally {
      setGoogleBusy(false);
    }
  };

  const selectSpreadsheet = (url: string) => {
    const sheet = spreadsheets.find((candidate) => candidate.url === url);
    setPreview(null);
    setWorksheetTabs([]);
    setDraft((current) => ({
      ...current,
      name: current.name || sheet?.name || '',
      sheet_url: url,
      worksheet_name: '',
    }));
  };

  return {
    googleStatus,
    setGoogleStatus,
    googleBusy,
    spreadsheets,
    spreadsheetsLoading,
    worksheetTabs,
    worksheetTabsLoading,
    connectGoogle,
    disconnectGoogle,
    selectSpreadsheet,
  };
};

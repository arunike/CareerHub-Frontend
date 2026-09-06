import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircleOutlined, ExperimentOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, message } from 'antd';
import {
  createGoogleSheetSync,
  deleteGoogleSheetSync,
  getGoogleOAuthStatus,
  getGoogleSheetSyncs,
  previewGoogleSheetSync,
  resyncGoogleSheetSync,
  runGoogleSheetSync,
  testGoogleSheetSync,
  updateGoogleSheetSync,
} from '../../api';
import type { GoogleSheetSyncConfig } from '../../types';
import SheetImportReviewModal from './SheetImportReviewModal';
import SheetMappingTabs from './SheetMappingTabs';
import { useSheetDraft } from './useSheetDraft';
import { useGoogleSheetOAuth } from './useGoogleSheetOAuth';
import { useSheetImportReview } from './useSheetImportReview';
import { useSheetSyncHistory } from './useSheetSyncHistory';
import { isCanceledRequest } from './sheetRequests';
import SheetApplicationOptions from './SheetApplicationOptions';
import SheetScheduleFields from './SheetScheduleFields';
import SheetSyncBehaviorFields from './SheetSyncBehaviorFields';
import SheetTargetPicker from './SheetTargetPicker';
import SheetSourceFields from './SheetSourceFields';
import GoogleConnectionBanner from './GoogleConnectionBanner';
import SavedSyncList from './SavedSyncList';
import SheetSyncReviewModal from './SheetSyncReviewModal';
import SheetSyncHistoryModal from './SheetSyncHistoryModal';
import SheetPreviewPanel from './SheetPreviewPanel';
import { buildAutoMapping, emptyDraft, toDraft } from './sheetMapping';

const GoogleSheetsSettings: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [configs, setConfigs] = useState<GoogleSheetSyncConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [syncReview, setSyncReview] = useState<{
    config: GoogleSheetSyncConfig;
    result: GoogleSheetSyncConfig['last_result'];
    force: boolean;
  } | null>(null);
  const actionAbortRef = useRef<AbortController | null>(null);

  useEffect(() => () => actionAbortRef.current?.abort(), []);

  const {
    draft,
    setDraft,
    preview,
    setPreview,
    fieldToAdd,
    setFieldToAdd,
    fields,
    requiredFields,
    visibleMappingFields,
    unmappedFields,
    missingRequiredFields,
    canSaveDraft,
    sheetMappingHeaders,
    updateDraft,
    updateMapping,
    updateStrategy,
    updateSheetColumnMapping,
    applyAutoMapping,
    addMappingField,
    removeMappingField,
    fieldForSheetHeader,
    sampleForHeader,
    changeTarget,
    draftPayload,
  } = useSheetDraft();

  const fetchConfigs = useCallback(async () => {
    try {
      const [syncsResponse, oauthResponse] = await Promise.all([
        getGoogleSheetSyncs(),
        getGoogleOAuthStatus(),
      ]);
      setConfigs(syncsResponse.data);
      setGoogleStatus(oauthResponse.data);
    } catch (error) {
      messageApi.error('Failed to load Google Sheet syncs');
      console.error('Failed to load Google Sheet syncs', error);
    } finally {
      setLoading(false);
    }
    // setGoogleStatus comes from the OAuth hook below and is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageApi]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const {
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
  } = useGoogleSheetOAuth({
    messageApi,
    refresh: fetchConfigs,
    setDraft,
    setPreview,
    sheetUrl: draft.sheet_url,
  });

  const {
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
  } = useSheetImportReview({ messageApi, refresh: fetchConfigs, setBusyId });

  const { historyConfig, syncRuns, syncRunsLoading, openHistory, closeHistory, rollbackRun } =
    useSheetSyncHistory({ messageApi, refresh: fetchConfigs });

  const cancelActionRequest = useCallback(() => {
    actionAbortRef.current?.abort();
    actionAbortRef.current = null;
    setBusyId(null);
    setPreviewing(false);
  }, []);

  const closeSyncReview = useCallback(() => {
    cancelActionRequest();
    setSyncReview(null);
  }, [cancelActionRequest]);

  const previewDraft = async () => {
    if (!draft.sheet_url.trim()) {
      messageApi.warning('Paste a Google Sheet link first');
      return;
    }
    actionAbortRef.current?.abort();
    const controller = new AbortController();
    actionAbortRef.current = controller;
    setPreviewing(true);
    try {
      const response = await previewGoogleSheetSync(draftPayload(worksheetTabs[0]?.title), {
        signal: controller.signal,
      });
      setPreview(response.data.preview);
      const autoMapping = applyAutoMapping(response.data.preview.headers, draft.target_type);
      if (Object.keys(autoMapping).length > 0) {
        messageApi.success('Preview loaded and mapping generated');
      } else {
        messageApi.warning('Preview loaded, but no matching columns were found');
      }
    } catch (error) {
      if (isCanceledRequest(error)) return;
      messageApi.error('Could not preview this sheet');
      console.error('Failed to preview Google Sheet sync', error);
    } finally {
      if (actionAbortRef.current === controller) {
        actionAbortRef.current = null;
        setPreviewing(false);
      }
    }
  };

  const saveDraft = async () => {
    if (!draft.name.trim() || !draft.sheet_url.trim()) {
      messageApi.warning('Name and Google Sheet link are required');
      return;
    }
    if (missingRequiredFields.length > 0) {
      messageApi.warning(
        `Map required fields first: ${missingRequiredFields.map((field) => field.label).join(', ')}`
      );
      return;
    }
    setSaving(true);
    try {
      const payload = draftPayload(worksheetTabs[0]?.title);

      if (draft.id) {
        await updateGoogleSheetSync(draft.id, payload);
        messageApi.success('Google Sheet sync updated');
      } else {
        await createGoogleSheetSync(payload);
        messageApi.success('Google Sheet sync created');
      }
      setDraft(emptyDraft(draft.target_type));
      fetchConfigs();
    } catch (error) {
      messageApi.error('Failed to save Google Sheet sync');
      console.error('Failed to save Google Sheet sync', error);
    } finally {
      setSaving(false);
    }
  };

  const testConfig = async (config: GoogleSheetSyncConfig) => {
    actionAbortRef.current?.abort();
    const controller = new AbortController();
    actionAbortRef.current = controller;
    setBusyId(config.id);
    try {
      const response = await testGoogleSheetSync(config.id, { signal: controller.signal });
      setPreview(response.data.preview);
      const autoMapping = buildAutoMapping(config.target_type, response.data.preview.headers);
      if (Object.keys(autoMapping).length > 0) {
        await updateGoogleSheetSync(config.id, { column_mapping: autoMapping });
        setDraft({ ...toDraft(config), column_mapping: autoMapping });
        messageApi.success('Sheet connection works. Mapping was generated from the headers.');
        fetchConfigs();
      } else {
        setDraft(toDraft(config));
        messageApi.warning('Sheet connection works, but no matching columns were found.');
      }
    } catch (error) {
      if (isCanceledRequest(error)) return;
      messageApi.error('Could not read this sheet');
      console.error('Failed to test Google Sheet sync', error);
    } finally {
      if (actionAbortRef.current === controller) {
        actionAbortRef.current = null;
        setBusyId(null);
      }
    }
  };

  const syncConfig = async (config: GoogleSheetSyncConfig, force = false) => {
    actionAbortRef.current?.abort();
    const controller = new AbortController();
    actionAbortRef.current = controller;
    setBusyId(config.id);
    try {
      const response = force
        ? await resyncGoogleSheetSync(config.id, { signal: controller.signal })
        : await runGoogleSheetSync(config.id, { signal: controller.signal });
      messageApi.success(`${force ? 'Resync' : 'Sync'} finished`);
      setSyncReview({ config, result: response.data.result, force });
      (response.data.result.warnings || []).forEach((warning) => {
        messageApi.warning(warning.message);
      });
      fetchConfigs();
    } catch (error) {
      if (isCanceledRequest(error)) return;
      messageApi.error(force ? 'Resync failed' : 'Sync failed');
      console.error('Failed to run Google Sheet sync', error);
      fetchConfigs();
    } finally {
      if (actionAbortRef.current === controller) {
        actionAbortRef.current = null;
        setBusyId(null);
      }
    }
  };

  const removeConfig = async (config: GoogleSheetSyncConfig) => {
    setBusyId(config.id);
    try {
      await deleteGoogleSheetSync(config.id);
      messageApi.success('Google Sheet sync removed');
      if (draft.id === config.id) {
        setDraft(emptyDraft());
      }
      fetchConfigs();
    } catch (error) {
      messageApi.error('Failed to delete Google Sheet sync');
      console.error('Failed to delete Google Sheet sync', error);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {contextHolder}
      <div className="bg-white dark:bg-ink-900 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-sm space-y-5">
        <div className="flex items-start justify-between gap-4 border-b pb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-ink-50">Google Sheets</h3>
            <p className="text-sm text-gray-500 dark:text-ink-400 mt-1">
              Link a sheet, map columns, then let the daily maintenance job import changes.
            </p>
          </div>
          <Button
            icon={<PlusOutlined />}
            onClick={() => {
              setDraft(emptyDraft());
              setPreview(null);
            }}
          >
            New Sync
          </Button>
        </div>

        <GoogleConnectionBanner
          connectGoogle={connectGoogle}
          disconnectGoogle={disconnectGoogle}
          googleBusy={googleBusy}
          googleStatus={googleStatus}
        />

        <SheetSourceFields changeTarget={changeTarget} draft={draft} updateDraft={updateDraft} />

        <SheetTargetPicker
          draft={draft}
          googleStatus={googleStatus}
          selectSpreadsheet={selectSpreadsheet}
          spreadsheets={spreadsheets}
          spreadsheetsLoading={spreadsheetsLoading}
          updateDraft={updateDraft}
        />

        <SheetSyncBehaviorFields
          draft={draft}
          updateDraft={updateDraft}
          worksheetTabs={worksheetTabs}
          worksheetTabsLoading={worksheetTabsLoading}
        />

        <SheetScheduleFields draft={draft} updateDraft={updateDraft} />

        {draft.target_type === 'APPLICATIONS' && (
          <SheetApplicationOptions draft={draft} updateDraft={updateDraft} />
        )}

        <div className="rounded-xl border border-blue-100 dark:border-blue-500/20 bg-blue-50/60 dark:bg-blue-500/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-ink-50">
              Preview before creating
            </div>
            <div className="text-xs text-gray-600 dark:text-ink-200 mt-0.5">
              Test reads the sheet headers, fills the mapping, and shows sample values before
              anything is saved.
            </div>
          </div>
          <Button icon={<ExperimentOutlined />} loading={previewing} onClick={previewDraft}>
            Test & Auto-map
          </Button>
        </div>

        <SheetMappingTabs
          onAutoMap={(headers) => {
            applyAutoMapping(headers);
            messageApi.success('Mapping regenerated from sheet headers');
          }}
          addMappingField={addMappingField}
          draft={draft}
          fieldForSheetHeader={fieldForSheetHeader}
          fieldToAdd={fieldToAdd}
          fields={fields}
          preview={preview}
          removeMappingField={removeMappingField}
          requiredFields={requiredFields}
          sampleForHeader={sampleForHeader}
          setFieldToAdd={setFieldToAdd}
          sheetMappingHeaders={sheetMappingHeaders}
          unmappedFields={unmappedFields}
          updateMapping={updateMapping}
          updateSheetColumnMapping={updateSheetColumnMapping}
          updateStrategy={updateStrategy}
          visibleMappingFields={visibleMappingFields}
        />
        <div className="pt-5 mt-2 border-t border-gray-200 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-ink-100">
            <input
              type="checkbox"
              className="rounded border-gray-300 dark:border-white/[0.12] text-blue-600 dark:text-blue-300 focus:ring-blue-500 h-4 w-4"
              checked={draft.enabled}
              onChange={(event) => updateDraft({ enabled: event.target.checked })}
            />
            Run this sync automatically each day
          </label>
          <Button
            type="primary"
            size="large"
            icon={<CheckCircleOutlined />}
            loading={saving}
            disabled={!canSaveDraft}
            onClick={saveDraft}
          >
            {draft.id ? 'Update Sync' : 'Create Sync'}
          </Button>
        </div>
      </div>

      <SavedSyncList
        busyId={busyId}
        configs={configs}
        loading={loading}
        openHistory={openHistory}
        openImportReview={openImportReview}
        removeConfig={removeConfig}
        setDraft={setDraft}
        setPreview={setPreview}
        syncConfig={syncConfig}
        testConfig={testConfig}
      />

      <SheetSyncHistoryModal
        closeHistory={closeHistory}
        historyConfig={historyConfig}
        rollbackRun={rollbackRun}
        syncRuns={syncRuns}
        syncRunsLoading={syncRunsLoading}
      />

      <SheetSyncReviewModal
        closeSyncReview={closeSyncReview}
        openHistory={openHistory}
        setSyncReview={setSyncReview}
        syncReview={syncReview}
      />

      <SheetImportReviewModal
        duplicateResolutions={duplicateResolutions}
        applyReview={applyReview}
        applyingReview={applyingReview}
        closeImportReview={closeImportReview}
        importReview={importReview}
        reviewConfig={reviewConfig}
        reviewLoading={reviewLoading}
        selectedReviewIds={selectedReviewIds}
        toggleAllReviewItems={toggleAllReviewItems}
        toggleReviewItem={toggleReviewItem}
        updateDuplicateResolution={updateDuplicateResolution}
      />

      {preview && <SheetPreviewPanel preview={preview} />}
    </div>
  );
};

export default GoogleSheetsSettings;

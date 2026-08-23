import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Select, Spin, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import {
  createApplicationTimelineEntry,
  deleteApplicationTimelineEntry,
  getApplicationTimeline,
  updateApplicationTimelineEntry,
} from '../../api';
import type { ApplicationTimelineEntry, ApplicationTimelineStage } from '../../types';
import type { CareerApplication } from '../../types/application';
import { compareTimelineStages } from './applicationTimelineUtils';
import {
  emptyDraft,
  formatStageLabel,
  hasContent,
  type DisplayStage,
  type TimelineDraft,
} from './applicationTimelineDraft';
import TimelineStageList from './TimelineStageList';

type Props = {
  application: CareerApplication | null;
  appStages?: Array<{ key: string; label: string; shortLabel?: string; tone?: string }>;
};

const ApplicationTimelinePanel = ({ application, appStages = [] }: Props) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingStageKey, setDeletingStageKey] = useState<string>();
  const [drafts, setDrafts] = useState<Record<string, TimelineDraft>>({});
  const [addedStageKeys, setAddedStageKeys] = useState<string[]>([]);
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [selectedStageKey, setSelectedStageKey] = useState<string | undefined>();
  const [focusedStageKey, setFocusedStageKey] = useState<string | undefined>();
  const stageCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const buildInitialDrafts = useCallback(
    (entries: ApplicationTimelineEntry[]) => {
      const next = appStages.reduce<Record<string, TimelineDraft>>(
        (acc, stage) => ({ ...acc, [stage.key]: { ...emptyDraft(), title: stage.label } }),
        {}
      );
      for (const entry of entries) {
        if (!next[entry.stage]) next[entry.stage] = emptyDraft();
        const configuredTitle = appStages.find((stage) => stage.key === entry.stage)?.label;
        next[entry.stage] = {
          id: entry.id,
          title: entry.display_title || configuredTitle || formatStageLabel(entry.stage),
          stage_order: entry.stage_order,
          event_date: entry.event_date || null,
          notes: entry.notes || '',
        };
      }
      if (next.APPLIED && !next.APPLIED.event_date && application?.date_applied) {
        next.APPLIED.event_date = application.date_applied;
      }
      setAddedStageKeys([]);
      setIsAddingStage(false);
      setSelectedStageKey(undefined);
      return next;
    },
    [application?.date_applied, appStages]
  );

  const loadTimeline = useCallback(async () => {
    if (!application) return;
    setLoading(true);
    try {
      const response = await getApplicationTimeline(application.id);
      setDrafts(buildInitialDrafts(response.data));
    } catch (error) {
      messageApi.error('Failed to load timeline');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [application, buildInitialDrafts, messageApi]);

  useEffect(() => {
    void loadTimeline();
  }, [loadTimeline]);

  const patchDraft = (stage: string, patch: Partial<TimelineDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [stage]: { ...(prev[stage] || emptyDraft()), ...patch },
    }));
  };

  const scrollToStage = useCallback((stageKey: string) => {
    const target = stageCardRefs.current[stageKey];
    if (!target) return;

    setFocusedStageKey(stageKey);
    target.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    window.setTimeout(() => setFocusedStageKey(undefined), 1400);
  }, []);

  const allDisplayStages = useMemo(() => {
    const configuredStages: DisplayStage[] = appStages.map((stage) => ({ ...stage }));
    const existingKeys = new Set(appStages.map((s) => s.key));
    const extraStages: DisplayStage[] = Object.keys(drafts)
      .filter((key) => !existingKeys.has(key) && hasContent(drafts[key]))
      .map((key) => ({
        key,
        label: formatStageLabel(key),
        shortLabel: key.slice(0, 5),
        tone: 'bg-gray-300',
      }));
    return [...configuredStages, ...extraStages];
  }, [appStages, drafts]);

  const activeStages = useMemo(
    () =>
      allDisplayStages
        .filter(
          (stage) =>
            addedStageKeys.includes(stage.key) ||
            hasContent(drafts[stage.key]) ||
            application?.status === stage.key
        )
        .sort((left, right) =>
          compareTimelineStages(
            {
              key: left.key,
              stageOrder: drafts[left.key]?.stage_order,
              eventDate: drafts[left.key]?.event_date,
            },
            {
              key: right.key,
              stageOrder: drafts[right.key]?.stage_order,
              eventDate: drafts[right.key]?.event_date,
            }
          )
        ),
    [addedStageKeys, allDisplayStages, application?.status, drafts]
  );

  const availableStages = useMemo(
    () =>
      allDisplayStages.filter(
        (stage) =>
          !addedStageKeys.includes(stage.key) &&
          !hasContent(drafts[stage.key]) &&
          application?.status !== stage.key
      ),
    [addedStageKeys, allDisplayStages, application?.status, drafts]
  );

  const handleAddStage = () => {
    if (!selectedStageKey) {
      messageApi.error('Select a stage first');
      return;
    }
    const stage = allDisplayStages.find((item) => item.key === selectedStageKey);
    if (!stage) {
      messageApi.error('That stage is no longer available');
      return;
    }
    setAddedStageKeys((prev) => (prev.includes(stage.key) ? prev : [...prev, stage.key]));
    setDrafts((prev) => ({
      ...prev,
      [stage.key]: prev[stage.key] || { ...emptyDraft(), title: stage.label },
    }));
    setSelectedStageKey(undefined);
    setIsAddingStage(false);
  };

  const handleRemoveAddedStage = (stageKey: string) => {
    const draft = drafts[stageKey];
    if (draft?.id) {
      messageApi.info(
        'Saved stages stay on the timeline. Clear the date and notes if you no longer need it.'
      );
      return;
    }
    setAddedStageKeys((prev) => prev.filter((key) => key !== stageKey));
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[stageKey];
      return next;
    });
  };

  const handleDeleteStage = async (stageKey: string) => {
    const draft = drafts[stageKey];
    if (!draft?.id) {
      handleRemoveAddedStage(stageKey);
      return;
    }

    setDeletingStageKey(stageKey);
    try {
      await deleteApplicationTimelineEntry(draft.id);
      messageApi.success(
        application?.status === stageKey
          ? 'Timeline details removed. The stage remains because it is the current application status.'
          : 'Timeline entry removed'
      );
      await loadTimeline();
    } catch (error) {
      messageApi.error('Failed to remove timeline entry');
      console.error(error);
    } finally {
      setDeletingStageKey(undefined);
    }
  };

  const handleSave = async () => {
    if (!application) return;
    setSaving(true);
    try {
      await Promise.all(
        allDisplayStages.map((stage) => {
          const draft = drafts[stage.key] || emptyDraft();
          const title = draft.title.trim();
          const payload = {
            application: application.id,
            stage: stage.key as ApplicationTimelineStage,
            display_title: title === stage.label ? '' : title,
            event_date: draft.event_date || null,
            notes: draft.notes,
          };
          if (draft.id) return updateApplicationTimelineEntry(draft.id, payload);
          if (hasContent(draft) || title !== stage.label || addedStageKeys.includes(stage.key)) {
            return createApplicationTimelineEntry(payload);
          }
          return Promise.resolve();
        })
      );
      messageApi.success('Timeline saved');
      await loadTimeline();
    } catch (error) {
      messageApi.error('Failed to save timeline');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {contextHolder}

      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Timeline
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            Track progression, key dates, and notes for each stage.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="small"
            icon={<PlusOutlined />}
            className="!rounded-lg !px-3 !text-xs !font-semibold"
            onClick={() => setIsAddingStage((value) => !value)}
          >
            Stage
          </Button>
          <Button
            type="primary"
            size="small"
            className="!rounded-lg !px-4 !text-xs !font-semibold"
            loading={saving}
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      </div>

      {isAddingStage && (
        <div className="mb-4 rounded-xl border border-sky-100 bg-sky-50/50 p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={selectedStageKey}
              onChange={setSelectedStageKey}
              placeholder={
                availableStages.length ? 'Select a timeline stage' : 'No more stages to add'
              }
              disabled={availableStages.length === 0}
              className="min-w-0 flex-1 [&_.ant-select-selector]:!rounded-lg"
              options={availableStages.map((stage) => ({
                value: stage.key,
                label: stage.label,
              }))}
            />
            <div className="flex gap-2">
              <Button
                type="primary"
                className="!rounded-lg"
                onClick={handleAddStage}
                disabled={!selectedStageKey}
              >
                Add
              </Button>
              <Button className="!rounded-lg" onClick={() => setIsAddingStage(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spin />
        </div>
      ) : activeStages.length === 0 ? (
        <div className="flex flex-col items-center py-14 text-slate-400">
          <div className="mb-1 text-sm font-medium">No stages recorded yet</div>
          <div className="text-xs text-slate-400">
            Stages appear as your application progresses.
          </div>
        </div>
      ) : (
        <TimelineStageList
          application={application}
          drafts={drafts}
          activeStages={activeStages}
          addedStageKeys={addedStageKeys}
          deletingStageKey={deletingStageKey}
          focusedStageKey={focusedStageKey}
          handleDeleteStage={handleDeleteStage}
          handleRemoveAddedStage={handleRemoveAddedStage}
          loading={loading}
          patchDraft={patchDraft}
          scrollToStage={scrollToStage}
          stageCardRefs={stageCardRefs}
        />
      )}
    </div>
  );
};

export default ApplicationTimelinePanel;

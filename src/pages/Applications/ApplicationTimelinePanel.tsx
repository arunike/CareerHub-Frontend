import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, DatePicker, Input, Select, Spin, Tag, message } from 'antd';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  createApplicationTimelineEntry,
  getApplicationTimeline,
  updateApplicationTimelineEntry,
} from '../../api';
import type { ApplicationTimelineEntry, ApplicationTimelineStage } from '../../types';
import type { CareerApplication } from '../../types/application';

type Props = {
  application: CareerApplication | null;
  appStages?: Array<{ key: string; label: string; shortLabel?: string; tone?: string }>;
};

type TimelineDraft = {
  id?: number;
  event_date?: string | null;
  notes: string;
};

type DisplayStage = {
  key: string;
  label: string;
  shortLabel?: string;
  tone?: string;
};

const emptyDraft = (): TimelineDraft => ({
  event_date: null,
  notes: '',
});

const hasContent = (draft?: TimelineDraft) =>
  Boolean(draft?.id || draft?.event_date || draft?.notes.trim());

const formatStageLabel = (key: string) => {
  if (!key) return 'Stage';
  if (key.includes(' ')) return key;
  return key
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
};

const TONE_TO_HEX: Record<string, string> = {
  'bg-blue-500': '#3b82f6',
  'bg-violet-500': '#8b5cf6',
  'bg-sky-500': '#0ea5e9',
  'bg-amber-400': '#fbbf24',
  'bg-amber-500': '#f59e0b',
  'bg-orange-500': '#f97316',
  'bg-orange-600': '#ea580c',
  'bg-red-500': '#ef4444',
  'bg-emerald-500': '#10b981',
  'bg-rose-500': '#f43f5e',
  'bg-slate-400': '#94a3b8',
  'bg-gray-300': '#d1d5db',
};

const ApplicationTimelinePanel = ({ application, appStages = [] }: Props) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, TimelineDraft>>({});
  const [addedStageKeys, setAddedStageKeys] = useState<string[]>([]);
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [selectedStageKey, setSelectedStageKey] = useState<string | undefined>();

  const buildInitialDrafts = useCallback(
    (entries: ApplicationTimelineEntry[]) => {
      const next = appStages.reduce<Record<string, TimelineDraft>>(
        (acc, stage) => ({ ...acc, [stage.key]: emptyDraft() }),
        {}
      );
      for (const entry of entries) {
        if (!next[entry.stage]) next[entry.stage] = emptyDraft();
        next[entry.stage] = {
          id: entry.id,
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
      allDisplayStages.filter(
        (stage) =>
          addedStageKeys.includes(stage.key) ||
          hasContent(drafts[stage.key]) ||
          application?.status === stage.key
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
    setDrafts((prev) => ({ ...prev, [stage.key]: prev[stage.key] || emptyDraft() }));
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

  const handleSave = async () => {
    if (!application) return;
    setSaving(true);
    try {
      await Promise.all(
        allDisplayStages.map((stage) => {
          const draft = drafts[stage.key] || emptyDraft();
          const payload = {
            application: application.id,
            stage: stage.key as ApplicationTimelineStage,
            event_date: draft.event_date || null,
            notes: draft.notes,
          };
          if (draft.id) return updateApplicationTimelineEntry(draft.id, payload);
          if (hasContent(draft) || addedStageKeys.includes(stage.key)) {
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
          <p className="mt-0.5 text-sm text-slate-500">Track key dates and notes for each stage.</p>
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
        <div className="relative pl-8">
          {/* Vertical spine */}
          <div className="absolute bottom-2 left-[11px] top-2 w-px bg-slate-100" />

          <div className="space-y-2">
            {activeStages.map((stage, index) => {
              const draft = drafts[stage.key] || emptyDraft();
              const isCurrent = application?.status === stage.key;
              const isLast = index === activeStages.length - 1;
              const accent = TONE_TO_HEX[stage.tone || ''] ?? '#94a3b8';

              return (
                <div key={stage.key} className="relative">
                  {/* Dot */}
                  <div
                    className="absolute -left-8 top-[18px] flex h-[22px] w-[22px] items-center justify-center rounded-full"
                    style={{
                      background: isCurrent ? `${accent}18` : 'white',
                      border: `2px solid ${isCurrent ? accent : '#e2e8f0'}`,
                      zIndex: 1,
                    }}
                  >
                    <div
                      className="h-[8px] w-[8px] rounded-full"
                      style={{ background: isCurrent ? accent : '#cbd5e1' }}
                    />
                  </div>

                  {/* Card */}
                  <div
                    className={`rounded-xl border bg-white transition-shadow duration-150 ${
                      isCurrent
                        ? 'border-slate-200 shadow-md shadow-slate-100'
                        : 'border-slate-100 hover:shadow-sm'
                    } ${isLast ? 'mb-0' : 'mb-2'}`}
                  >
                    {/* Stage header */}
                    <div className="flex items-center justify-between gap-4 px-4 pt-3.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[11px] font-bold uppercase tracking-[0.1em]"
                          style={{ color: isCurrent ? accent : '#475569' }}
                        >
                          {stage.label}
                        </span>
                        {isCurrent && (
                          <Tag
                            className="!m-0 !rounded-full !border-0 !px-2 !py-0 !text-[10px] !font-semibold !leading-5"
                            style={{
                              background: `${accent}18`,
                              color: accent,
                            }}
                          >
                            CURRENT
                          </Tag>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <DatePicker
                          value={draft.event_date ? dayjs(draft.event_date) : null}
                          onChange={(value) =>
                            patchDraft(stage.key, {
                              event_date: value ? value.format('YYYY-MM-DD') : null,
                            })
                          }
                          placeholder="Add date"
                          size="small"
                          variant="borderless"
                          className="!-mr-1 shrink-0 !text-xs [&_.ant-picker-input>input]:!text-xs [&_.ant-picker-input>input]:!text-slate-600"
                          format="MMM D, YYYY"
                        />
                        {addedStageKeys.includes(stage.key) && !draft.id && !hasContent(draft) && (
                          <Button
                            type="text"
                            size="small"
                            icon={<CloseOutlined />}
                            className="!h-7 !w-7 !rounded-lg !text-slate-300 hover:!text-rose-500"
                            onClick={() => handleRemoveAddedStage(stage.key)}
                          />
                        )}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="mx-4 mt-2 h-px bg-slate-50" />

                    {/* Notes */}
                    <div className="px-3 pb-3 pt-2">
                      <Input.TextArea
                        value={draft.notes}
                        onChange={(e) => patchDraft(stage.key, { notes: e.target.value })}
                        placeholder={`Notes for ${stage.label.toLowerCase()}…`}
                        autoSize={{ minRows: 1, maxRows: 5 }}
                        variant="borderless"
                        className="!px-1 !text-sm !text-slate-600 placeholder:!text-slate-300"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationTimelinePanel;

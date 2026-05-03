import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, DatePicker, Input, Spin, Tag, message } from 'antd';
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

const emptyDraft = (): TimelineDraft => ({
  event_date: null,
  notes: '',
});

const hasContent = (draft?: TimelineDraft) =>
  Boolean(draft?.id || draft?.event_date || draft?.notes.trim());

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
    const existingKeys = new Set(appStages.map((s) => s.key));
    const extraStages = Object.keys(drafts)
      .filter((key) => !existingKeys.has(key) && hasContent(drafts[key]))
      .map((key) => ({
        key,
        label: `${key.charAt(0)}${key.slice(1).toLowerCase()} (Legacy)`,
        shortLabel: key.slice(0, 5),
        tone: 'bg-gray-300',
      }));
    return [...appStages, ...extraStages];
  }, [appStages, drafts]);

  const activeStages = useMemo(
    () =>
      allDisplayStages.filter(
        (stage) => hasContent(drafts[stage.key]) || application?.status === stage.key
      ),
    [allDisplayStages, application?.status, drafts]
  );

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
          if (hasContent(draft)) return createApplicationTimelineEntry(payload);
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Timeline
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            Track key dates and notes for each stage.
          </p>
        </div>
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

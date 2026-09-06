import type { CareerApplication } from '../../types/application';
import {
  emptyDraft,
  getStageState,
  hasContent,
  type DisplayStage,
  type TimelineDraft,
} from './applicationTimelineDraft';
import { Button, DatePicker, Input, Popconfirm, Tag, Tooltip } from 'antd';
import { CalendarOutlined, CheckOutlined, CloseOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getPaletteColorFromTone, getReadableTextColor } from '../../utils/colorPalette';

type Props = {
  application: CareerApplication | null;
  drafts: Record<string, TimelineDraft>;
  activeStages: DisplayStage[];
  addedStageKeys: string[];
  deletingStageKey: string | null | undefined;
  focusedStageKey: string | undefined;
  handleDeleteStage: (stageKey: string) => void;
  handleRemoveAddedStage: (stageKey: string) => void;
  loading: boolean;
  patchDraft: (stage: string, patch: Partial<TimelineDraft>) => void;
  scrollToStage: (stageKey: string) => void;
  stageCardRefs: any;
};

const TimelineStageList = ({
  activeStages,
  addedStageKeys,
  deletingStageKey,
  focusedStageKey,
  handleDeleteStage,
  handleRemoveAddedStage,
  patchDraft,
  scrollToStage,
  stageCardRefs,
  application,
  drafts,
}: Props) => (
  <div className="space-y-5">
    <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-white/[0.07] bg-slate-50/70 dark:bg-ink-900/70 px-4 py-4">
      <div className="flex min-w-full w-max items-center justify-center gap-2">
        {activeStages.map((stage: DisplayStage, index: number) => {
          const draft = drafts[stage.key] || emptyDraft();
          const isCurrent = application?.status === stage.key;
          const state = getStageState(draft, isCurrent);
          const accent = getPaletteColorFromTone(stage.tone).dot;
          const accentText = getReadableTextColor(accent);
          const isDone = state === 'done' || state === 'current';
          const displayTitle = draft.title || stage.label;
          const hasCustomTitle = displayTitle !== stage.label;

          return (
            <div key={stage.key} className="flex items-center gap-2">
              <Tooltip title={displayTitle}>
                <button
                  type="button"
                  className="flex min-w-[82px] flex-col items-center gap-2 rounded-xl px-2 py-1 transition hover:bg-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
                  onClick={() => scrollToStage(stage.key)}
                  aria-label={`Jump to ${displayTitle} timeline stage`}
                >
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full border text-xs font-bold"
                    style={{
                      background: isDone ? accent : 'white',
                      borderColor: isDone ? accent : '#e2e8f0',
                      color: isDone ? accentText : '#94a3b8',
                    }}
                  >
                    {isDone ? <CheckOutlined /> : index + 1}
                  </div>
                  <div
                    className={`max-w-[90px] truncate text-center text-[11px] font-semibold ${
                      isCurrent
                        ? 'text-slate-950 dark:text-ink-50'
                        : 'text-slate-500 dark:text-ink-400'
                    }`}
                  >
                    {hasCustomTitle ? displayTitle : stage.shortLabel || stage.label}
                  </div>
                </button>
              </Tooltip>
              {index < activeStages.length - 1 && (
                <div className="h-px w-8" style={{ background: isDone ? accent : '#e2e8f0' }} />
              )}
            </div>
          );
        })}
      </div>
    </div>

    <div className="relative pl-8">
      <div className="absolute bottom-2 left-[11px] top-2 w-px bg-slate-100 dark:bg-ink-800" />
      {activeStages.map((stage: DisplayStage, index: number) => {
        const draft = drafts[stage.key] || emptyDraft();
        const isCurrent = application?.status === stage.key;
        const isLast = index === activeStages.length - 1;
        const accent = getPaletteColorFromTone(stage.tone).dot;
        const isFocused = focusedStageKey === stage.key;

        return (
          <div
            key={stage.key}
            ref={(node) => {
              stageCardRefs.current[stage.key] = node;
            }}
            className="relative scroll-mt-4"
          >
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

            <div
              className={`rounded-xl border bg-white dark:bg-ink-900 transition-shadow duration-150 ${
                isFocused
                  ? 'border-blue-200 dark:border-blue-500/25 shadow-lg shadow-blue-100/70 ring-2 ring-blue-100 dark:ring-blue-500/20'
                  : isCurrent
                    ? 'border-slate-200 dark:border-white/[0.08] shadow-md shadow-slate-100'
                    : 'border-slate-100 dark:border-white/[0.07] hover:shadow-sm'
              } ${isLast ? 'mb-0' : 'mb-2'}`}
            >
              <div className="flex items-center justify-between gap-4 px-4 pt-3.5">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Input
                    value={draft.title}
                    onChange={(event) => patchDraft(stage.key, { title: event.target.value })}
                    aria-label={`Title for ${stage.label} timeline stage`}
                    maxLength={120}
                    variant="borderless"
                    className="!min-w-0 !px-0 !text-[11px] !font-bold !uppercase !tracking-[0.1em]"
                    style={{ color: isCurrent ? accent : '#475569' }}
                  />
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
                    inputReadOnly
                    suffixIcon={<CalendarOutlined />}
                    className="!-mr-1 shrink-0 !text-xs [&_.ant-picker-input>input]:!text-xs [&_.ant-picker-input>input]:!text-slate-600 dark:!text-ink-200"
                    format="MMM D, YYYY"
                  />
                  {draft.id && (
                    <Popconfirm
                      title="Remove timeline entry?"
                      description="This removes its title, date, and notes. Your application status and Google Sheets status stay unchanged."
                      okText="Remove entry"
                      cancelText="Cancel"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => handleDeleteStage(stage.key)}
                    >
                      <Tooltip title="Remove timeline entry">
                        <Button
                          type="text"
                          size="small"
                          danger
                          aria-label={`Remove ${draft.title || stage.label} timeline entry`}
                          icon={<DeleteOutlined />}
                          loading={deletingStageKey === stage.key}
                          className="!h-7 !w-7 !rounded-lg !text-slate-300 dark:!text-ink-600 hover:!text-rose-500 dark:hover:!text-rose-400"
                        />
                      </Tooltip>
                    </Popconfirm>
                  )}
                  {addedStageKeys.includes(stage.key) && !draft.id && !hasContent(draft) && (
                    <Button
                      type="text"
                      size="small"
                      icon={<CloseOutlined />}
                      className="!h-7 !w-7 !rounded-lg !text-slate-300 dark:!text-ink-600 hover:!text-rose-500 dark:hover:!text-rose-400"
                      onClick={() => handleRemoveAddedStage(stage.key)}
                    />
                  )}
                </div>
              </div>

              <div className="mx-4 mt-2 h-px bg-slate-50 dark:bg-ink-900" />

              <div className="px-3 pb-3 pt-2">
                <Input.TextArea
                  value={draft.notes}
                  onChange={(e) => patchDraft(stage.key, { notes: e.target.value })}
                  placeholder={`Notes for ${(draft.title || stage.label).toLowerCase()}…`}
                  autoSize={{ minRows: 1, maxRows: 5 }}
                  variant="borderless"
                  className="!px-1 !text-sm !text-slate-600 dark:!text-ink-200 placeholder:!text-slate-300 dark:!text-ink-600"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export default TimelineStageList;

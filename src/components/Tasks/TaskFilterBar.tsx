import type { SmartReminderDraft } from '../../utils/smartReminder';
import type React from 'react';
import { Button, Input, Tooltip } from 'antd';
import { BellOutlined, CheckCircleOutlined, PlusOutlined } from '@ant-design/icons';

type Props = {
  handleCreateSmartReminder: (sourceText?: string) => void;
  loading: boolean;
  setSmartReminderText: React.Dispatch<React.SetStateAction<string>>;
  smartReminderDraft: SmartReminderDraft | null;
  smartReminderSaving: boolean;
  smartReminderText: string;
};

const TaskFilterBar = ({
  handleCreateSmartReminder,
  setSmartReminderText,
  smartReminderDraft,
  smartReminderSaving,
  smartReminderText,
}: Props) => (
  <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
    <div className="flex items-start gap-3 lg:w-[280px]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-300">
        <BellOutlined />
      </div>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-ink-50">Smart reminders</h2>
        <div className="text-xs text-slate-500 dark:text-ink-400">
          Type a reminder in natural language.
        </div>
      </div>
    </div>

    <div className="min-w-0 flex-1">
      <Input
        size="large"
        value={smartReminderText}
        onChange={(event) => setSmartReminderText(event.target.value)}
        onPressEnter={() => handleCreateSmartReminder()}
        placeholder="e.g. Follow up after 7 days"
        aria-label="Reminder description"
        aria-describedby="smart-reminder-help"
        disabled={smartReminderSaving}
        className="min-h-11 text-base sm:text-sm"
      />
      <div
        id="smart-reminder-help"
        className="mt-2 min-h-5 text-xs text-slate-500 dark:text-ink-400"
        aria-live="polite"
      >
        {smartReminderDraft ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-700 dark:text-emerald-300">
            <CheckCircleOutlined />
            {smartReminderDraft.dueDate.format('MMM D, YYYY')} · {smartReminderDraft.priority}
          </span>
        ) : (
          <span>Understands tomorrow, after 7 days, in 3 days, next Friday.</span>
        )}
      </div>
      <div
        className="scrollbar-none -mx-1 mt-3 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
        role="group"
        aria-label="Reminder examples"
      >
        {[
          'Follow up after 7 days',
          'Prepare for interview tomorrow',
          'Offer deadline in 3 days',
        ].map((example) => (
          <Tooltip key={example} title="Use example">
            <button
              type="button"
              onClick={() => setSmartReminderText(example)}
              className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 px-3 text-xs font-medium text-slate-600 dark:text-ink-200 transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
            >
              {example}
            </button>
          </Tooltip>
        ))}
      </div>
    </div>

    <Button
      type="primary"
      size="large"
      icon={<PlusOutlined />}
      loading={smartReminderSaving}
      disabled={!smartReminderText.trim()}
      onClick={() => handleCreateSmartReminder()}
      className="w-full lg:w-auto lg:self-start"
    >
      Set Reminder
    </Button>
  </div>
);

export default TaskFilterBar;

import type { SchedulePhase } from '../../types';
import type React from 'react';
import { Button, DatePicker, Input, Switch } from 'antd';
import dayjs from 'dayjs';
import UnitNumberInput from '../../components/UnitNumberInput';

type Props = {
  form: Omit<SchedulePhase, 'id'>;
  setForm: React.Dispatch<React.SetStateAction<Omit<SchedulePhase, 'id'>>>;
  cancelEdit: () => void;
  commitEdit: () => void;
  editingId: string | null;
};

const SchedulePhaseForm = ({ cancelEdit, commitEdit, editingId, form, setForm }: Props) => (
  <div className="border border-emerald-200 dark:border-emerald-500/25 rounded-xl bg-emerald-50/40 dark:bg-emerald-500/10 p-4 space-y-4">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-ink-200 mb-1">
          Phase Name *
        </label>
        <Input
          placeholder="e.g. Full-time Summer Phase"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          autoFocus
        />
      </div>
      <div className="flex flex-col">
        <label className="block text-xs font-medium text-gray-600 dark:text-ink-200 mb-1">
          Currently in this phase
        </label>
        <div className="flex items-center gap-2 h-8">
          <Switch
            size="small"
            checked={form.is_current}
            onChange={(v) =>
              setForm((f) => ({ ...f, is_current: v, end_date: v ? null : f.end_date }))
            }
          />
          <span className="text-sm text-gray-500 dark:text-ink-400">
            {form.is_current ? 'Yes' : 'No'}
          </span>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-ink-200 mb-1">
          Start Date
        </label>
        <DatePicker
          className="w-full"
          value={form.start_date ? dayjs(form.start_date) : null}
          onChange={(d) => setForm((f) => ({ ...f, start_date: d ? d.format('YYYY-MM-DD') : '' }))}
        />
      </div>
      {!form.is_current && (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-ink-200 mb-1">
            End Date
          </label>
          <DatePicker
            className="w-full"
            value={form.end_date ? dayjs(form.end_date) : null}
            onChange={(d) =>
              setForm((f) => ({ ...f, end_date: d ? d.format('YYYY-MM-DD') : null }))
            }
          />
        </div>
      )}
    </div>

    <div className="grid grid-cols-1 gap-3 border-t border-emerald-100 dark:border-emerald-500/20 pt-3 sm:grid-cols-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-ink-200 mb-1">
          Hourly Rate
        </label>
        <UnitNumberInput
          unit="$"
          placeholder="e.g. 45"
          value={form.hourly_rate}
          onChange={(v) => setForm((f) => ({ ...f, hourly_rate: v }))}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-ink-200 mb-1">
          Hours / Day
        </label>
        <UnitNumberInput
          unit="hrs"
          placeholder="e.g. 8"
          value={form.hours_per_day}
          onChange={(v) => setForm((f) => ({ ...f, hours_per_day: v }))}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-ink-200 mb-1">
          Days / Week
        </label>
        <UnitNumberInput
          unit="days"
          placeholder="e.g. 5"
          value={form.working_days_per_week}
          onChange={(v) => setForm((f) => ({ ...f, working_days_per_week: v }))}
        />
      </div>
    </div>

    <div className="flex justify-end gap-2 pt-1">
      <Button size="small" onClick={cancelEdit}>
        Cancel
      </Button>
      <Button size="small" type="primary" onClick={commitEdit} disabled={!form.name.trim()}>
        {editingId === '__new__' ? 'Add Phase' : 'Update Phase'}
      </Button>
    </div>
  </div>
);

export default SchedulePhaseForm;

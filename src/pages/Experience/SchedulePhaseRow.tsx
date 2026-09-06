import { Button, Popconfirm, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { SchedulePhase } from '../../types';
import { buildHourlyCompensationSnapshot } from './compensation';

type Props = {
  editingId: string | null;
  fmtDate: (d: string | null | undefined) => string;
  handleDelete: (id: string) => void;
  isFormEditing: boolean;
  local: SchedulePhase[];
  startEdit: (phase: SchedulePhase) => void;
};

const SchedulePhaseRow = ({
  editingId,
  fmtDate,
  handleDelete,
  isFormEditing,
  local,
  startEdit,
}: Props) => (
  <>
    {local.map((phase) => {
      const snapshot = buildHourlyCompensationSnapshot({
        startDate: phase.start_date,
        endDate: phase.end_date,
        isCurrent: phase.is_current,
        hourlyRate: phase.hourly_rate,
        hoursPerDay: phase.hours_per_day,
        workingDaysPerWeek: phase.working_days_per_week,
        totalHoursWorked: phase.total_hours_worked,
        overtimeHours: phase.overtime_hours,
        overtimeRate: phase.overtime_rate,
        overtimeMultiplier: phase.overtime_multiplier,
        totalEarningsOverride: phase.total_earnings_override,
      });

      return (
        <div
          key={phase.id}
          className={`border rounded-xl p-4 transition-all group ${
            editingId === phase.id
              ? 'hidden'
              : 'border-gray-100 dark:border-white/[0.07] bg-white dark:bg-ink-900 hover:border-gray-200 hover:shadow-sm'
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-base font-semibold text-gray-900 dark:text-ink-50">
                  {phase.name}
                </span>
                {phase.is_current && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/25">
                    Current
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500 dark:text-ink-400 mb-2 flex items-center gap-2 flex-wrap">
                <span>
                  {fmtDate(phase.start_date)} –{' '}
                  {phase.is_current ? 'Present' : fmtDate(phase.end_date)}
                </span>
              </div>

              <div className="flex text-xs mt-2 bg-gray-50 dark:bg-ink-900 p-2 rounded-lg inline-flex flex-wrap border border-gray-100 dark:border-white/[0.07] items-center">
                <div className="flex gap-4 items-center">
                  {phase.hourly_rate != null && (
                    <span>
                      <span className="text-gray-400 dark:text-ink-500">Rate:</span> $
                      {phase.hourly_rate}/hr
                    </span>
                  )}
                  {phase.hours_per_day != null && phase.working_days_per_week != null && (
                    <span>
                      <span className="text-gray-400 dark:text-ink-500">Schedule:</span>{' '}
                      {phase.hours_per_day}
                      h/day, {phase.working_days_per_week} days/wk
                    </span>
                  )}
                </div>
                {snapshot && snapshot.estimatedHours > 0 && (
                  <div className="flex items-center pl-3 ml-3 border-l border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-ink-200 font-medium">
                    <span>{snapshot.estimatedHours} hrs</span>
                    <span className="text-gray-300 dark:text-ink-600 mx-2">•</span>
                    <span>
                      $
                      {snapshot.total.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 1,
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="row-actions flex w-full shrink-0 items-center justify-end gap-1 sm:w-auto">
              <div className="flex items-center gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                <Tooltip title="Edit">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => startEdit(phase)}
                    disabled={isFormEditing}
                    className="text-gray-400 dark:text-ink-500 hover:text-emerald-500"
                  />
                </Tooltip>
                <Popconfirm
                  title="Remove this phase?"
                  onConfirm={() => handleDelete(phase.id)}
                  okText="Remove"
                  okButtonProps={{ danger: true }}
                >
                  <Tooltip title="Delete">
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      disabled={isFormEditing}
                      className="text-gray-400 dark:text-ink-500 hover:text-red-500"
                    />
                  </Tooltip>
                </Popconfirm>
              </div>
            </div>
          </div>
        </div>
      );
    })}
  </>
);

export default SchedulePhaseRow;

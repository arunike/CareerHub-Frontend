import React, { useState, useEffect } from 'react';
import { Modal, Button, DatePicker, Input, Switch, Popconfirm, Tooltip, InputNumber, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CalendarOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import type { SchedulePhase } from '../../types';
import { buildHourlyCompensationSnapshot } from './compensation';

const { TextArea } = Input;

type PhaseImportDefaults = {
  hourlyRate?: number | null;
  hoursPerDay?: number | null;
  workingDaysPerWeek?: number | null;
  overtimeRate?: number | null;
  overtimeMultiplier?: number | null;
};

type ImportedDayEntry = {
  date: Dayjs;
  hours: number;
  overtimeHours: number;
};

type ImportedWeekSummary = {
  label: string;
  weekNumber: number | null;
  entries: ImportedDayEntry[];
  startDate: Dayjs;
  endDate: Dayjs;
  totalHours: number;
  totalOvertimeHours: number;
  workingDaysPerWeek: number;
  positiveHourEntries: number;
  positiveHoursTotal: number;
  isUniformHours: boolean;
  mergeKey: string;
};

function nanoid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function emptyPhase(defaults: PhaseImportDefaults = {}): Omit<SchedulePhase, 'id'> {
  return {
    name: 'Phase 1',
    start_date: dayjs().format('YYYY-MM-DD'),
    end_date: null,
    is_current: false,
    hourly_rate: defaults.hourlyRate ?? 20,
    hours_per_day: defaults.hoursPerDay ?? 8,
    working_days_per_week: defaults.workingDaysPerWeek ?? 5,
    total_hours_worked: null,
    overtime_hours: null,
    overtime_rate: defaults.overtimeRate ?? null,
    overtime_multiplier: defaults.overtimeMultiplier ?? 1.5,
    total_earnings_override: null,
  };
}

const roundTo = (value: number, digits = 2) => Number(value.toFixed(digits));

const parseNumberToken = (value: string): number | null => {
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const parseWeekNumber = (label: string): number | null => {
  const match = label.match(/Week\s+(\d+)/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
};

const getInitialImportYear = ({
  rawText,
  expStartDate,
  expEndDate,
}: {
  rawText: string;
  expStartDate?: string | null;
  expEndDate?: string | null;
}) => {
  if (expStartDate && dayjs(expStartDate).isValid()) {
    return dayjs(expStartDate).year();
  }

  if (expEndDate && dayjs(expEndDate).isValid()) {
    const end = dayjs(expEndDate);
    const firstDateMatch = rawText.match(/\b(\d{1,2})\/(\d{1,2})\b/);
    if (firstDateMatch) {
      const firstMonth = Number(firstDateMatch[1]);
      return firstMonth > (end.month() + 1) ? end.year() - 1 : end.year();
    }
    return end.year();
  }

  return dayjs().year();
};

const resolveImportedDate = (token: string, currentYear: number, previousDate: Dayjs | null) => {
  const [monthText, dayText] = token.split('/');
  const month = Number(monthText);
  const day = Number(dayText);

  if (!Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Couldn't understand the date "${token}".`);
  }

  let year = currentYear;
  let candidate = dayjs(new Date(year, month - 1, day)).startOf('day');

  if (previousDate && candidate.isBefore(previousDate, 'day')) {
    year += 1;
    candidate = dayjs(new Date(year, month - 1, day)).startOf('day');
  }

  return { date: candidate, year };
};

const summarizeImportedWeek = (label: string, entries: ImportedDayEntry[]): ImportedWeekSummary => {
  const sortedEntries = [...entries].sort((a, b) => a.date.valueOf() - b.date.valueOf());
  const positiveHours = sortedEntries.map(entry => entry.hours).filter(hours => hours > 0.01);
  const positiveHoursTotal = roundTo(positiveHours.reduce((sum, hours) => sum + hours, 0));
  const hasZeroHourEntry = sortedEntries.some(entry => entry.hours <= 0.01);
  const baselineHours = positiveHours[0] ?? null;
  const isUniformHours = baselineHours != null
    && !hasZeroHourEntry
    && positiveHours.every(hours => Math.abs(hours - baselineHours) < 0.05);
  const workingDaysPerWeek = sortedEntries.filter(entry => entry.hours > 0 || entry.overtimeHours > 0).length || sortedEntries.length;
  const weekNumber = parseWeekNumber(label);

  return {
    label,
    weekNumber,
    entries: sortedEntries,
    startDate: sortedEntries[0].date,
    endDate: sortedEntries[sortedEntries.length - 1].date,
    totalHours: roundTo(sortedEntries.reduce((sum, entry) => sum + entry.hours, 0)),
    totalOvertimeHours: roundTo(sortedEntries.reduce((sum, entry) => sum + entry.overtimeHours, 0)),
    workingDaysPerWeek,
    positiveHourEntries: positiveHours.length,
    positiveHoursTotal,
    isUniformHours,
    mergeKey: isUniformHours
      ? `uniform:${roundTo(baselineHours, 2)}:${workingDaysPerWeek}`
      : `irregular:${label}`,
  };
};

const parseImportedWeeks = ({
  rawText,
  expStartDate,
  expEndDate,
}: {
  rawText: string;
  expStartDate?: string | null;
  expEndDate?: string | null;
}) => {
  const normalized = rawText.replace(/\r/g, '');
  const lines = normalized.split('\n');
  const parsedWeeks: ImportedWeekSummary[] = [];
  let currentWeekLabel = 'Imported Week 1';
  let currentEntries: ImportedDayEntry[] = [];
  let currentYear = getInitialImportYear({ rawText: normalized, expStartDate, expEndDate });
  let previousDate: Dayjs | null = null;

  const flushCurrentWeek = () => {
    if (currentEntries.length === 0) return;
    parsedWeeks.push(summarizeImportedWeek(currentWeekLabel, currentEntries));
    currentEntries = [];
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const weekHeading = trimmed.match(/^(Week\s+\d+)/i);
    if (weekHeading) {
      flushCurrentWeek();
      currentWeekLabel = weekHeading[1].replace(/\s+/g, ' ');
      continue;
    }

    const tokens = trimmed.split(/\s+/);
    if (!/^\d{1,2}\/\d{1,2}$/.test(tokens[0] ?? '')) continue;

    const hours = parseNumberToken(tokens[1] ?? '');
    const overtimeHours = parseNumberToken(tokens[2] ?? '');
    if (hours == null || overtimeHours == null) continue;

    const resolved = resolveImportedDate(tokens[0], currentYear, previousDate);
    currentYear = resolved.year;
    previousDate = resolved.date;
    currentEntries.push({
      date: resolved.date,
      hours: roundTo(hours),
      overtimeHours: roundTo(overtimeHours),
    });
  }

  flushCurrentWeek();

  if (parsedWeeks.length === 0) {
    throw new Error('No schedule rows were found. Paste lines with Date, Hours, and Overtime Hours.');
  }

  return parsedWeeks;
};

const formatImportedWeekRange = (weeks: ImportedWeekSummary[]) => {
  const first = weeks[0];
  const last = weeks[weeks.length - 1];
  if (first.weekNumber != null && last.weekNumber != null) {
    return first.weekNumber === last.weekNumber
      ? `Week ${first.weekNumber}`
      : `Weeks ${first.weekNumber}-${last.weekNumber}`;
  }
  return first.label === last.label ? first.label : `${first.label} - ${last.label}`;
};

const buildImportedPhases = ({
  rawText,
  expStartDate,
  expEndDate,
  defaults,
}: {
  rawText: string;
  expStartDate?: string | null;
  expEndDate?: string | null;
  defaults: PhaseImportDefaults;
}) => {
  const importedWeeks = parseImportedWeeks({ rawText, expStartDate, expEndDate });
  const groupedWeeks: ImportedWeekSummary[][] = [];

  for (const week of importedWeeks) {
    const currentGroup = groupedWeeks[groupedWeeks.length - 1];
    if (!currentGroup) {
      groupedWeeks.push([week]);
      continue;
    }

    const previousWeek = currentGroup[currentGroup.length - 1];
    const gapDays = week.startDate.diff(previousWeek.endDate, 'day');
    const canMerge = previousWeek.mergeKey === week.mergeKey && gapDays <= 7;

    if (canMerge) {
      currentGroup.push(week);
    } else {
      groupedWeeks.push([week]);
    }
  }

  const parsedEndDate = expEndDate && dayjs(expEndDate).isValid() ? dayjs(expEndDate).startOf('day') : null;
  const parsedStartDate = expStartDate && dayjs(expStartDate).isValid() ? dayjs(expStartDate).startOf('day') : null;

  return {
    phases: groupedWeeks.map((weeks, index) => {
      const nextGroup = groupedWeeks[index + 1];
      const firstWeek = weeks[0];
      const lastWeek = weeks[weeks.length - 1];
      const totalHoursWorked = roundTo(weeks.reduce((sum, week) => sum + week.totalHours, 0));
      const totalOvertimeHours = roundTo(weeks.reduce((sum, week) => sum + week.totalOvertimeHours, 0));
      const positiveHoursTotal = weeks.reduce((sum, week) => sum + week.positiveHoursTotal, 0);
      const positiveHourEntries = weeks.reduce((sum, week) => sum + week.positiveHourEntries, 0);
      const startDate = index === 0 && parsedStartDate && parsedStartDate.isBefore(firstWeek.startDate, 'day')
        && firstWeek.startDate.diff(parsedStartDate, 'day') <= 7
        ? parsedStartDate
        : firstWeek.startDate;
      const endDate = nextGroup
        ? nextGroup[0].startDate.subtract(1, 'day')
        : parsedEndDate && parsedEndDate.isAfter(lastWeek.endDate, 'day') && parsedEndDate.diff(lastWeek.endDate, 'day') <= 7
          ? parsedEndDate
          : lastWeek.endDate;

      return {
        id: nanoid(),
        name: `Phase ${index + 1} (${formatImportedWeekRange(weeks)})`,
        start_date: startDate.format('YYYY-MM-DD'),
        end_date: endDate.format('YYYY-MM-DD'),
        is_current: false,
        hourly_rate: defaults.hourlyRate ?? null,
        hours_per_day: positiveHourEntries > 0
          ? roundTo(positiveHoursTotal / positiveHourEntries)
          : (defaults.hoursPerDay ?? 8),
        working_days_per_week: firstWeek.workingDaysPerWeek || defaults.workingDaysPerWeek || 5,
        total_hours_worked: totalHoursWorked,
        overtime_hours: totalOvertimeHours > 0 ? totalOvertimeHours : null,
        overtime_rate: defaults.overtimeRate ?? null,
        overtime_multiplier: defaults.overtimeMultiplier ?? 1.5,
        total_earnings_override: null,
      } satisfies SchedulePhase;
    }),
    importedWeekCount: importedWeeks.length,
  };
};

interface Props {
  open: boolean;
  onClose: () => void;
  experienceName: string;
  phases: SchedulePhase[];
  onSave: (phases: SchedulePhase[]) => Promise<void>;
  expStartDate?: string | null;
  expEndDate?: string | null;
  expIsCurrent?: boolean;
  expHourlyRate?: number | null;
  expHoursPerDay?: number | null;
  expWorkingDaysPerWeek?: number | null;
  expOvertimeRate?: number | null;
  expOvertimeMultiplier?: number | null;
}

const SchedulePhasesModal: React.FC<Props> = ({
  open,
  onClose,
  experienceName,
  phases,
  onSave,
  expStartDate,
  expEndDate,
  expIsCurrent,
  expHourlyRate,
  expHoursPerDay,
  expWorkingDaysPerWeek,
  expOvertimeRate,
  expOvertimeMultiplier,
}) => {
  const phaseDefaults: PhaseImportDefaults = {
    hourlyRate: expHourlyRate,
    hoursPerDay: expHoursPerDay,
    workingDaysPerWeek: expWorkingDaysPerWeek,
    overtimeRate: expOvertimeRate,
    overtimeMultiplier: expOvertimeMultiplier,
  };
  const [local, setLocal] = useState<SchedulePhase[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<SchedulePhase, 'id'>>(emptyPhase(phaseDefaults));
  const [saving, setSaving] = useState(false);
  const [showQuickImport, setShowQuickImport] = useState(false);
  const [quickImportText, setQuickImportText] = useState('');

  useEffect(() => {
    if (open) {
      setLocal([...phases]);
      setEditingId(null);
      setForm(emptyPhase(phaseDefaults));
      setShowQuickImport(false);
      setQuickImportText('');
    }
  }, [open, phases, expHourlyRate, expHoursPerDay, expWorkingDaysPerWeek, expOvertimeRate, expOvertimeMultiplier]);

  const startAdd = () => {
    setEditingId('__new__');
    setForm({
      ...emptyPhase(phaseDefaults),
      name: `Phase ${local.length + 1}`,
      start_date: local.length > 0 && local[local.length - 1].end_date ? dayjs(local[local.length - 1].end_date).add(1, 'day').format('YYYY-MM-DD') : (expStartDate || dayjs().format('YYYY-MM-DD')),
      end_date: expEndDate ?? null,
      is_current: expIsCurrent ?? false,
    });
  };

  const startEdit = (phase: SchedulePhase) => {
    setEditingId(phase.id);
    setForm({
      name: phase.name,
      start_date: phase.start_date ?? null,
      end_date: phase.end_date ?? null,
      is_current: phase.is_current,
      hourly_rate: phase.hourly_rate,
      hours_per_day: phase.hours_per_day,
      working_days_per_week: phase.working_days_per_week,
      total_hours_worked: phase.total_hours_worked,
      overtime_hours: phase.overtime_hours,
      overtime_rate: phase.overtime_rate,
      overtime_multiplier: phase.overtime_multiplier,
      total_earnings_override: phase.total_earnings_override,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyPhase(phaseDefaults));
  };

  const commitEdit = () => {
    if (!form.name.trim()) return;
    if (editingId === '__new__') {
      setLocal(prev => [...prev, { ...form, id: nanoid() }]);
    } else {
      setLocal(prev => prev.map(e => e.id === editingId ? { ...form, id: editingId } : e));
    }
    setEditingId(null);
    setForm(emptyPhase(phaseDefaults));
  };

  const handleDelete = (id: string) => {
    setLocal(prev => prev.filter(e => e.id !== id));
  };

  const handleQuickImport = () => {
    try {
      const imported = buildImportedPhases({
        rawText: quickImportText,
        expStartDate,
        expEndDate,
        defaults: phaseDefaults,
      });
      setLocal(imported.phases);
      setEditingId(null);
      setForm(emptyPhase(phaseDefaults));
      setShowQuickImport(false);
      setQuickImportText('');
      message.success(`Generated ${imported.phases.length} phase(s) from ${imported.importedWeekCount} imported week(s). Review and Save when ready.`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to import schedule phases.');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(local);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (d: string | null | undefined) => d ? dayjs(d).format('MMM D, YYYY') : '—';
  
  const isFormEditing = editingId !== null;
  const importDefaultsSummary = [
    phaseDefaults.hourlyRate != null ? `Rate $${phaseDefaults.hourlyRate}/hr` : null,
    phaseDefaults.overtimeRate != null
      ? `OT $${phaseDefaults.overtimeRate}/hr`
      : phaseDefaults.overtimeMultiplier != null
        ? `OT ${phaseDefaults.overtimeMultiplier}x`
        : null,
  ].filter(Boolean).join('  |  ');

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <CalendarOutlined className="text-emerald-500" />
          <span>Schedule Phases — <span className="font-normal text-gray-500">{experienceName}</span></span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={800}
      footer={
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Popconfirm
              title="Delete all phases?"
              description="This clears every unsaved schedule phase in this modal."
              onConfirm={() => setLocal([])}
              okText="Delete All"
              okButtonProps={{ danger: true }}
              disabled={local.length === 0 || isFormEditing}
            >
              <Button danger disabled={local.length === 0 || isFormEditing}>
                Delete All
              </Button>
            </Popconfirm>
            <Button
              onClick={() => setShowQuickImport(prev => !prev)}
              icon={<UploadOutlined />}
              disabled={isFormEditing}
            >
              {showQuickImport ? 'Hide Import' : 'Quick Import'}
            </Button>
            <Button onClick={startAdd} icon={<PlusOutlined />} disabled={isFormEditing || showQuickImport}>
              Add Phase
            </Button>
          </div>
          <div className="flex gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" onClick={handleSave} loading={saving}>Save</Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3 mt-2">
        {showQuickImport && (
          <div className="border border-amber-200 rounded-xl bg-amber-50/40 p-4 space-y-3">
            <div>
              <div className="text-sm font-semibold text-amber-900">Quick Import Weekly Schedule</div>
              <div className="mt-1 text-sm text-amber-700 leading-relaxed">
                Paste weekly timesheet text with `Week`, `Date`, `Hours`, and `Overtime Hours`. We&apos;ll merge consecutive weeks that share the same schedule into phases and keep exact total + overtime hours from the import.
              </div>
              {importDefaultsSummary && (
                <div className="mt-2 text-xs text-amber-700/80">
                  Imported phases will use this role&apos;s saved defaults: {importDefaultsSummary}.
                </div>
              )}
              {local.length > 0 && (
                <div className="mt-1 text-xs text-amber-700/80">
                  Generating phases here replaces the unsaved phases currently shown in this modal.
                </div>
              )}
            </div>
            <TextArea
              rows={12}
              value={quickImportText}
              onChange={(event) => setQuickImportText(event.target.value)}
              placeholder={'Week 1\nDate    Hours    Overtime Hours\n08/22   8        2.71\n08/23   8        2.02\n...'}
            />
            <div className="flex justify-end gap-2">
              <Button onClick={() => setShowQuickImport(false)}>Cancel Import</Button>
              <Button type="primary" onClick={handleQuickImport} disabled={!quickImportText.trim()}>
                Generate Phases
              </Button>
            </div>
          </div>
        )}

        {/* Entry form */}
        {isFormEditing && (
          <div className="border border-emerald-200 rounded-xl bg-emerald-50/40 p-4 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phase Name *</label>
                <Input
                  placeholder="e.g. Full-time Summer Phase"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="flex flex-col">
                <label className="block text-xs font-medium text-gray-600 mb-1">Currently in this phase</label>
                <div className="flex items-center gap-2 h-8">
                  <Switch
                    size="small"
                    checked={form.is_current}
                    onChange={v => setForm(f => ({ ...f, is_current: v, end_date: v ? null : f.end_date }))}
                  />
                  <span className="text-sm text-gray-500">{form.is_current ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                <DatePicker
                  className="w-full"
                  value={form.start_date ? dayjs(form.start_date) : null}
                  onChange={d => setForm(f => ({ ...f, start_date: d ? d.format('YYYY-MM-DD') : '' }))}
                />
              </div>
              {!form.is_current && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                  <DatePicker
                    className="w-full"
                    value={form.end_date ? dayjs(form.end_date) : null}
                    onChange={d => setForm(f => ({ ...f, end_date: d ? d.format('YYYY-MM-DD') : null }))}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 border-t border-emerald-100 pt-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Hourly Rate</label>
                <InputNumber
                  className="w-full"
                  prefix="$"
                  placeholder="e.g. 45"
                  value={form.hourly_rate}
                  onChange={v => setForm(f => ({ ...f, hourly_rate: v }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Hours / Day</label>
                <InputNumber
                  className="w-full"
                  placeholder="e.g. 8"
                  value={form.hours_per_day}
                  onChange={v => setForm(f => ({ ...f, hours_per_day: v }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Days / Week</label>
                <InputNumber
                  className="w-full"
                  placeholder="e.g. 5"
                  value={form.working_days_per_week}
                  onChange={v => setForm(f => ({ ...f, working_days_per_week: v }))}
                />
              </div>
            </div>



            <div className="flex justify-end gap-2 pt-1">
              <Button size="small" onClick={cancelEdit}>Cancel</Button>
              <Button size="small" type="primary" onClick={commitEdit} disabled={!form.name.trim()}>
                {editingId === '__new__' ? 'Add Phase' : 'Update Phase'}
              </Button>
            </div>
          </div>
        )}

        {/* Phase list */}
        {local.length === 0 && !isFormEditing && !showQuickImport && (
          <div className="text-center py-10 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
            No schedule phases. The global role schedule applies. Click "Quick Import" or "Add Phase" to split the schedule.
          </div>
        )}

        {local.map(phase => {
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
                : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-base font-semibold text-gray-900">{phase.name}</span>
                  {phase.is_current && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                      Current
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 mb-2 flex items-center gap-2 flex-wrap">
                  <span>{fmtDate(phase.start_date)} – {phase.is_current ? 'Present' : fmtDate(phase.end_date)}</span>
                </div>
                
                <div className="flex text-xs mt-2 bg-gray-50 p-2 rounded-lg inline-flex flex-wrap border border-gray-100 items-center">
                  <div className="flex gap-4 items-center">
                    {phase.hourly_rate != null && <span><span className="text-gray-400">Rate:</span> ${phase.hourly_rate}/hr</span>}
                    {phase.hours_per_day != null && phase.working_days_per_week != null && (
                      <span><span className="text-gray-400">Schedule:</span> {phase.hours_per_day}h/day, {phase.working_days_per_week} days/wk</span>
                    )}
                  </div>
                  {snapshot && snapshot.estimatedHours > 0 && (
                    <div className="flex items-center pl-3 ml-3 border-l border-gray-200 text-gray-600 font-medium">
                      <span>{snapshot.estimatedHours} hrs</span>
                      <span className="text-gray-300 mx-2">•</span>
                      <span>${snapshot.total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <Tooltip title="Edit">
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => startEdit(phase)}
                      disabled={isFormEditing}
                      className="text-gray-400 hover:text-emerald-500"
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
                        className="text-gray-400 hover:text-red-500"
                      />
                    </Tooltip>
                  </Popconfirm>
                </div>
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </Modal>
  );
};

export default SchedulePhasesModal;

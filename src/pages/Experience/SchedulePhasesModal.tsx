import React, { useEffect, useMemo, useState } from 'react';
import { Button, Popconfirm, message } from 'antd';
import Modal from '../../components/MobileModal';
import { PlusOutlined, CalendarOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { SchedulePhase } from '../../types';
import {
  buildImportedPhases,
  emptyPhase,
  nanoid,
  type PhaseImportDefaults,
} from './schedulePhaseImport';
import SchedulePhaseForm from './SchedulePhaseForm';
import SchedulePhaseRow from './SchedulePhaseRow';
import SchedulePhaseQuickImport from './SchedulePhaseQuickImport';

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
  const phaseDefaults = useMemo<PhaseImportDefaults>(
    () => ({
      hourlyRate: expHourlyRate,
      hoursPerDay: expHoursPerDay,
      workingDaysPerWeek: expWorkingDaysPerWeek,
      overtimeRate: expOvertimeRate,
      overtimeMultiplier: expOvertimeMultiplier,
    }),
    [expHourlyRate, expHoursPerDay, expOvertimeMultiplier, expOvertimeRate, expWorkingDaysPerWeek]
  );
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
  }, [open, phases, phaseDefaults]);

  const startAdd = () => {
    setEditingId('__new__');
    setForm({
      ...emptyPhase(phaseDefaults),
      name: `Phase ${local.length + 1}`,
      start_date:
        local.length > 0 && local[local.length - 1].end_date
          ? dayjs(local[local.length - 1].end_date)
              .add(1, 'day')
              .format('YYYY-MM-DD')
          : expStartDate || dayjs().format('YYYY-MM-DD'),
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
      setLocal((prev) => [...prev, { ...form, id: nanoid() }]);
    } else {
      setLocal((prev) => prev.map((e) => (e.id === editingId ? { ...form, id: editingId } : e)));
    }
    setEditingId(null);
    setForm(emptyPhase(phaseDefaults));
  };

  const handleDelete = (id: string) => {
    setLocal((prev) => prev.filter((e) => e.id !== id));
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
      message.success(
        `Generated ${imported.phases.length} phase(s) from ${imported.importedWeekCount} imported week(s). Review and Save when ready.`
      );
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

  const fmtDate = (d: string | null | undefined) => (d ? dayjs(d).format('MMM D, YYYY') : '—');

  const isFormEditing = editingId !== null;
  const importDefaultsSummary = [
    phaseDefaults.hourlyRate != null ? `Rate $${phaseDefaults.hourlyRate}/hr` : null,
    phaseDefaults.overtimeRate != null
      ? `OT $${phaseDefaults.overtimeRate}/hr`
      : phaseDefaults.overtimeMultiplier != null
        ? `OT ${phaseDefaults.overtimeMultiplier}x`
        : null,
  ]
    .filter(Boolean)
    .join('  |  ');

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <CalendarOutlined className="text-emerald-500 dark:text-emerald-400" />
          <span>
            Schedule Phases —{' '}
            <span className="font-normal text-gray-500 dark:text-ink-400">{experienceName}</span>
          </span>
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
              onClick={() => setShowQuickImport((prev) => !prev)}
              icon={<UploadOutlined />}
              disabled={isFormEditing}
            >
              {showQuickImport ? 'Hide Import' : 'Quick Import'}
            </Button>
            <Button
              onClick={startAdd}
              icon={<PlusOutlined />}
              disabled={isFormEditing || showQuickImport}
            >
              Add Phase
            </Button>
          </div>
          <div className="flex gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" onClick={handleSave} loading={saving}>
              Save
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3 mt-2">
        {showQuickImport && (
          <SchedulePhaseQuickImport
            handleQuickImport={handleQuickImport}
            importDefaultsSummary={importDefaultsSummary}
            local={local}
            quickImportText={quickImportText}
            setQuickImportText={setQuickImportText}
            setShowQuickImport={setShowQuickImport}
          />
        )}

        {/* Entry form */}
        {isFormEditing && (
          <SchedulePhaseForm
            form={form}
            setForm={setForm}
            cancelEdit={cancelEdit}
            commitEdit={commitEdit}
            editingId={editingId}
          />
        )}

        {/* Phase list */}
        {local.length === 0 && !isFormEditing && !showQuickImport && (
          <div className="text-center py-10 text-gray-400 dark:text-ink-500 text-sm border border-dashed border-gray-200 dark:border-white/[0.08] rounded-xl">
            No schedule phases. The global role schedule applies. Click "Quick Import" or "Add
            Phase" to split the schedule.
          </div>
        )}

        <SchedulePhaseRow
          editingId={editingId}
          fmtDate={fmtDate}
          handleDelete={handleDelete}
          isFormEditing={isFormEditing}
          local={local}
          startEdit={startEdit}
        />
      </div>
    </Modal>
  );
};

export default SchedulePhasesModal;

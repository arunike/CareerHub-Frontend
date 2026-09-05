import React, { useState, useEffect } from 'react';
import { AutoComplete, Button, DatePicker, Input, Tag, Tooltip, Popconfirm } from 'antd';
import Modal from '../../components/MobileModal';
import UnitNumberInput from '../../components/UnitNumberInput';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { RaiseEntry } from '../../types';
import type { OfferLike as Offer } from './calculations';
import { backPayFor } from '../Income/raiseSchedule';
import { cycleFor, nextEffectiveDate } from './raiseCycles';
import ModeToggle from '../../components/ModeToggle';
import BackPayWorking from './BackPayWorking';
import RaiseBreakdown from './RaiseBreakdown';
import {
  defaultModes,
  defaultPcts,
  emptyForm,
  fmt,
  nanoid,
  RAISE_TYPES,
  reasonColor,
  reasonLabel,
  reasonValue,
  type AfterModes,
  type BaseEquityMode,
  type BonusMode,
  type PctInputs,
} from './raiseHistoryFields';

// Plain values only: a rich label here would be drawn inside the input, not just in the list.
const REASON_OPTIONS = RAISE_TYPES.map((type) => ({ value: type.label }));

interface Props {
  open: boolean;
  onClose: () => void;
  offer: Offer;
  companyName: string;
  roleTitle: string;
  onSave: (entries: RaiseEntry[]) => Promise<void>;
}

const RaiseHistoryModal: React.FC<Props> = ({
  open,
  onClose,
  offer,
  companyName,
  roleTitle,
  onSave,
}) => {
  const entries: RaiseEntry[] =
    ((offer as Record<string, unknown>).raise_history as RaiseEntry[] | undefined) ?? [];
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Omit<RaiseEntry, 'id'>>(emptyForm());
  const [afterModes, setAfterModes] = useState<AfterModes>(defaultModes);
  const [showWorking, setShowWorking] = useState(false);
  const [pctInputs, setPctInputs] = useState<PctInputs>(defaultPcts);

  const latestEntry = sorted[0];

  // Previewed from the same helper the ledger uses, so the form cannot promise a different figure.
  const [backPay] = backPayFor([{ ...form, id: 'preview' }]);

  const cycle = cycleFor(form.type);

  useEffect(() => {
    if (afterModes.bonus === '%ofbase' && pctInputs.bonus !== '') {
      const pctVal = parseFloat(pctInputs.bonus);
      if (!isNaN(pctVal)) {
        setForm((f) => ({ ...f, bonus_after: Math.round((f.base_after * pctVal) / 100) }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.base_after]);

  const resetFormState = (f: Omit<RaiseEntry, 'id'>) => {
    setForm(f);
    setAfterModes(defaultModes);
    setPctInputs(defaultPcts);
  };

  const openAdd = () => {
    const prefill = latestEntry
      ? {
          base_before: latestEntry.base_after,
          bonus_before: latestEntry.bonus_after,
          equity_before: latestEntry.equity_after,
          base_after: latestEntry.base_after,
          bonus_after: latestEntry.bonus_after,
          equity_after: latestEntry.equity_after,
        }
      : {
          base_before: Number(offer.base_salary),
          bonus_before: Number(offer.bonus),
          equity_before: Number(offer.equity),
          base_after: Number(offer.base_salary),
          bonus_after: Number(offer.bonus),
          equity_after: Number(offer.equity),
        };
    resetFormState(emptyForm(prefill));
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (entry: RaiseEntry) => {
    // Entries saved before the field existed were not backdated, so the two dates match.
    resetFormState({ ...entry, effective_date: entry.effective_date ?? entry.date });
    setEditingId(entry.id);
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    setSaving(true);
    let updated: RaiseEntry[];
    if (editingId) {
      updated = entries.map((e) => (e.id === editingId ? { ...form, id: editingId } : e));
    } else {
      updated = [...entries, { ...form, id: nanoid() }];
    }
    await onSave(updated);
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await onSave(entries.filter((e) => e.id !== id));
  };

  const setF = (key: keyof Omit<RaiseEntry, 'id'>, val: unknown) =>
    setForm((f) => ({ ...f, [key]: val }));

  // One row per figure, so the two columns cannot drift as the After side grows a toggle or a hint.
  const metricRow = (
    label: string,
    before: number,
    modes: React.ReactNode,
    after: React.ReactNode,
    hint?: React.ReactNode
  ) => (
    <div className="px-4 py-3.5">
      <div className="mb-2 flex min-h-11 items-center justify-between gap-3 sm:grid sm:min-h-7 sm:grid-cols-2 sm:gap-4">
        <label className="text-xs font-medium text-slate-600">{label}</label>
        <div className="flex items-center justify-end">{modes}</div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:hidden">
            Before
          </span>
          <div className="flex h-[38px] items-center rounded-[9px] border border-dashed border-slate-200 bg-slate-100 px-3 text-sm text-slate-500">
            {before > 0 ? fmt(before) : '—'}
          </div>
        </div>
        <div>
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-blue-600 sm:hidden">
            After
          </span>
          {after}
          {hint}
        </div>
      </div>
    </div>
  );

  const switchBaseMode = (mode: BaseEquityMode) => {
    setAfterModes((m) => ({ ...m, base: mode }));
    if (mode === '%change') {
      const p = form.base_before
        ? ((form.base_after - form.base_before) / form.base_before) * 100
        : 0;
      setPctInputs((pi) => ({ ...pi, base: p.toFixed(1) }));
    }
  };

  const switchBonusMode = (mode: BonusMode) => {
    setAfterModes((m) => ({ ...m, bonus: mode }));
    if (mode === '%change') {
      const p = form.bonus_before
        ? ((form.bonus_after - form.bonus_before) / form.bonus_before) * 100
        : 0;
      setPctInputs((pi) => ({ ...pi, bonus: p.toFixed(1) }));
    } else if (mode === '%ofbase') {
      const p = form.base_after ? (form.bonus_after / form.base_after) * 100 : 0;
      setPctInputs((pi) => ({ ...pi, bonus: p.toFixed(1) }));
    }
  };

  const switchEquityMode = (mode: BaseEquityMode) => {
    setAfterModes((m) => ({ ...m, equity: mode }));
    if (mode === '%change') {
      const p = form.equity_before
        ? ((form.equity_after - form.equity_before) / form.equity_before) * 100
        : 0;
      setPctInputs((pi) => ({ ...pi, equity: p.toFixed(1) }));
    }
  };

  const baseRow = () => {
    const mode = afterModes.base;
    return metricRow(
      'Base Salary',
      form.base_before,
      <ModeToggle
        value={mode}
        onChange={switchBaseMode}
        options={[
          { label: '$', value: '$' },
          { label: '% increase', value: '%change' },
        ]}
      />,
      mode === '$' ? (
        <UnitNumberInput
          unit="$"
          min={0}
          value={form.base_after || null}
          onChange={(value) => setF('base_after', value ?? 0)}
        />
      ) : (
        <UnitNumberInput
          unit="%"
          value={pctInputs.base === '' ? null : Number(pctInputs.base)}
          onChange={(value) => {
            setPctInputs((pi) => ({ ...pi, base: value == null ? '' : String(value) }));
            if (value != null) setF('base_after', Math.round(form.base_before * (1 + value / 100)));
          }}
          placeholder="e.g. 4.2"
        />
      ),
      mode === '%change' && form.base_after > 0 ? (
        <div className="mt-0.5 text-xs text-gray-400">{fmt(form.base_after)}</div>
      ) : null
    );
  };

  const bonusRow = () => {
    const mode = afterModes.bonus;
    return metricRow(
      'Annual Bonus',
      form.bonus_before,
      <ModeToggle
        value={mode}
        onChange={switchBonusMode}
        options={[
          { label: '$', value: '$' },
          { label: '% increase', value: '%change' },
          { label: '% of base', value: '%ofbase' },
        ]}
      />,
      mode === '$' ? (
        <UnitNumberInput
          unit="$"
          min={0}
          value={form.bonus_after || null}
          onChange={(value) => setF('bonus_after', value ?? 0)}
        />
      ) : (
        <UnitNumberInput
          unit="%"
          value={pctInputs.bonus === '' ? null : Number(pctInputs.bonus)}
          onChange={(value) => {
            setPctInputs((pi) => ({ ...pi, bonus: value == null ? '' : String(value) }));
            if (value != null) {
              if (mode === '%change') {
                setF('bonus_after', Math.round(form.bonus_before * (1 + value / 100)));
              } else {
                setF('bonus_after', Math.round((form.base_after * value) / 100));
              }
            }
          }}
          placeholder={mode === '%ofbase' ? 'e.g. 20' : 'e.g. 5'}
        />
      ),
      mode !== '$' && form.bonus_after > 0 ? (
        <div className="mt-0.5 text-xs text-gray-400">
          {fmt(form.bonus_after)}
          {mode === '%ofbase' && form.base_after > 0 && (
            <span className="ml-1 text-blue-400">of {fmt(form.base_after)} base</span>
          )}
        </div>
      ) : null
    );
  };

  const equityRow = () => {
    const mode = afterModes.equity;
    return metricRow(
      'Annual RSU',
      form.equity_before,
      <ModeToggle
        value={mode}
        onChange={switchEquityMode}
        options={[
          { label: '$', value: '$' },
          { label: '% increase', value: '%change' },
        ]}
      />,
      mode === '$' ? (
        <UnitNumberInput
          unit="$"
          min={0}
          value={form.equity_after || null}
          onChange={(value) => setF('equity_after', value ?? 0)}
        />
      ) : (
        <UnitNumberInput
          unit="%"
          value={pctInputs.equity === '' ? null : Number(pctInputs.equity)}
          onChange={(value) => {
            setPctInputs((pi) => ({ ...pi, equity: value == null ? '' : String(value) }));
            if (value != null)
              setF('equity_after', Math.round(form.equity_before * (1 + value / 100)));
          }}
          placeholder="e.g. 4.2"
        />
      ),
      mode === '%change' && form.equity_after > 0 ? (
        <div className="mt-0.5 text-xs text-gray-400">{fmt(form.equity_after)}</div>
      ) : null
    );
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={
        <div className="flex min-w-0 flex-col sm:flex-row sm:items-center sm:gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <TrophyOutlined className="shrink-0 text-amber-500" />
            <span className="truncate">Raise History</span>
          </div>
          <span className="truncate text-sm font-normal text-gray-500 sm:ml-2">
            {companyName} / {roleTitle}
          </span>
        </div>
      }
      width={680}
    >
      {/* Add Raise button */}
      {!showForm && (
        <div className="mb-4 flex justify-end md:mt-5">
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            Add Raise
          </Button>
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div className="mb-5 space-y-5 md:mt-5 rounded-xl border border-gray-200 bg-gray-50 p-5">
          <div className="text-sm font-semibold text-gray-700">
            {editingId ? 'Edit Raise' : 'New Raise'}
          </div>

          {/* Notified + Effective + Type + Label */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs text-gray-500">Notified on</label>
              <DatePicker
                className="w-full"
                value={form.date ? dayjs(form.date) : null}
                onChange={(d) => {
                  const date = d ? d.format('YYYY-MM-DD') : '';
                  setForm((f) => ({
                    ...f,
                    date,
                    effective_date: nextEffectiveDate(f.effective_date, f, { type: f.type, date }),
                  }));
                }}
                allowClear={false}
              />
              <div className="mt-1 text-[11px] leading-snug text-gray-400">
                The first paycheck on or after this carries the new rate
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-gray-500">Effective date</label>
              <DatePicker
                className="w-full"
                value={form.effective_date ? dayjs(form.effective_date) : null}
                onChange={(d) => setF('effective_date', d ? d.format('YYYY-MM-DD') : null)}
                allowClear={false}
              />
              <div className="mt-1 text-[11px] leading-snug text-gray-400">
                {cycle ? cycle.hint : 'When the new rate starts counting'}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-gray-500">Type</label>
              <AutoComplete
                className="w-full"
                value={reasonLabel(form)}
                options={REASON_OPTIONS}
                placeholder="Pick one or write your own"
                popupMatchSelectWidth={320}
                // Without a caret the box reads as plain text and the suggestions go unnoticed.
                suffixIcon={<DownOutlined className="text-[10px] text-gray-400" />}
                // The list explains what each reason means; the box keeps just the words.
                optionRender={(option) => {
                  const hint = RAISE_TYPES.find((type) => type.label === option.value)?.hint;
                  return (
                    <div className="py-0.5">
                      <div className="text-sm text-gray-800">{String(option.value)}</div>
                      <div className="text-xs leading-snug text-gray-400">{hint}</div>
                    </div>
                  );
                }}
                // The box holds labels, so filter on those rather than on the stored keys.
                filterOption={(input, option) =>
                  String(option?.value ?? '')
                    .toLowerCase()
                    .includes(input.trim().toLowerCase())
                }
                onChange={(text) =>
                  setForm((f) => {
                    const type = reasonValue(text ?? '');
                    return {
                      ...f,
                      type,
                      effective_date: nextEffectiveDate(f.effective_date, f, {
                        type,
                        date: f.date,
                      }),
                    };
                  })
                }
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-gray-500">Label (optional)</label>
              <Input
                placeholder="e.g. Annual review"
                value={form.label ?? ''}
                onChange={(e) => setF('label', e.target.value)}
              />
            </div>
          </div>

          {/* Payroll told late owes the difference; told on time, the two dates simply match. */}
          {backPay && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-2.5 text-xs leading-relaxed text-emerald-900">
              Backdated {backPay.days} days —{' '}
              <button
                type="button"
                aria-expanded={showWorking}
                onClick={() => setShowWorking((open) => !open)}
                className="font-semibold underline decoration-dotted underline-offset-2 hover:decoration-solid"
              >
                {fmt(backPay.amount)}
                <DownOutlined
                  className={`ml-1 text-[9px] transition-transform ${showWorking ? 'rotate-180' : ''}`}
                />
              </button>{' '}
              of back pay, added to the first paycheck from {backPay.paidFrom}.
              {showWorking && <BackPayWorking backPay={backPay} />}
            </div>
          )}
          {form.effective_date != null && form.effective_date > form.date && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-2.5 text-xs leading-relaxed text-amber-900">
              This takes effect after you were told about it, so nothing is owed for the gap.
            </div>
          )}

          {/* Before is what this role already pays, so it is shown, not asked for. */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="hidden gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2.5 sm:grid sm:grid-cols-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Before
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                After
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {baseRow()}
              {bonusRow()}
              {equityRow()}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-xs text-gray-500">Notes (optional)</label>
            <Input.TextArea
              rows={2}
              placeholder="Any context about this raise…"
              value={form.notes ?? ''}
              onChange={(e) => setF('notes', e.target.value)}
            />
          </div>

          {/* Form actions */}
          <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-4 sm:flex-row sm:justify-end">
            <Button onClick={cancelForm}>Cancel</Button>
            <Button type="primary" loading={saving} onClick={handleSubmit}>
              {editingId ? 'Update' : 'Add'}
            </Button>
          </div>
        </div>
      )}

      {/* Raise list */}
      {sorted.length === 0 && !showForm && (
        <p className="text-center text-gray-400 py-8">
          No raises recorded yet. Click "Add Raise" to start tracking.
        </p>
      )}

      <div className={`space-y-4 ${showForm ? 'hidden' : ''}`}>
        {sorted.map((entry) => {
          const reason = reasonLabel(entry);
          const tcBefore = entry.base_before + entry.bonus_before + entry.equity_before;
          const tcAfter = entry.base_after + entry.bonus_after + entry.equity_after;

          const rows: { label: string; before: number; after: number; extra?: string }[] = [
            { label: 'Base', before: entry.base_before, after: entry.base_after },
            {
              label: 'Annual Bonus',
              before: entry.bonus_before,
              after: entry.bonus_after,
              extra:
                entry.base_after > 0
                  ? `${((entry.bonus_after / entry.base_after) * 100).toFixed(1)}% of base`
                  : undefined,
            },
            { label: 'Annual RSU', before: entry.equity_before, after: entry.equity_after },
          ];

          return (
            <div key={entry.id} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Entry header */}
              <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2 sm:px-4">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="whitespace-nowrap text-sm font-semibold text-gray-700">
                    {entry.date}
                  </span>
                  <Tag color={reasonColor(entry.type)}>{reason}</Tag>
                  {entry.effective_date && entry.effective_date < entry.date && (
                    <Tooltip
                      title={`Took effect ${entry.effective_date}; the difference is owed as back pay`}
                    >
                      <Tag color="volcano">Backdated</Tag>
                    </Tooltip>
                  )}
                  {entry.label && (
                    <span className="truncate text-xs text-gray-500">{entry.label}</span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Tooltip title="Edit">
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => openEdit(entry)}
                    />
                  </Tooltip>
                  <Popconfirm
                    title="Delete this raise entry?"
                    okText="Delete"
                    okType="danger"
                    onConfirm={() => handleDelete(entry.id)}
                  >
                    <Tooltip title="Delete">
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Tooltip>
                  </Popconfirm>
                </div>
              </div>

              <RaiseBreakdown rows={rows} tcBefore={tcBefore} tcAfter={tcAfter} />

              {entry.notes && (
                <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 text-xs italic text-gray-500 sm:px-4">
                  {entry.notes}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
};

export default RaiseHistoryModal;

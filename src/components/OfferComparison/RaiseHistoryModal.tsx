import RaiseComponentRows from './RaiseComponentRows';
import RaiseHistoryList from './RaiseHistoryList';
import React, { useState, useEffect } from 'react';
import { AutoComplete, Button, DatePicker, Input, Tooltip } from 'antd';
import Modal from '../modals/MobileModal';
import { PlusOutlined, DownOutlined, TrophyOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import HelpTooltipTrigger from '../feedback/HelpTooltipTrigger';
import type { RaiseEntry } from '../../types';
import type { OfferLike as Offer } from '../../utils/OfferComparison/calculations';
import { backPayFor } from '../../utils/Income/raiseSchedule';
import { cycleFor, nextEffectiveDate } from '../../utils/OfferComparison/raiseCycles';
import BackPayWorking from './BackPayWorking';
import {
  describeRaiseFormIssues,
  raiseFormIssues,
} from '../../utils/OfferComparison/raiseFormValidation';
import { bonusAtSameRate, bonusFromPercent } from '../../utils/bonusPercent';
import { applyRolePayToChain, firstRaiseDrift } from '../../utils/OfferComparison/raiseChain';
import {
  defaultModes,
  defaultPcts,
  emptyForm,
  fmt,
  nanoid,
  RAISE_TYPES,
  reasonLabel,
  reasonValue,
  type AfterModes,
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

// Quiet enough that the label reads first; the colour still carries the reason.

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
  // A bonus tracks base at its old share until edited; after that it is the user's number.
  const [bonusTouched, setBonusTouched] = useState(false);
  const [hourlyInput, setHourlyInput] = useState('');

  const latestEntry = sorted[0];

  // Previewed from the same helper the ledger uses, so the form cannot promise a different figure.
  const [backPay] = backPayFor([{ ...form, id: 'preview' }], {
    paychecksPerYear: Number((offer as Record<string, unknown>).paychecks_per_year) || 26,
  });

  const cycle = cycleFor(form.type);

  useEffect(() => {
    if (afterModes.bonus === '%ofbase' && pctInputs.bonus !== '') {
      const pctVal = parseFloat(pctInputs.bonus);
      if (!isNaN(pctVal)) {
        setForm((f) => ({ ...f, bonus_after: bonusFromPercent(pctVal, f.base_after) }));
      }
      return;
    }
    if (afterModes.bonus === '$' && !bonusTouched) {
      setForm((f) => ({
        ...f,
        bonus_after: bonusAtSameRate(f.base_before, f.bonus_before, f.base_after),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.base_after]);

  const resetFormState = (f: Omit<RaiseEntry, 'id'>) => {
    setForm(f);
    setAfterModes(defaultModes);
    setPctInputs(defaultPcts);
    setBonusTouched(false);
    setHourlyInput('');
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

  // Read from the offer, which is the record the Offers page edits.
  const drift = firstRaiseDrift(entries, Number(offer.base_salary) || 0);

  const handleApplyRolePay = async () => {
    if (!drift) return;
    setSaving(true);
    await onSave(applyRolePayToChain(entries, drift.rolePay));
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await onSave(entries.filter((e) => e.id !== id));
  };

  const setF = (key: keyof Omit<RaiseEntry, 'id'>, val: unknown) =>
    setForm((f) => ({ ...f, [key]: val }));

  const issues = raiseFormIssues(form);
  const blockedReason = describeRaiseFormIssues(issues);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={
        <div className="flex min-w-0 flex-col sm:flex-row sm:items-center sm:gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <TrophyOutlined className="shrink-0 text-amber-500 dark:text-amber-400" />
            <span className="truncate">Raise History</span>
          </div>
          <span className="truncate text-sm font-normal text-gray-500 dark:text-ink-400 sm:ml-2">
            {companyName} / {roleTitle}
          </span>
        </div>
      }
      width={680}
    >
      {/* The earliest raise stores the pay it started from, so editing the role's base leaves it behind. */}
      {drift && !showForm ? (
        <div className="mb-4 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
          <span className="flex items-center gap-1.5">
            Base pay is now {fmt(drift.rolePay)}; the first raise starts from{' '}
            {fmt(drift.storedBefore)}.
            <HelpTooltipTrigger
              ariaLabel="Why the two figures differ"
              title={`Expected if ${fmt(drift.storedBefore)} is what you were paid until the raise. Starting from ${fmt(drift.rolePay)} re-rates your ${drift.affectedYear} paychecks before it, so use it only if the earlier figure is wrong.`}
            />
          </span>
          <Button
            size="small"
            loading={saving}
            onClick={() => void handleApplyRolePay()}
            className="shrink-0"
          >
            Start from {fmt(drift.rolePay)}
          </Button>
        </div>
      ) : null}

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
        <div className="mb-5 space-y-5 md:mt-5 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-ink-900 p-5">
          <div className="text-sm font-semibold text-gray-700 dark:text-ink-100">
            {editingId ? 'Edit Raise' : 'New Raise'}
          </div>

          {/* Notified + Effective + Type + Label */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs text-gray-500 dark:text-ink-400">
                Notified on
              </label>
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
              <div className="mt-1 text-[11px] leading-snug text-gray-400 dark:text-ink-500">
                The first paycheck on or after this carries the new rate
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-gray-500 dark:text-ink-400">
                Effective date
              </label>
              <DatePicker
                className="w-full"
                value={form.effective_date ? dayjs(form.effective_date) : null}
                onChange={(d) => setF('effective_date', d ? d.format('YYYY-MM-DD') : null)}
                allowClear={false}
              />
              <div className="mt-1 text-[11px] leading-snug text-gray-400 dark:text-ink-500">
                {cycle ? cycle.hint : 'When the new rate starts counting'}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-gray-500 dark:text-ink-400">Type</label>
              <AutoComplete
                className="w-full"
                value={reasonLabel(form)}
                options={REASON_OPTIONS}
                placeholder="Pick one or write your own"
                popupMatchSelectWidth={320}
                // Without a caret the box reads as plain text and the suggestions go unnoticed.
                suffixIcon={
                  <DownOutlined className="text-[10px] text-gray-400 dark:text-ink-500" />
                }
                // The list explains what each reason means; the box keeps just the words.
                optionRender={(option) => {
                  const hint = RAISE_TYPES.find((type) => type.label === option.value)?.hint;
                  return (
                    <div className="py-0.5">
                      <div className="text-sm text-gray-800 dark:text-ink-50">
                        {String(option.value)}
                      </div>
                      <div className="text-xs leading-snug text-gray-400 dark:text-ink-500">
                        {hint}
                      </div>
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
              <label className="mb-1.5 block text-xs text-gray-500 dark:text-ink-400">
                Label (optional)
              </label>
              <Input
                placeholder="e.g. Annual review"
                value={form.label ?? ''}
                onChange={(e) => setF('label', e.target.value)}
              />
            </div>
          </div>

          {/* Payroll told late owes the difference; told on time, the two dates simply match. */}
          {backPay && (
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50/60 dark:bg-emerald-500/10 px-4 py-2.5 text-xs leading-relaxed text-emerald-900 dark:text-emerald-200">
              Backdated {backPay.periods === 1 ? '1 paycheck' : `${backPay.periods} paychecks`} —{' '}
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
            <div className="rounded-lg border border-amber-200 dark:border-amber-500/25 bg-amber-50/60 dark:bg-amber-500/10 px-4 py-2.5 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
              This takes effect after you were told about it, so nothing is owed for the gap.
            </div>
          )}

          {/* Before is what this role already pays, so it is shown, not asked for. */}
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900">
            <div className="hidden gap-4 border-b border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-ink-900 px-4 py-2.5 sm:grid sm:grid-cols-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-ink-500">
                Before
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-300">
                After
              </div>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-white/[0.07]">
              <RaiseComponentRows
                form={form}
                setF={setF}
                afterModes={afterModes}
                setAfterModes={setAfterModes}
                pctInputs={pctInputs}
                setPctInputs={setPctInputs}
                hourlyInput={hourlyInput}
                setHourlyInput={setHourlyInput}
                setBonusTouched={setBonusTouched}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-xs text-gray-500 dark:text-ink-400">
              Notes (optional)
            </label>
            <Input.TextArea
              rows={2}
              placeholder="Any context about this raise…"
              value={form.notes ?? ''}
              onChange={(e) => setF('notes', e.target.value)}
            />
          </div>

          {/* Form actions */}
          <div className="flex flex-col-reverse gap-2 border-t border-gray-200 dark:border-white/[0.08] pt-4 sm:flex-row sm:justify-end">
            <Button onClick={cancelForm}>Cancel</Button>
            {/* Wrapped: a disabled antd Button fires no mouse events, so the tooltip needs a host. */}
            <Tooltip title={blockedReason || undefined}>
              <span className="inline-flex">
                <Button
                  // antd's disabled primary is grey on grey; default stays readable while inert.
                  type={issues.length > 0 ? 'default' : 'primary'}
                  disabled={issues.length > 0}
                  loading={saving}
                  onClick={handleSubmit}
                  className="w-full sm:w-auto"
                >
                  {editingId ? 'Update' : 'Add'}
                </Button>
              </span>
            </Tooltip>
          </div>
        </div>
      )}

      {/* Raise list */}
      {sorted.length === 0 && !showForm && (
        <p className="text-center text-gray-400 dark:text-ink-500 py-8">
          No raises recorded yet. Click "Add Raise" to start tracking.
        </p>
      )}

      <RaiseHistoryList
        entries={sorted}
        hidden={showForm}
        onEdit={openEdit}
        onDelete={handleDelete}
      />
    </Modal>
  );
};

export default RaiseHistoryModal;

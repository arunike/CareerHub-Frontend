import React, { useState, useEffect } from 'react';
import { Button, Select, DatePicker, Input, Tag, Tooltip, Popconfirm } from 'antd';
import Modal from '../../components/MobileModal';
import UnitNumberInput from '../../components/UnitNumberInput';
import { PlusOutlined, EditOutlined, DeleteOutlined, TrophyOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { RaiseEntry } from '../../types';
import type { OfferLike as Offer } from './calculations';
import {
  ModeBtn,
  RAISE_TYPES,
  defaultModes,
  defaultPcts,
  delta,
  emptyForm,
  fmt,
  fmtPct,
  nanoid,
  type AfterModes,
  type BaseEquityMode,
  type BonusMode,
  type PctInputs,
} from './raiseHistoryFields';

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
  const [pctInputs, setPctInputs] = useState<PctInputs>(defaultPcts);

  const latestEntry = sorted[0];

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
    resetFormState({ ...entry });
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
    <div>
      <div className="mb-1.5 flex min-h-11 items-center justify-between gap-2 sm:min-h-8">
        <label className="text-xs text-gray-500">{label}</label>
        {modes}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <span className="mb-1 block text-[11px] uppercase tracking-wide text-gray-400 sm:hidden">
            Before
          </span>
          <div className="flex h-[38px] items-center rounded-[9px] border border-dashed border-slate-200 bg-slate-100 px-3 text-sm text-slate-500">
            {before > 0 ? fmt(before) : '—'}
          </div>
        </div>
        <div>
          <span className="mb-1 block text-[11px] uppercase tracking-wide text-gray-400 sm:hidden">
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
      <div className="flex items-center gap-0.5">
        <ModeBtn active={mode === '$'} onClick={() => switchBaseMode('$')}>
          $
        </ModeBtn>
        <ModeBtn active={mode === '%change'} onClick={() => switchBaseMode('%change')}>
          %Δ
        </ModeBtn>
      </div>,
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
      <div className="flex items-center gap-0.5">
        <ModeBtn active={mode === '$'} onClick={() => switchBonusMode('$')}>
          $
        </ModeBtn>
        <ModeBtn active={mode === '%change'} onClick={() => switchBonusMode('%change')}>
          %Δ
        </ModeBtn>
        <ModeBtn active={mode === '%ofbase'} onClick={() => switchBonusMode('%ofbase')}>
          % of Base
        </ModeBtn>
      </div>,
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
      <div className="flex items-center gap-0.5">
        <ModeBtn active={mode === '$'} onClick={() => switchEquityMode('$')}>
          $
        </ModeBtn>
        <ModeBtn active={mode === '%change'} onClick={() => switchEquityMode('%change')}>
          %Δ
        </ModeBtn>
      </div>,
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
        <div className="flex items-center gap-2">
          <TrophyOutlined className="text-amber-500" />
          <span>Raise History</span>
          <span className="text-sm font-normal text-gray-500 ml-1">
            — {companyName} / {roleTitle}
          </span>
        </div>
      }
      width={680}
    >
      {/* Add Raise button */}
      {!showForm && (
        <div className="flex justify-end mb-4">
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            Add Raise
          </Button>
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5 space-y-4">
          <div className="text-sm font-semibold text-gray-700 mb-1">
            {editingId ? 'Edit Raise' : 'New Raise'}
          </div>

          {/* Date + Type + Label */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date</label>
              <DatePicker
                className="w-full"
                value={form.date ? dayjs(form.date) : null}
                onChange={(d) => setF('date', d ? d.format('YYYY-MM-DD') : '')}
                allowClear={false}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <Select
                className="w-full"
                value={form.type}
                onChange={(v) => setF('type', v)}
                options={RAISE_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                // The closed control shows the label alone; the list explains what each one means.
                optionRender={(option) => {
                  const type = RAISE_TYPES.find((t) => t.value === option.value);
                  return (
                    <div className="py-0.5">
                      <div className="text-sm text-gray-800">{type?.label}</div>
                      <div className="text-xs leading-snug text-gray-400">{type?.hint}</div>
                    </div>
                  );
                }}
                popupMatchSelectWidth={320}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Label (optional)</label>
              <Input
                placeholder="e.g. Annual review"
                value={form.label ?? ''}
                onChange={(e) => setF('label', e.target.value)}
              />
            </div>
          </div>

          {/* Before is what this role already pays, so it is shown, not asked for. */}
          <div className="space-y-3">
            <div className="hidden gap-3 sm:grid sm:grid-cols-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Before
              </div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                After
              </div>
            </div>
            {baseRow()}
            {bonusRow()}
            {equityRow()}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Notes (optional)</label>
            <Input.TextArea
              rows={2}
              placeholder="Any context about this raise…"
              value={form.notes ?? ''}
              onChange={(e) => setF('notes', e.target.value)}
            />
          </div>

          {/* Form actions */}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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

      <div className="space-y-4">
        {sorted.map((entry) => {
          const typeInfo = RAISE_TYPES.find((t) => t.value === entry.type);
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
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">{entry.date}</span>
                  <Tag color={typeInfo?.color}>{typeInfo?.label ?? entry.type}</Tag>
                  {entry.label && <span className="text-xs text-gray-500">{entry.label}</span>}
                </div>
                <div className="flex items-center gap-1">
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

              {/* Breakdown table */}
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    <th className="text-left px-4 py-2 font-medium">Component</th>
                    <th className="text-right px-4 py-2 font-medium">Before</th>
                    <th className="text-right px-4 py-2 font-medium">After</th>
                    <th className="text-right px-4 py-2 font-medium">+/-</th>
                    <th className="text-right px-4 py-2 font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const changed = r.after !== r.before;
                    return (
                      <tr key={r.label} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-700">
                          <div>{r.label}</div>
                          {r.extra && <div className="text-xs text-gray-400">{r.extra}</div>}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-500">{fmt(r.before)}</td>
                        <td className="px-4 py-2 text-right text-gray-700 font-medium">
                          {fmt(r.after)}
                        </td>
                        <td
                          className={`px-4 py-2 text-right font-medium ${changed ? (r.after >= r.before ? 'text-green-600' : 'text-red-500') : 'text-gray-400'}`}
                        >
                          {changed ? delta(r.before, r.after) : '—'}
                        </td>
                        <td
                          className={`px-4 py-2 text-right font-medium ${changed ? (r.after >= r.before ? 'text-green-600' : 'text-red-500') : 'text-gray-400'}`}
                        >
                          {changed ? fmtPct(r.before, r.after) : '—'}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Total TC row */}
                  <tr className="bg-blue-50 font-semibold text-blue-900">
                    <td className="px-4 py-2">Total TC</td>
                    <td className="px-4 py-2 text-right">{fmt(tcBefore)}</td>
                    <td className="px-4 py-2 text-right">{fmt(tcAfter)}</td>
                    <td
                      className={`px-4 py-2 text-right ${tcAfter >= tcBefore ? 'text-green-700' : 'text-red-600'}`}
                    >
                      {delta(tcBefore, tcAfter)}
                    </td>
                    <td
                      className={`px-4 py-2 text-right ${tcAfter >= tcBefore ? 'text-green-700' : 'text-red-600'}`}
                    >
                      {fmtPct(tcBefore, tcAfter)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {entry.notes && (
                <div className="px-4 py-2 text-xs text-gray-500 italic border-t border-gray-100 bg-gray-50">
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

import { useEffect, useState } from 'react';
import { Popover } from 'antd';
import { CarOutlined, EditOutlined } from '@ant-design/icons';
import UnitNumberInput from '../../components/UnitNumberInput';
import { DEFAULT_GAS_PRICE, DEFAULT_MPG, type DrivingDefaults } from './commute';

export interface FuelOverrideTarget {
  // Stable per offer, and the key the apply callback receives back.
  key: string;
  name: string;
  mpg: number | null;
  gasPricePerGallon: number | null;
}

const DrivingAssumptions = ({
  value,
  onChange,
  overrides = [],
  onApplyToOffers,
}: {
  value?: Partial<DrivingDefaults> | null;
  onChange: (next: DrivingDefaults) => void;
  overrides?: FuelOverrideTarget[];
  onApplyToOffers?: (keys: string[]) => void | Promise<void>;
}) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'edit' | 'review'>('edit');
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const mpg = Number(value?.mpg) || DEFAULT_MPG;
  const gasPrice = Number(value?.gasPricePerGallon) || DEFAULT_GAS_PRICE;
  // Drafts, so a half-typed "2" in a 28 mpg field does not reprice every offer mid-keystroke.
  const [draftMpg, setDraftMpg] = useState<number | null>(mpg);
  const [draftPrice, setDraftPrice] = useState<number | null>(gasPrice);

  // The saved figures arrive after the first render, and can change under us if the save fails
  // and reverts, so the draft follows them whenever the popover is shut.
  useEffect(() => {
    if (open) return;
    setDraftMpg(mpg);
    setDraftPrice(gasPrice);
    setStep('edit');
    setSelected([]);
  }, [mpg, gasPrice, open]);

  const nextDefaults = {
    mpg: Number(draftMpg) || DEFAULT_MPG,
    gasPricePerGallon: Number(draftPrice) || DEFAULT_GAS_PRICE,
  };

  const commit = async (keys: string[]) => {
    setSaving(true);
    try {
      onChange(nextDefaults);
      if (keys.length > 0) await onApplyToOffers?.(keys);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: string) =>
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const overrideLabel = `${overrides.length} offer${overrides.length === 1 ? '' : 's'} keep${
    overrides.length === 1 ? 's' : ''
  } their own figures`;

  const editStep = (
    <div className="w-[268px] space-y-3">
      <p className="m-0 text-xs leading-5 text-slate-500">
        Shared by every offer that costs its commute by fuel. An offer can override either figure on
        its Work &amp; commute tab.
      </p>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-600">Efficiency</span>
        <UnitNumberInput
          unit="mpg"
          min={1}
          max={200}
          value={draftMpg}
          placeholder={String(DEFAULT_MPG)}
          onChange={(next) => setDraftMpg(next)}
          className="w-full"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-600">Gas price</span>
        <UnitNumberInput
          unit="$/gal"
          min={0}
          max={30}
          step={0.1}
          value={draftPrice}
          placeholder={String(DEFAULT_GAS_PRICE)}
          onChange={(next) => setDraftPrice(next)}
          className="w-full"
        />
      </label>
      {overrides.length > 0 && (
        <p className="m-0 text-[11px] leading-4 text-amber-600">
          {overrideLabel} — you can apply these to them after saving.
        </p>
      )}
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-2.5">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            // With no overrides there is nothing to choose between, so save straight away.
            if (overrides.length === 0 || !onApplyToOffers) void commit([]);
            else setStep('review');
          }}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {overrides.length > 0 && onApplyToOffers ? 'Save…' : 'Save'}
        </button>
      </div>
    </div>
  );

  const reviewStep = (
    <div className="w-[300px] space-y-3">
      <p className="m-0 text-xs leading-5 text-slate-500">
        {overrideLabel}. Tick the ones that should switch to{' '}
        <strong className="font-semibold text-slate-700 tabular-nums">
          {nextDefaults.mpg} mpg · ${nextDefaults.gasPricePerGallon}/gal
        </strong>
        .
      </p>
      <ul className="m-0 max-h-[220px] list-none space-y-1.5 overflow-y-auto p-0">
        {overrides.map((target) => (
          <li key={target.key}>
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-2 transition-colors hover:bg-slate-50">
              <input
                type="checkbox"
                checked={selected.includes(target.key)}
                onChange={() => toggle(target.key)}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-blue-600"
              />
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-slate-800">
                  {target.name}
                </span>
                <span className="block text-[11px] leading-4 text-slate-500 tabular-nums">
                  {target.mpg !== null && (
                    <>
                      {target.mpg} → {nextDefaults.mpg} mpg
                    </>
                  )}
                  {target.mpg !== null && target.gasPricePerGallon !== null && ' · '}
                  {target.gasPricePerGallon !== null && (
                    <>
                      ${target.gasPricePerGallon} → ${nextDefaults.gasPricePerGallon}/gal
                    </>
                  )}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
        <button
          type="button"
          onClick={() =>
            setSelected((prev) =>
              prev.length === overrides.length ? [] : overrides.map((target) => target.key)
            )
          }
          className="rounded px-1 text-[11px] font-semibold text-blue-600 transition-colors hover:text-blue-800"
        >
          {selected.length === overrides.length ? 'Clear all' : 'Select all'}
        </button>
        <span className="flex gap-2">
          <button
            type="button"
            onClick={() => setStep('edit')}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            Back
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void commit(selected)}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {selected.length > 0 ? `Save & update ${selected.length}` : 'Save only'}
          </button>
        </span>
      </div>
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomRight"
      title={step === 'edit' ? 'Driving assumptions' : 'Offers with their own figures'}
      content={step === 'edit' ? editStep : reviewStep}
    >
      {/* Labelled and given an edit affordance: as a bare "23 mpg · $5.2/gal" chip it read as a
          summary of a setting kept somewhere else, so nobody thought to click it. */}
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:border-blue-400 hover:text-blue-700"
      >
        <CarOutlined className="text-slate-400" />
        <span className="text-slate-500">Driving:</span>
        <span className="tabular-nums text-slate-900">
          {mpg} mpg · ${gasPrice}/gal
        </span>
        <EditOutlined className="text-[11px] text-blue-600" />
      </button>
    </Popover>
  );
};

export default DrivingAssumptions;

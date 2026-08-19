import { useMemo, useState } from 'react';
import { Input } from 'antd';
import UnitNumberInput from './UnitNumberInput';
import { FIELD_HINT_CLASS } from './formControls';

// Never rewrite salary_range on its own: its exact string is part of the sheet row hash.

const SEPARATOR = /\s*(?:-|–|—|to)\s*/i;
const AMOUNT = /^\$?\s*([\d,]+(?:\.\d+)?)\s*([km])?$/i;

const parseAmount = (raw: string): number | null => {
  const match = AMOUNT.exec(raw.trim());
  if (!match) return null;
  const base = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(base)) return null;
  const suffix = match[2]?.toLowerCase();
  if (suffix === 'k') return Math.round(base * 1_000);
  if (suffix === 'm') return Math.round(base * 1_000_000);
  return Math.round(base);
};

// null means "not a numeric range" — e.g. 'Competitive', 'DOE', 'Up to £90k'.
export const parseSalaryRange = (
  value?: string
): { min: number | null; max: number | null } | null => {
  const text = (value ?? '').trim();
  if (!text) return { min: null, max: null };
  const parts = text.split(SEPARATOR).filter(Boolean);
  if (parts.length > 2) return null;
  const min = parseAmount(parts[0]);
  if (min == null) return null;
  if (parts.length === 1) return { min, max: null };
  const max = parseAmount(parts[1]);
  if (max == null) return null;
  return { min, max };
};

// Plain digits with spaces around the dash — the shape already used in synced sheets.
export const formatSalaryRange = (min: number | null, max: number | null) => {
  if (min != null && max != null) return `${min} - ${max}`;
  if (min != null) return String(min);
  if (max != null) return String(max);
  return '';
};

const money = (value: number) => `$${Math.round(value).toLocaleString()}`;

interface Props {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

const SalaryRangeInput = ({ value, onChange, placeholder }: Props) => {
  const parsed = useMemo(() => parseSalaryRange(value), [value]);
  // 'auto' follows the stored value so imported text is not crushed into two numbers.
  const [mode, setMode] = useState<'auto' | 'range' | 'text'>('auto');
  const freeform = mode === 'text' || (mode === 'auto' && parsed === null);

  if (freeform) {
    return (
      <div>
        <Input
          value={value ?? ''}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder ?? 'e.g. Competitive, DOE'}
        />
        <div className={FIELD_HINT_CLASS}>
          <span className="min-w-0 truncate text-gray-400">Saved exactly as written</span>
          <button
            type="button"
            onClick={() => setMode('range')}
            className="shrink-0 rounded px-1.5 py-0.5 font-semibold text-blue-600 hover:bg-blue-50"
          >
            Use min / max
          </button>
        </div>
      </div>
    );
  }

  const { min, max } = parsed ?? { min: null, max: null };
  const emit = (nextMin: number | null, nextMax: number | null) =>
    onChange?.(formatSalaryRange(nextMin, nextMax));
  const invalid = min != null && max != null && max < min;

  return (
    <div>
      <div className="flex items-center gap-2">
        <UnitNumberInput
          unit="$"
          min={0}
          step={1000}
          value={min}
          onChange={(next) => emit(next, max)}
          placeholder="Min"
          aria-label="Minimum salary"
        />
        <span className="shrink-0 text-sm text-gray-400">–</span>
        <UnitNumberInput
          unit="$"
          min={0}
          step={1000}
          value={max}
          onChange={(next) => emit(min, next)}
          placeholder="Max"
          aria-label="Maximum salary"
        />
      </div>
      <div className={FIELD_HINT_CLASS}>
        <span className={`min-w-0 truncate ${invalid ? 'text-amber-600' : 'text-gray-400'}`}>
          {invalid
            ? 'Max is below min'
            : parsed === null
              ? `Keeps “${value}” until you enter a number`
              : min != null && max != null
                ? `Midpoint ${money((min + max) / 2)} · spread ${money(max - min)}`
                : 'Leave max empty for a single figure'}
        </span>
        <button
          type="button"
          onClick={() => setMode('text')}
          className="shrink-0 rounded px-1.5 py-0.5 font-semibold text-blue-600 hover:bg-blue-50"
        >
          Enter as text
        </button>
      </div>
    </div>
  );
};

export default SalaryRangeInput;

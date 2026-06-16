import clsx from 'clsx';
import {
  getPaletteColor,
  getToneForPaletteColor,
  isHexColor,
  normalizeHexColor,
  normalizePaletteColor,
  USER_COLOR_PALETTE,
} from '../utils/colorPalette';

type ColorValueMode = 'key' | 'hex' | 'tone';

type Props = {
  value: string;
  onChange: (value: string) => void;
  mode?: ColorValueMode;
  allowCustomHex?: boolean;
  className?: string;
};

const valueForMode = (colorKey: string, mode: ColorValueMode) => {
  const color = getPaletteColor(colorKey);
  if (mode === 'hex') return color.dot;
  if (mode === 'tone') return getToneForPaletteColor(color.value);
  return color.value;
};

const selectedColorKey = (value: string, mode: ColorValueMode) => {
  if (mode === 'hex') {
    const normalized = normalizeHexColor(value);
    return USER_COLOR_PALETTE.find((option) => option.dot.toLowerCase() === normalized)?.value;
  }

  return normalizePaletteColor(value);
};

const ColorSwatchPicker = ({
  value,
  onChange,
  mode = 'key',
  allowCustomHex = false,
  className,
}: Props) => {
  const selected = selectedColorKey(value, mode);
  const selectedColor = getPaletteColor(value);
  const hasCustomValue =
    isHexColor(value) &&
    !USER_COLOR_PALETTE.some((option) => option.dot.toLowerCase() === normalizeHexColor(value));
  const customHexValue = isHexColor(value) ? normalizeHexColor(value) : selectedColor.dot;

  return (
    <div
      className={clsx(
        'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]',
        className
      )}
    >
      <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
        <span className="text-xs font-medium text-slate-500">Color</span>
        <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: selectedColor.dot }}
          />
          <span className="truncate">{hasCustomValue ? customHexValue : selectedColor.label}</span>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {USER_COLOR_PALETTE.map((option) => {
          const isSelected = selected === option.value && !hasCustomValue;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(valueForMode(option.value, mode))}
              title={option.label}
              aria-label={`${option.label} color`}
              className={clsx(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 active:scale-95',
                isSelected ? 'border-slate-900 bg-white' : 'border-slate-200 bg-white'
              )}
            >
              <span
                className={clsx(
                  'h-4 w-4 rounded-full transition',
                  isSelected ? 'ring-4 ring-slate-100' : 'ring-2 ring-white'
                )}
                style={{ backgroundColor: option.dot }}
              />
            </button>
          );
        })}

        {allowCustomHex && (
          <label
            className={clsx(
              'ml-1 flex h-8 min-w-[92px] cursor-pointer items-center justify-center gap-2 rounded-full border px-3 text-xs font-semibold transition hover:border-slate-400 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-1',
              hasCustomValue
                ? 'border-slate-900 bg-slate-50 text-slate-900'
                : 'border-slate-200 bg-white text-slate-600'
            )}
          >
            <span
              className="h-3.5 w-3.5 shrink-0 rounded-full"
              style={{ backgroundColor: customHexValue }}
            />
            <span>Custom</span>
            <input
              type="color"
              className="sr-only"
              value={customHexValue}
              onChange={(event) => onChange(normalizeHexColor(event.target.value))}
              aria-label="Custom color"
            />
          </label>
        )}
      </div>
    </div>
  );
};

export default ColorSwatchPicker;

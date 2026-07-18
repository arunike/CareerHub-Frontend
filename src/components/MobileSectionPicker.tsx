import type { ChangeEvent } from 'react';

export type MobileSectionOption<T extends string> = {
  value: T;
  label: string;
};

type MobileSectionPickerProps<T extends string> = {
  id: string;
  label: string;
  value: T;
  options: readonly MobileSectionOption<T>[];
  onChange: (value: T) => void;
  className?: string;
};

const MobileSectionPicker = <T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  className = '',
}: MobileSectionPickerProps<T>) => {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value as T);
  };

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-xs font-semibold text-slate-600">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={handleChange}
          className="min-h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 pr-10 text-base font-semibold text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span
          className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-slate-500"
          aria-hidden="true"
        >
          ▾
        </span>
      </div>
    </div>
  );
};

export default MobileSectionPicker;

import clsx from 'clsx';
import type { ReactNode } from 'react';

type Option<T extends string> = {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  activeClassName?: string;
  inactiveClassName?: string;
};

type Props<T extends string> = {
  value: T;
  onChange: (next: T) => void;
  options: Option<T>[];
  wrapperClassName?: string;
  buttonClassName?: string;
};

const SegmentedToggle = <T extends string>({
  value,
  onChange,
  options,
  wrapperClassName,
  buttonClassName,
}: Props<T>) => {
  return (
    <div
      className={clsx(
        'flex rounded-[10px] border border-slate-200/80 bg-slate-100/80 p-0.5',
        wrapperClassName
      )}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={clsx(
              'flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition-all',
              buttonClassName,
              isActive
                ? option.activeClassName ||
                    'bg-white text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                : option.inactiveClassName ||
                    'text-slate-500 hover:bg-white/50 hover:text-slate-700'
            )}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default SegmentedToggle;

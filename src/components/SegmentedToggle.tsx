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
    <div className={clsx('flex bg-gray-100 p-1 rounded-lg', wrapperClassName)}>
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap flex items-center justify-center gap-2',
              buttonClassName,
              isActive
                ? option.activeClassName || 'bg-white text-gray-900 shadow-sm'
                : option.inactiveClassName || 'text-gray-500 hover:text-gray-700'
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

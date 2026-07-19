import { Select } from 'antd';

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
  const labelId = `${id}-label`;

  return (
    <div className={className}>
      <label id={labelId} htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <Select<T>
        id={id}
        value={value}
        options={options.map((option) => ({ ...option }))}
        onChange={onChange}
        aria-labelledby={labelId}
        className="careerhub-mobile-section-picker w-full"
        classNames={{ popup: { root: 'careerhub-mobile-section-picker-popup' } }}
        popupMatchSelectWidth
      />
    </div>
  );
};

export default MobileSectionPicker;

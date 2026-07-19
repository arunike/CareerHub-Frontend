import { Checkbox } from 'antd';
import type { CheckboxProps } from 'antd';
import clsx from 'clsx';

type SelectionCheckboxProps = CheckboxProps & {
  selectionLabel: string;
};

const SelectionCheckbox = ({
  checked,
  selectionLabel,
  className,
  ...props
}: SelectionCheckboxProps) => (
  <Checkbox
    {...props}
    checked={checked}
    aria-label={`${checked ? 'Deselect' : 'Select'} ${selectionLabel}`}
    className={clsx(
      '!inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center md:min-h-6 md:min-w-6',
      className
    )}
  />
);

export default SelectionCheckbox;

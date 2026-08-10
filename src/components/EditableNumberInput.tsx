import { useEffect, useState } from 'react';
import UnitNumberInput, { type NumberUnit } from './UnitNumberInput';

type Props = {
  id?: string;
  value: number;
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  fallbackValue: number;
  ariaDescribedBy?: string;
  className?: string;
  placeholder?: string;
  unit?: NumberUnit;
};

// Same unit chip and stepper as every other numeric field, but the value is only
// pushed upward on blur/Enter so a half-typed number never hits the parent.
const EditableNumberInput = ({
  id,
  value,
  onCommit,
  min,
  max,
  step,
  fallbackValue,
  ariaDescribedBy,
  className,
  placeholder,
  unit,
}: Props) => {
  const [draft, setDraft] = useState<number | null>(value ?? fallbackValue);

  useEffect(() => {
    setDraft(value ?? fallbackValue);
  }, [fallbackValue, value]);

  const commit = () => {
    const next = draft == null ? fallbackValue : draft;
    const committed = min == null ? next : Math.max(min, next);
    setDraft(committed);
    onCommit(committed);
  };

  return (
    <UnitNumberInput
      id={id}
      unit={unit}
      min={min}
      max={max}
      step={step}
      value={draft}
      onChange={setDraft}
      onBlur={commit}
      onPressEnter={commit}
      aria-describedby={ariaDescribedBy}
      className={className}
      placeholder={placeholder}
    />
  );
};

export default EditableNumberInput;

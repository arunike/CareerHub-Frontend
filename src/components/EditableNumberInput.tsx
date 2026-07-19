import { useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';

type Props = {
  id?: string;
  value: number;
  onCommit: (value: number) => void;
  min?: number;
  step?: number;
  fallbackValue: number;
  ariaDescribedBy?: string;
  className?: string;
  placeholder?: string;
};

const EditableNumberInput = ({
  id,
  value,
  onCommit,
  min,
  step,
  fallbackValue,
  ariaDescribedBy,
  className,
  placeholder,
}: Props) => {
  const [draft, setDraft] = useState(String(value ?? fallbackValue));

  useEffect(() => {
    setDraft(String(value ?? fallbackValue));
  }, [fallbackValue, value]);

  const commit = () => {
    const parsed = Number(draft);
    const nextValue = Number.isFinite(parsed) && draft.trim() !== '' ? parsed : fallbackValue;
    const committedValue = min == null ? nextValue : Math.max(min, nextValue);
    setDraft(String(committedValue));
    onCommit(committedValue);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    }
  };

  return (
    <input
      id={id}
      type="number"
      min={min}
      step={step}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      aria-describedby={ariaDescribedBy}
      className={className}
      placeholder={placeholder}
    />
  );
};

export default EditableNumberInput;

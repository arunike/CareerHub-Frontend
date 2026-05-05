import { useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';

type Props = {
  value: number;
  onCommit: (value: number) => void;
  min?: number;
  step?: number;
  fallbackValue: number;
  className?: string;
  placeholder?: string;
};

const EditableNumberInput = ({
  value,
  onCommit,
  min,
  step,
  fallbackValue,
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
      type="number"
      min={min}
      step={step}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      className={className}
      placeholder={placeholder}
    />
  );
};

export default EditableNumberInput;

import { useRef, useState } from 'react';
import MoneyInput from './MoneyInput';

// Recorded figures carry the page's one accent, so a glance says which numbers are real.
export const RECORDED_CLASS =
  'text-emerald-700 decoration-emerald-300 underline underline-offset-4';

interface Props {
  // What the row shows today: the recorded figure when there is one, else the model's.
  display: string;
  recorded: number | null;
  // Shown greyed behind an empty editor, so the model's number stays visible while you type.
  modelledPlaceholder: string;
  editing: boolean;
  // undefined closes without writing; a number or null commits.
  onDone: (value: number | null | undefined) => void;
  className?: string;
  editorWidth?: number;
}

export const LedgerCell = ({
  display,
  recorded,
  modelledPlaceholder,
  editing,
  onDone,
  className = 'font-semibold text-slate-900',
  editorWidth = 116,
}: Props) => {
  const [draft, setDraft] = useState<number | null>(recorded);
  const wrapper = useRef<HTMLSpanElement>(null);

  if (!editing) {
    return (
      <span
        className={`ledger-cell-value whitespace-nowrap tabular-nums ${recorded === null ? className : RECORDED_CLASS}`}
      >
        {display}
      </span>
    );
  }

  const commit = () => onDone(draft === recorded ? undefined : draft);

  return (
    <span
      ref={wrapper}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit();
        if (event.key === 'Escape') onDone(undefined);
      }}
      // A blur inside the editor moves between its own parts, so only a blur that leaves commits.
      onBlur={(event) => {
        if (!wrapper.current?.contains(event.relatedTarget as Node | null)) commit();
      }}
    >
      <MoneyInput
        autoFocus
        inlineCurrency
        controls={false}
        className="ledger-cell-editor"
        size="small"
        width={editorWidth}
        placeholder={modelledPlaceholder}
        value={draft}
        onChange={setDraft}
      />
    </span>
  );
};

export default LedgerCell;

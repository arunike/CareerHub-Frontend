// A round toggle that switches a series or a slice of a total off, with a dot carrying its colour.
const FilterChip = ({
  label,
  active,
  dot,
  disabled,
  title,
  onToggle,
}: {
  label: string;
  active: boolean;
  // The series colour, or undefined for a chip that stands for no colour of its own.
  dot?: string;
  disabled?: boolean;
  // Why it cannot be toggled, since a disabled control explains nothing on its own.
  title?: string;
  onToggle: () => void;
}) => (
  <button
    type="button"
    aria-pressed={active}
    disabled={disabled}
    title={title}
    onClick={onToggle}
    className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed md:min-h-0 md:px-2.5 md:py-1 ${
      disabled ? 'opacity-50 ' : ''
    }${
      active
        ? 'border-gray-200 bg-white text-gray-700 shadow-sm dark:border-white/[0.08] dark:bg-ink-900 dark:text-ink-100'
        : 'border-gray-200 bg-gray-50 text-gray-400 dark:border-white/[0.08] dark:bg-ink-900 dark:text-ink-500'
    }`}
  >
    {dot !== undefined && (
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: active ? dot : '#d1d5db' }}
      />
    )}
    <span>{label}</span>
  </button>
);

export default FilterChip;

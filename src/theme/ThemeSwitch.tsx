import { DesktopOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import type { ComponentType } from 'react';
import type { ThemePreference } from './preference';

const OPTIONS: Array<{ value: ThemePreference; label: string; icon: ComponentType }> = [
  { value: 'light', label: 'Light theme', icon: SunOutlined },
  { value: 'dark', label: 'Dark theme', icon: MoonOutlined },
  { value: 'system', label: 'Use system theme', icon: DesktopOutlined },
];

const TRACK =
  'inline-flex items-center rounded-xl border border-slate-200/80 bg-slate-100/80 p-1 dark:border-white/[0.12] dark:bg-ink-900';

const seat = (selected: boolean) =>
  `flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-ink-900 ${
    selected
      ? 'bg-white dark:bg-ink-900 text-blue-700 dark:text-blue-300 shadow-sm dark:text-blue-300'
      : 'text-slate-500 dark:text-ink-400 hover:bg-white/70 hover:text-slate-900 dark:hover:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-50'
  }`;

export default function ThemeSwitch({
  value,
  onChange,
  compact = false,
}: {
  value: ThemePreference;
  onChange: (theme: ThemePreference) => void;
  // A collapsed sidebar has room for one seat, so it cycles instead of showing all three.
  compact?: boolean;
}) {
  if (compact) {
    const index = OPTIONS.findIndex((option) => option.value === value);
    const current = OPTIONS[index === -1 ? 2 : index];
    const next = OPTIONS[(index + 1) % OPTIONS.length];
    const Icon = current.icon;
    return (
      <button
        type="button"
        onClick={() => onChange(next.value)}
        aria-label={`${current.label}. Switch to ${next.label.toLowerCase()}`}
        title={current.label}
        className={`${TRACK} ${seat(true)} h-10 w-12`}
      >
        <Icon />
      </button>
    );
  }

  return (
    <div className={TRACK} role="group" aria-label="Color theme">
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            aria-label={option.label}
            aria-pressed={value === option.value}
            title={option.label}
            onClick={() => onChange(option.value)}
            className={seat(value === option.value)}
          >
            <Icon />
          </button>
        );
      })}
    </div>
  );
}

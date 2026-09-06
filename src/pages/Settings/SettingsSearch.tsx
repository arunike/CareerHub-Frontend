import { useEffect, useRef, useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { CONTROL_CLASS } from '../../components/formControls';
import { TAB_LABELS, searchSettings, type SettingsTab } from './settingsIndex';

const SettingsSearch = ({ onJump }: { onJump: (tab: SettingsTab, sectionId: string) => void }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const results = searchSettings(query);

  // A click anywhere else closes the list; without this it stays open over the page.
  useEffect(() => {
    if (!isOpen) return;
    const handle = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [isOpen]);

  const jump = (tab: SettingsTab, sectionId: string) => {
    onJump(tab, sectionId);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full sm:w-[280px]">
      <SearchOutlined className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-ink-500" />
      <input
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsOpen(false);
          // Enter takes the top hit, so a search can be driven entirely from the keyboard.
          if (event.key === 'Enter' && results[0]) jump(results[0].tab, results[0].id);
        }}
        placeholder="Search settings"
        aria-label="Search settings"
        className={`${CONTROL_CLASS} !pl-9`}
      />

      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 shadow-lg">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-slate-500 dark:text-ink-400">
              No settings match “{query.trim()}”.
            </p>
          ) : (
            <ul className="max-h-[320px] overflow-y-auto py-1">
              {results.map((entry) => (
                <li key={`${entry.tab}-${entry.id}`}>
                  <button
                    type="button"
                    onClick={() => jump(entry.tab, entry.id)}
                    className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-slate-50"
                  >
                    <span className="min-w-0 truncate text-sm font-medium text-slate-900 dark:text-ink-50">
                      {entry.title}
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-ink-500">
                      {TAB_LABELS[entry.tab]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default SettingsSearch;

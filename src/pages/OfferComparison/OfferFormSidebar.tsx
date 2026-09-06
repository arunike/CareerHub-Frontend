type Props = {
  activeSectionIndex: number;
  navigationItems: Array<{ id: string; label: string; meta: string }>;
  showSection: (index: number) => void;
};

const OfferFormSidebar = ({ activeSectionIndex, navigationItems, showSection }: Props) => (
  <aside className="min-w-0 border-b border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 px-4 py-3 lg:border-b-0 lg:border-r lg:px-3 lg:py-5">
    <div className="lg:sticky lg:top-0">
      <p className="hidden px-3 text-xs font-semibold text-slate-950 dark:text-ink-50 lg:block">
        Offer record
      </p>
      <p className="mt-1 hidden px-3 text-xs leading-5 text-slate-500 dark:text-ink-400 lg:block">
        Enter only what you can verify. Blank optional signals are excluded from scoring.
      </p>
      <nav
        aria-label="Offer form sections"
        role="tablist"
        className="mt-0 flex gap-2 overflow-x-auto lg:mt-5 lg:flex-col lg:overflow-visible"
      >
        {navigationItems.map((item, index) => (
          <a
            key={item.id}
            id={`${item.id}-tab`}
            href={`#${item.id}`}
            role="tab"
            aria-selected={activeSectionIndex === index}
            aria-controls={item.id}
            onClick={(event) => {
              event.preventDefault();
              showSection(index);
            }}
            className={`group flex min-w-max items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:min-w-0 ${
              activeSectionIndex === index
                ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-200 shadow-[inset_0_0_0_1px_rgba(191,219,254,0.8)]'
                : 'text-slate-700 dark:text-ink-100 hover:bg-slate-100'
            }`}
          >
            <span
              className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-white dark:bg-ink-900 text-[11px] font-semibold ${
                activeSectionIndex === index
                  ? 'border-blue-200 dark:border-blue-500/25 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-ink-400 group-hover:border-blue-200 group-hover:text-blue-700'
              }`}
            >
              {index + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold group-hover:text-slate-950">
                {item.label}
              </span>
              <span className="mt-0.5 hidden truncate text-[11px] text-slate-500 dark:text-ink-400 lg:block">
                {item.meta}
              </span>
            </span>
          </a>
        ))}
      </nav>
    </div>
  </aside>
);

export default OfferFormSidebar;

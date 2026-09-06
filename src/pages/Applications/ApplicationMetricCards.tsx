import type { buildApplicationMetrics } from './applicationMetrics';

type Props = {
  applicationMetrics: ReturnType<typeof buildApplicationMetrics>;
};

const ApplicationMetricCards = ({ applicationMetrics }: Props) => (
  <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
    {applicationMetrics.map((metric) => (
      <button
        type="button"
        key={metric.label}
        onClick={metric.onClick}
        aria-label={metric.label}
        className={`enterprise-card text-left transition-all duration-200 ease-in-out p-4 md:px-5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 active:scale-[0.98] ${
          metric.isActive
            ? metric.tone === 'blue'
              ? 'border-blue-400 bg-blue-50/40 dark:bg-blue-500/10 shadow-inner'
              : metric.tone === 'emerald'
                ? 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-500/10 shadow-inner'
                : metric.tone === 'amber'
                  ? 'border-amber-400 bg-amber-50/40 dark:bg-amber-500/10 shadow-inner'
                  : 'border-slate-400 dark:border-white/[0.16] bg-slate-100/70 dark:bg-ink-800/70 shadow-inner'
            : 'hover:bg-slate-50/80 hover:border-slate-300 hover:shadow-md'
        }`}
      >
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-ink-400">
          {metric.label}
        </div>
        <div
          className={`mt-2 text-2xl font-[760] leading-none ${
            metric.tone === 'blue'
              ? 'text-blue-600 dark:text-blue-300'
              : metric.tone === 'emerald'
                ? 'text-emerald-700 dark:text-emerald-300'
                : metric.tone === 'amber'
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-slate-950 dark:text-ink-50'
          }`}
        >
          {metric.value}
        </div>
      </button>
    ))}
  </div>
);

export default ApplicationMetricCards;

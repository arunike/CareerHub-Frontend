import { CalendarBlank, CheckSquare, Clock, FileText } from '@phosphor-icons/react';
import useReveal from '../../hooks/useReveal';

const weekItems = [
  {
    icon: CalendarBlank,
    label: 'Interview',
    title: 'Google · Software Engineer',
    detail: 'Scheduled for Oct 1',
    tone: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  },
  {
    icon: CheckSquare,
    label: 'Follow-up task',
    title: 'Send interview thank-you',
    detail: 'Due Oct 1',
    tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  },
  {
    icon: Clock,
    label: 'Offer deadline',
    title: 'Review Netflix offer',
    detail: 'Decision due Oct 1',
    tone: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  },
  {
    icon: FileText,
    label: 'Preparation',
    title: 'Review the job description and submitted resume',
    detail: 'Ready when you are',
    tone: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
  },
];

export default function WeekAtGlance() {
  const reveal = useReveal();

  return (
    <section className="relative overflow-hidden bg-white px-5 py-20 dark:bg-night-1 sm:px-8 sm:py-28 lg:px-10">
      <div
        {...reveal}
        className="public-reveal relative mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[minmax(0,0.76fr)_minmax(520px,1.24fr)] lg:items-center lg:gap-20"
      >
        <div>
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
            02 · Your next moves
          </p>
          <h2 className="mt-5 max-w-[13ch] text-balance text-4xl font-bold leading-tight tracking-[-0.035em] text-slate-950 dark:text-ink-50 sm:text-5xl">
            Your week, already connected.
          </h2>
          <p className="mt-6 max-w-[58ch] text-lg leading-8 text-slate-600 dark:text-ink-200">
            An interview is more useful beside its preparation, follow-up, and decision deadline.
            CareerHub brings the next actions together without separating them from the records
            behind them.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl bg-slate-50 shadow-[0_30px_90px_-56px_rgba(30,64,175,0.5)] ring-1 ring-slate-200 dark:bg-night-2 dark:shadow-[0_30px_90px_-56px_rgba(0,0,0,0.95)] dark:ring-white/[0.12]">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-white/[0.08] dark:bg-night-3 sm:px-6">
            <div>
              <p className="text-sm font-semibold text-slate-950 dark:text-ink-50">
                Week at a glance
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-ink-400">
                Illustrative schedule
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-night-4 dark:text-ink-200">
              Oct 1
            </span>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-white/[0.08]">
            {weekItems.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.label}
                  className="group grid gap-4 px-5 py-5 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white dark:hover:bg-slate-900 sm:grid-cols-[44px_minmax(120px,0.55fr)_minmax(0,1.45fr)] sm:items-center sm:px-6"
                >
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 ${item.tone}`}
                  >
                    <Icon />
                  </span>
                  <p className="text-xs font-semibold text-slate-500 dark:text-ink-400">
                    {item.label}
                  </p>
                  <div>
                    <h3 className="text-sm font-semibold leading-6 text-slate-950 dark:text-ink-50">
                      {item.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-ink-400">{item.detail}</p>
                  </div>
                </article>
              );
            })}
          </div>
          <p className="border-t border-slate-200 bg-white px-5 py-3 text-xs leading-5 text-slate-500 dark:border-white/[0.08] dark:bg-night-3 dark:text-ink-400 sm:px-6">
            Illustrative data only. No personal information is shown.
          </p>
        </div>
      </div>
    </section>
  );
}

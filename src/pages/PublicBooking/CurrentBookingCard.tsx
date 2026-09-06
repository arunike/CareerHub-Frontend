import type { PublicBooking } from '../../types';

type Props = {
  email: string;
  managedBooking: PublicBooking | null;
  name: string;
  timezone: string;
};

const CurrentBookingCard = ({ managedBooking }: Props) => (
  <div className="lg:col-span-5">
    <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 p-5 shadow-[0_18px_48px_-42px_rgba(15,23,42,0.55)] sm:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 text-xs font-medium text-slate-500 dark:text-ink-400">
            Scheduled time
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-ink-50 sm:text-2xl">
            {managedBooking?.date} · {managedBooking?.start_time.slice(0, 5)} -{' '}
            {managedBooking?.end_time.slice(0, 5)} {managedBooking?.timezone}
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-500 dark:text-ink-400">
            {managedBooking?.name} · {managedBooking?.email}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {managedBooking?.ics_url && (
            <a
              href={managedBooking.ics_url}
              className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 dark:border-white/[0.12] px-5 text-sm font-semibold text-slate-700 dark:text-ink-100 hover:border-blue-300 hover:text-blue-700"
            >
              Download .ics
            </a>
          )}
          {managedBooking?.reschedule_url && (
            <a
              href={managedBooking.reschedule_url}
              className="inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Reschedule
            </a>
          )}
          {managedBooking?.cancel_url && (
            <a
              href={managedBooking.cancel_url}
              className="inline-flex min-h-11 items-center rounded-xl bg-rose-50 dark:bg-rose-500/10 px-5 text-sm font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100"
            >
              Cancel
            </a>
          )}
        </div>
      </div>
    </div>
  </div>
);

export default CurrentBookingCard;

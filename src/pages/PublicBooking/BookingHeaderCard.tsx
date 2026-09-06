import { ClockCircleOutlined } from '@ant-design/icons';
import IdentityAvatar from '../../components/IdentityAvatar';
import type { PublicBooking } from '../../types';

type Props = {
  allowRescheduleCancel: boolean;
  bookingBlockMinutes: number;
  hostDisplayName: string;
  hostEmail: string;
  hostProfilePicture: string | null;
  manageAction: 'reschedule' | 'cancel' | null;
  managedBooking: PublicBooking | null;
  publicNote: string;
  rescheduleCancelDeadlineHours: number;
  restoredGuestBooking: boolean;
  title: string;
};

const BookingHeaderCard = ({
  allowRescheduleCancel,
  bookingBlockMinutes,
  hostDisplayName,
  hostEmail,
  hostProfilePicture,
  manageAction,
  managedBooking,
  publicNote,
  rescheduleCancelDeadlineHours,
  restoredGuestBooking,
  title,
}: Props) => (
  <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 p-5 shadow-[0_18px_48px_-42px_rgba(15,23,42,0.55)] sm:p-8">
    <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
      <div className="flex-1">
        <div className="mb-5 inline-flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
          {manageAction === 'reschedule'
            ? 'Reschedule Booking'
            : manageAction === 'cancel'
              ? 'Cancel Booking'
              : restoredGuestBooking
                ? 'Your Booking'
                : 'Booking Invitation'}
        </div>
        <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-slate-950 dark:text-ink-50 sm:text-4xl">
          {title}
        </h1>
        <p className="max-w-xl text-base leading-7 text-slate-600 dark:text-ink-200">
          {restoredGuestBooking
            ? 'You already have a scheduled time from this browser. You can reschedule or cancel it if needed.'
            : manageAction === 'cancel'
              ? 'Review your booking details and cancel if this time no longer works.'
              : 'Please select a convenient time for our session. All times are automatically adjusted to your local timezone.'}
        </p>
      </div>
      <div className="min-w-0 shrink-0 md:w-[260px]">
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-ink-900 p-4">
          <div className="mb-3 text-xs font-medium text-slate-500 dark:text-ink-400">Hosted by</div>
          <div className="flex items-center gap-3">
            <IdentityAvatar
              imageUrl={hostProfilePicture}
              name={hostDisplayName || 'CareerHub User'}
              email={hostEmail}
              alt={hostDisplayName || 'Host'}
              size="md"
            />
            <div className="min-w-0">
              <div className="truncate text-base font-bold text-slate-900 dark:text-ink-50">
                {hostDisplayName || 'CareerHub User'}
              </div>
              {hostEmail && (
                <div className="truncate text-xs font-medium text-slate-600 dark:text-ink-200">
                  {hostEmail}
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 dark:border-white/[0.08] pt-4 text-sm font-medium text-slate-700 dark:text-ink-100">
            <span className="inline-flex items-center gap-2">
              <ClockCircleOutlined className="text-blue-500 dark:text-blue-400" />
              {bookingBlockMinutes} min session
            </span>
            {allowRescheduleCancel && rescheduleCancelDeadlineHours > 0 && (
              <span className="rounded-lg bg-white dark:bg-ink-900 px-2 py-1 text-xs font-medium text-slate-600 dark:text-ink-200">
                Changes close {rescheduleCancelDeadlineHours}h before start
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
    {publicNote && (
      <div className="mt-6 rounded-xl border border-blue-100 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/10 p-4 text-sm leading-6 text-blue-950">
        <div className="mb-1 text-xs font-semibold text-blue-700 dark:text-blue-300">Host note</div>
        <p className="m-0">{publicNote}</p>
      </div>
    )}
    {managedBooking && (
      <div className="mt-6 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-ink-900 p-4 text-sm text-slate-700 dark:text-ink-100">
        Current booking:{' '}
        <span className="font-bold text-slate-900 dark:text-ink-50">{managedBooking.date}</span>{' '}
        {managedBooking.start_time.slice(0, 5)}-{managedBooking.end_time.slice(0, 5)}{' '}
        {managedBooking.timezone}
        {managedBooking.status === 'canceled' && (
          <span className="ml-2 font-bold text-rose-600 dark:text-rose-300">Canceled</span>
        )}
        {restoredGuestBooking && managedBooking.status === 'active' && (
          <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold">
            {managedBooking.ics_url && (
              <a
                href={managedBooking.ics_url}
                className="text-blue-700 dark:text-blue-300 underline"
              >
                Download .ics
              </a>
            )}
            {managedBooking.reschedule_url && (
              <a
                href={managedBooking.reschedule_url}
                className="text-blue-700 dark:text-blue-300 underline"
              >
                Reschedule
              </a>
            )}
            {managedBooking.cancel_url && (
              <a
                href={managedBooking.cancel_url}
                className="text-rose-700 dark:text-rose-300 underline"
              >
                Cancel
              </a>
            )}
          </div>
        )}
      </div>
    )}
  </div>
);

export default BookingHeaderCard;

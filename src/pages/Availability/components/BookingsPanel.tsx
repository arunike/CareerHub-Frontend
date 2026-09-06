import type React from 'react';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import BulkActionHeader from '../../../components/BulkActionHeader';
import SelectionCheckbox from '../../../components/SelectionCheckbox';

type Props = {
  bookings: any;
  formatTime: any;
  onCancelBooking: any;
  handleBulkDeleteBookings: () => void;
  handleBulkToggleLockBookings: (lock: boolean) => void;
  handleSelectAllBookings: (checked: boolean) => void;
  handleSelectBooking: (id: number, checked: boolean) => void;
  isAnyBookingLocked: any;
  selectedBookingIds: number[];
  setSelectedBookingIds: React.Dispatch<React.SetStateAction<number[]>>;
};

const BookingsPanel = ({
  handleBulkDeleteBookings,
  handleBulkToggleLockBookings,
  handleSelectAllBookings,
  handleSelectBooking,
  isAnyBookingLocked,
  selectedBookingIds,
  setSelectedBookingIds,
  bookings,
  formatTime,
  onCancelBooking,
}: Props) => (
  <section className="enterprise-section flex flex-col p-4 sm:p-6">
    <div className="mb-4">
      <BulkActionHeader
        title={
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-ink-50">
            <CalendarOutlined className="text-emerald-500 dark:text-emerald-400" />
            Public bookings
          </div>
        }
        selectedCount={selectedBookingIds.length}
        totalCount={bookings.length}
        onSelectAll={handleSelectAllBookings}
        onCancelSelection={() => setSelectedBookingIds([])}
        bulkActions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="small"
              icon={<LockOutlined />}
              onClick={() => handleBulkToggleLockBookings(true)}
            >
              Lock
            </Button>
            <Button
              size="small"
              icon={<UnlockOutlined />}
              onClick={() => handleBulkToggleLockBookings(false)}
            >
              Unlock
            </Button>
            <Tooltip title={isAnyBookingLocked ? 'Cannot delete locked bookings' : ''}>
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={handleBulkDeleteBookings}
                disabled={isAnyBookingLocked}
              >
                Delete
              </Button>
            </Tooltip>
          </div>
        }
        defaultActions={
          <span className="rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-500/20">
            {bookings.length}
          </span>
        }
      />
      <p className="text-xs text-gray-500 dark:text-ink-400 mt-1">
        Recruiter submissions from all public availability links.
      </p>
    </div>

    {bookings.length === 0 ? (
      <div className="enterprise-empty p-5 text-sm text-gray-500 dark:text-ink-400">
        No public bookings yet.
      </div>
    ) : (
      <div className="space-y-3 max-h-[540px] overflow-auto pr-1">
        {bookings.map((booking: any) => (
          <div
            key={booking.id}
            className={`rounded-xl border transition-all p-4 ${
              selectedBookingIds.includes(booking.id)
                ? 'border-blue-200 dark:border-blue-500/25 bg-blue-50/30 dark:bg-blue-500/10 shadow-sm'
                : 'border-slate-200 dark:border-white/[0.08] bg-white/70 dark:bg-ink-900/70'
            }`}
          >
            <div className="flex items-start gap-3">
              <SelectionCheckbox
                selectionLabel={`${booking.name}'s booking on ${booking.date}`}
                checked={selectedBookingIds.includes(booking.id)}
                onChange={(e) => handleSelectBooking(booking.id, e.target.checked)}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h3 className="m-0 min-w-0 break-words text-sm font-bold text-gray-900 dark:text-ink-50 [overflow-wrap:anywhere]">
                      {booking.name}
                    </h3>
                    {booking.is_locked && (
                      <LockOutlined className="text-amber-500 dark:text-amber-400 text-xs" />
                    )}
                    {booking.status === 'canceled' && (
                      <span className="rounded-full border border-rose-100 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700 dark:text-rose-300">
                        Canceled
                      </span>
                    )}
                  </div>
                  <CheckCircleOutlined className="text-emerald-500 dark:text-emerald-400" />
                </div>
                <p className="mt-0.5 break-words text-xs text-gray-500 dark:text-ink-400 [overflow-wrap:anywhere]">
                  {booking.email}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-ink-200">
                  <span className="inline-flex max-w-full items-center gap-1 break-words rounded-lg border border-slate-100 dark:border-white/[0.07] bg-slate-50 dark:bg-ink-900 px-2 py-1 [overflow-wrap:anywhere]">
                    <CalendarOutlined /> {booking.date}
                  </span>
                  <span className="inline-flex max-w-full items-center gap-1 break-words rounded-lg border border-slate-100 dark:border-white/[0.07] bg-slate-50 dark:bg-ink-900 px-2 py-1 [overflow-wrap:anywhere]">
                    <ClockCircleOutlined /> {formatTime(booking.start_time)} -{' '}
                    {formatTime(booking.end_time)} {booking.timezone}
                  </span>
                </div>
                <p className="mt-2 break-words text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-ink-500 [overflow-wrap:anywhere]">
                  {booking.share_link_title || 'Public booking link'}
                </p>
                {booking.notes && (
                  <p className="mt-2 break-words rounded-lg border border-amber-100 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:text-amber-200 [overflow-wrap:anywhere]">
                    {booking.notes}
                  </p>
                )}
                {booking.cancel_reason && (
                  <p className="mt-2 break-words rounded-lg border border-rose-100 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-3 py-2 text-xs leading-relaxed text-rose-900 dark:text-rose-200 [overflow-wrap:anywhere]">
                    <span className="font-bold">Cancel reason:</span> {booking.cancel_reason}
                  </p>
                )}
                {booking.intake_answers && Object.keys(booking.intake_answers).length > 0 && (
                  <div className="mt-2 break-words rounded-lg border border-sky-100 dark:border-sky-500/20 bg-sky-50 dark:bg-sky-500/10 px-3 py-2 text-xs leading-relaxed text-sky-900 dark:text-sky-200 [overflow-wrap:anywhere]">
                    {Object.entries(booking.intake_answers).map(([key, value]) => (
                      <div key={key}>
                        <span className="font-bold">{key}:</span> {String(value)}
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
                  {booking.ics_url && (
                    <a
                      className="text-blue-600 dark:text-blue-300 hover:underline"
                      href={booking.ics_url}
                    >
                      .ics
                    </a>
                  )}
                  {booking.reschedule_url && booking.status !== 'canceled' && (
                    <a
                      className="text-blue-600 dark:text-blue-300 hover:underline"
                      href={booking.reschedule_url}
                    >
                      Reschedule link
                    </a>
                  )}
                  {booking.status !== 'canceled' && (
                    <button
                      type="button"
                      onClick={() => onCancelBooking?.(booking)}
                      className="p-0 text-left text-rose-600 dark:text-rose-300 hover:underline"
                    >
                      Cancel booking
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </section>
);

export default BookingsPanel;

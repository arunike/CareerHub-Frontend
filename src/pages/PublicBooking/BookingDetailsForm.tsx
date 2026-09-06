import { FIELD_CLASS_NAME, TEXTAREA_CLASS_NAME } from './bookingFieldStyles';
import type React from 'react';
import { ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import type { BookingIntakeQuestion, BookingSlot, PublicBooking } from '../../types';
import { formatDateOnly } from '../../utils/dateOnly';

type Props = {
  allowRescheduleCancel: boolean;
  cancelReason: string;
  confirmedBooking: PublicBooking | null;
  email: string;
  emailIsInvalid: boolean;
  emailTouched: boolean;
  handleBook: () => void;
  intakeAnswers: Record<string, string>;
  setIntakeAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  intakeQuestions: BookingIntakeQuestion[];
  manageAction: 'reschedule' | 'cancel' | null;
  managedBooking: PublicBooking | null;
  name: string;
  notes: string;
  selectedDate: string;
  selectedSlot: BookingSlot | null;
  setCancelReason: React.Dispatch<React.SetStateAction<string>>;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  setEmailTouched: React.Dispatch<React.SetStateAction<boolean>>;
  setName: React.Dispatch<React.SetStateAction<string>>;
  setNotes: React.Dispatch<React.SetStateAction<string>>;
  submitting: boolean;
  timezone: string;
};

const BookingDetailsForm = ({
  allowRescheduleCancel,
  cancelReason,
  confirmedBooking,
  email,
  emailIsInvalid,
  emailTouched,
  handleBook,
  intakeAnswers,
  setIntakeAnswers,
  intakeQuestions,
  manageAction,
  managedBooking,
  name,
  notes,
  selectedDate,
  selectedSlot,
  setCancelReason,
  setEmail,
  setEmailTouched,
  setName,
  setNotes,
  submitting,
  timezone,
}: Props) => (
  <div className="lg:col-span-2">
    <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 p-5 shadow-[0_18px_48px_-42px_rgba(15,23,42,0.55)] sm:p-8 lg:sticky lg:top-6">
      <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-ink-50">
        <UserOutlined className="text-blue-500 dark:text-blue-400" />
        {manageAction ? 'Booking Details' : '2. Your Details'}
      </h2>

      <div className="space-y-5">
        <div className="space-y-2">
          <label
            htmlFor="booking-name"
            className="text-sm font-medium text-slate-700 dark:text-ink-100"
          >
            Full Name <span className="text-rose-500 dark:text-rose-400">*</span>
          </label>
          <input
            id="booking-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!!manageAction}
            autoComplete="name"
            placeholder="Your name"
            className={FIELD_CLASS_NAME}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="booking-email"
            className="text-sm font-medium text-slate-700 dark:text-ink-100"
          >
            Email Address <span className="text-rose-500 dark:text-rose-400">*</span>
          </label>
          <input
            id="booking-email"
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setEmailTouched(true)}
            disabled={!!manageAction}
            autoComplete="email"
            placeholder="your@email.com"
            aria-invalid={!manageAction && emailTouched && emailIsInvalid}
            aria-describedby={
              !manageAction && emailTouched && emailIsInvalid ? 'booking-email-error' : undefined
            }
            className={`${FIELD_CLASS_NAME} ${
              !manageAction && emailTouched && emailIsInvalid
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                : ''
            }`}
          />
          {!manageAction && emailTouched && emailIsInvalid && (
            <p
              id="booking-email-error"
              className="text-xs font-medium text-rose-700 dark:text-rose-300"
            >
              Enter a valid email address.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="booking-notes"
            className="text-sm font-medium text-slate-700 dark:text-ink-100"
          >
            Additional Notes
          </label>
          <textarea
            id="booking-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!!manageAction}
            placeholder="Anything useful before the meeting..."
            className={`${TEXTAREA_CLASS_NAME} min-h-28`}
          />
        </div>

        {!manageAction &&
          intakeQuestions.map((question) => (
            <div className="space-y-2" key={question.id}>
              <label
                htmlFor={`booking-question-${question.id}`}
                className="text-sm font-medium text-slate-700 dark:text-ink-100"
              >
                {question.label}{' '}
                {question.required && <span className="text-rose-500 dark:text-rose-400">*</span>}
              </label>
              <textarea
                id={`booking-question-${question.id}`}
                required={question.required}
                value={intakeAnswers[question.id] || ''}
                onChange={(e) =>
                  setIntakeAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))
                }
                placeholder="Your answer"
                className={`${TEXTAREA_CLASS_NAME} min-h-24`}
              />
            </div>
          ))}

        {manageAction === 'cancel' && (
          <div className="space-y-2">
            <label
              htmlFor="booking-cancel-reason"
              className="text-sm font-medium text-slate-700 dark:text-ink-100"
            >
              Cancel Reason
            </label>
            <textarea
              id="booking-cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Optional context for the host..."
              className={`${TEXTAREA_CLASS_NAME} min-h-24 focus:border-rose-500 focus:ring-rose-500/20`}
            />
          </div>
        )}

        <div className="pt-2">
          {selectedSlot && (
            <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-blue-200 dark:border-blue-500/25 bg-blue-50 dark:bg-blue-500/10 p-4">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                  Confirm This Time
                </div>
                <div className="mt-1 text-sm font-semibold text-blue-950">{selectedSlot.label}</div>
                <div className="mt-1 text-xs text-blue-800 dark:text-blue-200">
                  {formatDateOnly(selectedDate)} · {timezone}
                </div>
                <div className="mt-1 text-xs leading-5 text-blue-700 dark:text-blue-300">
                  Host receives the calendar hold in their saved timezone.
                </div>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-100 dark:border-blue-500/20 bg-white dark:bg-ink-900">
                <ClockCircleOutlined className="text-blue-500 dark:text-blue-400" />
              </div>
            </div>
          )}
          {confirmedBooking && (
            <div className="mb-5 rounded-xl border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 p-4 text-sm text-emerald-950">
              <div className="font-semibold">Booking confirmed</div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold">
                {confirmedBooking.ics_url && (
                  <a
                    href={confirmedBooking.ics_url}
                    className="text-emerald-700 dark:text-emerald-300 underline"
                  >
                    Download .ics
                  </a>
                )}
                {confirmedBooking.reschedule_url && (
                  <a
                    href={confirmedBooking.reschedule_url}
                    className="text-emerald-700 dark:text-emerald-300 underline"
                  >
                    Reschedule
                  </a>
                )}
                {confirmedBooking.cancel_url && (
                  <a
                    href={confirmedBooking.cancel_url}
                    className="text-emerald-700 dark:text-emerald-300 underline"
                  >
                    Cancel
                  </a>
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleBook}
            disabled={
              (manageAction !== 'cancel' && !selectedSlot) ||
              submitting ||
              managedBooking?.status === 'canceled' ||
              (!!manageAction && !allowRescheduleCancel)
            }
            aria-busy={submitting}
            className={`flex min-h-12 w-full items-center justify-center gap-3 rounded-xl px-6 text-base font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:bg-slate-300 ${
              manageAction === 'cancel'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {submitting ? (
              <>
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                  aria-hidden="true"
                />
                Saving…
              </>
            ) : manageAction === 'reschedule' ? (
              'Confirm New Time'
            ) : manageAction === 'cancel' ? (
              'Cancel Booking'
            ) : (
              'Confirm Booking'
            )}
          </button>
          <p className="mt-3 text-center text-xs leading-5 text-slate-500 dark:text-ink-400">
            By confirming, the host will receive the booking details and calendar file.
          </p>
        </div>
      </div>
    </div>
  </div>
);

export default BookingDetailsForm;

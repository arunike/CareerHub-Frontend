import { LinkOutlined, PlusOutlined, SettingOutlined, StopOutlined } from '@ant-design/icons';
import { useId, useState } from 'react';
import type { BookingIntakeQuestion, ShareLink } from '../../../types';

const bookingFieldLabelClass =
  'mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-ink-400';

const bookingFieldClass =
  'min-h-11 min-w-0 rounded-lg border bg-white dark:bg-ink-900 px-3 py-2 text-sm';

const secondaryButtonClass =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 px-4 text-sm font-medium text-gray-600 dark:text-ink-200 transition-colors hover:bg-gray-50 disabled:opacity-70 sm:w-auto';

const primaryButtonClass =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-70 motion-reduce:active:scale-100 sm:w-auto';

type Props = {
  shareLink: ShareLink | null;
  shareTitle: string;
  onShareTitleChange: (value: string) => void;
  hostDisplayName: string;
  onHostDisplayNameChange: (value: string) => void;
  hostEmail: string;
  onHostEmailChange: (value: string) => void;
  publicNote: string;
  onPublicNoteChange: (value: string) => void;
  shareDuration: number;
  onShareDurationChange: (value: number) => void;
  bookingBlockMinutes: number;
  onBookingBlockMinutesChange: (value: number) => void;
  bufferMinutes: number;
  onBufferMinutesChange: (value: number) => void;
  maxBookingsPerDay: number;
  onMaxBookingsPerDayChange: (value: number) => void;
  allowRescheduleCancel: boolean;
  onAllowRescheduleCancelChange: (value: boolean) => void;
  rescheduleCancelDeadlineHours: number;
  onRescheduleCancelDeadlineHoursChange: (value: number) => void;
  intakeQuestions: BookingIntakeQuestion[];
  onIntakeQuestionsChange: (value: BookingIntakeQuestion[]) => void;
  generatingLink: boolean;
  onGenerateShareLink: () => void;
  onCopyShareLink: () => void;
  deactivatingLink: boolean;
  onDeactivateShareLink: () => void;
  getShareLinkUrl: () => string;
  onReset?: () => void;
};

const AvailabilityBookingCard = ({
  shareLink,
  shareTitle,
  onShareTitleChange,
  hostDisplayName,
  onHostDisplayNameChange,
  hostEmail,
  onHostEmailChange,
  publicNote,
  onPublicNoteChange,
  shareDuration,
  onShareDurationChange,
  bookingBlockMinutes,
  onBookingBlockMinutesChange,
  bufferMinutes,
  onBufferMinutesChange,
  maxBookingsPerDay,
  onMaxBookingsPerDayChange,
  allowRescheduleCancel,
  onAllowRescheduleCancelChange,
  rescheduleCancelDeadlineHours,
  onRescheduleCancelDeadlineHoursChange,
  intakeQuestions,
  onIntakeQuestionsChange,
  generatingLink,
  onGenerateShareLink,
  onCopyShareLink,
  deactivatingLink,
  onDeactivateShareLink,
  getShareLinkUrl,
  onReset,
}: Props) => {
  const [showConfig, setShowConfig] = useState(false);
  const bookingFormId = useId();

  const updateQuestion = (index: number, updates: Partial<BookingIntakeQuestion>) => {
    onIntakeQuestionsChange(
      intakeQuestions.map((question, idx) =>
        idx === index ? { ...question, ...updates } : question
      )
    );
  };

  return (
    <div className="enterprise-section min-w-0 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <LinkOutlined aria-hidden="true" className="text-gray-500 dark:text-ink-400" />
        <h2 className="text-sm font-semibold text-gray-800 dark:text-ink-50">
          Public Booking Link
        </h2>
      </div>
      <p className="mt-1 break-words text-xs text-gray-500 dark:text-ink-400">
        People can only see and book your available slots. Event and holiday details stay private.
      </p>

      {shareLink ? (
        <div className="mt-4">
          <input
            readOnly
            aria-label="Public booking link"
            value={getShareLinkUrl()}
            className="min-h-11 w-full min-w-0 rounded-lg border border-gray-300 dark:border-white/[0.12] bg-gray-50 dark:bg-ink-900 px-3 py-2 text-sm"
          />
          <p className="mt-3 break-words text-xs text-gray-500 dark:text-ink-400">
            Expires: {new Date(shareLink.expires_at).toLocaleString()}
          </p>
          <p className="mt-1 break-words text-xs text-gray-500 dark:text-ink-400">
            Booking duration: {shareLink.booking_block_minutes} minutes per slot
            {shareLink.buffer_minutes ? ` · ${shareLink.buffer_minutes} min buffer` : ''}
            {shareLink.max_bookings_per_day ? ` · max ${shareLink.max_bookings_per_day}/day` : ''}
            {shareLink.allow_reschedule_cancel ? ' · reschedule/cancel enabled' : ''}
            {shareLink.allow_reschedule_cancel && shareLink.reschedule_cancel_deadline_hours
              ? ` · ${shareLink.reschedule_cancel_deadline_hours}h change cutoff`
              : ''}
          </p>
          {shareLink.intake_questions?.length > 0 && (
            <p className="mt-1 break-words text-xs text-gray-500 dark:text-ink-400">
              Intake questions:{' '}
              {shareLink.intake_questions.map((question) => question.label).join(', ')}
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex min-w-0 flex-col">
              <label htmlFor={`${bookingFormId}-title`} className={bookingFieldLabelClass}>
                Page Title
              </label>
              <input
                id={`${bookingFormId}-title`}
                value={shareTitle}
                onChange={(e) => onShareTitleChange(e.target.value)}
                className={`${bookingFieldClass} border-gray-300 dark:border-white/[0.12]`}
                placeholder="e.g. Book a recruiter screen"
              />
            </div>
            <div className="flex min-w-0 flex-col">
              <label htmlFor={`${bookingFormId}-display-name`} className={bookingFieldLabelClass}>
                Display Name <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input
                id={`${bookingFormId}-display-name`}
                value={hostDisplayName}
                onChange={(e) => onHostDisplayNameChange(e.target.value)}
                className={`${bookingFieldClass} ${
                  !hostDisplayName.trim() && generatingLink
                    ? 'border-red-500'
                    : 'border-gray-300 dark:border-white/[0.12]'
                }`}
                placeholder="e.g. John Smith"
                required
              />
            </div>
            <div className="flex min-w-0 flex-col sm:col-span-2 xl:col-span-1">
              <label htmlFor={`${bookingFormId}-host-email`} className={bookingFieldLabelClass}>
                Host Email <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input
                id={`${bookingFormId}-host-email`}
                type="email"
                value={hostEmail}
                onChange={(e) => onHostEmailChange(e.target.value)}
                className={`${bookingFieldClass} ${
                  !hostEmail.trim() && generatingLink
                    ? 'border-red-500'
                    : 'border-gray-300 dark:border-white/[0.12]'
                }`}
                placeholder="e.g. john.smith@example.com"
                required
              />
            </div>
            <div className="flex min-w-0 flex-col sm:col-span-2 xl:col-span-3">
              <label htmlFor={`${bookingFormId}-public-note`} className={bookingFieldLabelClass}>
                Recruiter-facing Note
              </label>
              <textarea
                id={`${bookingFormId}-public-note`}
                value={publicNote}
                onChange={(e) => onPublicNoteChange(e.target.value)}
                className="min-h-20 min-w-0 rounded-lg border border-gray-300 dark:border-white/[0.12] bg-white dark:bg-ink-900 px-3 py-2 text-sm"
                placeholder="e.g. Please include role, company, and interview format."
              />
            </div>
          </div>

          {showConfig && (
            <div
              id={`${bookingFormId}-config-panel`}
              className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 dark:border-white/[0.07] pt-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              <div className="flex min-w-0 flex-col">
                <label htmlFor={`${bookingFormId}-expires-in`} className={bookingFieldLabelClass}>
                  Expires In
                </label>
                <select
                  id={`${bookingFormId}-expires-in`}
                  value={shareDuration}
                  onChange={(e) => onShareDurationChange(Number(e.target.value))}
                  className={`${bookingFieldClass} border-gray-300 dark:border-white/[0.12]`}
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>
              <div className="flex min-w-0 flex-col">
                <label htmlFor={`${bookingFormId}-duration`} className={bookingFieldLabelClass}>
                  Duration
                </label>
                <select
                  id={`${bookingFormId}-duration`}
                  value={bookingBlockMinutes}
                  onChange={(e) => onBookingBlockMinutesChange(Number(e.target.value))}
                  className={`${bookingFieldClass} border-gray-300 dark:border-white/[0.12]`}
                >
                  <option value={15}>15 min</option>
                  <option value={20}>20 min</option>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                  <option value={90}>90 min</option>
                  <option value={120}>120 min</option>
                </select>
              </div>
              <div className="flex min-w-0 flex-col">
                <label htmlFor={`${bookingFormId}-buffer`} className={bookingFieldLabelClass}>
                  Buffer
                </label>
                <select
                  id={`${bookingFormId}-buffer`}
                  value={bufferMinutes}
                  onChange={(e) => onBufferMinutesChange(Number(e.target.value))}
                  className={`${bookingFieldClass} border-gray-300 dark:border-white/[0.12]`}
                >
                  <option value={0}>No buffer</option>
                  <option value={5}>5 min</option>
                  <option value={10}>10 min</option>
                  <option value={15}>15 min</option>
                  <option value={20}>20 min</option>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                </select>
              </div>
              <div className="flex min-w-0 flex-col">
                <label htmlFor={`${bookingFormId}-daily-limit`} className={bookingFieldLabelClass}>
                  Daily Limit
                </label>
                <select
                  id={`${bookingFormId}-daily-limit`}
                  value={maxBookingsPerDay}
                  onChange={(e) => onMaxBookingsPerDayChange(Number(e.target.value))}
                  className={`${bookingFieldClass} border-gray-300 dark:border-white/[0.12]`}
                >
                  <option value={0}>No limit</option>
                  <option value={1}>Max 1/day</option>
                  <option value={2}>Max 2/day</option>
                  <option value={3}>Max 3/day</option>
                  <option value={4}>Max 4/day</option>
                  <option value={5}>Max 5/day</option>
                  <option value={8}>Max 8/day</option>
                </select>
              </div>
              <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-ink-900 p-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 xl:col-span-4">
                <label className="flex min-w-0 items-center gap-2 text-sm font-medium text-gray-700 dark:text-ink-100">
                  <input
                    type="checkbox"
                    checked={allowRescheduleCancel}
                    onChange={(e) => onAllowRescheduleCancelChange(e.target.checked)}
                    className="h-4 w-4 shrink-0 accent-blue-600"
                  />
                  Allow guests to reschedule or cancel from their booking links
                </label>
                <div className="flex shrink-0 items-center gap-2">
                  <label
                    htmlFor={`${bookingFormId}-change-cutoff`}
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      allowRescheduleCancel
                        ? 'text-gray-500 dark:text-ink-400'
                        : 'text-gray-400 dark:text-ink-500'
                    }`}
                  >
                    Change Cutoff
                  </label>
                  <select
                    id={`${bookingFormId}-change-cutoff`}
                    value={rescheduleCancelDeadlineHours}
                    onChange={(e) => onRescheduleCancelDeadlineHoursChange(Number(e.target.value))}
                    disabled={!allowRescheduleCancel}
                    className={`${bookingFieldClass} border-gray-300 dark:border-white/[0.12] disabled:bg-gray-100 disabled:text-gray-400`}
                  >
                    <option value={0}>No cutoff</option>
                    <option value={2}>2 hours before</option>
                    <option value={6}>6 hours before</option>
                    <option value={12}>12 hours before</option>
                    <option value={24}>24 hours before</option>
                    <option value={48}>48 hours before</option>
                  </select>
                </div>
              </div>
              <div className="min-w-0 sm:col-span-2 xl:col-span-4">
                <div className={bookingFieldLabelClass}>Intake Questions</div>
                {intakeQuestions.length === 0 ? (
                  <p className="mb-2 text-xs text-gray-500 dark:text-ink-400">
                    Optional. Ask for company, role, agenda, phone number, or anything you want
                    before the meeting.
                  </p>
                ) : (
                  <div className="mb-2 space-y-2">
                    {intakeQuestions.map((question, index) => (
                      <div
                        key={question.id}
                        className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center"
                      >
                        <input
                          aria-label={`Question ${index + 1}`}
                          value={question.label}
                          onChange={(e) => updateQuestion(index, { label: e.target.value })}
                          className={`${bookingFieldClass} border-gray-300 dark:border-white/[0.12] sm:flex-1`}
                          placeholder="e.g. Which company is this for?"
                        />
                        <div className="flex shrink-0 items-center gap-2">
                          <label className="flex min-h-11 flex-1 items-center gap-2 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 px-3 text-xs font-semibold text-gray-600 dark:text-ink-200 sm:flex-none">
                            <input
                              type="checkbox"
                              checked={!!question.required}
                              onChange={(e) =>
                                updateQuestion(index, { required: e.target.checked })
                              }
                              className="h-4 w-4 shrink-0 accent-blue-600"
                            />
                            Required
                          </label>
                          <button
                            type="button"
                            aria-label={`Remove question ${index + 1}`}
                            onClick={() =>
                              onIntakeQuestionsChange(
                                intakeQuestions.filter((_, idx) => idx !== index)
                              )
                            }
                            className="min-h-11 shrink-0 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 px-3 text-xs font-semibold text-gray-500 dark:text-ink-400 transition-colors hover:border-red-200 hover:text-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() =>
                    onIntakeQuestionsChange([
                      ...intakeQuestions,
                      { id: `q_${Date.now()}`, label: '', required: false },
                    ])
                  }
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 px-3 text-xs font-semibold text-gray-600 dark:text-ink-200 transition-colors hover:bg-gray-50 hover:text-gray-900"
                >
                  <PlusOutlined aria-hidden="true" />
                  Add question
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 dark:border-white/[0.07] pt-4 sm:flex-row sm:items-center sm:justify-between">
        {!shareLink ? (
          <>
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              aria-expanded={showConfig}
              aria-controls={`${bookingFormId}-config-panel`}
              className={
                showConfig
                  ? `${secondaryButtonClass} border-gray-300 dark:border-white/[0.12] bg-gray-100 dark:bg-ink-800 text-gray-700 dark:text-ink-100`
                  : secondaryButtonClass
              }
            >
              <SettingOutlined
                aria-hidden="true"
                className={`transition-transform duration-300 motion-reduce:transition-none ${
                  showConfig ? 'rotate-90' : ''
                }`}
              />
              {showConfig ? 'Hide Config' : 'Config'}
            </button>
            <button
              type="button"
              onClick={onGenerateShareLink}
              disabled={generatingLink}
              className={primaryButtonClass}
            >
              {generatingLink ? 'Generating...' : 'Generate Link'}
            </button>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="button" onClick={onReset} className={secondaryButtonClass}>
                Create Another
              </button>
              <button
                type="button"
                onClick={onDeactivateShareLink}
                disabled={deactivatingLink}
                className={secondaryButtonClass}
              >
                <StopOutlined aria-hidden="true" />
                {deactivatingLink ? 'Deactivating...' : 'Deactivate'}
              </button>
            </div>
            <button type="button" onClick={onCopyShareLink} className={primaryButtonClass}>
              Copy Link
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AvailabilityBookingCard;

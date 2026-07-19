import { LinkOutlined, SettingOutlined, StopOutlined } from '@ant-design/icons';
import { useId, useState } from 'react';
import type { BookingIntakeQuestion, ShareLink } from '../../../types';

const bookingFieldLabelClass =
  'mb-1 ml-1 text-xs font-semibold uppercase tracking-wide text-gray-500';

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
    <div className="enterprise-section p-4 sm:p-6">
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <LinkOutlined aria-hidden="true" className="text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-800">Public Booking Link</h2>
          </div>
          <p className="text-xs text-gray-500 mb-2">
            People can only see and book your available slots. Event and holiday details stay
            private.
          </p>
          {shareLink ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <input
                  readOnly
                  aria-label="Public booking link"
                  value={getShareLinkUrl()}
                  className="min-h-11 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Expires: {new Date(shareLink.expires_at).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Booking duration: {shareLink.booking_block_minutes} minutes per slot
                {shareLink.buffer_minutes ? ` · ${shareLink.buffer_minutes} min buffer` : ''}
                {shareLink.max_bookings_per_day
                  ? ` · max ${shareLink.max_bookings_per_day}/day`
                  : ''}
                {shareLink.allow_reschedule_cancel ? ' · reschedule/cancel enabled' : ''}
                {shareLink.allow_reschedule_cancel && shareLink.reschedule_cancel_deadline_hours
                  ? ` · ${shareLink.reschedule_cancel_deadline_hours}h change cutoff`
                  : ''}
              </p>
              {shareLink.intake_questions?.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Intake questions:{' '}
                  {shareLink.intake_questions.map((question) => question.label).join(', ')}
                </p>
              )}
            </>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                <div className="flex flex-col">
                  <label htmlFor={`${bookingFormId}-title`} className={bookingFieldLabelClass}>
                    Page Title
                  </label>
                  <input
                    id={`${bookingFormId}-title`}
                    value={shareTitle}
                    onChange={(e) => onShareTitleChange(e.target.value)}
                    className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    placeholder="e.g. Book a recruiter screen"
                  />
                </div>
                <div className="flex flex-col">
                  <label
                    htmlFor={`${bookingFormId}-display-name`}
                    className={bookingFieldLabelClass}
                  >
                    Display Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id={`${bookingFormId}-display-name`}
                    value={hostDisplayName}
                    onChange={(e) => onHostDisplayNameChange(e.target.value)}
                    className={`min-h-11 rounded-lg border bg-white px-3 py-2 text-sm ${
                      !hostDisplayName.trim() && generatingLink
                        ? 'border-red-500'
                        : 'border-gray-300'
                    }`}
                    placeholder="e.g. John"
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label htmlFor={`${bookingFormId}-host-email`} className={bookingFieldLabelClass}>
                    Host Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id={`${bookingFormId}-host-email`}
                    type="email"
                    value={hostEmail}
                    onChange={(e) => onHostEmailChange(e.target.value)}
                    className={`min-h-11 rounded-lg border bg-white px-3 py-2 text-sm ${
                      !hostEmail.trim() && generatingLink ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g. john@example.com"
                    required
                  />
                </div>
                <div className="flex flex-col md:col-span-2 lg:col-span-3">
                  <label
                    htmlFor={`${bookingFormId}-public-note`}
                    className={bookingFieldLabelClass}
                  >
                    Recruiter-facing Note
                  </label>
                  <textarea
                    id={`${bookingFormId}-public-note`}
                    value={publicNote}
                    onChange={(e) => onPublicNoteChange(e.target.value)}
                    className="min-h-20 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    placeholder="e.g. Please include role, company, and interview format."
                  />
                </div>
              </div>

              {showConfig && (
                <div
                  id={`${bookingFormId}-config-panel`}
                  className="animate-in mt-4 grid grid-cols-1 gap-3 border-t border-gray-50 pt-4 duration-200 fade-in slide-in-from-top-1 sm:grid-cols-2 md:grid-cols-4"
                >
                  <div className="flex flex-col">
                    <label
                      htmlFor={`${bookingFormId}-expires-in`}
                      className={bookingFieldLabelClass}
                    >
                      Expires In
                    </label>
                    <select
                      id={`${bookingFormId}-expires-in`}
                      value={shareDuration}
                      onChange={(e) => onShareDurationChange(Number(e.target.value))}
                      className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value={7}>7 days</option>
                      <option value={14}>14 days</option>
                      <option value={30}>30 days</option>
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label htmlFor={`${bookingFormId}-duration`} className={bookingFieldLabelClass}>
                      Duration
                    </label>
                    <select
                      id={`${bookingFormId}-duration`}
                      value={bookingBlockMinutes}
                      onChange={(e) => onBookingBlockMinutesChange(Number(e.target.value))}
                      className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
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
                  <div className="flex flex-col">
                    <label htmlFor={`${bookingFormId}-buffer`} className={bookingFieldLabelClass}>
                      Buffer
                    </label>
                    <select
                      id={`${bookingFormId}-buffer`}
                      value={bufferMinutes}
                      onChange={(e) => onBufferMinutesChange(Number(e.target.value))}
                      className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
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
                  <div className="flex flex-col">
                    <label
                      htmlFor={`${bookingFormId}-daily-limit`}
                      className={bookingFieldLabelClass}
                    >
                      Daily Limit
                    </label>
                    <select
                      id={`${bookingFormId}-daily-limit`}
                      value={maxBookingsPerDay}
                      onChange={(e) => onMaxBookingsPerDayChange(Number(e.target.value))}
                      className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
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
                  <div className="flex flex-col">
                    <label
                      htmlFor={`${bookingFormId}-change-cutoff`}
                      className={bookingFieldLabelClass}
                    >
                      Change Cutoff
                    </label>
                    <select
                      id={`${bookingFormId}-change-cutoff`}
                      value={rescheduleCancelDeadlineHours}
                      onChange={(e) =>
                        onRescheduleCancelDeadlineHoursChange(Number(e.target.value))
                      }
                      disabled={!allowRescheduleCancel}
                      className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      <option value={0}>No cutoff</option>
                      <option value={2}>2 hours before</option>
                      <option value={6}>6 hours before</option>
                      <option value={12}>12 hours before</option>
                      <option value={24}>24 hours before</option>
                      <option value={48}>48 hours before</option>
                    </select>
                  </div>
                  <label className="flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 md:col-span-2">
                    <input
                      type="checkbox"
                      checked={allowRescheduleCancel}
                      onChange={(e) => onAllowRescheduleCancelChange(e.target.checked)}
                    />
                    Allow guests to reschedule or cancel from their booking links
                  </label>
                  <div className="md:col-span-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className={bookingFieldLabelClass}>Intake Questions</div>
                      <button
                        type="button"
                        onClick={() =>
                          onIntakeQuestionsChange([
                            ...intakeQuestions,
                            { id: `q_${Date.now()}`, label: '', required: false },
                          ])
                        }
                        className="min-h-11 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                      >
                        Add question
                      </button>
                    </div>
                    <div className="space-y-2">
                      {intakeQuestions.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-gray-200 bg-white px-3 py-2 text-xs text-gray-500">
                          Optional. Ask for company, role, agenda, phone number, or anything you
                          want before the meeting.
                        </p>
                      ) : (
                        intakeQuestions.map((question, index) => (
                          <div
                            key={question.id}
                            className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
                          >
                            <input
                              aria-label={`Question ${index + 1}`}
                              value={question.label}
                              onChange={(e) => updateQuestion(index, { label: e.target.value })}
                              className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                              placeholder="e.g. Which company is this for?"
                            />
                            <label className="flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600">
                              <input
                                type="checkbox"
                                checked={!!question.required}
                                onChange={(e) =>
                                  updateQuestion(index, { required: e.target.checked })
                                }
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
                              className="min-h-11 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-500 hover:text-red-600"
                            >
                              Remove
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-2 flex w-full flex-col gap-3 sm:mt-4 sm:flex-row lg:mt-8 lg:w-auto">
          {!shareLink ? (
            <>
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                aria-expanded={showConfig}
                aria-controls={`${bookingFormId}-config-panel`}
                className={`min-h-11 px-4 py-2 border text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  showConfig
                    ? 'bg-gray-100 border-gray-300 text-gray-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <SettingOutlined
                  aria-hidden="true"
                  className={
                    showConfig
                      ? 'rotate-90 transition-transform duration-300'
                      : 'transition-transform duration-300'
                  }
                />
                {showConfig ? 'Hide Config' : 'Config'}
              </button>
              <button
                type="button"
                onClick={onGenerateShareLink}
                disabled={generatingLink}
                className="min-h-11 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-70 shadow-sm transition-all active:scale-[0.98]"
              >
                {generatingLink ? 'Generating...' : 'Generate Link'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onCopyShareLink}
                className="min-h-11 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm"
              >
                Copy Link
              </button>
              <button
                type="button"
                onClick={onReset}
                className="min-h-11 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                Create Another
              </button>
              <button
                type="button"
                onClick={onDeactivateShareLink}
                disabled={deactivatingLink}
                className="min-h-11 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                <StopOutlined />
                {deactivatingLink ? 'Deactivating...' : 'Deactivate'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AvailabilityBookingCard;

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  cancelPublicBooking,
  createPublicBooking,
  getPublicBookingDetails,
  getPublicBookingSlots,
  reschedulePublicBooking,
} from '../../api';
import { CalendarOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import { message } from 'antd';
import IdentityAvatar from '../../components/IdentityAvatar';
import { PageState, PanelSkeleton } from '../../components/PageState';
import type {
  BookingDayAvailability,
  BookingIntakeQuestion,
  BookingSlot,
  PublicBooking,
} from '../../types';
import { formatDateOnly, todayDateOnlyLocal } from '../../utils/dateOnly';
import { TIMEZONE_OPTIONS, getBrowserTimeZone, normalizeTimeZone } from '../../lib/timezones';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIELD_CLASS_NAME =
  'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500';
const TEXTAREA_CLASS_NAME = `${FIELD_CLASS_NAME} resize-y py-3 leading-6`;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { error?: unknown } } }).response?.data?.error ===
      'string'
  ) {
    return (error as { response: { data: { error: string } } }).response.data.error;
  }
  return fallback;
};

type StoredGuestBooking = {
  booking_uuid: string;
  email?: string;
  saved_at: string;
};

const guestBookingStorageKey = (shareLinkUuid: string) =>
  `careerhub_public_booking:${shareLinkUuid}`;

const getStoredGuestBooking = (shareLinkUuid?: string): StoredGuestBooking | null => {
  if (!shareLinkUuid) return null;
  try {
    const raw = window.localStorage.getItem(guestBookingStorageKey(shareLinkUuid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredGuestBooking>;
    if (!parsed.booking_uuid) return null;
    return {
      booking_uuid: parsed.booking_uuid,
      email: parsed.email,
      saved_at: parsed.saved_at || new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

const saveGuestBooking = (shareLinkUuid: string | undefined, booking: PublicBooking) => {
  if (!shareLinkUuid) return;
  window.localStorage.setItem(
    guestBookingStorageKey(shareLinkUuid),
    JSON.stringify({
      booking_uuid: booking.uuid,
      email: booking.email,
      saved_at: new Date().toISOString(),
    } satisfies StoredGuestBooking)
  );
};

const clearGuestBooking = (shareLinkUuid?: string) => {
  if (!shareLinkUuid) return;
  window.localStorage.removeItem(guestBookingStorageKey(shareLinkUuid));
};

const PublicBookingPage = () => {
  const { uuid, bookingUuid, action } = useParams<{
    uuid: string;
    bookingUuid?: string;
    action?: string;
  }>();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const manageAction = action === 'reschedule' || action === 'cancel' ? action : null;

  const [title, setTitle] = useState('Book a time');
  const [hostDisplayName, setHostDisplayName] = useState('');
  const [hostEmail, setHostEmail] = useState('');
  const [hostProfilePicture, setHostProfilePicture] = useState<string | null>(null);
  const [publicNote, setPublicNote] = useState('');
  const [bookingBlockMinutes, setBookingBlockMinutes] = useState(30);
  const [allowRescheduleCancel, setAllowRescheduleCancel] = useState(true);
  const [rescheduleCancelDeadlineHours, setRescheduleCancelDeadlineHours] = useState(0);
  const [intakeQuestions, setIntakeQuestions] = useState<BookingIntakeQuestion[]>([]);
  const [timezone, setTimezone] = useState<string>(() => getBrowserTimeZone());
  const [selectedDate, setSelectedDate] = useState<string>(() => todayDateOnlyLocal());
  const [days, setDays] = useState<BookingDayAvailability[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [slotView, setSlotView] = useState<'list' | 'calendar'>('list');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [notes, setNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [intakeAnswers, setIntakeAnswers] = useState<Record<string, string>>({});
  const [managedBooking, setManagedBooking] = useState<PublicBooking | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<PublicBooking | null>(null);
  const [restoredGuestBooking, setRestoredGuestBooking] = useState(false);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const showCurrentBookingOnly = Boolean(
    !manageAction && restoredGuestBooking && managedBooking?.status === 'active'
  );

  const loadSlots = async (anchorDate?: string) => {
    if (!uuid) return;
    setLoading(true);
    try {
      const resp = await getPublicBookingSlots(
        uuid,
        anchorDate || selectedDate,
        timezone,
        bookingUuid
      );
      setTitle(resp.data.title || 'Book a time');
      setHostDisplayName(resp.data.host_display_name || '');
      setHostEmail(resp.data.host_email || '');
      setHostProfilePicture(resp.data.host_profile_picture || null);
      setPublicNote(resp.data.public_note || '');
      setBookingBlockMinutes(resp.data.booking_block_minutes || 30);
      setAllowRescheduleCancel(resp.data.allow_reschedule_cancel);
      setRescheduleCancelDeadlineHours(resp.data.reschedule_cancel_deadline_hours || 0);
      setIntakeQuestions(resp.data.intake_questions || []);
      setDays(resp.data.days || []);
      setLinkInvalid(false);

      const currentDay = resp.data.days?.find(
        (day: BookingDayAvailability) => day.date === (anchorDate || selectedDate)
      );
      if (!currentDay || currentDay.slots.length === 0) {
        const firstAvailable = resp.data.days?.find(
          (day: BookingDayAvailability) => day.slots.length > 0
        );
        if (firstAvailable) {
          setSelectedDate(firstAvailable.date);
        }
      }
    } catch (error) {
      console.error(error);
      setDays([]);
      setLinkInvalid(true);
    } finally {
      setLoading(false);
    }
  };

  const loadManagedBooking = async () => {
    if (!uuid || !bookingUuid || !manageAction) return;
    setLoading(true);
    try {
      const resp = await getPublicBookingDetails(uuid, bookingUuid);
      const booking = resp.data.booking;
      const link = resp.data.share_link;
      setManagedBooking(booking);
      setTitle(link.title || 'Manage booking');
      setHostDisplayName(link.host_display_name || '');
      setHostEmail(link.host_email || '');
      setPublicNote(link.public_note || '');
      setBookingBlockMinutes(link.booking_block_minutes || 30);
      setAllowRescheduleCancel(link.allow_reschedule_cancel);
      setRescheduleCancelDeadlineHours(link.reschedule_cancel_deadline_hours || 0);
      setIntakeQuestions(link.intake_questions || []);
      setTimezone(normalizeTimeZone(booking.timezone));
      setSelectedDate(booking.date);
      setName(booking.name);
      setEmail(booking.email);
      setNotes(booking.notes || '');
      setCancelReason(booking.cancel_reason || '');
      setIntakeAnswers(booking.intake_answers || {});
      if (booking.status === 'active') {
        saveGuestBooking(uuid, booking);
      }
      setLinkInvalid(false);
    } catch (error) {
      console.error(error);
      setLinkInvalid(true);
    } finally {
      setLoading(false);
    }
  };

  const loadStoredGuestBooking = async () => {
    if (!uuid || bookingUuid || manageAction) return;
    const stored = getStoredGuestBooking(uuid);
    if (!stored) return;
    try {
      const resp = await getPublicBookingDetails(uuid, stored.booking_uuid);
      const booking = resp.data.booking;
      const link = resp.data.share_link;
      if (booking.status !== 'active') {
        clearGuestBooking(uuid);
        return;
      }
      setManagedBooking(booking);
      setRestoredGuestBooking(true);
      setTitle(link.title || 'Manage booking');
      setHostDisplayName(link.host_display_name || '');
      setHostEmail(link.host_email || '');
      setPublicNote(link.public_note || '');
      setBookingBlockMinutes(link.booking_block_minutes || 30);
      setAllowRescheduleCancel(link.allow_reschedule_cancel);
      setRescheduleCancelDeadlineHours(link.reschedule_cancel_deadline_hours || 0);
      setIntakeQuestions(link.intake_questions || []);
      setTimezone(normalizeTimeZone(booking.timezone));
      setSelectedDate(booking.date);
      setName(booking.name);
      setEmail(booking.email);
      setNotes(booking.notes || '');
      setCancelReason(booking.cancel_reason || '');
      setIntakeAnswers(booking.intake_answers || {});
    } catch (error) {
      console.error(error);
      clearGuestBooking(uuid);
    }
  };

  useEffect(() => {
    if (manageAction) {
      loadManagedBooking();
      return;
    }
    loadStoredGuestBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uuid, bookingUuid, manageAction]);

  useEffect(() => {
    if (manageAction === 'cancel') return;
    if (showCurrentBookingOnly) return;
    if (manageAction === 'reschedule' && !managedBooking) return;
    loadSlots(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uuid, timezone, manageAction, managedBooking?.uuid, showCurrentBookingOnly]);

  useEffect(() => {
    if (!uuid) return;
    if (days.length === 0) return;
    const existsInLoadedRange = days.some((d) => d.date === selectedDate);
    if (!existsInLoadedRange) {
      loadSlots(selectedDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, days, uuid]);

  const selectedDay = useMemo(
    () => days.find((d) => d.date === selectedDate),
    [days, selectedDate]
  );
  const trimmedEmail = email.trim();
  const emailIsInvalid = Boolean(trimmedEmail) && !EMAIL_PATTERN.test(trimmedEmail);

  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedDate, timezone]);

  const handleBook = async () => {
    if (!uuid) return;
    if (manageAction === 'cancel') {
      if (!bookingUuid) return;
      setSubmitting(true);
      try {
        const resp = await cancelPublicBooking(uuid, bookingUuid, cancelReason);
        setManagedBooking(resp.data.booking);
        clearGuestBooking(uuid);
        messageApi.success('Booking canceled.');
      } catch (error) {
        messageApi.error(getErrorMessage(error, 'Failed to cancel booking.'));
        console.error(error);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!selectedSlot) return;
    if (!manageAction && (!name.trim() || !email.trim())) {
      setEmailTouched(true);
      messageApi.error('Please enter your name and email.');
      return;
    }
    if (!manageAction && emailIsInvalid) {
      setEmailTouched(true);
      messageApi.error('Please enter a valid email address.');
      return;
    }
    for (const question of intakeQuestions) {
      if (question.required && !intakeAnswers[question.id]?.trim()) {
        messageApi.error(`Please answer: ${question.label}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      if (manageAction === 'reschedule' && bookingUuid) {
        const resp = await reschedulePublicBooking(uuid, bookingUuid, {
          date: selectedDate,
          start_time: selectedSlot.start_time,
          end_time: selectedSlot.end_time,
          timezone,
        });
        setManagedBooking(resp.data.booking);
        saveGuestBooking(uuid, resp.data.booking);
        setRestoredGuestBooking(true);
        setSelectedSlot(null);
        messageApi.success('Booking rescheduled.');
        navigate(`/book/${uuid}`, { replace: true });
      } else {
        const resp = await createPublicBooking(uuid, {
          name: name.trim(),
          email: email.trim(),
          notes: notes.trim(),
          date: selectedDate,
          start_time: selectedSlot.start_time,
          end_time: selectedSlot.end_time,
          timezone,
          intake_answers: intakeAnswers,
        });
        saveGuestBooking(uuid, resp.data.booking);
        setConfirmedBooking(resp.data.booking);
        messageApi.success('Booked successfully.');
        setName('');
        setEmail('');
        setNotes('');
        setIntakeAnswers({});
        setSelectedSlot(null);
        loadSlots();
      }
    } catch (error) {
      messageApi.error(
        getErrorMessage(
          error,
          manageAction
            ? 'Failed to update booking. Please refresh and retry.'
            : 'Failed to book slot. Please refresh and retry.'
        )
      );
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const retryPage = () => {
    if (manageAction) {
      void loadManagedBooking();
      return;
    }
    void loadSlots(selectedDate);
  };

  if (linkInvalid) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 pt-16 sm:p-8 sm:pt-20">
        {contextHolder}
        <PageState
          tone="error"
          title="Booking page unavailable"
          description="The link may have expired, or the page may be temporarily unavailable. Try again before requesting a new link."
          actionLabel="Retry booking page"
          onAction={retryPage}
        />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[max(env(safe-area-inset-top),1rem)] selection:bg-blue-100 selection:text-blue-900 sm:p-6 lg:p-10">
      {contextHolder}
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_48px_-42px_rgba(15,23,42,0.55)] sm:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="mb-5 inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                {manageAction === 'reschedule'
                  ? 'Reschedule Booking'
                  : manageAction === 'cancel'
                    ? 'Cancel Booking'
                    : restoredGuestBooking
                      ? 'Your Booking'
                      : 'Booking Invitation'}
              </div>
              <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-4xl">
                {title}
              </h1>
              <p className="max-w-xl text-base leading-7 text-slate-600">
                {restoredGuestBooking
                  ? 'You already have a scheduled time from this browser. You can reschedule or cancel it if needed.'
                  : manageAction === 'cancel'
                    ? 'Review your booking details and cancel if this time no longer works.'
                    : 'Please select a convenient time for our session. All times are automatically adjusted to your local timezone.'}
              </p>
            </div>
            <div className="min-w-0 shrink-0 md:w-[260px]">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-3 text-xs font-medium text-slate-500">Hosted by</div>
                <div className="flex items-center gap-3">
                  <IdentityAvatar
                    imageUrl={hostProfilePicture}
                    name={hostDisplayName || 'CareerHub User'}
                    email={hostEmail}
                    alt={hostDisplayName || 'Host'}
                    size="md"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-base font-bold text-slate-900">
                      {hostDisplayName || 'CareerHub User'}
                    </div>
                    {hostEmail && (
                      <div className="truncate text-xs font-medium text-slate-600">{hostEmail}</div>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4 text-sm font-medium text-slate-700">
                  <span className="inline-flex items-center gap-2">
                    <ClockCircleOutlined className="text-blue-500" />
                    {bookingBlockMinutes} min session
                  </span>
                  {allowRescheduleCancel && rescheduleCancelDeadlineHours > 0 && (
                    <span className="rounded-lg bg-white px-2 py-1 text-xs font-medium text-slate-600">
                      Changes close {rescheduleCancelDeadlineHours}h before start
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          {publicNote && (
            <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-sm leading-6 text-blue-950">
              <div className="mb-1 text-xs font-semibold text-blue-700">Host note</div>
              <p className="m-0">{publicNote}</p>
            </div>
          )}
          {managedBooking && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
              Current booking:{' '}
              <span className="font-bold text-slate-900">{managedBooking.date}</span>{' '}
              {managedBooking.start_time.slice(0, 5)}-{managedBooking.end_time.slice(0, 5)}{' '}
              {managedBooking.timezone}
              {managedBooking.status === 'canceled' && (
                <span className="ml-2 font-bold text-rose-600">Canceled</span>
              )}
              {restoredGuestBooking && managedBooking.status === 'active' && (
                <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold">
                  {managedBooking.ics_url && (
                    <a href={managedBooking.ics_url} className="text-blue-700 underline">
                      Download .ics
                    </a>
                  )}
                  {managedBooking.reschedule_url && (
                    <a href={managedBooking.reschedule_url} className="text-blue-700 underline">
                      Reschedule
                    </a>
                  )}
                  {managedBooking.cancel_url && (
                    <a href={managedBooking.cancel_url} className="text-rose-700 underline">
                      Cancel
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selection & Details Flow */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Left: Date & Time Selection (3 columns) */}
          {showCurrentBookingOnly ? (
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_48px_-42px_rgba(15,23,42,0.55)] sm:p-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="mb-2 text-xs font-medium text-slate-500">Scheduled time</div>
                    <div className="text-xl font-bold text-slate-900 sm:text-2xl">
                      {managedBooking?.date} · {managedBooking?.start_time.slice(0, 5)} -{' '}
                      {managedBooking?.end_time.slice(0, 5)} {managedBooking?.timezone}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-500">
                      {managedBooking?.name} · {managedBooking?.email}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {managedBooking?.ics_url && (
                      <a
                        href={managedBooking.ics_url}
                        className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
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
                        className="inline-flex min-h-11 items-center rounded-xl bg-rose-50 px-5 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        Cancel
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 lg:col-span-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_48px_-42px_rgba(15,23,42,0.55)] sm:p-8">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                    <CalendarOutlined className="text-blue-500" />
                    {manageAction === 'cancel' ? 'Booking Time' : '1. Select Date & Time'}
                  </h2>
                  <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => setSlotView('list')}
                      className={`min-h-11 rounded-lg px-4 text-sm font-semibold transition-colors sm:min-h-9 ${
                        slotView === 'list'
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      aria-pressed={slotView === 'list'}
                    >
                      List
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlotView('calendar')}
                      className={`min-h-11 rounded-lg px-4 text-sm font-semibold transition-colors sm:min-h-9 ${
                        slotView === 'calendar'
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      aria-pressed={slotView === 'calendar'}
                    >
                      Calendar
                    </button>
                  </div>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="booking-date" className="text-sm font-medium text-slate-700">
                      Date
                    </label>
                    <input
                      type="date"
                      id="booking-date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="booking-timezone"
                      className="text-sm font-medium text-slate-700"
                    >
                      Timezone
                    </label>
                    <select
                      value={timezone}
                      id="booking-timezone"
                      onChange={(e) => setTimezone(normalizeTimeZone(e.target.value))}
                      className="min-h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.75rem_center] bg-no-repeat px-4 text-sm font-medium transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      {TIMEZONE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {manageAction === 'cancel' ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                    {managedBooking
                      ? `${managedBooking.date} · ${managedBooking.start_time.slice(0, 5)} - ${managedBooking.end_time.slice(0, 5)} ${managedBooking.timezone}`
                      : 'Loading booking details...'}
                  </div>
                ) : loading && days.length === 0 ? (
                  <PanelSkeleton rows={4} />
                ) : slotView === 'calendar' ? (
                  <div className="space-y-6">
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3 sm:hidden">
                        <span className="text-xs font-medium text-slate-500">Available dates</span>
                        <span className="text-xs font-semibold text-blue-700">Swipe for more</span>
                      </div>
                      <div
                        className="overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                        aria-label="Available booking dates"
                      >
                        <div className="flex min-w-max snap-x snap-mandatory gap-2 sm:grid sm:min-w-0 sm:grid-cols-7">
                          {days.map((day) => {
                            const isSelected = day.date === selectedDate;
                            const hasSlots = day.slots.length > 0;
                            return (
                              <button
                                key={day.date}
                                type="button"
                                onClick={() => hasSlots && setSelectedDate(day.date)}
                                disabled={!hasSlots}
                                className={`flex min-h-16 w-14 snap-start flex-col items-center justify-center rounded-xl border py-3 transition-colors sm:w-auto ${
                                  isSelected
                                    ? 'border-blue-600 bg-blue-600 text-white'
                                    : hasSlots
                                      ? 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                                      : 'cursor-not-allowed border-transparent bg-slate-50 text-slate-400 opacity-60'
                                }`}
                                aria-pressed={isSelected}
                                aria-label={`${day.day_name}, ${formatDateOnly(day.date)}${hasSlots ? '' : ', unavailable'}`}
                              >
                                <span
                                  className={`mb-1 text-xs font-medium ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}
                                >
                                  {day.day_name.slice(0, 3)}
                                </span>
                                <span className="text-sm font-semibold">
                                  {day.date.split('-')[2]}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-slate-200 pt-4">
                      {!selectedDay || selectedDay.slots.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                          <p className="text-sm font-medium text-slate-600">
                            No slots for this date
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {selectedDay.slots.map((slot) => {
                            const active = selectedSlot?.start_time === slot.start_time;
                            return (
                              <button
                                key={slot.start_time}
                                type="button"
                                onClick={() => setSelectedSlot(slot)}
                                className={`min-h-11 rounded-xl border px-4 text-sm font-semibold transition-colors ${
                                  active
                                    ? 'border-blue-600 bg-blue-600 text-white'
                                    : 'border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                                }`}
                                aria-pressed={active}
                              >
                                {slot.label.split(' - ')[0]}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {!selectedDay || selectedDay.slots.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
                        <p className="text-sm font-medium text-slate-600">
                          No available slots for this date
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {selectedDay.slots.map((slot) => {
                          const active = selectedSlot?.start_time === slot.start_time;
                          return (
                            <button
                              key={slot.start_time}
                              type="button"
                              onClick={() => setSelectedSlot(slot)}
                              className={`flex min-h-14 items-center justify-between rounded-xl border px-4 text-left transition-colors ${
                                active
                                  ? 'border-blue-600 bg-blue-600 text-white'
                                  : 'border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                              }`}
                              aria-pressed={active}
                            >
                              <span className="text-sm font-semibold">{slot.label}</span>
                              <ClockCircleOutlined
                                className={active ? 'text-blue-200' : 'text-blue-500'}
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Right: Details Form (2 columns) */}
          {!showCurrentBookingOnly && (
            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_48px_-42px_rgba(15,23,42,0.55)] sm:p-8 lg:sticky lg:top-6">
                <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-900">
                  <UserOutlined className="text-blue-500" />
                  {manageAction ? 'Booking Details' : '2. Your Details'}
                </h2>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <label htmlFor="booking-name" className="text-sm font-medium text-slate-700">
                      Full Name <span className="text-rose-500">*</span>
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
                    <label htmlFor="booking-email" className="text-sm font-medium text-slate-700">
                      Email Address <span className="text-rose-500">*</span>
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
                        !manageAction && emailTouched && emailIsInvalid
                          ? 'booking-email-error'
                          : undefined
                      }
                      className={`${FIELD_CLASS_NAME} ${
                        !manageAction && emailTouched && emailIsInvalid
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                          : ''
                      }`}
                    />
                    {!manageAction && emailTouched && emailIsInvalid && (
                      <p id="booking-email-error" className="text-xs font-medium text-rose-700">
                        Enter a valid email address.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="booking-notes" className="text-sm font-medium text-slate-700">
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
                          className="text-sm font-medium text-slate-700"
                        >
                          {question.label}{' '}
                          {question.required && <span className="text-rose-500">*</span>}
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
                        className="text-sm font-medium text-slate-700"
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
                      <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-blue-700">
                            Confirm This Time
                          </div>
                          <div className="mt-1 text-sm font-semibold text-blue-950">
                            {selectedSlot.label}
                          </div>
                          <div className="mt-1 text-xs text-blue-800">
                            {formatDateOnly(selectedDate)} · {timezone}
                          </div>
                          <div className="mt-1 text-xs leading-5 text-blue-700">
                            Host receives the calendar hold in their saved timezone.
                          </div>
                        </div>
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-white">
                          <ClockCircleOutlined className="text-blue-500" />
                        </div>
                      </div>
                    )}
                    {confirmedBooking && (
                      <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                        <div className="font-semibold">Booking confirmed</div>
                        <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold">
                          {confirmedBooking.ics_url && (
                            <a
                              href={confirmedBooking.ics_url}
                              className="text-emerald-700 underline"
                            >
                              Download .ics
                            </a>
                          )}
                          {confirmedBooking.reschedule_url && (
                            <a
                              href={confirmedBooking.reschedule_url}
                              className="text-emerald-700 underline"
                            >
                              Reschedule
                            </a>
                          )}
                          {confirmedBooking.cancel_url && (
                            <a
                              href={confirmedBooking.cancel_url}
                              className="text-emerald-700 underline"
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
                    <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                      By confirming, the host will receive the booking details and calendar file.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicBookingPage;

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  cancelPublicBooking,
  createPublicBooking,
  getPublicBookingDetails,
  getPublicBookingSlots,
  reschedulePublicBooking,
} from '../../api';
import { message } from 'antd';
import { PageState } from '../../components/PageState';
import type {
  BookingDayAvailability,
  BookingIntakeQuestion,
  BookingSlot,
  PublicBooking,
} from '../../types';
import { todayDateOnlyLocal } from '../../utils/dateOnly';
import { getBrowserTimeZone, normalizeTimeZone } from '../../lib/timezones';

import BookingDetailsForm from './BookingDetailsForm';
import BookingSlotPicker from './BookingSlotPicker';
import CurrentBookingCard from './CurrentBookingCard';
import BookingHeaderCard from './BookingHeaderCard';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
        <BookingHeaderCard
          allowRescheduleCancel={allowRescheduleCancel}
          bookingBlockMinutes={bookingBlockMinutes}
          hostDisplayName={hostDisplayName}
          hostEmail={hostEmail}
          hostProfilePicture={hostProfilePicture}
          manageAction={manageAction}
          managedBooking={managedBooking}
          publicNote={publicNote}
          rescheduleCancelDeadlineHours={rescheduleCancelDeadlineHours}
          restoredGuestBooking={restoredGuestBooking}
          title={title}
        />

        {/* Selection & Details Flow */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Left: Date & Time Selection (3 columns) */}
          {showCurrentBookingOnly ? (
            <CurrentBookingCard
              email={email}
              managedBooking={managedBooking}
              name={name}
              timezone={timezone}
            />
          ) : (
            <BookingSlotPicker
              days={days}
              loading={loading}
              manageAction={manageAction}
              managedBooking={managedBooking}
              selectedDate={selectedDate}
              selectedDay={selectedDay}
              selectedSlot={selectedSlot}
              setSelectedDate={setSelectedDate}
              setSelectedSlot={setSelectedSlot}
              setSlotView={setSlotView}
              setTimezone={setTimezone}
              slotView={slotView}
              timezone={timezone}
            />
          )}

          {/* Right: Details Form (2 columns) */}
          {!showCurrentBookingOnly && (
            <BookingDetailsForm
              intakeAnswers={intakeAnswers}
              setIntakeAnswers={setIntakeAnswers}
              allowRescheduleCancel={allowRescheduleCancel}
              cancelReason={cancelReason}
              confirmedBooking={confirmedBooking}
              email={email}
              emailIsInvalid={emailIsInvalid}
              emailTouched={emailTouched}
              handleBook={handleBook}
              intakeQuestions={intakeQuestions}
              manageAction={manageAction}
              managedBooking={managedBooking}
              name={name}
              notes={notes}
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
              setCancelReason={setCancelReason}
              setEmail={setEmail}
              setEmailTouched={setEmailTouched}
              setName={setName}
              setNotes={setNotes}
              submitting={submitting}
              timezone={timezone}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicBookingPage;

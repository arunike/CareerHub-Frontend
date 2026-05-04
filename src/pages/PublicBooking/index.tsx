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
import type { BookingDayAvailability, BookingIntakeQuestion, BookingSlot, PublicBooking } from '../../types';

const timezones = ['PT', 'MT', 'CT', 'ET'] as const;
type Timezone = (typeof timezones)[number];
type StoredGuestBooking = {
  booking_uuid: string;
  email?: string;
  saved_at: string;
};

const guestBookingStorageKey = (shareLinkUuid: string) => `careerhub_public_booking:${shareLinkUuid}`;

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
    } satisfies StoredGuestBooking),
  );
};

const clearGuestBooking = (shareLinkUuid?: string) => {
  if (!shareLinkUuid) return;
  window.localStorage.removeItem(guestBookingStorageKey(shareLinkUuid));
};

const PublicBookingPage = () => {
  const { uuid, bookingUuid, action } = useParams<{ uuid: string; bookingUuid?: string; action?: string }>();
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
  const [intakeQuestions, setIntakeQuestions] = useState<BookingIntakeQuestion[]>([]);
  const [timezone, setTimezone] = useState<Timezone>('PT');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [days, setDays] = useState<BookingDayAvailability[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [slotView, setSlotView] = useState<'list' | 'calendar'>('list');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [intakeAnswers, setIntakeAnswers] = useState<Record<string, string>>({});
  const [managedBooking, setManagedBooking] = useState<PublicBooking | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<PublicBooking | null>(null);
  const [restoredGuestBooking, setRestoredGuestBooking] = useState(false);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const showCurrentBookingOnly = Boolean(!manageAction && restoredGuestBooking && managedBooking?.status === 'active');

  const loadSlots = async (anchorDate?: string) => {
    if (!uuid) return;
    setLoading(true);
    try {
      const resp = await getPublicBookingSlots(uuid, anchorDate || selectedDate, timezone, bookingUuid);
      setTitle(resp.data.title || 'Book a time');
      setHostDisplayName(resp.data.host_display_name || '');
      setHostEmail(resp.data.host_email || '');
      setHostProfilePicture(resp.data.host_profile_picture || null);
      setPublicNote(resp.data.public_note || '');
      setBookingBlockMinutes(resp.data.booking_block_minutes || 30);
      setAllowRescheduleCancel(resp.data.allow_reschedule_cancel);
      setIntakeQuestions(resp.data.intake_questions || []);
      setDays(resp.data.days || []);
      setLinkInvalid(false);

      const currentDay = resp.data.days?.find((day: BookingDayAvailability) => day.date === (anchorDate || selectedDate));
      if (!currentDay || currentDay.slots.length === 0) {
        const firstAvailable = resp.data.days?.find((day: BookingDayAvailability) => day.slots.length > 0);
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
      setIntakeQuestions(link.intake_questions || []);
      setTimezone((booking.timezone as Timezone) || 'PT');
      setSelectedDate(booking.date);
      setName(booking.name);
      setEmail(booking.email);
      setNotes(booking.notes || '');
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
      setIntakeQuestions(link.intake_questions || []);
      setTimezone((booking.timezone as Timezone) || 'PT');
      setSelectedDate(booking.date);
      setName(booking.name);
      setEmail(booking.email);
      setNotes(booking.notes || '');
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

  const selectedDay = useMemo(() => days.find((d) => d.date === selectedDate), [days, selectedDate]);

  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedDate, timezone]);

  const handleBook = async () => {
    if (!uuid) return;
    if (manageAction === 'cancel') {
      if (!bookingUuid) return;
      setSubmitting(true);
      try {
        const resp = await cancelPublicBooking(uuid, bookingUuid);
        setManagedBooking(resp.data.booking);
        clearGuestBooking(uuid);
        messageApi.success('Booking canceled.');
      } catch (error) {
        messageApi.error('Failed to cancel booking.');
        console.error(error);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!selectedSlot) return;
    if (!manageAction && (!name.trim() || !email.trim())) {
      messageApi.error('Please enter your name and email.');
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
      messageApi.error(manageAction ? 'Failed to update booking. Please refresh and retry.' : 'Failed to book slot. Please refresh and retry.');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (linkInvalid) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
        {contextHolder}
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Link Unavailable</h1>
          <p className="text-gray-600">This link is invalid or expired. Please ask for a new booking link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfcfd] p-4 sm:p-8 lg:p-12 selection:bg-blue-100 selection:text-blue-900">
      {contextHolder}
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Card */}
        <div className="relative overflow-hidden rounded-[32px] bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 sm:p-12">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest mb-6">
                {manageAction === 'reschedule'
                  ? 'Reschedule Booking'
                  : manageAction === 'cancel'
                  ? 'Cancel Booking'
                  : restoredGuestBooking
                  ? 'Your Booking'
                  : 'Booking Invitation'}
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-[1.1] mb-4">
                {title}
              </h1>
              <p className="text-slate-500 text-lg max-w-xl leading-relaxed">
                {restoredGuestBooking
                  ? 'You already have a scheduled time from this browser. You can reschedule or cancel it if needed.'
                  : manageAction === 'cancel'
                  ? 'Review your booking details and cancel if this time no longer works.'
                  : 'Please select a convenient time for our session. All times are automatically adjusted to your local timezone.'}
              </p>
            </div>
            <div className="shrink-0">
              <div className="bg-slate-50 rounded-[24px] p-6 border border-slate-100 min-w-[240px]">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Hosted by</div>
                <div className="flex items-center gap-3">
                  <IdentityAvatar
                    imageUrl={hostProfilePicture}
                    name={hostDisplayName || 'CareerHub User'}
                    email={hostEmail}
                    alt={hostDisplayName || 'Host'}
                    size="md"
                  />
                  <div>
                    <div className="font-bold text-slate-900 text-lg">{hostDisplayName || 'CareerHub User'}</div>
                    {hostEmail && <div className="text-xs text-slate-400 font-medium">{hostEmail}</div>}
                  </div>
                </div>
                <div className="mt-5 pt-5 border-t border-slate-200/60 flex items-center gap-2 text-slate-600 text-sm font-semibold">
                  <ClockCircleOutlined className="text-blue-500" />
                  {bookingBlockMinutes} min session
                </div>
              </div>
            </div>
          </div>
          {publicNote && (
            <div className="mt-10 p-5 rounded-2xl bg-sky-50/50 border border-sky-100 text-slate-700 text-sm leading-relaxed relative">
              <div className="absolute top-0 left-6 -mt-2.5 px-2 bg-sky-100 text-sky-600 text-[9px] font-black uppercase tracking-wider rounded">Note</div>
              {publicNote}
            </div>
          )}
          {managedBooking && (
            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-sm text-slate-600">
              Current booking: <span className="font-bold text-slate-900">{managedBooking.date}</span>{' '}
              {managedBooking.start_time.slice(0, 5)}-{managedBooking.end_time.slice(0, 5)} {managedBooking.timezone}
              {managedBooking.status === 'canceled' && <span className="ml-2 font-bold text-rose-600">Canceled</span>}
              {restoredGuestBooking && managedBooking.status === 'active' && (
                <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold">
                  {managedBooking.ics_url && <a href={managedBooking.ics_url} className="text-blue-700 underline">Download .ics</a>}
                  {managedBooking.reschedule_url && <a href={managedBooking.reschedule_url} className="text-blue-700 underline">Reschedule</a>}
                  {managedBooking.cancel_url && <a href={managedBooking.cancel_url} className="text-rose-700 underline">Cancel</a>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selection & Details Flow */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Date & Time Selection (3 columns) */}
          {showCurrentBookingOnly ? (
            <div className="lg:col-span-5">
              <div className="bg-white rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Scheduled time</div>
                    <div className="text-2xl font-black text-slate-900">
                      {managedBooking?.date} · {managedBooking?.start_time.slice(0, 5)} - {managedBooking?.end_time.slice(0, 5)} {managedBooking?.timezone}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-500">
                      {managedBooking?.name} · {managedBooking?.email}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {managedBooking?.ics_url && (
                      <a
                        href={managedBooking.ics_url}
                        className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 hover:border-blue-200 hover:text-blue-700"
                      >
                        Download .ics
                      </a>
                    )}
                    {managedBooking?.reschedule_url && (
                      <a
                        href={managedBooking.reschedule_url}
                        className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-700"
                      >
                        Reschedule
                      </a>
                    )}
                    {managedBooking?.cancel_url && (
                      <a
                        href={managedBooking.cancel_url}
                        className="rounded-2xl bg-rose-50 px-5 py-3 text-sm font-black text-rose-700 hover:bg-rose-100"
                      >
                        Cancel
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <CalendarOutlined className="text-blue-500" />
                  {manageAction === 'cancel' ? 'Booking Time' : '1. Select Date & Time'}
                </h2>
                <div className="flex gap-1 p-1 rounded-xl bg-slate-50 border border-slate-100">
                  <button
                    onClick={() => setSlotView('list')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                      slotView === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    List
                  </button>
                  <button
                    onClick={() => setSlotView('calendar')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                      slotView === 'calendar' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Calendar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => {
                      const nextTimezone = e.target.value;
                      if (timezones.includes(nextTimezone as Timezone)) {
                        setTimezone(nextTimezone as Timezone);
                      }
                    }}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.75rem_center] bg-no-repeat"
                  >
                    <option value="PT">Pacific Time (PT)</option>
                    <option value="MT">Mountain Time (MT)</option>
                    <option value="CT">Central Time (CT)</option>
                    <option value="ET">Eastern Time (ET)</option>
                  </select>
                </div>
              </div>

              {manageAction === 'cancel' ? (
                <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-6 text-sm font-bold text-slate-700">
                  {managedBooking
                    ? `${managedBooking.date} · ${managedBooking.start_time.slice(0, 5)} - ${managedBooking.end_time.slice(0, 5)} ${managedBooking.timezone}`
                    : 'Loading booking details...'}
                </div>
              ) : loading && days.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-sm font-bold text-slate-400">Loading slots...</p>
                </div>
              ) : slotView === 'calendar' ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-7 gap-2">
                    {days.map((day) => {
                      const isSelected = day.date === selectedDate;
                      const hasSlots = day.slots.length > 0;
                      return (
                        <button
                          key={day.date}
                          onClick={() => hasSlots && setSelectedDate(day.date)}
                          disabled={!hasSlots}
                          className={`flex flex-col items-center py-3 rounded-xl border transition-all ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100 scale-105'
                              : hasSlots
                              ? 'bg-white border-slate-100 text-slate-600 hover:border-blue-200 hover:bg-blue-50/30'
                              : 'bg-slate-50/50 border-transparent text-slate-300 cursor-not-allowed opacity-40'
                          }`}
                        >
                          <span className={`text-[9px] font-black uppercase mb-1 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                            {day.day_name.slice(0, 3)}
                          </span>
                          <span className="text-sm font-black">{day.date.split('-')[2]}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="pt-4 border-t border-slate-50">
                    {!selectedDay || selectedDay.slots.length === 0 ? (
                      <div className="py-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-sm text-slate-400 font-bold">No slots for this date</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {selectedDay.slots.map((slot) => {
                          const active = selectedSlot?.start_time === slot.start_time;
                          return (
                            <button
                              key={slot.start_time}
                              onClick={() => setSelectedSlot(slot)}
                              className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all ${
                                active
                                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100'
                                  : 'bg-white border-slate-100 text-slate-600 hover:border-blue-300'
                              }`}
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
                    <div className="py-16 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                      <p className="text-sm text-slate-400 font-bold">No available slots for this date</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedDay.slots.map((slot) => {
                        const active = selectedSlot?.start_time === slot.start_time;
                        return (
                          <button
                            key={slot.start_time}
                            onClick={() => setSelectedSlot(slot)}
                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                              active
                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100 ring-2 ring-blue-600 ring-offset-2'
                                : 'bg-white border-slate-100 text-slate-600 hover:border-blue-300 hover:bg-slate-50/30'
                            }`}
                          >
                            <span className="text-sm font-black">{slot.label}</span>
                            <ClockCircleOutlined className={active ? 'text-blue-200' : 'text-blue-500'} />
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
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 sticky top-8">
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 mb-8">
                <UserOutlined className="text-blue-500" />
                {manageAction ? 'Booking Details' : '2. Your Details'}
              </h2>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!!manageAction}
                    placeholder="Your Name"
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={!!manageAction}
                    placeholder="your@email.com"
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Additional Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={!!manageAction}
                    placeholder="Anything useful before the meeting..."
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-3.5 text-sm font-semibold min-h-[100px] focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all resize-none"
                  />
                </div>

                {!manageAction && intakeQuestions.map((question) => (
                  <div className="space-y-2" key={question.id}>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      {question.label} {question.required && <span className="text-rose-500">*</span>}
                    </label>
                    <textarea
                      value={intakeAnswers[question.id] || ''}
                      onChange={(e) => setIntakeAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
                      placeholder="Your answer"
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-3.5 text-sm font-semibold min-h-[80px] focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all resize-none"
                    />
                  </div>
                ))}

                <div className="pt-6">
                  {selectedSlot && (
                    <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-between animate-in zoom-in-95 duration-200">
                      <div>
                        <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Selected Slot</div>
                        <div className="text-sm font-black text-blue-700">{selectedSlot.label}</div>
                        <div className="text-[10px] font-bold text-blue-500">{new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <ClockCircleOutlined className="text-blue-500" />
                      </div>
                    </div>
                  )}
                  {confirmedBooking && (
                    <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
                      <div className="font-black">Booking confirmed</div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold">
                        {confirmedBooking.ics_url && <a href={confirmedBooking.ics_url} className="text-emerald-700 underline">Download .ics</a>}
                        {confirmedBooking.reschedule_url && <a href={confirmedBooking.reschedule_url} className="text-emerald-700 underline">Reschedule</a>}
                        {confirmedBooking.cancel_url && <a href={confirmedBooking.cancel_url} className="text-emerald-700 underline">Cancel</a>}
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={handleBook}
                    disabled={(manageAction !== 'cancel' && !selectedSlot) || submitting || managedBooking?.status === 'canceled' || !allowRescheduleCancel}
                    className={`w-full py-4 px-8 text-white text-base font-black rounded-2xl shadow-xl disabled:opacity-40 disabled:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${
                      manageAction === 'cancel'
                        ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200/50'
                        : 'bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 shadow-blue-200/50'
                    }`}
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Confirming...
                      </>
                    ) : (
                      manageAction === 'reschedule' ? 'Confirm New Time' : manageAction === 'cancel' ? 'Cancel Booking' : 'Confirm Booking'
                    )}
                  </button>
                  <p className="mt-4 text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                    By confirming, an invitation will be sent to both parties and added to the host's calendar.
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

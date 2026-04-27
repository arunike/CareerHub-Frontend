import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { createPublicBooking, getPublicBookingSlots } from '../../api';
import { CalendarOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import { message } from 'antd';
import IdentityAvatar from '../../components/IdentityAvatar';
import type { BookingDayAvailability, BookingSlot } from '../../types';

const timezones = ['PT', 'MT', 'CT', 'ET'] as const;
type Timezone = (typeof timezones)[number];

const PublicBookingPage = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const [messageApi, contextHolder] = message.useMessage();

  const [title, setTitle] = useState('Book a time');
  const [hostDisplayName, setHostDisplayName] = useState('');
  const [hostEmail, setHostEmail] = useState('');
  const [hostProfilePicture, setHostProfilePicture] = useState<string | null>(null);
  const [publicNote, setPublicNote] = useState('');
  const [bookingBlockMinutes, setBookingBlockMinutes] = useState(30);
  const [timezone, setTimezone] = useState<Timezone>('PT');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [days, setDays] = useState<BookingDayAvailability[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [slotView, setSlotView] = useState<'list' | 'calendar'>('list');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);

  const loadSlots = async (anchorDate?: string) => {
    if (!uuid) return;
    setLoading(true);
    try {
      const resp = await getPublicBookingSlots(uuid, anchorDate || selectedDate, timezone);
      setTitle(resp.data.title || 'Book a time');
      setHostDisplayName(resp.data.host_display_name || '');
      setHostEmail(resp.data.host_email || '');
      setHostProfilePicture(resp.data.host_profile_picture || null);
      setPublicNote(resp.data.public_note || '');
      setBookingBlockMinutes(resp.data.booking_block_minutes || 30);
      setDays(resp.data.days || []);
      setLinkInvalid(false);

      // Auto-advance to first available date if current one is empty
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

  useEffect(() => {
    loadSlots(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uuid, timezone]);

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
    if (!uuid || !selectedSlot) return;
    if (!name.trim() || !email.trim()) {
      messageApi.error('Please enter your name and email.');
      return;
    }

    setSubmitting(true);
    try {
      await createPublicBooking(uuid, {
        name: name.trim(),
        email: email.trim(),
        notes: notes.trim(),
        date: selectedDate,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        timezone,
      });
      messageApi.success('Booked successfully.');
      setName('');
      setEmail('');
      setNotes('');
      setSelectedSlot(null);
      loadSlots();
    } catch (error) {
      messageApi.error('Failed to book slot. Please refresh and retry.');
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
                Booking Invitation
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-[1.1] mb-4">
                {title}
              </h1>
              <p className="text-slate-500 text-lg max-w-xl leading-relaxed">
                Please select a convenient time for our session. All times are automatically adjusted to your local
                timezone.
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
            <div className="mt-10 p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-slate-700 text-sm leading-relaxed relative">
              <div className="absolute top-0 left-6 -mt-2.5 px-2 bg-indigo-100 text-indigo-600 text-[9px] font-black uppercase tracking-wider rounded">Note</div>
              {publicNote}
            </div>
          )}
        </div>

        {/* Selection & Details Flow */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Date & Time Selection (3 columns) */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <CalendarOutlined className="text-blue-500" />
                  1. Select Date & Time
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

              {loading && days.length === 0 ? (
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

          {/* Right: Details Form (2 columns) */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 sticky top-8">
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 mb-8">
                <UserOutlined className="text-blue-500" />
                2. Your Details
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
                    placeholder="Anything useful before the meeting..."
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-3.5 text-sm font-semibold min-h-[100px] focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all resize-none"
                  />
                </div>

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
                  
                  <button
                    onClick={handleBook}
                    disabled={!selectedSlot || submitting}
                    className="w-full py-4 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-base font-black rounded-2xl shadow-xl shadow-blue-200/50 disabled:opacity-40 disabled:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Confirming...
                      </>
                    ) : (
                      'Confirm Booking'
                    )}
                  </button>
                  <p className="mt-4 text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                    By confirming, an invitation will be sent to both parties and added to the host's calendar.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicBookingPage;

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { createPublicBooking, getPublicBookingSlots } from '../../api';
import { CalendarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { message } from 'antd';
import type { BookingDayAvailability, BookingSlot } from '../../types';
import SegmentedToggle from '../../components/SegmentedToggle';

const PublicBookingPage = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const [messageApi, contextHolder] = message.useMessage();

  const [title, setTitle] = useState('Book a time');
  const [timezone, setTimezone] = useState<'PT' | 'MT' | 'CT' | 'ET'>('PT');
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
      setDays(resp.data.days || []);
      setLinkInvalid(false);
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
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      {contextHolder}
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
          <p className="text-gray-600 text-sm">Choose a date and available slot. You will only see open times.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <div className="relative">
                <CalendarOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value as 'PT' | 'MT' | 'CT' | 'ET')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              >
                <option value="PT">Pacific Time (PT)</option>
                <option value="MT">Mountain Time (MT)</option>
                <option value="CT">Central Time (CT)</option>
                <option value="ET">Eastern Time (ET)</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <p className="text-sm font-medium text-gray-700">Available Slots</p>
              <SegmentedToggle
                value={slotView}
                onChange={setSlotView}
                wrapperClassName="w-full sm:w-auto"
                options={[
                  { value: 'list', label: 'List' },
                  { value: 'calendar', label: 'Calendar' },
                ]}
              />
            </div>
            {loading && days.length === 0 ? (
              <p className="text-sm text-gray-500">Loading slots...</p>
            ) : slotView === 'calendar' ? (
              <div className="space-y-3">
                {loading && days.length > 0 && (
                  <p className="text-xs text-gray-500">Refreshing slots for selected timezone...</p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {days.map((day) => {
                    const isSelected = day.date === selectedDate;
                    const slotCount = day.slots.length;
                    const disabled = slotCount === 0;
                    return (
                      <button
                        key={day.date}
                        type="button"
                        onClick={() => {
                          if (!disabled) setSelectedDate(day.date);
                        }}
                        disabled={disabled}
                        className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                          disabled
                            ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                            : isSelected
                            ? 'border-blue-400 bg-blue-50'
                            : 'border-gray-300 bg-white hover:border-blue-300'
                        }`}
                      >
                        <div className={`text-xs ${disabled ? 'text-gray-400' : 'text-gray-500'}`}>
                          {day.day_name}
                        </div>
                        <div className={`text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-900'}`}>
                          {day.readable_date}
                        </div>
                        <div className={`text-xs mt-1 ${slotCount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {slotCount > 0 ? `${slotCount} slots` : 'No slots'}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {!selectedDay || selectedDay.slots.length === 0 ? (
                  <p className="text-sm text-gray-500">No available slots for this date.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedDay.slots.map((slot) => {
                      const active =
                        selectedSlot?.start_time === slot.start_time &&
                        selectedSlot?.end_time === slot.end_time;
                      return (
                        <button
                          key={`${slot.start_time}-${slot.end_time}`}
                          onClick={() => setSelectedSlot(slot)}
                          className={`rounded-lg border px-3 py-2 text-sm flex items-center gap-2 ${
                            active
                              ? 'bg-blue-50 border-blue-400 text-blue-700'
                              : 'bg-white border-gray-300 text-gray-700 hover:border-blue-300'
                          }`}
                        >
                          <ClockCircleOutlined />
                          {slot.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : !selectedDay || selectedDay.slots.length === 0 ? (
              <p className="text-sm text-gray-500">No available slots for this date.</p>
            ) : (
              <>
                {loading && days.length > 0 && (
                  <p className="text-xs text-gray-500 mb-2">Refreshing slots for selected timezone...</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {selectedDay.slots.map((slot) => {
                    const active =
                      selectedSlot?.start_time === slot.start_time &&
                      selectedSlot?.end_time === slot.end_time;
                    return (
                      <button
                        key={`${slot.start_time}-${slot.end_time}`}
                        onClick={() => setSelectedSlot(slot)}
                        className={`rounded-lg border px-3 py-2 text-sm flex items-center gap-2 ${
                          active
                            ? 'bg-blue-50 border-blue-400 text-blue-700'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-blue-300'
                        }`}
                      >
                        <ClockCircleOutlined />
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Your Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="you@example.com"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-24"
              placeholder="Anything to share before the meeting"
            />
          </div>
          <button
            onClick={handleBook}
            disabled={!selectedSlot || submitting}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-60"
          >
            {submitting ? 'Booking...' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublicBookingPage;

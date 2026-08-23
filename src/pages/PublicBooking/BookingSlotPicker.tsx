import type React from 'react';
import { CalendarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { PanelSkeleton } from '../../components/PageState';
import type { BookingDayAvailability, BookingSlot, PublicBooking } from '../../types';
import { formatDateOnly } from '../../utils/dateOnly';
import { TIMEZONE_OPTIONS, normalizeTimeZone } from '../../lib/timezones';

type Props = {
  days: BookingDayAvailability[];
  loading: boolean;
  manageAction: 'reschedule' | 'cancel' | null;
  managedBooking: PublicBooking | null;
  selectedDate: string;
  selectedDay: BookingDayAvailability | undefined;
  selectedSlot: BookingSlot | null;
  setSelectedDate: React.Dispatch<React.SetStateAction<string>>;
  setSelectedSlot: React.Dispatch<React.SetStateAction<BookingSlot | null>>;
  setSlotView: React.Dispatch<React.SetStateAction<'list' | 'calendar'>>;
  setTimezone: React.Dispatch<React.SetStateAction<string>>;
  slotView: 'list' | 'calendar';
  timezone: string;
};

const BookingSlotPicker = ({
  days,
  loading,
  manageAction,
  managedBooking,
  selectedDate,
  selectedDay,
  selectedSlot,
  setSelectedDate,
  setSelectedSlot,
  setSlotView,
  setTimezone,
  slotView,
  timezone,
}: Props) => (
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
          <label htmlFor="booking-timezone" className="text-sm font-medium text-slate-700">
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
                      <span className="text-sm font-semibold">{day.date.split('-')[2]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-4">
            {!selectedDay || selectedDay.slots.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                <p className="text-sm font-medium text-slate-600">No slots for this date</p>
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
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-600">No available slots for this date</p>
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
);

export default BookingSlotPicker;

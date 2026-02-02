import React, { useState } from 'react';
import { X, Repeat } from 'lucide-react';
import clsx from 'clsx';

interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  count?: number;
  until?: string;
  byweekday?: number[];
}

interface RecurrenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: RecurrenceRule) => void;
  initialRule?: RecurrenceRule;
}

const RecurrenceModal: React.FC<RecurrenceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialRule,
}) => {
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>(
    initialRule?.frequency || 'weekly'
  );
  const [interval, setInterval] = useState(initialRule?.interval || 1);
  const [endType, setEndType] = useState<'never' | 'count' | 'until'>(
    initialRule?.count ? 'count' : initialRule?.until ? 'until' : 'never'
  );
  const [count, setCount] = useState(initialRule?.count || 10);
  const [until, setUntil] = useState(initialRule?.until || '');
  const [selectedDays, setSelectedDays] = useState<number[]>(initialRule?.byweekday || []);

  const weekDays = [
    { label: 'Mon', value: 0 },
    { label: 'Tue', value: 1 },
    { label: 'Wed', value: 2 },
    { label: 'Thu', value: 3 },
    { label: 'Fri', value: 4 },
    { label: 'Sat', value: 5 },
    { label: 'Sun', value: 6 },
  ];

  const handleSave = () => {
    const rule: RecurrenceRule = {
      frequency,
      interval,
    };

    if (endType === 'count') {
      rule.count = count;
    } else if (endType === 'until') {
      rule.until = until;
    }

    if (frequency === 'weekly' && selectedDays.length > 0) {
      rule.byweekday = selectedDays;
    }

    onSave(rule);
    onClose();
  };

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 flex justify-between items-center rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Repeat className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Repeat Event</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition p-1 hover:bg-white/10 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Frequency */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Repeat</label>
            <select
              className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white transition text-gray-900 font-medium"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly')}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          {/* Interval */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Every</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="99"
                className="w-24 rounded-lg border-2 border-gray-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium"
                value={interval}
                onChange={(e) => setInterval(Number(e.target.value))}
              />
              <span className="text-base text-gray-700 font-medium">
                {frequency === 'daily' && (interval === 1 ? 'day' : 'days')}
                {frequency === 'weekly' && (interval === 1 ? 'week' : 'weeks')}
                {frequency === 'monthly' && (interval === 1 ? 'month' : 'months')}
                {frequency === 'yearly' && (interval === 1 ? 'year' : 'years')}
              </span>
            </div>
          </div>

          {/* Days of Week (for weekly) */}
          {frequency === 'weekly' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Repeat on</label>
              <div className="flex gap-2">
                {weekDays.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={clsx(
                      'flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm',
                      selectedDays.includes(day.value)
                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-300 ring-offset-1'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:shadow'
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* End Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Ends</label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition">
                <input
                  type="radio"
                  name="endType"
                  checked={endType === 'never'}
                  onChange={() => setEndType('never')}
                  className="w-4 h-4 text-indigo-600"
                />
                <span className="text-sm font-medium text-gray-700">Never</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition">
                <input
                  type="radio"
                  name="endType"
                  checked={endType === 'count'}
                  onChange={() => setEndType('count')}
                  className="w-4 h-4 text-indigo-600"
                />
                <span className="text-sm font-medium text-gray-700">After</span>
                <input
                  type="number"
                  min="1"
                  max="999"
                  disabled={endType !== 'count'}
                  className="w-20 rounded-lg border-2 border-gray-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-400 font-medium"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  onClick={() => setEndType('count')}
                />
                <span className="text-sm font-medium text-gray-700">occurrences</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition">
                <input
                  type="radio"
                  name="endType"
                  checked={endType === 'until'}
                  onChange={() => setEndType('until')}
                  className="w-4 h-4 text-indigo-600"
                />
                <span className="text-sm font-medium text-gray-700">On</span>
                <input
                  type="date"
                  disabled={endType !== 'until'}
                  className="flex-1 rounded-lg border-2 border-gray-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-400 font-medium"
                  value={until}
                  onChange={(e) => setUntil(e.target.value)}
                  onClick={() => setEndType('until')}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white px-6 py-4 flex gap-3 rounded-b-2xl border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-5 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition font-semibold shadow-lg shadow-indigo-500/30"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecurrenceModal;

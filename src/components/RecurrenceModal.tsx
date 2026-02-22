import React, { useEffect, useState } from 'react';
import { Modal } from 'antd';
import clsx from 'clsx';

import type { RecurrenceRule } from '../types';

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
  const getInitialState = () => ({
    frequency: (initialRule?.frequency || 'weekly') as 'daily' | 'weekly' | 'monthly' | 'yearly',
    interval: String(initialRule?.interval || 1),
    endType: (initialRule?.count ? 'count' : initialRule?.until ? 'until' : 'never') as
      | 'never'
      | 'count'
      | 'until',
    count: String(initialRule?.count || 10),
    until: initialRule?.until || '',
    selectedDays: initialRule?.byweekday || [],
  });

  const initial = getInitialState();
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>(
    initial.frequency
  );
  const [intervalValue, setIntervalValue] = useState(initial.interval);
  const [endType, setEndType] = useState<'never' | 'count' | 'until'>(initial.endType);
  const [countValue, setCountValue] = useState(initial.count);
  const [until, setUntil] = useState(initial.until);
  const [selectedDays, setSelectedDays] = useState<number[]>(initial.selectedDays);

  useEffect(() => {
    if (!isOpen) return;
    const next = getInitialState();
    setFrequency(next.frequency);
    setIntervalValue(next.interval);
    setEndType(next.endType);
    setCountValue(next.count);
    setUntil(next.until);
    setSelectedDays(next.selectedDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialRule]);

  const weekDays = [
    { label: 'Mon', value: 0 },
    { label: 'Tue', value: 1 },
    { label: 'Wed', value: 2 },
    { label: 'Thu', value: 3 },
    { label: 'Fri', value: 4 },
    { label: 'Sat', value: 5 },
    { label: 'Sun', value: 6 },
  ];

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  const handleSave = () => {
    const parsedInterval = Math.max(1, Number(intervalValue) || 1);
    const parsedCount = Math.max(1, Number(countValue) || 1);

    const rule: RecurrenceRule = {
      frequency,
      interval: parsedInterval,
    };

    if (endType === 'count') {
      rule.count = parsedCount;
    } else if (endType === 'until') {
      rule.until = until;
    }

    if (frequency === 'weekly' && selectedDays.length > 0) {
      rule.byweekday = selectedDays;
    }

    onSave(rule);
    onClose();
  };

  return (
    <Modal
      title="Repeat Event"
      open={isOpen}
      onCancel={onClose}
      onOk={handleSave}
      okText="Save"
      cancelText="Cancel"
      zIndex={1200}
      destroyOnClose={false}
      maskClosable={false}
    >
      <div className="space-y-5 pt-1">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Repeat</label>
          <select
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly')}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Every</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="1"
              max="99"
              className="w-24 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={intervalValue}
              onChange={(e) => setIntervalValue(e.target.value)}
            />
            <span className="text-sm text-gray-700">
              {frequency === 'daily' && (Number(intervalValue) === 1 ? 'day' : 'days')}
              {frequency === 'weekly' && (Number(intervalValue) === 1 ? 'week' : 'weeks')}
              {frequency === 'monthly' && (Number(intervalValue) === 1 ? 'month' : 'months')}
              {frequency === 'yearly' && (Number(intervalValue) === 1 ? 'year' : 'years')}
            </span>
          </div>
        </div>

        {frequency === 'weekly' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Repeat on</label>
            <div className="flex gap-2">
              {weekDays.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={clsx(
                    'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
                    selectedDays.includes(day.value)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Ends</label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 px-2 py-1 rounded">
              <input
                type="radio"
                name="endType"
                checked={endType === 'never'}
                onChange={() => setEndType('never')}
              />
              <span className="text-sm text-gray-700">Never</span>
            </label>

            <label className="flex items-center gap-3 px-2 py-1 rounded">
              <input
                type="radio"
                name="endType"
                checked={endType === 'count'}
                onChange={() => setEndType('count')}
              />
              <span className="text-sm text-gray-700">After</span>
              <input
                type="number"
                min="1"
                max="999"
                disabled={endType !== 'count'}
                className="w-20 rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                value={countValue}
                onChange={(e) => setCountValue(e.target.value)}
                onFocus={() => setEndType('count')}
              />
              <span className="text-sm text-gray-700">occurrences</span>
            </label>

            <label className="flex items-center gap-3 px-2 py-1 rounded">
              <input
                type="radio"
                name="endType"
                checked={endType === 'until'}
                onChange={() => setEndType('until')}
              />
              <span className="text-sm text-gray-700">On</span>
              <input
                type="date"
                disabled={endType !== 'until'}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                value={until}
                onChange={(e) => setUntil(e.target.value)}
                onFocus={() => setEndType('until')}
              />
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default RecurrenceModal;

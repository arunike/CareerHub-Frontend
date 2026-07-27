import { useId } from 'react';
import { CalendarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import EditableNumberInput from '../../../components/EditableNumberInput';
import { TIMEZONE_OPTIONS } from '../../../lib/timezones';

type Props = {
  startDate: string;
  onStartDateChange: (value: string) => void;
  timezone: string;
  onTimezoneChange: (value: string) => void;
  availabilityWeeks: number;
  onAvailabilityWeeksChange: (value: number) => void;
  loading: boolean;
  onGenerate: () => void;
};

const AvailabilityGeneratorCard = ({
  startDate,
  onStartDateChange,
  timezone,
  onTimezoneChange,
  availabilityWeeks,
  onAvailabilityWeeksChange,
  loading,
  onGenerate,
}: Props) => {
  const startDateId = useId();
  const timezoneId = useId();
  const rangeId = useId();

  return (
    <div className="enterprise-section p-4 sm:p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(8rem,0.55fr)_auto] xl:items-end">
        <div className="min-w-0">
          <label htmlFor={startDateId} className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <div className="relative min-w-0">
            <CalendarOutlined
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-gray-400"
            />
            <input
              id={startDateId}
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="min-h-11 min-w-0 w-full rounded-lg border border-gray-300 px-3 py-2 pl-10 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="min-w-0">
          <label htmlFor={timezoneId} className="block text-sm font-medium text-gray-700 mb-1">
            Timezone
          </label>
          <div className="relative min-w-0">
            <ClockCircleOutlined
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-gray-400"
            />
            <select
              id={timezoneId}
              value={timezone}
              onChange={(e) => onTimezoneChange(e.target.value)}
              className="min-h-11 min-w-0 w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pl-10 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            >
              {TIMEZONE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="min-w-0">
          <label htmlFor={rangeId} className="block text-sm font-medium text-gray-700 mb-1">
            Range (weeks)
          </label>
          <EditableNumberInput
            id={rangeId}
            min={1}
            step={1}
            value={availabilityWeeks}
            fallbackValue={2}
            onCommit={onAvailabilityWeeksChange}
            className="min-h-11 min-w-0 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="min-w-0 sm:self-end xl:w-auto">
          <button
            onClick={onGenerate}
            disabled={loading}
            className="min-h-11 w-full rounded-lg border border-blue-600 bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_10px_18px_-16px_rgba(49,88,183,0.74)] transition-colors hover:border-blue-700 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 xl:w-auto"
          >
            {loading ? 'Calculating...' : 'Generate Availability'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityGeneratorCard;

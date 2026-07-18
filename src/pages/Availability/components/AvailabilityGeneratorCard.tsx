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
  return (
    <div className="enterprise-section p-6">
      <div className="flex flex-col md:flex-row md:items-end gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <div className="relative">
            <CalendarOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="min-h-11 pl-10 w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
          <div className="relative">
            <ClockCircleOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-gray-400" />
            <select
              value={timezone}
              onChange={(e) => onTimezoneChange(e.target.value)}
              className="min-h-11 pl-10 w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none bg-white"
            >
              {TIMEZONE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Range (weeks)</label>
          <EditableNumberInput
            min={1}
            step={1}
            value={availabilityWeeks}
            fallbackValue={2}
            onCommit={onAvailabilityWeeksChange}
            className="min-h-11 w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
          />
        </div>

        <div className="flex-none w-full md:w-auto">
          <button
            onClick={onGenerate}
            disabled={loading}
            className="min-h-11 w-full rounded-lg border border-blue-600 bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_10px_18px_-16px_rgba(49,88,183,0.74)] transition-colors hover:border-blue-700 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
          >
            {loading ? 'Calculating...' : 'Generate Availability'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityGeneratorCard;

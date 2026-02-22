import { CalendarOutlined, ClockCircleOutlined } from '@ant-design/icons';

type Props = {
  startDate: string;
  onStartDateChange: (value: string) => void;
  timezone: string;
  onTimezoneChange: (value: string) => void;
  loading: boolean;
  onGenerate: () => void;
};

const AvailabilityGeneratorCard = ({
  startDate,
  onStartDateChange,
  timezone,
  onTimezoneChange,
  loading,
  onGenerate,
}: Props) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex flex-col md:flex-row md:items-end gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <div className="relative">
            <CalendarOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="pl-10 w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
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
              className="pl-10 w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none bg-white"
            >
              <option value="PT">Pacific Time (PT)</option>
              <option value="MT">Mountain Time (MT)</option>
              <option value="CT">Central Time (CT)</option>
              <option value="ET">Eastern Time (ET)</option>
            </select>
          </div>
        </div>

        <div className="flex-none w-full md:w-auto">
          <button
            onClick={onGenerate}
            disabled={loading}
            className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Calculating...' : 'Generate Availability'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityGeneratorCard;

import {
  CheckCircleOutlined,
  MenuOutlined,
  ScheduleOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import SegmentedToggle from '../../../components/SegmentedToggle';

type Props = {
  hasData: boolean;
  textMode: 'detailed' | 'combined';
  onTextModeChange: (value: 'detailed' | 'combined') => void;
  copiedIndex: string | null;
  onCopyAll: () => void;
};

const AvailabilityTextControls = ({
  hasData,
  textMode,
  onTextModeChange,
  copiedIndex,
  onCopyAll,
}: Props) => {
  if (!hasData) return null;

  return (
    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 bg-gray-50 dark:bg-ink-900 p-2 rounded-xl border border-gray-100 dark:border-white/[0.07]">
      <SegmentedToggle
        value={textMode}
        onChange={onTextModeChange}
        wrapperClassName="bg-white dark:bg-ink-900 rounded-lg p-1 border border-gray-200 dark:border-white/[0.08] shadow-sm w-full sm:w-auto"
        buttonClassName="flex-1 sm:flex-none px-3 py-1.5"
        options={[
          {
            value: 'combined',
            label: 'Combined',
            icon: <MenuOutlined className="text-base" />,
            activeClassName: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300',
          },
          {
            value: 'detailed',
            label: 'Detailed',
            icon: <UnorderedListOutlined className="text-base" />,
            activeClassName: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300',
          },
        ]}
      />

      <button
        type="button"
        onClick={onCopyAll}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 dark:text-ink-100 transition-colors hover:bg-white hover:text-blue-600 sm:w-auto"
      >
        {copiedIndex === 'ALL' ? (
          <CheckCircleOutlined className="text-base text-green-500 dark:text-green-400" />
        ) : (
          <ScheduleOutlined className="text-base" />
        )}
        Copy Full Schedule
      </button>
    </div>
  );
};

export default AvailabilityTextControls;

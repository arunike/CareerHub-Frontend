import { CalendarOutlined, UnorderedListOutlined } from '@ant-design/icons';
import SegmentedToggle from '../../../components/SegmentedToggle';

type Props = {
  viewTab: 'text' | 'calendar';
  onChange: (next: 'text' | 'calendar') => void;
};

const AvailabilityViewToggle = ({ viewTab, onChange }: Props) => {
  return (
    <div className="w-full md:w-auto">
      <SegmentedToggle
        value={viewTab}
        onChange={onChange}
        wrapperClassName="w-full rounded-xl md:w-auto"
        buttonClassName="min-w-0 flex-1 rounded-lg md:flex-none"
        options={[
          {
            value: 'text',
            label: (
              <>
                <span className="sm:hidden">Text</span>
                <span className="hidden sm:inline">Availability Text</span>
              </>
            ),
            icon: <UnorderedListOutlined className="text-base" />,
            activeClassName: 'bg-white text-blue-600 shadow-sm',
          },
          {
            value: 'calendar',
            label: (
              <>
                <span className="sm:hidden">Calendar</span>
                <span className="hidden sm:inline">Calendar View</span>
              </>
            ),
            icon: <CalendarOutlined className="text-base" />,
            activeClassName: 'bg-white text-blue-600 shadow-sm',
          },
        ]}
      />
    </div>
  );
};

export default AvailabilityViewToggle;

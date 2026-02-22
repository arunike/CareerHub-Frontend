import { CalendarOutlined, UnorderedListOutlined } from '@ant-design/icons';
import SegmentedToggle from '../../../components/SegmentedToggle';

type Props = {
  viewTab: 'text' | 'calendar';
  onChange: (next: 'text' | 'calendar') => void;
};

const AvailabilityViewToggle = ({ viewTab, onChange }: Props) => {
  return (
    <div className="w-full md:w-auto overflow-x-auto">
      <SegmentedToggle
        value={viewTab}
        onChange={onChange}
        wrapperClassName="rounded-xl w-max md:w-auto"
        buttonClassName="rounded-lg"
        options={[
          {
            value: 'text',
            label: 'Availability Text',
            icon: <UnorderedListOutlined className="text-base" />,
            activeClassName: 'bg-white text-blue-600 shadow-sm',
          },
          {
            value: 'calendar',
            label: 'Calendar View',
            icon: <CalendarOutlined className="text-base" />,
            activeClassName: 'bg-white text-blue-600 shadow-sm',
          },
        ]}
      />
    </div>
  );
};

export default AvailabilityViewToggle;

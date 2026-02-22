import { Card, Empty, Space, Tag, Typography } from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  LockOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Event } from '../../../types';
import CategoryBadge from '../../../components/CategoryBadge';
import RowActions from '../../../components/RowActions';

const { Text } = Typography;

type EventsGridProps = {
  loading: boolean;
  events: Event[];
  userTimezone: string;
  onToggleLock: (event: Event) => void;
  onView: (event: Event) => void;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
  formatEventTime: (event: Event, userTimezone: string) => string | null;
};

const EventsGrid = ({
  loading,
  events,
  userTimezone,
  onToggleLock,
  onView,
  onEdit,
  onDelete,
  formatEventTime,
}: EventsGridProps) => {
  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Typography.Text type="secondary">Loading events...</Typography.Text>
      </div>
    );
  }

  if (events.length === 0) {
    return <Empty description="No events found" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
      {events.map((event) => (
        <div key={event.id} style={{ height: '100%' }}>
          <Card
            hoverable
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            bodyStyle={{ flex: 1 }}
            title={
              <Space>
                <Text strong ellipsis style={{ maxWidth: 180 }} title={event.name}>
                  {event.name}
                </Text>
                {event.is_locked && <LockOutlined style={{ color: '#faad14' }} />}
              </Space>
            }
            extra={
              <RowActions
                isLocked={event.is_locked}
                onToggleLock={() => onToggleLock(event)}
                onView={() => onView(event)}
                onEdit={() => onEdit(event)}
                disableEdit={Boolean(event.is_locked)}
                onDelete={() => onDelete(event)}
                disableDelete={Boolean(event.is_locked)}
                confirmDelete={false}
                size="small"
              />
            }
            actions={[
              <Space key="time">
                <ClockCircleOutlined style={{ fontSize: '16px' }} />
                {event.start_time.substring(0, 5)} - {event.end_time.substring(0, 5)}
                {formatEventTime(event, userTimezone)}
              </Space>,
            ]}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                {event.category_details && <CategoryBadge category={event.category_details} size="sm" />}
                {event.location_type !== 'virtual' && (
                  <Tag icon={<EnvironmentOutlined style={{ fontSize: '14px' }} />}>On-site</Tag>
                )}
                {event.location_type === 'virtual' && (
                  <Tag icon={<VideoCameraOutlined style={{ fontSize: '14px' }} />}>Virtual</Tag>
                )}
              </Space>
              <Space>
                <CalendarOutlined style={{ color: '#8c8c8c', fontSize: '16px' }} />
                <Text type="secondary">{dayjs(event.date).format('MMM D, YYYY')}</Text>
              </Space>
              {event.application_details && <Tag color="blue">💼 {event.application_details.company}</Tag>}
            </Space>
          </Card>
        </div>
      ))}
    </div>
  );
};

export default EventsGrid;

import {
  Button,
  Card,
  Dropdown,
  Empty,
  Space,
  Tag,
  Tooltip,
  Typography,
  type MenuProps,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  LockOutlined,
  MoreOutlined,
  UnlockOutlined,
  VideoCameraOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Event } from '../../../types';
import CategoryBadge from '../../../components/CategoryBadge';
import RowActions from '../../../components/RowActions';
import { GridSkeleton } from '../../../components/SkeletonLoader';
import SelectionCheckbox from '../../../components/SelectionCheckbox';

const { Text } = Typography;

type EventsGridProps = {
  loading: boolean;
  events: Event[];
  userTimezone: string;
  onToggleLock: (event: Event) => void;
  onView: (event: Event) => void;
  onEdit: (event: Event) => void;
  onDuplicate?: (event: Event) => void;
  onDelete: (event: Event) => void;
  formatEventTime: (event: Event, userTimezone: string) => string | null;
  selectedIds: number[];
  onSelectChange: (id: number, checked: boolean) => void;
};

const EventsGrid = ({
  loading,
  events,
  userTimezone,
  onToggleLock,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  formatEventTime,
  selectedIds,
  onSelectChange,
}: EventsGridProps) => {
  if (loading) {
    return <GridSkeleton count={4} />;
  }

  if (events.length === 0) {
    return (
      <div className="enterprise-empty px-4 py-12">
        <Empty description="No events found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  }

  const getMobileActionItems = (event: Event): MenuProps['items'] => [
    {
      key: 'lock',
      icon: event.is_locked ? <UnlockOutlined /> : <LockOutlined />,
      label: event.is_locked ? 'Unlock' : 'Lock',
    },
    {
      key: 'view',
      icon: <EyeOutlined />,
      label: 'View',
    },
    ...(event.is_locked
      ? []
      : [
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: 'Edit',
          },
          ...(onDuplicate
            ? [
                {
                  key: 'duplicate',
                  icon: <CopyOutlined />,
                  label: 'Duplicate',
                },
              ]
            : []),
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: 'Delete',
            danger: true,
          },
        ]),
  ];

  const handleMobileAction = (event: Event, actionKey: string) => {
    if (actionKey === 'lock') onToggleLock(event);
    if (actionKey === 'view') onView(event);
    if (actionKey === 'edit' && !event.is_locked) onEdit(event);
    if (actionKey === 'duplicate' && !event.is_locked) onDuplicate?.(event);
    if (actionKey === 'delete' && !event.is_locked) onDelete(event);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
      {events.map((event) => (
        <div key={event.id} style={{ height: '100%' }}>
          <Card
            hoverable
            className="enterprise-card"
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            bodyStyle={{ flex: 1 }}
            title={
              <div className="flex min-w-0 items-center gap-3">
                <SelectionCheckbox
                  selectionLabel={event.name}
                  checked={selectedIds.includes(event.id)}
                  onChange={(e) => onSelectChange(event.id, e.target.checked)}
                />
                <Tooltip title={event.name} mouseEnterDelay={0}>
                  <Text strong ellipsis className="min-w-0 flex-1">
                    {event.name}
                  </Text>
                </Tooltip>
              </div>
            }
            extra={
              <>
                <div className="hidden sm:block">
                  <RowActions
                    isLocked={event.is_locked}
                    onToggleLock={() => onToggleLock(event)}
                    onView={() => onView(event)}
                    onEdit={event.is_locked ? undefined : () => onEdit(event)}
                    onDuplicate={
                      event.is_locked || !onDuplicate ? undefined : () => onDuplicate(event)
                    }
                    onDelete={event.is_locked ? undefined : () => onDelete(event)}
                    confirmDelete={false}
                    size="small"
                  />
                </div>
                <div className="sm:hidden">
                  <Dropdown
                    trigger={['click']}
                    placement="bottomRight"
                    menu={{
                      items: getMobileActionItems(event),
                      onClick: ({ key, domEvent }) => {
                        domEvent.stopPropagation();
                        handleMobileAction(event, key);
                      },
                    }}
                  >
                    <Button
                      type="text"
                      icon={<MoreOutlined />}
                      aria-label={`More actions for ${event.name}`}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Dropdown>
                </div>
              </>
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
                {event.category_details && (
                  <CategoryBadge category={event.category_details} size="sm" />
                )}
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
              {event.application_details && (
                <Tag color="blue">{event.application_details.company}</Tag>
              )}
            </Space>
          </Card>
        </div>
      ))}
    </div>
  );
};

export default EventsGrid;

import { CalendarOutlined, DeleteOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Space, Switch, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import type { Holiday } from '../../../types';

const { Text } = Typography;

export interface FederalHolidayGroup {
  isGroup: true;
  id: string;
  group_id: string;
  items: Holiday[];
  date: string;
  endDate: string;
  description: string;
  holiday_type: 'federal';
  is_ignored: boolean;
}

export type FederalHolidayDisplayItem = Holiday | FederalHolidayGroup;

export const isFederalHolidayGroup = (
  item: FederalHolidayDisplayItem
): item is FederalHolidayGroup => 'isGroup' in item && item.isGroup;

export const groupFederalHolidays = (holidays: Holiday[]): FederalHolidayDisplayItem[] => {
  const displayItems: FederalHolidayDisplayItem[] = [];
  const groupMap = new Map<string, FederalHolidayGroup>();

  holidays.forEach((holiday) => {
    if (!holiday.group_id || holiday.holiday_type !== 'federal') {
      displayItems.push(holiday);
      return;
    }

    let group = groupMap.get(holiday.group_id);
    if (!group) {
      group = {
        isGroup: true,
        id: holiday.group_id,
        group_id: holiday.group_id,
        items: [],
        date: holiday.date,
        endDate: holiday.date,
        description: holiday.description,
        holiday_type: 'federal',
        is_ignored: false,
      };
      groupMap.set(holiday.group_id, group);
      displayItems.push(group);
    }

    group.items.push(holiday);
    group.items.sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
    group.date = group.items[0].date;
    group.endDate = group.items[group.items.length - 1].date;
    group.is_ignored = group.items.every((item) => item.is_ignored);
  });

  return displayItems;
};

interface FederalHolidayCardProps {
  item: FederalHolidayDisplayItem;
  isAdvancedMode: boolean;
  onDeleteHoliday: (id: number) => void;
  onDeleteRange: (group: FederalHolidayGroup) => void;
  onToggleObserved: (holidayName: string, date: string, checked: boolean) => void;
}

const FederalHolidayCard = ({
  item,
  isAdvancedMode,
  onDeleteHoliday,
  onDeleteRange,
  onToggleObserved,
}: FederalHolidayCardProps) => {
  const isGroup = isFederalHolidayGroup(item);
  const isIgnored = Boolean(item.is_ignored);
  const dateLabel = isGroup
    ? `${dayjs(item.date).format('MMM D')} to ${dayjs(item.endDate).format('MMM D, YYYY')}`
    : dayjs(item.date).format('MMMM D, YYYY');
  const dateDetail = isGroup ? `${item.items.length} days` : dayjs(item.date).format('dddd');
  const isCustomFederal = item.holiday_type === 'federal';

  return (
    <div
      className={`flex min-h-[166px] w-full flex-col rounded-xl border p-5 transition-all duration-200 ${
        !isAdvancedMode
          ? 'cursor-default border-gray-200 bg-gray-50 opacity-60 grayscale'
          : isIgnored
            ? 'border-dashed border-gray-300 bg-gray-100 opacity-60 grayscale-[70%]'
            : 'border-blue-100 bg-white shadow-sm hover:border-blue-300 hover:shadow-md'
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              isIgnored
                ? 'bg-gray-200 text-gray-400'
                : isAdvancedMode
                  ? 'bg-blue-50 text-blue-500'
                  : 'bg-gray-100 text-gray-400'
            }`}
          >
            <CalendarOutlined className="text-lg" />
          </div>
          <div className="flex min-w-0 flex-col">
            <Text
              strong
              delete={isIgnored}
              className={`text-base ${isIgnored ? 'text-gray-400' : 'text-gray-800'}`}
            >
              {dateLabel}
            </Text>
            <Text className={`text-xs ${isIgnored ? 'text-gray-400' : 'text-gray-500'}`}>
              {dateDetail}
            </Text>
          </div>
        </div>

        <Space size={4} className="shrink-0">
          <Tag
            className={`m-0 rounded-full px-2.5 py-1 ${
              isIgnored
                ? 'border-gray-300 bg-gray-100 text-gray-500'
                : isAdvancedMode
                  ? 'border-blue-200 bg-blue-50 text-blue-600'
                  : 'border-gray-200 bg-gray-100 text-gray-500'
            }`}
            color={isIgnored || !isAdvancedMode ? 'default' : 'blue'}
          >
            {isIgnored ? 'Ignored' : 'Observed'}
          </Tag>

          {isAdvancedMode && isCustomFederal && (
            <Popconfirm
              title={isGroup ? 'Delete observed holiday range?' : 'Delete observed holiday?'}
              description={
                isGroup ? `This removes all ${item.items.length} days in the range.` : undefined
              }
              onConfirm={() => (isGroup ? onDeleteRange(item) : onDeleteHoliday(item.id))}
              okText={isGroup ? 'Delete range' : 'Delete time off'}
              okType="danger"
              cancelText="Cancel"
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                size="small"
                aria-label={isGroup ? 'Delete observed holiday range' : 'Delete observed holiday'}
              />
            </Popconfirm>
          )}
        </Space>
      </div>

      <div className="mb-4 min-h-10 flex-grow overflow-hidden">
        <Text
          className={`line-clamp-2 text-sm ${
            isIgnored ? 'text-gray-400 line-through' : 'text-gray-600'
          }`}
          title={item.description}
        >
          {item.description}
        </Text>
      </div>

      {isAdvancedMode && (
        <div
          className={`mt-auto flex items-center justify-between border-t pt-4 ${
            isIgnored ? 'border-gray-200' : 'border-blue-50'
          }`}
        >
          <Text className={`text-xs font-medium ${isIgnored ? 'text-gray-400' : 'text-blue-500'}`}>
            Observance Status
          </Text>
          <Switch
            checked={!isIgnored}
            onChange={(checked) => onToggleObserved(item.description, item.date, checked)}
          />
        </div>
      )}
    </div>
  );
};

export default FederalHolidayCard;

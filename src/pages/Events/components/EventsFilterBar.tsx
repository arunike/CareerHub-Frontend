import { Button, Card, Col, DatePicker, Row, Select } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import type { EventCategory } from '../../../types';

const { RangePicker } = DatePicker;

type DateRangeValue = [Dayjs | null, Dayjs | null] | null;

type EventsFilterBarProps = {
  categoryFilter: number | 'ALL';
  onCategoryFilterChange: (value: number | 'ALL') => void;
  dateRange: DateRangeValue;
  onDateRangeChange: (value: DateRangeValue) => void;
  sortBy: 'date' | 'duration';
  onSortByChange: (value: 'date' | 'duration') => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderToggle: () => void;
  categories: EventCategory[];
};

const EventsFilterBar = ({
  categoryFilter,
  onCategoryFilterChange,
  dateRange,
  onDateRangeChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderToggle,
  categories,
}: EventsFilterBarProps) => {
  return (
    <Card bodyStyle={{ padding: '16px' }}>
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} sm={8} md={6}>
          <Select
            style={{ width: '100%' }}
            size="large"
            placeholder="All Categories"
            value={categoryFilter}
            onChange={onCategoryFilterChange}
            options={[
              { value: 'ALL', label: 'All Categories' },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
            allowClear
          />
        </Col>
        <Col xs={24} sm={10} md={8}>
          <RangePicker
            style={{ width: '100%' }}
            size="large"
            value={dateRange}
            onChange={(dates) => onDateRangeChange((dates as DateRangeValue) ?? null)}
          />
        </Col>
        <Col xs={24} sm={6} md={6}>
          <Select
            style={{ width: '100%' }}
            size="large"
            value={sortBy}
            onChange={onSortByChange}
            options={[
              { value: 'date', label: 'Sort by Date' },
              { value: 'duration', label: 'Sort by Duration' },
            ]}
          />
        </Col>
        <Col flex="auto" style={{ textAlign: 'right' }}>
          <Button
            size="large"
            icon={sortOrder === 'asc' ? <FilterOutlined /> : <FilterOutlined rotate={180} />}
            onClick={onSortOrderToggle}
          >
            {sortOrder === 'asc' ? 'Asc' : 'Desc'}
          </Button>
        </Col>
      </Row>
    </Card>
  );
};

export default EventsFilterBar;

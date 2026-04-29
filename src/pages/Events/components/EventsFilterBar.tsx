import { useState } from 'react';
import { Button, Card, Col, DatePicker, Grid, Row, Select } from 'antd';
import { DownOutlined, FilterOutlined, UpOutlined } from '@ant-design/icons';
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
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [expanded, setExpanded] = useState(false);

  if (isMobile) {
    return (
      <Card bodyStyle={{ padding: '16px' }} className="rounded-2xl border-gray-100 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Event Filters</div>
            <div className="mt-1 text-xs text-slate-500">Category, date range, and sorting</div>
          </div>
          <Button
            size="large"
            className="toolbar-native-btn"
            icon={expanded ? <UpOutlined /> : <DownOutlined />}
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? 'Hide' : 'Show'}
          </Button>
        </div>

        {expanded ? (
          <div className="mt-4 grid grid-cols-1 gap-3">
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
            <RangePicker
              style={{ width: '100%' }}
              size="large"
              value={dateRange}
              onChange={(dates) => onDateRangeChange((dates as DateRangeValue) ?? null)}
            />
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
            <Button
              size="large"
              icon={sortOrder === 'asc' ? <FilterOutlined /> : <FilterOutlined rotate={180} />}
              onClick={onSortOrderToggle}
            >
              {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            </Button>
          </div>
        ) : null}
      </Card>
    );
  }

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

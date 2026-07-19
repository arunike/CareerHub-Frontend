import React from 'react';
import { Select } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';

interface YearFilterProps {
  selectedYear: number | 'all';
  onYearChange: (year: number | 'all') => void;
  availableYears: number[];
  ariaLabel?: string;
  currentYear?: number;
  className?: string;
  size?: 'large' | 'middle' | 'small';
  width?: number;
}

const YearFilter: React.FC<YearFilterProps> = ({
  selectedYear,
  onYearChange,
  availableYears,
  ariaLabel = 'Filter by year',
  currentYear = new Date().getFullYear(),
  className,
  size = 'middle',
  width,
}) => {
  const normalizedYears = Array.from(
    new Set([
      currentYear,
      ...(typeof selectedYear === 'number' ? [selectedYear] : []),
      ...availableYears,
    ])
  ).sort((a, b) => b - a);

  const options = [
    {
      value: 'all',
      label: 'All Years',
    },
    ...normalizedYears.map((year) => ({
      value: year,
      label: year === currentYear ? `${year} (Current)` : `${year}`,
    })),
  ];

  return (
    <Select
      aria-label={ariaLabel}
      value={selectedYear}
      onChange={onYearChange}
      options={options}
      className={className}
      size={size}
      style={typeof width === 'number' ? { width } : undefined}
      suffixIcon={<CalendarOutlined />}
    />
  );
};

export default YearFilter;

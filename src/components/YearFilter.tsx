import React from 'react';
import { Select } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';

interface YearFilterProps {
  selectedYear: number | 'all';
  onYearChange: (year: number | 'all') => void;
  availableYears: number[];
  currentYear?: number;
  className?: string;
  size?: 'large' | 'middle' | 'small';
  width?: number;
}

const YearFilter: React.FC<YearFilterProps> = ({
  selectedYear,
  onYearChange,
  availableYears,
  currentYear = new Date().getFullYear(),
  className,
  size = 'middle',
  width = 190,
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
      value={selectedYear}
      onChange={onYearChange}
      options={options}
      className={className}
      size={size}
      style={{ width: '22%', height: '100%', paddingTop: 6, paddingBottom: 6, paddingLeft: 18 }}
      suffixIcon={<CalendarOutlined />}
    />
  );
};

export default YearFilter;

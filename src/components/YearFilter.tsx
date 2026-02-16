import React from 'react';
import { Select } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';

interface YearFilterProps {
  selectedYear: number | 'all';
  onYearChange: (year: number | 'all') => void;
  availableYears: number[];
  currentYear?: number;
}

const YearFilter: React.FC<YearFilterProps> = ({
  selectedYear,
  onYearChange,
  availableYears,
  currentYear = new Date().getFullYear(),
}) => {
  const options = [
    {
      value: 'all',
      label: 'All Years',
    },
    ...availableYears.map(year => ({
      value: year,
      label: year === currentYear ? `${year} (Current)` : `${year}`,
    })),
  ];

  return (
    <Select
      value={selectedYear}
      onChange={onYearChange}
      options={options}
      style={{ width: 150 }}
      suffixIcon={<CalendarOutlined />}
    />
  );
};

export default YearFilter;

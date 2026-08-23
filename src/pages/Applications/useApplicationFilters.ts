import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import type { CareerApplication } from '../../types/application';
import { getAvailableYears, getCurrentYear } from '../../utils/yearFilter';
import { usePersistedState } from '../../hooks/usePersistedState';

// Owns every filter the list is driven by, plus the counts the empty state and the
// "clear filters" affordance read.
export const useApplicationFilters = ({
  applications,
  setSelectedRowKeys,
}: {
  applications: CareerApplication[];
  setSelectedRowKeys: React.Dispatch<React.SetStateAction<React.Key[]>>;
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [empTypeFilter, setEmpTypeFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [isLockedFilter, setIsLockedFilter] = useState<boolean | undefined>(undefined);
  const [selectedYear, setSelectedYear] = usePersistedState<number | 'all'>(
    'applicationsSelectedYear',
    getCurrentYear(),
    {
      serialize: (value) => value.toString(),
      deserialize: (raw) => (raw === 'all' ? 'all' : parseInt(raw)),
    }
  );

  useEffect(() => {
    setCurrentPage(1);
    setSelectedRowKeys([]);
  }, [
    debouncedSearchText,
    statusFilter,
    empTypeFilter,
    locationFilter,
    isLockedFilter,
    selectedYear,
    setSelectedRowKeys,
  ]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchText(searchText.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchText]);

  const availableYears = useMemo(
    () => getAvailableYears(applications, 'date_applied'),
    [applications]
  );

  const handleYearChange = (year: number | 'all') => {
    setSelectedYear(year);
  };

  const activeFilterCount =
    Number(Boolean(searchText)) +
    Number(statusFilter !== 'ALL') +
    Number(empTypeFilter !== 'ALL') +
    Number(locationFilter !== 'ALL') +
    Number(isLockedFilter !== undefined);

  const hasActiveSearchFilters = activeFilterCount > 0;
  const isYearFiltered = selectedYear !== 'all';

  const clearApplicationFilters = () => {
    setSearchText('');
    setDebouncedSearchText('');
    setStatusFilter('ALL');
    setEmpTypeFilter('ALL');
    setLocationFilter('ALL');
    setIsLockedFilter(undefined);
    setCurrentPage(1);
  };

  return {
    currentPage,
    setCurrentPage,
    searchText,
    setSearchText,
    debouncedSearchText,
    statusFilter,
    setStatusFilter,
    empTypeFilter,
    setEmpTypeFilter,
    locationFilter,
    setLocationFilter,
    isLockedFilter,
    setIsLockedFilter,
    selectedYear,
    setSelectedYear,
    availableYears,
    handleYearChange,
    activeFilterCount,
    hasActiveSearchFilters,
    isYearFiltered,
    clearApplicationFilters,
  };
};

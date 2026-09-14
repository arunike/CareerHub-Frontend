import type React from 'react';
import { Button, Input, Select, Typography } from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  GlobalOutlined,
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons';
import type { EmploymentType } from '../../types';

const { Option } = Select;
const { Text } = Typography;

type Props = {
  activeFilterCount: number;
  applicationLoadFailed: boolean;
  applicationsTotal: number;
  clearApplicationFilters: () => void;
  empTypeFilter: string;
  empTypes: EmploymentType[];
  hasActiveSearchFilters: boolean;
  isLockedFilter: boolean | undefined;
  isMobile: unknown;
  locationFilter: string;
  mobileFiltersOpen: boolean;
  searchText: string;
  setEmpTypeFilter: React.Dispatch<React.SetStateAction<string>>;
  setIsLockedFilter: React.Dispatch<React.SetStateAction<boolean | undefined>>;
  setLocationFilter: React.Dispatch<React.SetStateAction<string>>;
  setMobileFiltersOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSearchText: React.Dispatch<React.SetStateAction<string>>;
  setStatusFilter: React.Dispatch<React.SetStateAction<string>>;
  statusFilter: string;
  statusFilterOptions: Array<{ key: string; label: string }>;
};

const ApplicationFilterBar = ({
  activeFilterCount,
  applicationLoadFailed,
  applicationsTotal,
  clearApplicationFilters,
  empTypeFilter,
  empTypes,
  hasActiveSearchFilters,
  isLockedFilter,
  isMobile,
  locationFilter,
  mobileFiltersOpen,
  searchText,
  setEmpTypeFilter,
  setIsLockedFilter,
  setLocationFilter,
  setMobileFiltersOpen,
  setSearchText,
  setStatusFilter,
  statusFilter,
  statusFilterOptions,
}: Props) => (
  <>
    {!applicationLoadFailed &&
      (isMobile ? (
        <div className="mb-4 space-y-3">
          <div className="enterprise-filter-bar p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-ink-50">Filters</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-ink-400">
                  {activeFilterCount > 0
                    ? `${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active`
                    : 'Search, status, and type'}
                </div>
              </div>
              <Button
                size="large"
                className="toolbar-native-btn"
                icon={mobileFiltersOpen ? <UpOutlined /> : <DownOutlined />}
                onClick={() => setMobileFiltersOpen((current) => !current)}
              >
                {mobileFiltersOpen ? 'Hide' : 'Show'}
              </Button>
            </div>

            {mobileFiltersOpen ? (
              <div className="mt-4 grid grid-cols-1 gap-3">
                <Input
                  size="large"
                  aria-label="Search applications by company or role"
                  placeholder="Search company or role"
                  prefix={<SearchOutlined className="text-gray-400 dark:text-ink-500" />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  allowClear
                />
                <Select
                  size="large"
                  aria-label="Filter applications by status"
                  value={statusFilter}
                  onChange={(value) => {
                    setStatusFilter(value);
                    setIsLockedFilter(undefined);
                  }}
                  suffixIcon={<FilterOutlined />}
                >
                  <Option value="ALL">All Statuses</Option>
                  <Option value="INTERVIEWS">All Interviews</Option>
                  {statusFilterOptions.map((stage) => (
                    <Option key={stage.key} value={stage.key}>
                      {stage.label}
                    </Option>
                  ))}
                </Select>
                <Select
                  size="large"
                  aria-label="Filter applications by employment type"
                  value={empTypeFilter}
                  onChange={setEmpTypeFilter}
                  suffixIcon={<FilterOutlined />}
                >
                  <Option value="ALL">All Types</Option>
                  {empTypes.map((t) => (
                    <Option key={t.value} value={t.value}>
                      {t.label}
                    </Option>
                  ))}
                </Select>
                <Input
                  size="large"
                  aria-label="Filter applications by location"
                  placeholder="Location"
                  value={locationFilter === 'ALL' ? '' : locationFilter}
                  onChange={(event) => setLocationFilter(event.target.value || 'ALL')}
                  prefix={<GlobalOutlined className="text-gray-400 dark:text-ink-500" />}
                  allowClear
                />
                <div className="flex items-center justify-between gap-3 pt-2">
                  <Text type="secondary" className="text-sm">
                    {applicationsTotal.toLocaleString()} result
                    {applicationsTotal !== 1 ? 's' : ''}
                  </Text>
                  {hasActiveSearchFilters && (
                    <Button
                      size="small"
                      type="link"
                      onClick={clearApplicationFilters}
                      className="flex items-center gap-1.5 !text-slate-500 dark:!text-ink-400 hover:!text-sky-600 dark:hover:!text-sky-300 !p-0"
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="enterprise-filter-bar mb-4 flex flex-wrap gap-3 p-3">
          <Input
            size="large"
            aria-label="Search applications by company or role"
            placeholder="Search company or role"
            prefix={<SearchOutlined className="text-gray-400 dark:text-ink-500" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ maxWidth: 340 }}
            allowClear
          />
          <Select
            size="large"
            aria-label="Filter applications by status"
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setIsLockedFilter(undefined);
            }}
            style={{ width: 200 }}
            suffixIcon={<FilterOutlined />}
          >
            <Option value="ALL">All Statuses</Option>
            <Option value="INTERVIEWS">All Interviews</Option>
            {statusFilterOptions.map((stage) => (
              <Option key={stage.key} value={stage.key}>
                {stage.label}
              </Option>
            ))}
          </Select>
          <Select
            size="large"
            aria-label="Filter applications by employment type"
            value={empTypeFilter}
            onChange={setEmpTypeFilter}
            style={{ width: 180 }}
            suffixIcon={<FilterOutlined />}
          >
            <Option value="ALL">All Types</Option>
            {empTypes.map((t) => (
              <Option key={t.value} value={t.value}>
                {t.label}
              </Option>
            ))}
          </Select>
          <Input
            size="large"
            aria-label="Filter applications by location"
            placeholder="Location"
            value={locationFilter === 'ALL' ? '' : locationFilter}
            style={{ width: 200 }}
            onChange={(event) => setLocationFilter(event.target.value || 'ALL')}
            prefix={<GlobalOutlined className="text-gray-400 dark:text-ink-500" />}
            allowClear
          />
          {(searchText ||
            statusFilter !== 'ALL' ||
            empTypeFilter !== 'ALL' ||
            locationFilter !== 'ALL' ||
            isLockedFilter !== undefined) && (
            <div className="flex items-center gap-3 self-center">
              <Text type="secondary" className="text-sm">
                {applicationsTotal.toLocaleString()} result{applicationsTotal !== 1 ? 's' : ''}
              </Text>
              <Button
                size="small"
                type="link"
                onClick={clearApplicationFilters}
                className="flex items-center gap-1.5 !text-slate-500 dark:!text-ink-400 hover:!text-sky-600 dark:hover:!text-sky-300 !p-0"
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
      ))}
  </>
);

export default ApplicationFilterBar;

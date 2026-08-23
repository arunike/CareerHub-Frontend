import type React from 'react';
import { List, Button, Card, Tag, Popconfirm, Select, Tooltip } from 'antd';
import {
  DeleteOutlined,
  LockOutlined,
  SyncOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  UnlockOutlined,
  EditOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Holiday } from '../../types';
import BulkActionHeader from '../../components/BulkActionHeader';
import { ListSkeleton } from '../../components/SkeletonLoader';
import RowActions from '../../components/RowActions';
import { PageState } from '../../components/PageState';
import SelectionCheckbox from '../../components/SelectionCheckbox';
import { GroupedHolidayItem } from './GroupedHolidayItem';

type Props = {
  tabLabel: string;
  selectedYear: number | 'all';
  setSelectedYear: (year: number | 'all') => void;
  activeTabHolidays: Holiday[];
  fetchData: () => void;
  onDeleteAllUnlocked: () => void;
  groupedHolidays: any[];
  handleBulkDelete: () => void;
  handleBulkEditClick: () => void;
  handleBulkToggleLock: (lock: boolean) => void;
  handleDelete: (id: number) => void;
  handleDeleteGroup: (groupItem: any) => void;
  handleDuplicateHoliday: (item: any) => void;
  handleEditClick: (item: any) => void;
  handleSelectAll: (checked: boolean) => void;
  handleSelectChange: (id: number, checked: boolean) => void;
  handleSelectGroup: (items: any[], checked: boolean) => void;
  handleToggleLockGroup: (groupItem: any) => void;
  isAnySelectedLocked: boolean;
  loading: boolean;
  selectedIds: number[];
  setSelectedIds: React.Dispatch<React.SetStateAction<number[]>>;
  setSortBy: React.Dispatch<React.SetStateAction<'date' | 'name'>>;
  setSortOrder: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>;
  sortBy: 'date' | 'name';
  sortOrder: 'asc' | 'desc';
  sortedHolidays: Holiday[];
  toggleLock: (holiday: Holiday) => void;
};

const HolidayListCard = ({
  activeTabHolidays,
  onDeleteAllUnlocked,
  groupedHolidays,
  handleBulkDelete,
  handleBulkEditClick,
  handleBulkToggleLock,
  handleDelete,
  handleDeleteGroup,
  handleDuplicateHoliday,
  handleEditClick,
  handleSelectAll,
  handleSelectChange,
  handleSelectGroup,
  handleToggleLockGroup,
  isAnySelectedLocked,
  loading,
  selectedIds,
  setSelectedIds,
  setSortBy,
  setSortOrder,
  sortBy,
  sortOrder,
  sortedHolidays,
  toggleLock,
  tabLabel,
  selectedYear,
  setSelectedYear,
}: Props) => (
  <Card
    className="holiday-list-card"
    title={
      <BulkActionHeader
        className="holiday-list-header"
        selectedCount={selectedIds.length}
        totalCount={sortedHolidays.length}
        onSelectAll={handleSelectAll}
        onCancelSelection={() => setSelectedIds([])}
        title={`${tabLabel} (${activeTabHolidays.length})`}
        bulkActions={
          <>
            <Button onClick={() => handleBulkToggleLock(true)} icon={<LockOutlined />}>
              Lock
            </Button>
            <Button onClick={() => handleBulkToggleLock(false)} icon={<UnlockOutlined />}>
              Unlock
            </Button>
            <Button onClick={handleBulkEditClick} icon={<EditOutlined />}>
              Edit
            </Button>
            <Tooltip
              title={isAnySelectedLocked ? 'Cannot delete while locked items are selected' : ''}
            >
              <Button
                danger
                onClick={handleBulkDelete}
                icon={<DeleteOutlined />}
                disabled={isAnySelectedLocked}
              >
                Delete
              </Button>
            </Tooltip>
          </>
        }
        defaultActions={
          <div className="holiday-list-toolbar">
            <Select
              className="holiday-sort-select"
              aria-label="Sort holidays by"
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: 'date', label: 'By Date' },
                { value: 'name', label: 'By Name' },
              ]}
              style={{ width: 120 }}
            />
            <Button
              className="holiday-sort-direction"
              aria-label={`Sort holidays ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
              icon={sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            />
            <Popconfirm
              title="Delete All Unlocked?"
              description={`This will delete all unlocked holidays in "${tabLabel}". This cannot be undone.`}
              okText="Delete All"
              okType="danger"
              onConfirm={onDeleteAllUnlocked}
              disabled={activeTabHolidays.length === 0}
            >
              <Button
                className="holiday-delete-all"
                danger
                disabled={activeTabHolidays.length === 0}
                icon={<DeleteOutlined />}
              >
                Delete All
              </Button>
            </Popconfirm>
          </div>
        }
      />
    }
  >
    {loading ? (
      <ListSkeleton count={4} />
    ) : (
      <List
        itemLayout="horizontal"
        dataSource={groupedHolidays}
        renderItem={(item) => {
          if (item.isGroup) {
            return (
              <GroupedHolidayItem
                key={`group-${item.id}`}
                item={item}
                handleToggleLockGroup={handleToggleLockGroup}
                handleDeleteGroup={handleDeleteGroup}
                toggleLock={toggleLock}
                handleDelete={handleDelete}
                handleEditItem={handleEditClick}
                handleDuplicateHoliday={handleDuplicateHoliday}
                selectedIds={selectedIds}
                onSelectChange={handleSelectChange}
                onSelectGroup={handleSelectGroup}
              />
            );
          }

          const titleText = item.description || 'Time off';
          const itemDayjs = dayjs(item.date);
          const monthText = itemDayjs.format('MMM').toUpperCase();
          const dayText = itemDayjs.format('DD');
          const formattedDate = itemDayjs.format('MMM D, YYYY');

          return (
            <List.Item key={`item-${item.id}`} className="holiday-list-item">
              <div className="group w-full rounded-xl border border-slate-200/80 bg-white px-5 py-4 sm:px-6 shadow-2xs transition-all duration-200 hover:border-red-200 hover:shadow-xs">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <SelectionCheckbox
                      selectionLabel={`${titleText} on ${itemDayjs.format('MMMM D, YYYY')}`}
                      checked={selectedIds.includes(item.id)}
                      onChange={(e) => handleSelectChange(item.id, e.target.checked)}
                    />

                    {/* Unified Red Mini Calendar Tile */}
                    <div className="flex shrink-0 flex-col items-center overflow-hidden rounded-xl border border-red-200/80 bg-white shadow-2xs">
                      <div className="w-full bg-gradient-to-r from-red-500 via-rose-500 to-red-600 px-2.5 py-0.5 text-center">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-white">
                          {monthText}
                        </span>
                      </div>
                      <div className="flex flex-1 items-center justify-center px-3 py-1.5 min-w-[42px]">
                        <span className="font-extrabold text-slate-800 text-sm tracking-tight whitespace-nowrap">
                          {dayText}
                        </span>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900 text-base sm:text-lg leading-tight truncate">
                          {titleText}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-medium text-slate-600">{formattedDate}</span>

                        {item.is_recurring && (
                          <Tag
                            color="blue"
                            icon={<SyncOutlined />}
                            className="m-0 rounded border-sky-200 bg-sky-50 text-sky-700 text-xs font-medium px-1.5 py-0"
                          >
                            Yearly
                          </Tag>
                        )}

                        {item.is_locked && (
                          <Tag
                            color="gold"
                            icon={<LockOutlined />}
                            className="m-0 rounded border-amber-200 bg-amber-50 text-amber-700 text-xs font-medium px-1.5 py-0"
                          >
                            Locked
                          </Tag>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="holiday-item-actions flex shrink-0 items-center justify-end">
                    <div className="rounded-lg border border-slate-200/60 bg-slate-50/60 p-0.5">
                      <RowActions
                        key={`actions-${item.id}`}
                        size="middle"
                        isLocked={item.is_locked}
                        onToggleLock={() => toggleLock(item)}
                        onEdit={() => handleEditClick(item)}
                        onDuplicate={() => handleDuplicateHoliday(item)}
                        onDelete={() => handleDelete(item.id)}
                        disableDelete={item.is_locked}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </List.Item>
          );
        }}
        locale={{
          emptyText: (
            <PageState
              title={selectedYear === 'all' ? 'No time off yet' : `No time off in ${selectedYear}`}
              description={
                selectedYear === 'all'
                  ? 'Add time off using the form above.'
                  : 'Add one above or show all years to review older entries.'
              }
              actionLabel={selectedYear === 'all' ? undefined : 'Show all years'}
              onAction={selectedYear === 'all' ? undefined : () => setSelectedYear('all')}
            />
          ),
        }}
      />
    )}
  </Card>
);

export default HolidayListCard;

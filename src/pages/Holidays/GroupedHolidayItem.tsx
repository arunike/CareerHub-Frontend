import { useState } from 'react';
import { List, Button, Tag } from 'antd';
import { LockOutlined, SyncOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import RowActions from '../../components/RowActions';
import SelectionCheckbox from '../../components/SelectionCheckbox';

export const GroupedHolidayItem = ({
  item,
  handleToggleLockGroup,
  handleDeleteGroup,
  toggleLock,
  handleDelete,
  handleEditItem,
  handleDuplicateHoliday,
  selectedIds,
  onSelectChange,
  onSelectGroup,
}: any) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const startDate = item.items[0].date;
  const endDate = item.items[item.items.length - 1].date;

  const allSelected = item.items.every((i: any) => selectedIds.includes(i.id));
  const someSelected = item.items.some((i: any) => selectedIds.includes(i.id)) && !allSelected;

  const titleText = item.description || 'Time Off Range';
  const startDayjs = dayjs(startDate);
  const endDayjs = dayjs(endDate);
  const formattedRange = `${startDayjs.format('MMM D')} – ${endDayjs.format('MMM D, YYYY')}`;

  return (
    <List.Item key={`group-item-${item.id}`} className="holiday-list-item">
      <div className="group w-full rounded-xl border border-slate-200/80 bg-white px-5 py-4 sm:px-6 shadow-2xs transition-all duration-200 hover:border-red-200 hover:shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <SelectionCheckbox
              selectionLabel={`${titleText} from ${startDayjs.format('MMMM D, YYYY')} to ${endDayjs.format('MMMM D, YYYY')}`}
              checked={allSelected}
              indeterminate={someSelected}
              onChange={() => onSelectGroup(item.items, !allSelected)}
            />

            {/* Calendar Tile for Range */}
            {(() => {
              const isSameMonth =
                startDayjs.isSame(endDayjs, 'month') && startDayjs.isSame(endDayjs, 'year');
              const isSameDay = isSameMonth && startDayjs.isSame(endDayjs, 'day');

              if (isSameDay) {
                return (
                  <div className="flex h-[52px] w-12 shrink-0 flex-col items-center overflow-hidden rounded-xl border border-red-200/80 bg-white shadow-2xs">
                    <div className="flex h-[18px] w-full items-center justify-center bg-gradient-to-r from-red-500 via-rose-500 to-red-600">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-white">
                        {startDayjs.format('MMM')}
                      </span>
                    </div>
                    <div className="flex flex-1 items-center justify-center">
                      <span className="text-sm font-extrabold tracking-tight text-slate-800 whitespace-nowrap">
                        {startDayjs.format('DD')}
                      </span>
                    </div>
                  </div>
                );
              }

              if (isSameMonth) {
                return (
                  <div className="flex h-[52px] w-[76px] shrink-0 flex-col items-center overflow-hidden rounded-xl border border-red-200/80 bg-white shadow-2xs">
                    <div className="flex h-[18px] w-full items-center justify-center bg-gradient-to-r from-red-500 via-rose-500 to-red-600">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-white">
                        {startDayjs.format('MMM')}
                      </span>
                    </div>
                    <div className="flex flex-1 items-center justify-center">
                      <span className="text-xs font-extrabold tracking-tight text-slate-800 whitespace-nowrap">
                        {startDayjs.format('D')} – {endDayjs.format('D')}
                      </span>
                    </div>
                  </div>
                );
              }

              return (
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex h-[52px] w-12 shrink-0 flex-col items-center overflow-hidden rounded-xl border border-red-200/80 bg-white shadow-2xs">
                    <div className="flex h-[18px] w-full items-center justify-center bg-gradient-to-r from-red-500 via-rose-500 to-red-600">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-white">
                        {startDayjs.format('MMM')}
                      </span>
                    </div>
                    <div className="flex flex-1 items-center justify-center">
                      <span className="text-sm font-extrabold tracking-tight text-slate-800 whitespace-nowrap">
                        {startDayjs.format('DD')}
                      </span>
                    </div>
                  </div>
                  <span className="text-slate-400 font-bold text-xs px-0.5">→</span>
                  <div className="flex h-[52px] w-12 shrink-0 flex-col items-center overflow-hidden rounded-xl border border-red-200/80 bg-white shadow-2xs">
                    <div className="flex h-[18px] w-full items-center justify-center bg-gradient-to-r from-red-500 via-rose-500 to-red-600">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-white">
                        {endDayjs.format('MMM')}
                      </span>
                    </div>
                    <div className="flex flex-1 items-center justify-center">
                      <span className="text-sm font-extrabold tracking-tight text-slate-800 whitespace-nowrap">
                        {endDayjs.format('DD')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-900 text-base sm:text-lg leading-tight truncate">
                  {titleText}
                </span>
                <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                  {item.items.length} Days
                </span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-medium text-slate-600">{formattedRange}</span>

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

          <div className="holiday-item-actions flex shrink-0 items-center justify-end gap-2">
            <Button
              type="text"
              size="small"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-medium text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg px-2.5 py-1 flex items-center gap-1"
            >
              {isExpanded ? 'Hide Days ▲' : `View Days (${item.items.length}) ▼`}
            </Button>
            <div className="rounded-lg border border-slate-200/60 bg-slate-50/60 p-0.5">
              <RowActions
                key={`actions-group-${item.id}`}
                size="middle"
                isLocked={item.is_locked}
                onToggleLock={() => handleToggleLockGroup(item)}
                onEdit={() => handleEditItem(item)}
                onDuplicate={() => handleDuplicateHoliday(item)}
                onDelete={() => handleDeleteGroup(item)}
                disableDelete={item.is_locked}
              />
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5">
            <div className="text-xs font-semibold text-slate-500 px-1">Individual Days:</div>
            <div className="space-y-1.5 pl-3 border-l-2 border-indigo-200">
              {item.items.map((subItem: any) => (
                <div
                  key={`sub-${subItem.id}`}
                  className="flex items-center justify-between rounded-lg bg-slate-50/80 px-3 py-2 border border-slate-200/50 hover:border-indigo-300 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <SelectionCheckbox
                      selectionLabel={`holiday on ${dayjs(subItem.date).format('MMMM D, YYYY')}`}
                      checked={selectedIds.includes(subItem.id)}
                      onChange={(e) => onSelectChange(subItem.id, e.target.checked)}
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      {dayjs(subItem.date).format('dddd, MMMM D, YYYY')}
                    </span>
                  </div>
                  <RowActions
                    key={`actions-${subItem.id}`}
                    size="small"
                    isLocked={subItem.is_locked}
                    onToggleLock={() => toggleLock(subItem)}
                    onEdit={() => handleEditItem(subItem)}
                    onDuplicate={() => handleDuplicateHoliday(subItem)}
                    onDelete={() => handleDelete(subItem.id)}
                    disableDelete={subItem.is_locked}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </List.Item>
  );
};

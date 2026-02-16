import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAvailability, getEvents, getHolidays, getFederalHolidays } from '../../api';
import type { Availability as AvailabilityType, Event, Holiday } from '../../types';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  UnorderedListOutlined,
  MenuOutlined,
  ScheduleOutlined,
  EditOutlined,
} from '@ant-design/icons';
import clsx from 'clsx';
import { format, parseISO, isSameWeek, addWeeks, isSameMonth } from 'date-fns';
import CalendarView from '../../components/CalendarView';
import { useToast } from '../../context/ToastContext';
import EmptyState from '../../components/EmptyState';

const Availability = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const viewTab = searchParams.get('view') === 'calendar' ? 'calendar' : 'text';
  
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AvailabilityType[]>([]);
  const [timezone, setTimezone] = useState('PT');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const [textMode, setTextMode] = useState<'detailed' | 'combined'>('detailed');

  const [events, setEvents] = useState<Event[]>([]);
  const [customHolidays, setCustomHolidays] = useState<Holiday[]>([]);
  const [federalHolidays, setFederalHolidays] = useState<Holiday[]>([]);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const resp = await getAvailability(startDate, timezone);
      setData(resp.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarData = async () => {
    try {
      const [eventsResp, holidaysResp, fedResp] = await Promise.all([
        getEvents(),
        getHolidays(),
        getFederalHolidays(),
      ]);
      setEvents(eventsResp.data);
      setCustomHolidays(holidaysResp.data);
      setFederalHolidays(fedResp.data);
    } catch (err) {
      console.error('Failed to fetch calendar data', err);
    }
  };

  useEffect(() => {
    fetchAvailability();
    fetchCalendarData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // --- Grouping Logic ---
  const groupedData = useMemo(() => {
    if (!data.length) return [];

    const start = parseISO(startDate);

    // Define buckets
    const groups: { title: string; items: AvailabilityType[] }[] = [
      { title: 'This Week', items: [] },
      { title: 'Next Week', items: [] },
      { title: 'The Following Week', items: [] },
    ];

    data.forEach((item) => {
      const itemDate = parseISO(item.date);

      if (isSameWeek(itemDate, start, { weekStartsOn: 1 })) {
        // Assuming Monday start
        groups[0].items.push(item);
      } else if (isSameWeek(itemDate, addWeeks(start, 1), { weekStartsOn: 1 })) {
        groups[1].items.push(item);
      } else if (isSameWeek(itemDate, addWeeks(start, 2), { weekStartsOn: 1 })) {
        groups[2].items.push(item);
      } else {
        // Fallback
        let lastGroup = groups.find((g) => g.title === 'Later');
        if (!lastGroup) {
          lastGroup = { title: 'Later', items: [] };
          groups.push(lastGroup);
        }
        lastGroup.items.push(item);
      }
    });

    return groups.filter((g) => g.items.length > 0);
  }, [data, startDate]);

  // Condensing Logic
  const processGroupItems = (items: AvailabilityType[]) => {
    if (textMode === 'detailed')
      return items.map((item) => ({
        ...item,
        displayDate: `${item.day_name}, ${item.readable_date}`,
        availability: item.availability || 'Unknown',
        fullText: `${item.day_name}, ${item.readable_date}, ${item.availability || 'Unknown'}`,
      }));

    // Combined View
    const condensed: { displayDate: string; availability: string; fullText: string }[] = [];

    if (items.length === 0) return [];

    let currentStart = items[0];
    let currentEnd = items[0];

    for (let i = 1; i < items.length; i++) {
      if (items[i].availability === currentStart.availability) {
        currentEnd = items[i];
      } else {
        condensed.push(formatRange(currentStart, currentEnd));
        currentStart = items[i];
        currentEnd = items[i];
      }
    }
    condensed.push(formatRange(currentStart, currentEnd));

    return condensed;
  };

  const formatRange = (start: AvailabilityType, end: AvailabilityType) => {
    const sDate = parseISO(start.date);
    const eDate = parseISO(end.date);
    let dateStr = '';

    if (start.date === end.date) {
      dateStr = `${start.readable_date}`;
    } else if (isSameMonth(sDate, eDate)) {
      dateStr = `${format(sDate, 'MMMM dd')} - ${format(eDate, 'dd')}`;
    } else {
      dateStr = `${format(sDate, 'MMMM dd')} - ${format(eDate, 'MMMM dd')}`;
    }

    return {
      displayDate: dateStr,
      availability: start.availability || 'Unknown',
      fullText: `${dateStr}, ${start.availability || 'Unknown'}`,
    };
  };

  const generateFullCopyText = () => {
    let text = `Availability Schedule (${timezone}):\n`;
    text += '--------------------------------------------------\n';

    groupedData.forEach((group) => {
      text += `${group.title}:\n`;
      const processed = processGroupItems(group.items);
      processed.forEach((item) => {
        text += `${item.fullText}\n`;
      });
      text += '\n';
    });

    return text.trim();
  };

  return (
    <div className="space-y-6">
      {/* Main Header / View Toggle */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setSearchParams({ view: 'text' })}
            className={clsx(
              'flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              viewTab === 'text'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <UnorderedListOutlined className="text-base" />
            <span>Availability Text</span>
          </button>
          <button
            onClick={() => setSearchParams({ view: 'calendar' })}
            className={clsx(
              'flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              viewTab === 'calendar'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <CalendarOutlined className="text-base" />
            <span>Calendar View</span>
          </button>
        </div>
      </div>

      {viewTab === 'calendar' ? (
        <CalendarView
          events={events} // Pass full list, component filters by date
          customHolidays={customHolidays}
          federalHolidays={federalHolidays}
        />
      ) : (
        <>
          {/* AvailabilityType Generator Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <div className="relative">
                  <CalendarOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-gray-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-10 w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <div className="relative">
                  <ClockCircleOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-gray-400" />
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="pl-10 w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none bg-white"
                  >
                    <option value="PT">Pacific Time (PT)</option>
                    <option value="MT">Mountain Time (MT)</option>
                    <option value="CT">Central Time (CT)</option>
                    <option value="ET">Eastern Time (ET)</option>
                  </select>
                </div>
              </div>

              <div className="flex-none">
                <button
                  onClick={fetchAvailability}
                  disabled={loading}
                  className="w-[200px] px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? 'Calculating...' : 'Generate Availability'}
                </button>
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          {data.length > 0 && (
            <div className="flex justify-between items-center bg-gray-50 p-2 rounded-xl border border-gray-100">
              <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                <button
                  onClick={() => setTextMode('detailed')}
                  className={clsx(
                    'flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                    textMode === 'detailed'
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <UnorderedListOutlined className="text-base" />
                  <span>Detailed</span>
                </button>
                <button
                  onClick={() => setTextMode('combined')}
                  className={clsx(
                    'flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                    textMode === 'combined'
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <MenuOutlined className="text-base" />
                  <span>Combined</span>
                </button>
              </div>

              <button
                onClick={() => copyToClipboard(generateFullCopyText(), 'ALL')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors"
              >
                {copiedIndex === 'ALL' ? (
                  <CheckCircleOutlined className="text-base text-green-500" />
                ) : (
                  <ScheduleOutlined className="text-base" />
                )}
                Copy Full Schedule
              </button>
            </div>
          )}

          <div className="space-y-8">
            {groupedData.map((group, groupIdx) => {
              const itemsToRender = processGroupItems(group.items);
              if (itemsToRender.length === 0) return null;

              return (
                <div
                  key={group.title}
                  className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${groupIdx * 100}ms` }}
                >
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">
                    {group.title}
                  </h3>
                  <div className="space-y-3">
                    {itemsToRender.map((item, idx) => (
                      <AvailabilityItem
                        key={`${group.title}-${idx}`}
                        item={item}
                        onUpdate={fetchAvailability}
                        itemId={`${group.title}-${idx}`}
                        copiedIndex={copiedIndex}
                        onCopy={copyToClipboard}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {data.length === 0 && !loading && (
              <EmptyState
                icon={CalendarOutlined}
                title="No availability generated"
                description="Select a Start Date and Timezone, then click 'Generate AvailabilityType' to see your schedule."
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};

// Sub-component for individual items to handle edit state
const AvailabilityItem = ({
  item,
  onUpdate,
  itemId,
  copiedIndex,
  onCopy,
}: {
  item: { displayDate: string; availability: string; fullText: string; date?: string };
  onUpdate: () => void;
  itemId: string;
  copiedIndex: string | null;
  onCopy: (text: string, id: string) => void;
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editText, setEditText] = React.useState(item.availability || '');
  const [saving, setSaving] = React.useState(false);
  const { addToast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      // Check if we have a valid single date to override
      if (!item.date) {
        addToast(
          'Cannot edit a combined range. Please switch to Detailed view to edit specific days.',
          'error'
        );
        setIsEditing(false);
        setSaving(false);
        return;
      }

      const { createOverride } = await import('../../api');
      await createOverride({
        date: item.date, // This comes from availability object
        availability_text: editText,
      });

      setIsEditing(false);
      onUpdate(); // Refetch
      addToast('Override saved', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to save override.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="group relative bg-white rounded-xl p-5 border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all duration-300">
      <div className="flex items-start md:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-semibold text-gray-900">{item.displayDate}</span>
          </div>

          {isEditing ? (
            <div className="flex gap-2 mt-1">
              <input
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                autoFocus
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-indigo-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-xs font-medium hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group/text">
              <p className="text-gray-700 font-medium font-mono text-sm md:text-base">
                {item.availability}
              </p>
              {/* Only show edit pencil if it's a single date (detailed view usually) */}
              {item.date && (
                <button
                  onClick={() => {
                    setEditText(item.availability);
                    setIsEditing(true);
                  }}
                  className="opacity-0 group-hover/text:opacity-100 text-gray-400 hover:text-indigo-600 transition-opacity p-1"
                  title="Override AvailabilityType"
                >
                  <EditOutlined className="text-xs" />
                </button>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => onCopy(item.fullText, itemId)}
          className={clsx(
            'p-2 rounded-lg transition-colors',
            copiedIndex === itemId
              ? 'bg-green-50 text-green-600'
              : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100 opacity-0'
          )}
          title="Copy line"
        >
          {copiedIndex === itemId ? (
            <CheckCircleOutlined className="text-xl" />
          ) : (
            <CopyOutlined className="text-xl" />
          )}
        </button>
      </div>

      <div className="absolute left-0 top-4 bottom-4 w-1 bg-indigo-500 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};
export default Availability;

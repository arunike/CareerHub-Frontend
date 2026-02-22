import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  deactivateShareLink,
  generateShareLink,
  getAvailability,
  getCurrentShareLink,
  getEvents,
  getFederalHolidays,
  getHolidays,
} from '../../api';
import type { Availability as AvailabilityType, Event, Holiday } from '../../types';
import { format, parseISO, isSameWeek, addWeeks, isSameMonth } from 'date-fns';
import CalendarView from '../../components/CalendarView';
import { message } from 'antd';
import type { ShareLink } from '../../types';
import {
  AvailabilityBookingCard,
  AvailabilityGeneratorCard,
  AvailabilityGroups,
  AvailabilityTextControls,
  AvailabilityViewToggle,
} from './components';

const Availability = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewTab = searchParams.get('view') === 'calendar' ? 'calendar' : 'text';

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AvailabilityType[]>([]);
  const [timezone, setTimezone] = useState('PT');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const [textMode, setTextMode] = useState<'detailed' | 'combined'>('detailed');
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [shareDuration, setShareDuration] = useState<number>(14);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [deactivatingLink, setDeactivatingLink] = useState(false);

  const [events, setEvents] = useState<Event[]>([]);
  const [customHolidays, setCustomHolidays] = useState<Holiday[]>([]);
  const [federalHolidays, setFederalHolidays] = useState<Holiday[]>([]);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const resp = await getAvailability(startDate, timezone);
      setData(resp.data);
    } catch (error) {
      messageApi.error('Failed to fetch availability');
      console.error(error);
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
    } catch (error) {
      messageApi.error('Failed to fetch calendar data');
      console.error('Failed to fetch calendar data', error);
    }
  };

  const fetchShareLink = async () => {
    try {
      const resp = await getCurrentShareLink();
      setShareLink(resp.data.active);
    } catch (error) {
      console.error('Failed to fetch share link', error);
    }
  };

  useEffect(() => {
    fetchAvailability();
    fetchCalendarData();
    fetchShareLink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerateShareLink = async () => {
    setGeneratingLink(true);
    try {
      const resp = await generateShareLink({
        title: 'Book a time with me',
        duration_days: shareDuration,
      });
      setShareLink(resp.data);
      messageApi.success('Booking link generated');
    } catch (error) {
      messageApi.error('Failed to generate booking link');
      console.error(error);
    } finally {
      setGeneratingLink(false);
    }
  };

  const getShareLinkUrl = () => {
    if (!shareLink) return '';
    return `${window.location.origin}/book/${shareLink.uuid}`;
  };

  const handleCopyShareLink = async () => {
    if (!shareLink) return;
    const url = getShareLinkUrl();
    await navigator.clipboard.writeText(url);
    messageApi.success('Booking link copied');
  };

  const handleDeactivateShareLink = async () => {
    setDeactivatingLink(true);
    try {
      await deactivateShareLink();
      setShareLink(null);
      messageApi.success('Booking link deactivated');
    } catch (error) {
      messageApi.error('Failed to deactivate link');
      console.error(error);
    } finally {
      setDeactivatingLink(false);
    }
  };

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

  const renderedGroups = groupedData
    .map((group) => ({
      title: group.title,
      items: processGroupItems(group.items),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="space-y-6">
      {contextHolder}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        </div>
        <AvailabilityViewToggle
          viewTab={viewTab}
          onChange={(next) => setSearchParams({ view: next })}
        />
      </div>

      {viewTab === 'calendar' ? (
        <CalendarView
          events={events}
          customHolidays={customHolidays}
          federalHolidays={federalHolidays}
        />
      ) : (
        <>
          <AvailabilityGeneratorCard
            startDate={startDate}
            onStartDateChange={setStartDate}
            timezone={timezone}
            onTimezoneChange={setTimezone}
            loading={loading}
            onGenerate={fetchAvailability}
          />

          <AvailabilityBookingCard
            shareLink={shareLink}
            shareDuration={shareDuration}
            onShareDurationChange={setShareDuration}
            generatingLink={generatingLink}
            onGenerateShareLink={handleGenerateShareLink}
            onCopyShareLink={handleCopyShareLink}
            deactivatingLink={deactivatingLink}
            onDeactivateShareLink={handleDeactivateShareLink}
            getShareLinkUrl={getShareLinkUrl}
          />

          <AvailabilityTextControls
            hasData={data.length > 0}
            textMode={textMode}
            onTextModeChange={setTextMode}
            copiedIndex={copiedIndex}
            onCopyAll={() => copyToClipboard(generateFullCopyText(), 'ALL')}
          />

          <AvailabilityGroups
            groupedData={renderedGroups}
            loading={loading}
            hasData={data.length > 0}
            copiedIndex={copiedIndex}
            onCopy={copyToClipboard}
            onUpdate={fetchAvailability}
          />
        </>
      )}
    </div>
  );
};
export default Availability;

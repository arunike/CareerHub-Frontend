import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  deactivateShareLink,
  deactivateSpecificShareLink,
  deletePublicBooking,
  deleteShareLink,
  generateShareLink,
  getAvailability,
  getCurrentShareLink,
  getEvents,
  getFederalHolidays,
  getHolidays,
  getPublicBookings,
  getShareLinks,
  updatePublicBooking,
  updateShareLink,
  getUserSettings,
} from '../../api';
import type { Availability as AvailabilityType, Event, Holiday, PublicBooking } from '../../types';
import { format, parseISO, isSameWeek, addWeeks, isSameMonth } from 'date-fns';
import CalendarView from '../../components/CalendarView';
import PageActionToolbar from '../../components/PageActionToolbar';
import { message } from 'antd';
import type { ShareLink } from '../../types';
import {
  AvailabilityBookingCard,
  AvailabilityGeneratorCard,
  AvailabilityGroups,
  AvailabilityTextControls,
  AvailabilityViewToggle,
  PublicBookingManager,
} from './components';
import { useAuth } from '../../context/AuthContext';

const Availability = () => {
  const { user } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewTab = searchParams.get('view') === 'calendar' ? 'calendar' : 'text';

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AvailabilityType[]>([]);
  const [timezone, setTimezone] = useState('PT');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const [textMode, setTextMode] = useState<'detailed' | 'combined'>('combined');
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [publicBookings, setPublicBookings] = useState<PublicBooking[]>([]);
  const [shareTitle, setShareTitle] = useState('Book a time with me');
  const [hostDisplayName, setHostDisplayName] = useState('');
  const [hostEmail, setHostEmail] = useState('');
  const [publicNote, setPublicNote] = useState('');
  const [shareDuration, setShareDuration] = useState<number>(14);
  const [bookingBlockMinutes, setBookingBlockMinutes] = useState<number>(30);
  const [bufferMinutes, setBufferMinutes] = useState<number>(10);
  const [maxBookingsPerDay, setMaxBookingsPerDay] = useState<number>(3);
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
      const [currentResp, linksResp, bookingsResp, settingsResp] = await Promise.all([
        getCurrentShareLink(),
        getShareLinks(),
        getPublicBookings(),
        getUserSettings(),
      ]);
      setShareLink(currentResp.data.active);
      setShareLinks(linksResp.data);
      setPublicBookings(bookingsResp.data);
      
      const activeLink = currentResp.data.active;
      if (activeLink) {
        if (activeLink.booking_block_minutes) {
          setBookingBlockMinutes(activeLink.booking_block_minutes);
        }
        if (activeLink.host_display_name) {
          setHostDisplayName(activeLink.host_display_name);
        }
        if (activeLink.host_email) {
          setHostEmail(activeLink.host_email);
        }
      } else {
        // Autofill from profile settings
        if (settingsResp.data.display_name) {
          setHostDisplayName(settingsResp.data.display_name);
        }
        if (settingsResp.data.email) {
          setHostEmail(settingsResp.data.email);
        }
      }
    } catch (error) {
      console.error('Failed to fetch share link', error);
    }
  };

  // Immediate prefill from auth user to avoid lag
  useEffect(() => {
    if (user) {
      if (!hostDisplayName) setHostDisplayName(user.full_name || '');
      if (!hostEmail) setHostEmail(user.email || '');
    }
  }, [user]);

  useEffect(() => {
    fetchAvailability();
    fetchCalendarData();
    fetchShareLink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerateShareLink = async () => {
    if (!hostDisplayName.trim() || !hostEmail.trim()) {
      messageApi.error('Display Name and Host Email are required.');
      return;
    }

    setGeneratingLink(true);
    try {
      const resp = await generateShareLink({
        title: shareTitle.trim() || 'Book a time with me',
        host_display_name: hostDisplayName.trim(),
        host_email: hostEmail.trim(),
        public_note: publicNote.trim(),
        duration_days: shareDuration,
        booking_block_minutes: bookingBlockMinutes,
        buffer_minutes: bufferMinutes,
        max_bookings_per_day: maxBookingsPerDay,
      });
      setShareLink(resp.data);
      await fetchShareLink();
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

  const getAnyShareLinkUrl = (link: ShareLink) => `${window.location.origin}/book/${link.uuid}`;

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
      await fetchShareLink();
      messageApi.success('Booking link deactivated');
    } catch (error) {
      messageApi.error('Failed to deactivate link');
      console.error(error);
    } finally {
      setDeactivatingLink(false);
    }
  };

  const handleCopySpecificShareLink = async (link: ShareLink) => {
    await navigator.clipboard.writeText(getAnyShareLinkUrl(link));
    messageApi.success('Booking link copied');
  };

  const handleDeactivateSpecificShareLink = async (id: number) => {
    try {
      await deactivateSpecificShareLink(id);
      await fetchShareLink();
      messageApi.success('Booking link deactivated');
    } catch (error) {
      messageApi.error('Failed to deactivate link');
      console.error(error);
    }
  };

  const handleBulkDeactivateLinks = async (ids: number[]) => {
    try {
      await Promise.all(ids.map((id) => deactivateSpecificShareLink(id)));
      await fetchShareLink();
      messageApi.success(`${ids.length} links deactivated`);
    } catch (error) {
      messageApi.error('Failed to deactivate some links');
      console.error(error);
    }
  };

  const handleBulkDeleteLinks = async (ids: number[]) => {
    try {
      await Promise.all(ids.map((id) => deleteShareLink(id)));
      await fetchShareLink();
      messageApi.success(`${ids.length} links deleted`);
    } catch (error) {
      messageApi.error('Failed to delete some links');
      console.error(error);
    }
  };

  const handleBulkDeleteBookings = async (ids: number[]) => {
    try {
      await Promise.all(ids.map((id) => deletePublicBooking(id)));
      await fetchShareLink();
      messageApi.success(`${ids.length} bookings deleted`);
    } catch (error) {
      messageApi.error('Failed to delete some bookings');
      console.error(error);
    }
  };

  const handleBulkToggleLockLinks = async (ids: number[], lock: boolean) => {
    try {
      await Promise.all(ids.map((id) => updateShareLink(id, { is_locked: lock })));
      await fetchShareLink();
      messageApi.success(`${ids.length} links ${lock ? 'locked' : 'unlocked'}`);
    } catch (error) {
      messageApi.error(`Failed to ${lock ? 'lock' : 'unlock'} some links`);
      console.error(error);
    }
  };

  const handleBulkToggleLockBookings = async (ids: number[], lock: boolean) => {
    try {
      await Promise.all(ids.map((id) => updatePublicBooking(id, { is_locked: lock })));
      await fetchShareLink();
      messageApi.success(`${ids.length} bookings ${lock ? 'locked' : 'unlocked'}`);
    } catch (error) {
      messageApi.error(`Failed to ${lock ? 'lock' : 'unlock'} some bookings`);
      console.error(error);
    }
  };

  const handleBulkUpdateLinks = async (ids: number[], updates: Partial<ShareLink>) => {
    try {
      await Promise.all(ids.map((id) => updateShareLink(id, updates)));
      await fetchShareLink();
      messageApi.success(`${ids.length} links updated`);
    } catch (error) {
      messageApi.error('Failed to update some links');
      console.error(error);
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
      <PageActionToolbar
        title="Dashboard"
        subtitle="Manage your availability and public booking links"
        extraActions={
          <AvailabilityViewToggle
            viewTab={viewTab}
            onChange={(next) => setSearchParams({ view: next })}
          />
        }
      />

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
            shareTitle={shareTitle}
            onShareTitleChange={setShareTitle}
            hostDisplayName={hostDisplayName}
            onHostDisplayNameChange={setHostDisplayName}
            hostEmail={hostEmail}
            onHostEmailChange={setHostEmail}
            publicNote={publicNote}
            onPublicNoteChange={setPublicNote}
            shareDuration={shareDuration}
            onShareDurationChange={setShareDuration}
            bookingBlockMinutes={bookingBlockMinutes}
            onBookingBlockMinutesChange={setBookingBlockMinutes}
            bufferMinutes={bufferMinutes}
            onBufferMinutesChange={setBufferMinutes}
            maxBookingsPerDay={maxBookingsPerDay}
            onMaxBookingsPerDayChange={setMaxBookingsPerDay}
            generatingLink={generatingLink}
            onGenerateShareLink={handleGenerateShareLink}
            onCopyShareLink={handleCopyShareLink}
            deactivatingLink={deactivatingLink}
            onDeactivateShareLink={handleDeactivateShareLink}
            getShareLinkUrl={getShareLinkUrl}
            onReset={() => setShareLink(null)}
          />

          <PublicBookingManager
            links={shareLinks}
            bookings={publicBookings}
            onCopyLink={handleCopySpecificShareLink}
            onDeactivateLink={handleDeactivateSpecificShareLink}
            onDeactivateLinks={handleBulkDeactivateLinks}
            onDeleteLinks={handleBulkDeleteLinks}
            onDeleteBookings={handleBulkDeleteBookings}
            onToggleLockLinks={handleBulkToggleLockLinks}
            onToggleLockBookings={handleBulkToggleLockBookings}
            onBulkUpdateLinks={handleBulkUpdateLinks}
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

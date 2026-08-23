import { useEffect, useState } from 'react';
import Modal from '../../components/MobileModal';
import type { MessageInstance } from 'antd/es/message/interface';
import {
  cancelHostPublicBooking,
  deactivateShareLink,
  deactivateSpecificShareLink,
  deletePublicBooking,
  deleteShareLink,
  generateShareLink,
  getCurrentShareLink,
  getPublicBookings,
  getShareLinks,
  getAvailability,
  getUserSettings,
  updatePublicBooking,
  updateShareLink,
} from '../../api';
import type { Availability, BookingIntakeQuestion, PublicBooking, ShareLink } from '../../types';
import { getErrorMessage } from './availabilityFormTypes';

export const useShareLinks = ({
  timezone,
  startDate,
  availabilityWeeks,
  setAvailabilityWeeks,
  onAvailabilityRefetched,
  onAvailabilityRefetchFailed,
  messageApi,
}: {
  timezone: string;
  startDate: string;
  availabilityWeeks: number;
  setAvailabilityWeeks: (weeks: number) => void;
  onAvailabilityRefetched: (rows: Availability[]) => void;
  onAvailabilityRefetchFailed: () => void;
  messageApi: MessageInstance;
}) => {
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
  const [allowRescheduleCancel, setAllowRescheduleCancel] = useState(true);
  const [rescheduleCancelDeadlineHours, setRescheduleCancelDeadlineHours] = useState<number>(24);
  const [intakeQuestions, setIntakeQuestions] = useState<BookingIntakeQuestion[]>([]);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [deactivatingLink, setDeactivatingLink] = useState(false);
  const [bookingDataLoading, setBookingDataLoading] = useState(true);
  const [bookingDataError, setBookingDataError] = useState(false);

  const fetchShareLink = async () => {
    setBookingDataLoading(true);
    setBookingDataError(false);
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
      const nextAvailabilityWeeks = settingsResp.data.availability_weeks || 2;
      setAvailabilityWeeks(nextAvailabilityWeeks);

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
        setAllowRescheduleCancel(activeLink.allow_reschedule_cancel);
        setRescheduleCancelDeadlineHours(activeLink.reschedule_cancel_deadline_hours || 0);
        setIntakeQuestions(activeLink.intake_questions || []);
      } else {
        if (settingsResp.data.display_name) {
          setHostDisplayName(settingsResp.data.display_name);
        }
        if (settingsResp.data.email) {
          setHostEmail(settingsResp.data.email);
        }
      }

      if (nextAvailabilityWeeks !== availabilityWeeks) {
        try {
          const availabilityResp = await getAvailability(
            startDate,
            timezone,
            nextAvailabilityWeeks
          );
          onAvailabilityRefetched(availabilityResp.data);
        } catch (error) {
          onAvailabilityRefetchFailed();
          console.error('Failed to refresh saved availability range', error);
        }
      }
    } catch (error) {
      setBookingDataError(true);
      console.error('Failed to fetch share link', error);
    } finally {
      setBookingDataLoading(false);
    }
  };

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
        allow_reschedule_cancel: allowRescheduleCancel,
        reschedule_cancel_deadline_hours: allowRescheduleCancel ? rescheduleCancelDeadlineHours : 0,
        intake_questions: intakeQuestions.filter((question) => question.label.trim()),
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

  // Confirmed before saving: a drop is easy to trigger by accident on a dense month grid.
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

  const handleCancelHostBooking = (booking: PublicBooking) => {
    Modal.confirm({
      title: `Cancel booking with ${booking.name}?`,
      content:
        'This cancels the booking from your host account and removes its locked calendar event. Guest reschedule/cancel cutoff settings do not apply to host actions.',
      okText: 'Cancel booking',
      okType: 'danger',
      cancelText: 'Keep booking',
      onOk: async () => {
        try {
          const resp = await cancelHostPublicBooking(booking.id);
          await fetchShareLink();
          messageApi.success(resp.data.message || 'Booking canceled');
        } catch (error) {
          messageApi.error(getErrorMessage(error, 'Could not cancel booking from host account.'));
          console.error(error);
        }
      },
    });
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
  useEffect(() => {
    fetchShareLink();
    // Loaded once; the handlers refetch after every change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    shareLink,
    setShareLink,
    shareLinks,
    publicBookings,
    shareTitle,
    setShareTitle,
    hostDisplayName,
    setHostDisplayName,
    hostEmail,
    setHostEmail,
    publicNote,
    setPublicNote,
    shareDuration,
    setShareDuration,
    bookingBlockMinutes,
    setBookingBlockMinutes,
    bufferMinutes,
    setBufferMinutes,
    maxBookingsPerDay,
    setMaxBookingsPerDay,
    allowRescheduleCancel,
    setAllowRescheduleCancel,
    rescheduleCancelDeadlineHours,
    setRescheduleCancelDeadlineHours,
    intakeQuestions,
    setIntakeQuestions,
    generatingLink,
    deactivatingLink,
    bookingDataLoading,
    bookingDataError,
    fetchShareLink,
    handleGenerateShareLink,
    getShareLinkUrl,
    getAnyShareLinkUrl,
    handleCopyShareLink,
    handleDeactivateShareLink,
    handleCopySpecificShareLink,
    handleDeactivateSpecificShareLink,
    handleBulkDeactivateLinks,
    handleBulkDeleteLinks,
    handleBulkDeleteBookings,
    handleBulkToggleLockLinks,
    handleBulkToggleLockBookings,
    handleCancelHostBooking,
    handleBulkUpdateLinks,
  };
};

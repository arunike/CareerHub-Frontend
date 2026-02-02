import React, { useState, useEffect } from 'react';
import {
  getEvents,
  deleteEvent,
  createEvent,
  updateEvent,
  importData,
  getCategories,
  setRecurrence,
  createCategory,
  getRecurringInstances,
  updateRecurringSeries,
  deleteRecurringSeries,
  deleteRecurringInstance,
  getApplications,
  exportEvents,
  getUserSettings,
} from '../../api';
import ExportButton from '../../components/ExportButton';
import type { Event, EventCategory } from '../../types';
import {
  Plus,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Pencil,
  CalendarPlus,
  Video,
  Repeat,
  X,
  ChevronDown,
  Eye,
  Filter,
  ArrowUpDown,
  CalendarX,
  Lock,
  Unlock,
} from 'lucide-react';
import { format, addMinutes, parse } from 'date-fns';
import clsx from 'clsx';
import CategoryBadge from '../../components/CategoryBadge';
import RecurrenceModal from '../../components/RecurrenceModal';
import ConfirmModal from '../../components/ConfirmModal';
import EmptyState from '../../components/EmptyState';
import { useToast } from '../../context/ToastContext';

const EventList = () => {
  const { addToast } = useToast();

  // Helper for timezone conversion logic
  const formatEventTime = (event: Event, userTz: string) => {
    // Basic mapping for offset calculation (simplified)
    const offsets: Record<string, number> = {
      PT: -8,
      MT: -7,
      CT: -6,
      ET: -5,
      UTC: 0,
    };

    const eventTz = event.timezone || 'PT';
    if (eventTz === userTz) return null; // No conversion needed

    const diffHours = (offsets[userTz] || 0) - (offsets[eventTz] || 0);
    if (diffHours === 0) return null;

    try {
      // Parse event times
      const today = new Date().toISOString().split('T')[0];
      const startDt = new Date(`${today}T${event.start_time}`);
      const endDt = new Date(`${today}T${event.end_time}`);

      if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) return null;

      // Apply offset
      startDt.setHours(startDt.getHours() + diffHours);
      endDt.setHours(endDt.getHours() + diffHours);

      return `(${format(startDt, 'HH:mm')} - ${format(endDt, 'HH:mm')} ${userTz})`;
    } catch {
      return null;
    }
  };

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState<number | 'ALL'>('ALL');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'duration'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [name, setName] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('13:00');
  const [defaultDuration, setDefaultDuration] = useState(60); // Default 60 mins
  const [timezone, setTimezone] = useState('PT');
  const [userTimezone, setUserTimezone] = useState(
    () => localStorage.getItem('userTimezone') || 'PT'
  ); // User's viewing timezone

  useEffect(() => {
    localStorage.setItem('userTimezone', userTimezone);
  }, [userTimezone]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showDurationPopover, setShowDurationPopover] = useState(false);

  const [category, setCategory] = useState<number | undefined>(undefined);
  const [locationType, setLocationType] = useState<'in_person' | 'virtual' | 'hybrid'>('virtual');
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [notes, setNotes] = useState('');

  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [applications, setApplications] = useState<Array<{ id: number; company_details?: { name: string }; role_title: string; [key: string]: unknown }>>([]);
  const [applicationId, setApplicationId] = useState<number | undefined>(undefined);

  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);

  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<Record<string, unknown> | null>(null);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  // Confirmation States
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'warning' | 'danger' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    onConfirm: () => {},
  });

  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);

  const [nameError, setNameError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);

      const today = new Date();
      const startStr = format(addMinutes(today, -10080), 'yyyy-MM-dd'); // -7 days
      const endStr = format(addMinutes(today, 262800), 'yyyy-MM-dd'); // ~6 months

      const [eventsResp, recurringResp, settingsResp] = await Promise.all([
        getEvents(),
        getRecurringInstances(startStr, endStr),
        getUserSettings(),
      ]);

      if (settingsResp.data && settingsResp.data.default_event_duration) {
        setDefaultDuration(parseInt(settingsResp.data.default_event_duration));
      }

      const regularEvents = eventsResp.data;
      const recurringInstances = recurringResp.data;

      // Assign temporary IDs to virtual recurring instances and map fields
      const virtualEvents = recurringInstances.map((evt: Record<string, unknown>, index: number) => ({
        ...evt,
        id: -1 * (index + 1 + Date.now()), // Negative ID for virtual events
        parent_event: evt.parent_event_id,
        is_virtual: true,
      }));

      // Filter out parent recurring events from regular list to avoid duplicates
      const nonRecurringEvents = regularEvents.filter((e: Event) => !e.is_recurring);

      // Merge and sort
      const allEvents = [...nonRecurringEvents, ...virtualEvents].sort((a: Event, b: Event) => {
        const dateA = new Date(`${a.date}T${a.start_time}`);
        const dateB = new Date(`${b.date}T${b.start_time}`);
        return dateA.getTime() - dateB.getTime();
      });

      setEvents(allEvents);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async (): Promise<EventCategory[]> => {
    try {
      const catResp = await getCategories();
      setCategories(catResp.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchApplications = async () => {
    try {
      const appResp = await getApplications();
      // Filter to only active applications or all? All is fine, maybe sort by recent.
      setApplications(appResp.data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchCategories();
    fetchApplications();
  }, []);

  // Update endTime when defaultDuration loads/changes
  useEffect(() => {
    if (startTime && defaultDuration) {
      try {
        const startDate = parse(startTime, 'HH:mm', new Date());
        const defaultEnd = addMinutes(startDate, defaultDuration);
        setEndTime(format(defaultEnd, 'HH:mm'));
      } catch {
        console.error('Failed to add category');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultDuration]);

  // Derived Filtered & Sorted Events
  const filteredEvents = events
    .filter((event) => {
      // Category Filter
      if (categoryFilter !== 'ALL' && event.category !== categoryFilter) return false;

      // Date Range Filter
      if (startDateFilter || endDateFilter) {
        const eventDate = parse(event.date, 'yyyy-MM-dd', new Date());
        if (startDateFilter) {
          const start = parse(startDateFilter, 'yyyy-MM-dd', new Date());
          if (eventDate < start) return false;
        }
        if (endDateFilter) {
          const end = parse(endDateFilter, 'yyyy-MM-dd', new Date());
          if (eventDate > end) return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        const dateA = new Date(`${a.date}T${a.start_time}`);
        const dateB = new Date(`${b.date}T${b.start_time}`);
        comparison = dateA.getTime() - dateB.getTime();
      } else if (sortBy === 'duration') {
        // Duration Calculation helper (minutes)
        const getDuration = (e: Event) => {
          const parseToMinutes = (timeStr: string) => {
            if (!timeStr) return 0;
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + m;
          };

          const start = parseToMinutes(e.start_time);
          const end = parseToMinutes(e.end_time);
          let diff = end - start;
          if (diff < 0) diff += 24 * 60; // Handle overnight wrapping if any
          return diff;
        };
        comparison = getDuration(a) - getDuration(b);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const generateEndTimeOptions = (start: string) => {
    if (!start) return [];
    try {
      const startDate = parse(start, 'HH:mm', new Date());
      const options = [];

      // 15 min to 3 hours (180 mins)
      for (let i = 15; i <= 180; i += 15) {
        const endDate = addMinutes(startDate, i);
        let durationLabel = '';
        const hours = Math.floor(i / 60);
        const mins = i % 60;

        if (hours > 0) durationLabel += `${hours} hr${hours > 1 ? 's' : ''}`;
        if (hours > 0 && mins > 0) durationLabel += ' ';
        if (mins > 0) durationLabel += `${mins} min${mins > 1 ? 's' : ''}`;

        options.push({
          value: format(endDate, 'HH:mm'),
          label: `${format(endDate, 'hh:mm a')} (${durationLabel})`,
        });
      }
      return options;
    } catch {
      return [];
    }
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    setStartTime(newStart);

    // Auto-set end time based on default duration
    try {
      const startDate = parse(newStart, 'HH:mm', new Date());
      const defaultEnd = addMinutes(startDate, defaultDuration);
      setEndTime(format(defaultEnd, 'HH:mm'));
    } catch (e) {
      console.error(e);
    }
  };

  const handleNameBlur = () => {
    if (!name.trim()) {
      setNameError(null);
      return;
    }

    const nameExists = events.some(
      (ev) => ev.name.toLowerCase() === name.trim().toLowerCase() && ev.id !== editingId
    );

    if (nameExists) {
      setNameError('An event with this name already exists');
    } else {
      setNameError(null);
    }
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    type: 'warning' | 'danger' | 'info' = 'warning'
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: () => {
        onConfirm();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const processSave = async (payload: Record<string, unknown>, force: boolean = false) => {
    try {
      let savedEvent;
      if (editingId) {
        if (force) {
          const resp = await updateEvent(editingId, payload, { force: true });
          savedEvent = resp.data;
        } else {
          const resp = await updateEvent(editingId, payload);
          savedEvent = resp.data;
        }
      } else {
        const resp = await createEvent(payload, { force });
        savedEvent = resp.data;
      }

      if (recurrenceRule && savedEvent.id) {
        await setRecurrence(savedEvent.id, recurrenceRule);
      }

      handleCloseForm();
      fetchData();
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { conflict?: boolean; message?: string } } };
      if (error.response && error.response.status === 400 && error.response.data?.conflict) {
        const message = error.response.data.message || 'Conflict detected.';
        showConfirm(
          'Schedule Conflict',
          `${message}\n\nDo you want to force save this event anyway?`,
          () => processSave(payload, true), // Retry with force
          'warning'
        );
      } else {
        console.error(err);
        showConfirm(
          'Error',
          'Failed to save event: ' + (err.response?.data?.message || err.message),
          () => {},
          'danger'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting || nameError) return;

    executeSubmit();
  };

  const executeSubmit = async () => {
    setIsSubmitting(true);
    const payload: Record<string, unknown> = {
      name,
      date,
      start_time: startTime + ':00',
      end_time: endTime + ':00',
      timezone,
      category: category || null,
      location_type: locationType,
      location: location || '',
      meeting_link: meetingLink || '',
      notes: notes || '',
      is_recurring: !!recurrenceRule,
      recurrence_rule: recurrenceRule,
      reminder_minutes: 15,
      application: applicationId || null,
    };

    if (editingId) {
      const editingEvent = events.find((e) => e.id === editingId);
      if (editingEvent?.is_virtual && editingEvent.parent_event) {
        // It's a recurring instance
        showConfirm(
          'Update Recurring Event',
          'This is part of a recurring series. Do you want to update the entire series?',
          async () => {
            // Update Series
            try {
              const resp = await updateRecurringSeries(editingEvent.parent_event, payload);
              if (recurrenceRule && resp.data.id) {
                await setRecurrence(resp.data.id, recurrenceRule);
              }
              handleCloseForm();
              fetchData();
              setIsSubmitting(false);
            } catch (error) {
              console.error(error);
              setIsSubmitting(false);
            }
          },
          'info'
        );
        return;
      }
    }

    // Normal Save
    await processSave(payload);
  };

  const handleDelete = async (id: number) => {
    const event = events.find((e) => e.id === id);
    if (event) {
      setDeletingEvent(event);
    }
  };

  const confirmDelete = async (deleteType: 'instance' | 'series' = 'series') => {
    if (!deletingEvent) return;
    try {
      if (deletingEvent.is_virtual && deletingEvent.parent_event) {
        if (deleteType === 'series') {
          await deleteRecurringSeries(deletingEvent.parent_event);
        } else {
          await deleteRecurringInstance(deletingEvent.parent_event, deletingEvent.date);
        }
      } else {
        await deleteEvent(deletingEvent.id);
      }
      fetchData();
      setDeletingEvent(null);
    } catch {
      addToast('Failed to delete event.', 'error');
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    const formData = new FormData();
    formData.append('file', importFile);

    try {
      await importData(formData);
      addToast('Import successful!', 'success');
      setShowImport(false);
      setImportFile(null);
      fetchData();
    } catch (error) {
      console.error(error);
      addToast('Import failed.', 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
    }
  };

  const handleEdit = (event: Event) => {
    setEditingId(event.id);
    setName(event.name);
    setDate(event.date);
    const start = event.start_time.substring(0, 5);
    const end = event.end_time.substring(0, 5);
    setStartTime(start);
    setEndTime(end);
    setTimezone(event.timezone);
    setCategory(event.category);
    setLocationType(event.location_type);
    setLocation(event.location || '');
    setMeetingLink(event.meeting_link || '');
    setMeetingLink(event.meeting_link || '');
    setNotes(event.notes || '');
    setApplicationId(event.application || undefined);

    setIsFormOpen(true);
  };

  const handleAddStart = () => {
    setEditingId(null);
    setName('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    const startStr = '12:00';
    setStartTime(startStr);

    try {
      const startDate = parse(startStr, 'HH:mm', new Date());
      const defaultEnd = addMinutes(startDate, defaultDuration);
      setEndTime(format(defaultEnd, 'HH:mm'));
    } catch {
      setEndTime('13:00');
    }

    setTimezone('PT');
    setCategory(undefined);
    setLocationType('virtual');
    setLocation('');
    setMeetingLink('');
    setNotes('');
    setApplicationId(undefined);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setName('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setStartTime('12:00');
    setEndTime('13:00');
    setTimezone('PT');
    setCategory(undefined);
    setLocationType('virtual');
    setLocation('');
    setMeetingLink('');
    setNotes('');
    setApplicationId(undefined);
    setShowDurationPopover(false);
    setRecurrenceRule(null);
  };

  const endTimeOptions = generateEndTimeOptions(startTime);

  const toggleLock = async (event: Event) => {
    try {
      await updateEvent(event.id, { is_locked: !event.is_locked });
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? { ...e, is_locked: !e.is_locked } : e))
      );
      addToast(event.is_locked ? 'Event unlocked' : 'Event locked', 'success');
    } catch (err) {
      console.error('Failed to toggle lock', err);
      addToast('Failed to update lock status', 'error');
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllEvents();
      addToast('All unlocked events deleted.', 'success');
      setIsDeleteAllOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      addToast('Failed to delete all events.', 'error');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Events</h2>
          <p className="text-sm text-gray-500 mt-1">
            {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
            {events.length !== filteredEvents.length && ` (filtered from ${events.length})`}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {/* My Timezone Selector */}
          <div className="flex items-center gap-2 mr-4 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              My View:
            </span>
            <select
              value={userTimezone}
              onChange={(e) => setUserTimezone(e.target.value)}
              className="bg-transparent text-sm font-medium text-indigo-700 outline-none cursor-pointer"
            >
              <option value="PT">Pacific (PT)</option>
              <option value="MT">Mountain (MT)</option>
              <option value="CT">Central (CT)</option>
              <option value="ET">Eastern (ET)</option>
            </select>
          </div>

          {events.length > 0 && (
            <button
              onClick={() => setIsDeleteAllOpen(true)}
              className="flex items-center px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition"
            >
              <Trash2 className="h-5 w-5 mr-2" />
              Delete All
            </button>
          )}
          <ExportButton onExport={exportEvents} filename="events" label="Export CSV" />
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            <CalendarPlus className="h-5 w-5 mr-2" />
            Import
          </button>
          <button
            onClick={handleAddStart}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Event
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex gap-3 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 items-center">
          {/* Category Filter */}
          <div className="relative min-w-[150px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
              }
              className="w-full pl-10 pr-8 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm appearance-none bg-white cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
          </div>

          {/* Date Logic */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">From</span>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-500">To</span>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {(startDateFilter || endDateFilter) && (
              <button
                onClick={() => {
                  setStartDateFilter('');
                  setEndDateFilter('');
                }}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-md"
                title="Clear Dates"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto items-center">
          {/* Sort By */}
          <div className="relative min-w-[140px]">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'duration')}
              className="w-full pl-10 pr-8 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm appearance-none bg-white cursor-pointer"
            >
              <option value="date">Sort by Date</option>
              <option value="duration">Sort by Duration</option>
            </select>
          </div>

          {/* Sort Order Toggle */}
          <button
            onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
            title={sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}
          >
            <ArrowUpDown
              className={`h-4 w-4 transition-transform ${sortOrder === 'asc' ? '' : 'rotate-180'}`}
            />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12 text-gray-400">Loading events...</div>
      ) : filteredEvents.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => (
            <div
              key={event.id}
              className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative group"
            >
              <h3 className="font-semibold text-gray-900 mb-2 pr-8 truncate" title={event.name}>
                {event.name}
              </h3>

              {/* Category and Tags */}
              <div className="flex flex-wrap gap-2 mb-3">
                {event.category_details && (
                  <CategoryBadge category={event.category_details} size="sm" />
                )}
              </div>

              <div className="space-y-2 text-sm text-gray-500">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  {event.date}
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-gray-400" />
                  <span>
                    {event.start_time} - {event.end_time}
                    {(() => {
                      const converted = formatEventTime(event, userTimezone);
                      return converted ? (
                        <span className="ml-1 text-indigo-600 font-medium">{converted}</span>
                      ) : null;
                    })()}
                  </span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                  {event.timezone}
                </div>
                {event.application_details && (
                  <div className="flex items-center text-indigo-600 font-medium pt-1">
                    <span className="text-xs border border-indigo-200 bg-indigo-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                      💼 {event.application_details.company}
                    </span>
                  </div>
                )}
              </div>

              {/* Lock Indicator - Top Right (Visible when not hovering) */}
              {event.is_locked && (
                <div className="absolute top-4 right-4 text-amber-500 group-hover:opacity-0 transition-opacity duration-200">
                  <Lock className="h-4 w-4" />
                </div>
              )}

              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4 bg-white/90 backdrop-blur-sm shadow-sm p-1 rounded-lg border border-gray-100 z-10">
                <button
                  onClick={() => toggleLock(event)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    event.is_locked
                      ? 'text-amber-600 hover:bg-amber-50'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  }`}
                  title={event.is_locked ? 'Unlock Event' : 'Lock Event'}
                >
                  {event.is_locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setViewingEvent(event)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="View Details"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleEdit(event)}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (event.is_locked) {
                      addToast('Unlock this event to delete it.', 'error');
                      return;
                    }
                    handleDelete(event.id);
                  }}
                  disabled={event.is_locked}
                  className={`p-1.5 rounded-lg transition-colors ${
                    event.is_locked
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                  }`}
                  title={event.is_locked ? 'Unlock to delete' : 'Delete'}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CalendarX}
          title={events.length === 0 ? 'No events yet' : 'No events match'}
          description={
            events.length === 0
              ? 'Get started by adding your first event or importing your calendar.'
              : 'Try adjusting your filters to see more events.'
          }
          action={
            events.length === 0 ? (
              <div className="flex gap-3">
                <button
                  onClick={() => setShowImport(true)}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Import
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={handleAddStart}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                  + Add Event
                </button>
                <span className="text-gray-300">|</span>
                <ExportButton onExport={exportEvents} filename="events" />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setCategoryFilter('ALL');
                    setStartDateFilter('');
                    setEndDateFilter('');
                  }}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Clear Filters
                </button>
                <span className="text-gray-300">|</span>
                <ExportButton onExport={exportEvents} filename="events_filtered" />
              </div>
            )
          }
        />
      )}

      {/* Delete All Modal */}
      {isDeleteAllOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">Delete All Events?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              This will permanently delete ALL {events.length} events. This action cannot be undone.
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => setIsDeleteAllOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-4">{editingId ? 'Edit Event' : 'Add New Event'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
                <input
                  required
                  className={clsx(
                    'w-full rounded-lg border px-3 py-2 outline-none focus:ring-2',
                    nameError
                      ? 'border-red-300 focus:ring-red-200 bg-red-50 text-red-900 placeholder-red-300'
                      : 'border-gray-300 focus:ring-indigo-500'
                  )}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError(null); // Clear error on type
                  }}
                  onBlur={handleNameBlur}
                />
                {nameError && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1 animate-in slide-in-from-top-1">
                    ⚠️ {nameError}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startTime}
                    onChange={handleStartTimeChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <div className="flex gap-1 relative">
                    <input
                      type="time"
                      required
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowDurationPopover(!showDurationPopover)}
                      className="px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors text-gray-600"
                      title="Quick duration"
                    >
                      ⏱️
                    </button>

                    {/* Modern Duration Popover */}
                    {showDurationPopover && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowDurationPopover(false)}
                        />
                        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 p-4 animate-in fade-in zoom-in duration-200">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-sm font-semibold text-gray-700">Quick Duration</h4>
                            <button
                              type="button"
                              onClick={() => setShowDurationPopover(false)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                            {endTimeOptions.map((opt) => {
                              const duration = opt.label.split('(')[1]?.replace(')', '') || '';
                              const time = opt.label.split('(')[0].trim();
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => {
                                    setEndTime(opt.value);
                                    setShowDurationPopover(false);
                                  }}
                                  className="flex flex-col items-start p-3 rounded-lg border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left group"
                                >
                                  <span className="text-xs font-semibold text-indigo-600 group-hover:text-indigo-700">
                                    {duration}
                                  </span>
                                  <span className="text-sm text-gray-600 group-hover:text-gray-900 mt-0.5">
                                    {time}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <select
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  <option value="PT">PT</option>
                  <option value="ET">ET</option>
                  <option value="CT">CT</option>
                  <option value="MT">MT</option>
                </select>

                {/* Additional Options Toggle */}
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                    className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-medium text-gray-700 transition-colors flex items-center justify-between"
                  >
                    <span>Additional Options</span>
                    <ChevronDown
                      className={clsx(
                        'w-4 h-4 transition-transform',
                        showAdvancedOptions && 'rotate-180'
                      )}
                    />
                  </button>
                </div>

                {showAdvancedOptions && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    {/* Category */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <div className="space-y-2">
                        <select
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          value={category || ''}
                          onChange={(e) =>
                            setCategory(e.target.value ? Number(e.target.value) : undefined)
                          }
                        >
                          <option value="">No Category</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>

                        {showCategoryInput ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="New category name (press Enter)"
                              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter' && newCategoryName.trim()) {
                                  try {
                                    await createCategory({
                                      name: newCategoryName
                                        .trim()
                                        .toLowerCase()
                                        .replace(/\s+/g, '_'),
                                      color: '#6366f1',
                                      icon: '📌',
                                    });
                                    await fetchCategories();
                                    setNewCategoryName('');
                                    setShowCategoryInput(false);
                                  } catch (error) {
                                    console.error('Error creating category:', error);
                                    addToast(
                                      'Failed to create category. It may already exist.',
                                      'error'
                                    );
                                  }
                                } else if (e.key === 'Escape') {
                                  setShowCategoryInput(false);
                                  setNewCategoryName('');
                                }
                              }}
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setShowCategoryInput(false);
                                setNewCategoryName('');
                              }}
                              className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowCategoryInput(true)}
                            className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Add New Category
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Location Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location Type
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setLocationType('virtual')}
                          className={clsx(
                            'px-3 py-2 rounded-lg border-2 font-medium text-sm transition-all flex items-center justify-center gap-1',
                            locationType === 'virtual'
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                          )}
                        >
                          <Video className="w-4 h-4" />
                          Virtual
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocationType('in_person')}
                          className={clsx(
                            'px-3 py-2 rounded-lg border-2 font-medium text-sm transition-all flex items-center justify-center gap-1',
                            locationType === 'in_person'
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                          )}
                        >
                          <MapPin className="w-4 h-4" />
                          In-Person
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocationType('hybrid')}
                          className={clsx(
                            'px-3 py-2 rounded-lg border-2 font-medium text-sm transition-all',
                            locationType === 'hybrid'
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                          )}
                        >
                          Hybrid
                        </button>
                      </div>
                    </div>

                    {/* Meeting Link */}
                    {(locationType === 'virtual' || locationType === 'hybrid') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Meeting Link
                        </label>
                        <input
                          type="url"
                          placeholder="https://zoom.us/j/..."
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                          value={meetingLink}
                          onChange={(e) => setMeetingLink(e.target.value)}
                        />
                      </div>
                    )}

                    {/* Physical Location */}
                    {(locationType === 'in_person' || locationType === 'hybrid') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Physical Location
                        </label>
                        <input
                          type="text"
                          placeholder="123 Main St, City, State"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                        />
                      </div>
                    )}

                    {/* Recurrence */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Recurrence
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowRecurrenceModal(true)}
                        className={clsx(
                          'w-full px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all flex items-center justify-center gap-2',
                          recurrenceRule
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                        )}
                      >
                        <Repeat className="w-4 h-4" />
                        {recurrenceRule ? 'Repeats ' + recurrenceRule.frequency : 'Does not repeat'}
                      </button>
                    </div>

                    {/* Link Application */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Link Application
                      </label>
                      <select
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        value={applicationId || ''}
                        onChange={(e) =>
                          setApplicationId(e.target.value ? Number(e.target.value) : undefined)
                        }
                      >
                        <option value="">None</option>
                        {applications.map((app: Record<string, unknown>) => (
                          <option key={app.id as number} value={app.id as number}>
                            {app.company_name as string} - {app.role_title as string} ({app.status as string})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea
                        placeholder="Add any additional notes..."
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-6">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !!nameError || !name.trim()}
                  className={clsx(
                    'flex-1 py-2.5 px-4 rounded-lg font-medium text-white transition-all shadow-sm flex justify-center items-center gap-2',
                    isSubmitting || !!nameError || !name.trim()
                      ? 'bg-gray-400 cursor-not-allowed'
                      : editingId
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <CalendarPlus className="w-5 h-5" />
                    <span>{editingId ? 'Update Event' : 'Add Event'}</span>
                  </div>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Import Events/Holidays</h3>
            <p className="text-sm text-gray-500 mb-4">
              Upload .ics or .json file. Items will be classified based on keywords (e.g.
              "Interview" &rarr; Event, "Holiday" &rarr; Holiday).
            </p>

            <input
              type="file"
              accept=".ics,.json"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowImport(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Event Details Modal */}
      {viewingEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-gray-900">{viewingEvent.name}</h3>
                <button
                  onClick={() => setViewingEvent(null)}
                  className="text-gray-400 hover:text-gray-600 transition p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                      Date
                    </label>
                    <div className="flex items-center text-gray-900 font-medium">
                      <Calendar className="w-4 h-4 mr-2 text-indigo-600" />
                      {viewingEvent.date}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                      Time
                    </label>
                    <div className="flex items-center text-gray-900 font-medium">
                      <Clock className="w-4 h-4 mr-2 text-indigo-600" />
                      {viewingEvent.start_time} - {viewingEvent.end_time}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                    Timezone
                  </label>
                  <div className="flex items-center text-gray-900 font-medium">
                    <MapPin className="w-4 h-4 mr-2 text-indigo-600" />
                    {viewingEvent.timezone}
                  </div>
                </div>

                {viewingEvent.category && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                      Category
                    </label>
                    <CategoryBadge
                      category={categories.find((c) => c.id === viewingEvent.category)}
                    />
                  </div>
                )}

                {viewingEvent.location_type && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                      Location Type
                    </label>
                    <div className="flex items-center text-gray-900 font-medium capitalize">
                      {viewingEvent.location_type === 'virtual' && (
                        <Video className="w-4 h-4 mr-2 text-indigo-600" />
                      )}
                      {viewingEvent.location_type === 'in_person' && (
                        <MapPin className="w-4 h-4 mr-2 text-indigo-600" />
                      )}
                      {viewingEvent.location_type.replace('_', ' ')}
                    </div>
                  </div>
                )}

                {viewingEvent.location && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                      Location
                    </label>
                    <p className="text-gray-900">{viewingEvent.location}</p>
                  </div>
                )}

                {viewingEvent.meeting_link && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                      Meeting Link
                    </label>
                    <a
                      href={viewingEvent.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-700 underline break-all font-medium"
                    >
                      {viewingEvent.meeting_link}
                    </a>
                  </div>
                )}

                {viewingEvent.recurrence_rule && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                      Recurrence
                    </label>
                    <div className="flex items-center text-gray-900 font-medium">
                      <Repeat className="w-4 h-4 mr-2 text-indigo-600" />
                      Repeats {viewingEvent.recurrence_rule.frequency}
                    </div>
                  </div>
                )}

                {viewingEvent.notes && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                      Notes
                    </label>
                    <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                      {viewingEvent.notes}
                    </p>
                  </div>
                )}

                {viewingEvent.application_details && (
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                    <label className="block text-xs font-medium text-indigo-500 mb-2 uppercase tracking-wide">
                      Linked Application
                    </label>
                    <div className="flex items-center text-indigo-900 font-medium">
                      <span className="text-lg mr-2">💼</span>
                      {viewingEvent.application_details.company}
                      <span className="mx-2 text-indigo-300">|</span>
                      <span className="text-sm text-indigo-700">
                        {viewingEvent.application_details.role}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setViewingEvent(null)}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleEdit(viewingEvent);
                    setViewingEvent(null);
                  }}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 font-medium shadow-sm"
                >
                  <Pencil className="w-4 h-4" />
                  Edit Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Event</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">You are about to delete:</p>
              <p className="font-semibold text-gray-900">{deletingEvent.name}</p>
              <p className="text-sm text-gray-500 mt-1">
                {deletingEvent.date} • {deletingEvent.start_time} - {deletingEvent.end_time}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeletingEvent(null)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </button>

              {deletingEvent.is_virtual ? (
                <>
                  <button
                    onClick={() => confirmDelete('instance')}
                    className="flex-1 px-4 py-2.5 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition font-medium flex items-center justify-center gap-2"
                  >
                    Delete This Occurrence
                  </button>
                  <button
                    onClick={() => confirmDelete('series')}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium flex items-center justify-center gap-2"
                  >
                    Delete Entire Series
                  </button>
                </>
              ) : (
                <button
                  onClick={() => confirmDelete()}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recurrence Modal */}
      <RecurrenceModal
        isOpen={showRecurrenceModal}
        onClose={() => setShowRecurrenceModal(false)}
        onSave={(rule) => {
          setRecurrenceRule(rule);
          setShowRecurrenceModal(false);
        }}
        initialRule={recurrenceRule}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          setIsSubmitting(false); // Reset submitting state on cancel
        }}
      />
    </div>
  );
};

export default EventList;

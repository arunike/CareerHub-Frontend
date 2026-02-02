import React, { useState, useEffect } from 'react';
import {
  getHolidays,
  createHoliday,
  deleteHoliday,
  deleteAllHolidays,
  getFederalHolidays,
  exportHolidays,
  updateHoliday,
} from '../../api';
import ExportButton from '../../components/ExportButton';
import type { Holiday } from '../../types';
import {
  Trash2,
  Calendar,
  RefreshCw,
  Lock,
  Unlock,
  Plus,
  CalendarX,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { addDays, format, differenceInDays, parseISO } from 'date-fns';
import clsx from 'clsx';
import EmptyState from '../../components/EmptyState';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';

const HolidayList = () => {
  const { addToast } = useToast();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [federalHolidays, setFederalHolidays] = useState<Holiday[]>([]);
  const [activeTab, setActiveTab] = useState<'custom' | 'federal'>('custom');
  const [sortBy, setSortBy] = useState<'date' | 'name'>(
    () => (localStorage.getItem('holidaySortBy') as 'date' | 'name') || 'date'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    () => (localStorage.getItem('holidaySortOrder') as 'asc' | 'desc') || 'asc'
  );


  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);

  const fetchData = async () => {
    try {
      const [customResp, federalResp] = await Promise.all([getHolidays(), getFederalHolidays()]);

      setHolidays(customResp.data);
      setFederalHolidays(federalResp.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData(); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  // Derived state for sorting
  const sortedHolidays = [...holidays].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'date') {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      comparison = timeA - timeB;
    } else if (sortBy === 'name') {
      const nameA = a.description || '';
      const nameB = b.description || '';
      comparison = nameA.localeCompare(nameB);
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const sortedFederalHolidays = [...federalHolidays]
    .filter((h) => h.date.startsWith(new Date().getFullYear().toString()))
    .sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return timeA - timeB; // Always asc for federal
    });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) return;

    const description = nameInput || 'Custom Holiday';
    const promises = [];

    // Logic to generate dates
    const datesToAdd: Date[] = [];

    try {
      if (isRangeMode && endDate) {
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        const diff = differenceInDays(end, start);

        if (diff < 0) {
          addToast('End date must be after start date', 'error');
          return;
        }

        for (let i = 0; i <= diff; i++) {
          datesToAdd.push(addDays(start, i));
        }
      } else {
        datesToAdd.push(parseISO(startDate));
      }

      // Create API calls
      for (const dateObj of datesToAdd) {
        promises.push(
          createHoliday({
            date: format(dateObj, 'yyyy-MM-dd'),
            description,
            is_recurring: isRecurring,
          })
        );
      }

      await Promise.allSettled(promises);

      setStartDate('');
      setEndDate('');
      setNameInput('');
      setIsRecurring(false);
      fetchData();
      addToast('Holiday(s) added successfully', 'success');
    } catch (err) {
      console.error(err);
      addToast('Error adding holiday(s).', 'error');
    }
  };

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const handleDelete = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Holiday',
      message: 'Are you sure you want to remove this holiday?',
      onConfirm: async () => {
        try {
          await deleteHoliday(id);
          addToast('Holiday deleted.', 'info');
          fetchData();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        } catch (e) {
          console.error(e);
          addToast('Failed to delete holiday.', 'error');
        }
      },
    });
  };

  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);

  const toggleLock = async (holiday: Holiday) => {
    try {
      await updateHoliday(holiday.id, { is_locked: !holiday.is_locked });
      setHolidays((prev) =>
        prev.map((h) => (h.id === holiday.id ? { ...h, is_locked: !h.is_locked } : h))
      );
      addToast(holiday.is_locked ? 'Holiday unlocked' : 'Holiday locked', 'success');
    } catch (err) {
      console.error('Failed to toggle lock', err);
      addToast('Failed to update lock status', 'error');
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllHolidays();
      addToast('All unlocked holidays deleted.', 'success');
      setIsDeleteAllOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      addToast('Failed to delete holidays.', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        type="danger"
      />

      {/* Delete All Modal */}
      {isDeleteAllOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">
              Delete All Holidays?
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              This will permanently delete all <strong>unlocked</strong> custom holidays.
              <br />
              <span className="text-xs text-amber-600 mt-2 block">
                Locked holidays will be preserved.
              </span>
            </p>

            <div className="flex gap-2">
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Holiday Manager</h2>
          <p className="text-sm text-gray-500 mt-1">
            {activeTab === 'custom'
              ? `${holidays.length} custom ${holidays.length === 1 ? 'holiday' : 'holidays'}`
              : `${sortedFederalHolidays.length} federal ${sortedFederalHolidays.length === 1 ? 'holiday' : 'holidays'}`}
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton onExport={exportHolidays} filename="holidays" label="Export" />

        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        <button
          onClick={() => setActiveTab('custom')}
          className={clsx(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            activeTab === 'custom'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          Manage Custom
        </button>
        <button
          onClick={() => setActiveTab('federal')}
          className={clsx(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            activeTab === 'federal'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          View Federal
        </button>
      </div>

      {activeTab === 'custom' && (
        <>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8 transition-all">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-800">Add New Holiday</h3>
              <button
                onClick={() => setIsRangeMode(!isRangeMode)}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                {isRangeMode ? 'Switch to Single Day' : 'Switch to Date Range'}
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isRangeMode ? 'Start Date' : 'Date'}
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                {isRangeMode && (
                  <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      required={isRangeMode}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                )}

                <div className={isRangeMode ? 'md:col-span-2' : ''}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Winter Break"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center space-x-2 cursor-pointer group">
                  <div
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isRecurring ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'}`}
                  >
                    {isRecurring && <RefreshCw className="h-3 w-3 text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                  />
                  <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                    Recurring (Yearly)
                  </span>
                </label>

                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                My Time Off
                <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {holidays.length}
                </span>
              </h3>

              {holidays.length > 0 && (
                <button
                  onClick={() => setIsDeleteAllOpen(true)}
                  className="text-xs font-medium text-red-600 hover:bg-red-50 px-2 py-1.5 rounded transition-colors ml-auto mr-4"
                >
                  Delete All
                </button>
              )}

              <div className="flex gap-2 text-sm">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'name')}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-gray-600 outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="date">Sort by Date</option>
                  <option value="name">Sort by Name</option>
                </select>
                <button
                  onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="p-1.5 text-gray-500 hover:text-gray-700 bg-gray-50 border border-gray-200 rounded-lg transition-colors"
                  title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                >
                  <ArrowRight
                    className={clsx(
                      'h-4 w-4 transition-transform',
                      sortOrder === 'asc' ? '-rotate-90' : 'rotate-90'
                    )}
                  />
                </button>
              </div>
            </div>
            {sortedHolidays.length > 0 ? (
              sortedHolidays.map((holiday) => (
                <div
                  key={holiday.id}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors group relative"
                >
                  <div className="flex items-center text-gray-700 gap-6">
                    <div className="flex items-center w-36">
                      <Calendar className="h-4 w-4 mr-2 text-indigo-500 flex-shrink-0" />
                      <span className="font-medium">{holiday.date}</span>
                    </div>
                    <div className="flex items-center text-gray-500">
                      <FileText className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                      <span className="group-hover:text-gray-700 transition-colors">
                        {holiday.description || 'No description'}
                      </span>
                      {holiday.is_recurring && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Yearly
                        </span>
                      )}
                      {holiday.is_locked && (
                        <Lock className="ml-2 h-3 w-3 text-amber-500" title="Locked" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => toggleLock(holiday)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        holiday.is_locked
                          ? 'text-amber-600 hover:bg-amber-50'
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                      }`}
                      title={holiday.is_locked ? 'Unlock' : 'Lock'}
                    >
                      {holiday.is_locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => {
                        if (holiday.is_locked) {
                          addToast('Unlock this holiday to delete it.', 'error');
                          return;
                        }
                        handleDelete(holiday.id);
                      }}
                      disabled={holiday.is_locked}
                      className={`p-1.5 rounded-lg transition-colors ${
                        holiday.is_locked
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                      }`}
                      title={holiday.is_locked ? 'Unlock to delete' : 'Delete'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={CalendarX}
                title="No custom holidays"
                description="Add holidays like vacations or personal days to exclude them from your availability."
              />
            )}
          </div>
        </>
      )}

      {activeTab === 'federal' && (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex items-start gap-3">
            <Lock className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-indigo-900">Federal Holidays are Automatic</h4>
              <p className="text-sm text-indigo-700 mt-1">
                These holidays are automatically excluded from availability calculations. You do not
                need to add them manually.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {sortedFederalHolidays.length > 0 ? (
              sortedFederalHolidays.map((holiday, idx) => (
                <div
                  key={idx}
                  className="flex items-center p-4 bg-white rounded-lg border border-gray-100"
                >
                  <Calendar className="h-4 w-4 mr-3 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900">{holiday.date}</div>
                    <div className="text-sm text-gray-500">{holiday.description}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2">
                <EmptyState
                  icon={CalendarX}
                  title="No federal holidays found"
                  description="Unable to load federal holidays for the current year."
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HolidayList;

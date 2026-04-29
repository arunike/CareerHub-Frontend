import { LinkOutlined, SettingOutlined, StopOutlined } from '@ant-design/icons';
import { useState } from 'react';
import type { ShareLink } from '../../../types';

type Props = {
  shareLink: ShareLink | null;
  shareTitle: string;
  onShareTitleChange: (value: string) => void;
  hostDisplayName: string;
  onHostDisplayNameChange: (value: string) => void;
  hostEmail: string;
  onHostEmailChange: (value: string) => void;
  publicNote: string;
  onPublicNoteChange: (value: string) => void;
  shareDuration: number;
  onShareDurationChange: (value: number) => void;
  bookingBlockMinutes: number;
  onBookingBlockMinutesChange: (value: number) => void;
  bufferMinutes: number;
  onBufferMinutesChange: (value: number) => void;
  maxBookingsPerDay: number;
  onMaxBookingsPerDayChange: (value: number) => void;
  generatingLink: boolean;
  onGenerateShareLink: () => void;
  onCopyShareLink: () => void;
  deactivatingLink: boolean;
  onDeactivateShareLink: () => void;
  getShareLinkUrl: () => string;
  onReset?: () => void;
};

const AvailabilityBookingCard = ({
  shareLink,
  shareTitle,
  onShareTitleChange,
  hostDisplayName,
  onHostDisplayNameChange,
  hostEmail,
  onHostEmailChange,
  publicNote,
  onPublicNoteChange,
  shareDuration,
  onShareDurationChange,
  bookingBlockMinutes,
  onBookingBlockMinutesChange,
  bufferMinutes,
  onBufferMinutesChange,
  maxBookingsPerDay,
  onMaxBookingsPerDayChange,
  generatingLink,
  onGenerateShareLink,
  onCopyShareLink,
  deactivatingLink,
  onDeactivateShareLink,
  getShareLinkUrl,
  onReset,
}: Props) => {
  const [showConfig, setShowConfig] = useState(false);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <LinkOutlined className="text-gray-500" />
            <label className="block text-sm font-medium text-gray-700">Public Booking Link</label>
          </div>
          <p className="text-xs text-gray-500 mb-2">
            People can only see and book your available slots. Event and holiday details stay private.
          </p>
          {shareLink ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <input
                  readOnly
                  value={getShareLinkUrl()}
                  className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm bg-gray-50"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Expires: {new Date(shareLink.expires_at).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Booking duration: {shareLink.booking_block_minutes} minutes per slot
                {shareLink.buffer_minutes ? ` · ${shareLink.buffer_minutes} min buffer` : ''}
                {shareLink.max_bookings_per_day ? ` · max ${shareLink.max_bookings_per_day}/day` : ''}
              </p>
            </>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                <div className="flex flex-col">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 ml-1">
                    Page Title
                  </label>
                  <input
                    value={shareTitle}
                    onChange={(e) => onShareTitleChange(e.target.value)}
                    className="rounded-lg border-gray-300 border px-3 py-2 text-sm bg-white"
                    placeholder="e.g. Book a recruiter screen"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 ml-1">
                    Display Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={hostDisplayName}
                    onChange={(e) => onHostDisplayNameChange(e.target.value)}
                    className={`rounded-lg border px-3 py-2 text-sm bg-white ${
                      !hostDisplayName.trim() && generatingLink ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g. John"
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 ml-1">
                    Host Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={hostEmail}
                    onChange={(e) => onHostEmailChange(e.target.value)}
                    className={`rounded-lg border px-3 py-2 text-sm bg-white ${
                      !hostEmail.trim() && generatingLink ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g. john@example.com"
                    required
                  />
                </div>
                <div className="flex flex-col md:col-span-2 lg:col-span-3">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 ml-1">
                    Recruiter-facing Note
                  </label>
                  <textarea
                    value={publicNote}
                    onChange={(e) => onPublicNoteChange(e.target.value)}
                    className="rounded-lg border-gray-300 border px-3 py-2 text-sm bg-white min-h-20"
                    placeholder="e.g. Please include role, company, and interview format."
                  />
                </div>
              </div>

              {showConfig && (
                <div className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-50 pt-4 animate-in fade-in slide-in-from-top-1 duration-200 sm:grid-cols-2 md:grid-cols-4">
                  <div className="flex flex-col">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 ml-1">
                      Expires In
                    </label>
                    <select
                      value={shareDuration}
                      onChange={(e) => onShareDurationChange(Number(e.target.value))}
                      className="rounded-lg border-gray-300 border px-3 py-2 text-sm bg-white"
                    >
                      <option value={7}>7 days</option>
                      <option value={14}>14 days</option>
                      <option value={30}>30 days</option>
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 ml-1">
                      Duration
                    </label>
                    <select
                      value={bookingBlockMinutes}
                      onChange={(e) => onBookingBlockMinutesChange(Number(e.target.value))}
                      className="rounded-lg border-gray-300 border px-3 py-2 text-sm bg-white"
                    >
                      <option value={15}>15 min</option>
                      <option value={20}>20 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>60 min</option>
                      <option value={90}>90 min</option>
                      <option value={120}>120 min</option>
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 ml-1">
                      Buffer
                    </label>
                    <select
                      value={bufferMinutes}
                      onChange={(e) => onBufferMinutesChange(Number(e.target.value))}
                      className="rounded-lg border-gray-300 border px-3 py-2 text-sm bg-white"
                    >
                      <option value={0}>No buffer</option>
                      <option value={5}>5 min</option>
                      <option value={10}>10 min</option>
                      <option value={15}>15 min</option>
                      <option value={20}>20 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>60 min</option>
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 ml-1">
                      Daily Limit
                    </label>
                    <select
                      value={maxBookingsPerDay}
                      onChange={(e) => onMaxBookingsPerDayChange(Number(e.target.value))}
                      className="rounded-lg border-gray-300 border px-3 py-2 text-sm bg-white"
                    >
                      <option value={0}>No limit</option>
                      <option value={1}>Max 1/day</option>
                      <option value={2}>Max 2/day</option>
                      <option value={3}>Max 3/day</option>
                      <option value={4}>Max 4/day</option>
                      <option value={5}>Max 5/day</option>
                      <option value={8}>Max 8/day</option>
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-2 flex w-full flex-col gap-3 sm:mt-4 sm:flex-row lg:mt-8 lg:w-auto">
          {!shareLink ? (
            <>
              <button
                onClick={() => setShowConfig(!showConfig)}
                className={`min-h-11 px-4 py-2 border text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  showConfig
                    ? 'bg-gray-100 border-gray-300 text-gray-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <SettingOutlined
                  className={
                    showConfig ? 'rotate-90 transition-transform duration-300' : 'transition-transform duration-300'
                  }
                />
                {showConfig ? 'Hide Config' : 'Config'}
              </button>
              <button
                onClick={onGenerateShareLink}
                disabled={generatingLink}
                className="min-h-11 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-70 shadow-sm transition-all active:scale-[0.98]"
              >
                {generatingLink ? 'Generating...' : 'Generate Link'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onCopyShareLink}
                className="min-h-11 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm"
              >
                Copy Link
              </button>
              <button
                onClick={onReset}
                className="min-h-11 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                Create Another
              </button>
              <button
                onClick={onDeactivateShareLink}
                disabled={deactivatingLink}
                className="min-h-11 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                <StopOutlined />
                {deactivatingLink ? 'Deactivating...' : 'Deactivate'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AvailabilityBookingCard;

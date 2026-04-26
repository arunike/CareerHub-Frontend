import { useState } from 'react';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  LinkOutlined,
  LockOutlined,
  StopOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import { Checkbox, Button, Modal, Tooltip, Form, Input, InputNumber, Select } from 'antd';
import type { PublicBooking, ShareLink } from '../../../types';
import BulkActionHeader from '../../../components/BulkActionHeader';

type Props = {
  links: ShareLink[];
  bookings: PublicBooking[];
  onCopyLink: (link: ShareLink) => void;
  onDeactivateLink: (id: number) => void;
  onDeleteLinks?: (ids: number[]) => void;
  onDeleteBookings?: (ids: number[]) => void;
  onDeactivateLinks?: (ids: number[]) => void;
  onToggleLockLinks?: (ids: number[], lock: boolean) => void;
  onToggleLockBookings?: (ids: number[], lock: boolean) => void;
  onBulkUpdateLinks?: (ids: number[], updates: Partial<ShareLink>) => void;
};

const formatTime = (value: string) => {
  if (!value) return '';
  const [hourRaw, minuteRaw] = value.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw || 0);
  if (!Number.isFinite(hour)) return value;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const normalizedHour = hour % 12 || 12;
  return `${normalizedHour}:${String(minute).padStart(2, '0')} ${suffix}`;
};

const PublicBookingManager = ({
  links,
  bookings,
  onCopyLink,
  onDeactivateLink,
  onDeleteLinks,
  onDeleteBookings,
  onDeactivateLinks,
  onToggleLockLinks,
  onToggleLockBookings,
  onBulkUpdateLinks,
}: Props) => {
  const [selectedLinkIds, setSelectedLinkIds] = useState<number[]>([]);
  const [selectedBookingIds, setSelectedBookingIds] = useState<number[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm] = Form.useForm();

  const handleSelectLink = (id: number, checked: boolean) => {
    setSelectedLinkIds((prev) => (checked ? [...prev, id] : prev.filter((i) => i !== id)));
  };

  const handleSelectAllLinks = (checked: boolean) => {
    setSelectedLinkIds(checked ? links.map((l) => l.id) : []);
  };

  const handleSelectBooking = (id: number, checked: boolean) => {
    setSelectedBookingIds((prev) => (checked ? [...prev, id] : prev.filter((i) => i !== id)));
  };

  const handleSelectAllBookings = (checked: boolean) => {
    setSelectedBookingIds(checked ? bookings.map((b) => b.id) : []);
  };

  const handleBulkDeactivateLinks = () => {
    if (onDeactivateLinks) {
      onDeactivateLinks(selectedLinkIds);
      setSelectedLinkIds([]);
    }
  };

  const handleBulkDeleteLinks = () => {
    Modal.confirm({
      title: 'Delete Selected Links',
      content: `Are you sure you want to delete ${selectedLinkIds.length} booking links? This cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      onOk: () => {
        if (onDeleteLinks) {
          onDeleteLinks(selectedLinkIds);
          setSelectedLinkIds([]);
        }
      },
    });
  };

  const handleBulkDeleteBookings = () => {
    Modal.confirm({
      title: 'Delete Selected Bookings',
      content: `Are you sure you want to delete ${selectedBookingIds.length} public bookings?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: () => {
        if (onDeleteBookings) {
          onDeleteBookings(selectedBookingIds);
          setSelectedBookingIds([]);
        }
      },
    });
  };

  const handleBulkToggleLockLinks = (lock: boolean) => {
    if (onToggleLockLinks) {
      onToggleLockLinks(selectedLinkIds, lock);
      setSelectedLinkIds([]);
    }
  };

  const handleBulkToggleLockBookings = (lock: boolean) => {
    if (onToggleLockBookings) {
      onToggleLockBookings(selectedBookingIds, lock);
      setSelectedBookingIds([]);
    }
  };

  const handleOpenBulkEditLinks = () => {
    editForm.resetFields();
    setEditModalVisible(true);
  };

  const handleBulkEditLinksSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      // Only include fields that were actually changed (not empty strings)
      const updates: Partial<ShareLink> = {};
      if (values.title) updates.title = values.title;
      if (values.duration_days) updates.duration_days = values.duration_days;
      if (values.booking_block_minutes) updates.booking_block_minutes = values.booking_block_minutes;
      if (values.max_bookings_per_day !== undefined) updates.max_bookings_per_day = values.max_bookings_per_day;

      if (onBulkUpdateLinks) {
        onBulkUpdateLinks(selectedLinkIds, updates);
        setSelectedLinkIds([]);
        setEditModalVisible(false);
      }
    } catch (e) {
      console.error('Validation failed:', e);
    }
  };

  const isAnyLinkLocked = links.some((l) => selectedLinkIds.includes(l.id) && l.is_locked);
  const isAnyBookingLocked = bookings.some((b) => selectedBookingIds.includes(b.id) && b.is_locked);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-5">
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
        <div className="mb-4">
          <BulkActionHeader
            title={
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <LinkOutlined className="text-blue-500" />
                Public availability links
              </div>
            }
            selectedCount={selectedLinkIds.length}
            totalCount={links.length}
            onSelectAll={handleSelectAllLinks}
            onCancelSelection={() => setSelectedLinkIds([])}
            bulkActions={
              <div className="flex items-center gap-2">
                <Button size="small" icon={<StopOutlined />} onClick={handleBulkDeactivateLinks}>
                  Deactivate
                </Button>
                <Button size="small" icon={<LockOutlined />} onClick={() => handleBulkToggleLockLinks(true)}>
                  Lock
                </Button>
                <Button size="small" icon={<UnlockOutlined />} onClick={() => handleBulkToggleLockLinks(false)}>
                  Unlock
                </Button>
                <Button size="small" icon={<EditOutlined />} onClick={handleOpenBulkEditLinks}>
                  Edit
                </Button>
                <Tooltip title={isAnyLinkLocked ? 'Cannot delete locked links' : ''}>
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleBulkDeleteLinks}
                    disabled={isAnyLinkLocked}
                  >
                    Delete
                  </Button>
                </Tooltip>
              </div>
            }
            defaultActions={
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-100">
                {links.length}
              </span>
            }
          />
          <p className="text-xs text-gray-500 mt-1">Manage every recruiter-facing link you have created.</p>
        </div>

        {links.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-5 text-sm text-gray-500">
            No public links yet. Create one above when you are ready to share availability.
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <div
                key={link.id}
                className={`rounded-xl border transition-all p-4 ${
                  selectedLinkIds.includes(link.id)
                    ? 'border-blue-200 bg-blue-50/30'
                    : 'border-gray-100 bg-slate-50/70'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedLinkIds.includes(link.id)}
                    onChange={(e) => handleSelectLink(link.id, e.target.checked)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-gray-900 m-0">{link.title}</h3>
                          {link.is_locked && <LockOutlined className="text-amber-500 text-xs" />}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border ${
                              link.is_active && !link.is_expired
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-gray-100 text-gray-500 border-gray-200'
                            }`}
                          >
                            {link.is_active && !link.is_expired ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 truncate">/book/{link.uuid}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500">
                          <span>{link.booking_block_minutes} min slots</span>
                          <span>{link.buffer_minutes || 0} min buffer</span>
                          <span>
                            {link.max_bookings_per_day ? `${link.max_bookings_per_day}/day` : 'No daily cap'}
                          </span>
                          <span>Expires {new Date(link.expires_at).toLocaleDateString()}</span>
                        </div>
                        {link.public_note && (
                          <p className="mt-2 text-xs leading-relaxed text-gray-600">{link.public_note}</p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onCopyLink(link)}
                          className="h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-blue-600 hover:border-blue-200 transition-colors"
                          title="Copy booking link"
                        >
                          <CopyOutlined />
                        </button>
                        {link.is_active && !link.is_expired && (
                          <button
                            type="button"
                            onClick={() => onDeactivateLink(link.id)}
                            className="h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-red-600 hover:border-red-200 transition-colors"
                            title="Deactivate link"
                          >
                            <StopOutlined />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
        <div className="mb-4">
          <BulkActionHeader
            title={
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <CalendarOutlined className="text-emerald-500" />
                Public bookings
              </div>
            }
            selectedCount={selectedBookingIds.length}
            totalCount={bookings.length}
            onSelectAll={handleSelectAllBookings}
            onCancelSelection={() => setSelectedBookingIds([])}
            bulkActions={
              <div className="flex items-center gap-2">
                <Button size="small" icon={<LockOutlined />} onClick={() => handleBulkToggleLockBookings(true)}>
                  Lock
                </Button>
                <Button size="small" icon={<UnlockOutlined />} onClick={() => handleBulkToggleLockBookings(false)}>
                  Unlock
                </Button>
                <Tooltip title={isAnyBookingLocked ? 'Cannot delete locked bookings' : ''}>
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleBulkDeleteBookings}
                    disabled={isAnyBookingLocked}
                  >
                    Delete
                  </Button>
                </Tooltip>
              </div>
            }
            defaultActions={
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-100">
                {bookings.length}
              </span>
            }
          />
          <p className="text-xs text-gray-500 mt-1">Recruiter submissions from all public availability links.</p>
        </div>

        {bookings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-5 text-sm text-gray-500">
            No public bookings yet.
          </div>
        ) : (
          <div className="space-y-3 max-h-[540px] overflow-auto pr-1">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className={`rounded-xl border transition-all p-4 ${
                  selectedBookingIds.includes(booking.id)
                    ? 'border-blue-200 bg-blue-50/30 shadow-sm'
                    : 'border-gray-100 bg-white shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedBookingIds.includes(booking.id)}
                    onChange={(e) => handleSelectBooking(booking.id, e.target.checked)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-gray-900 m-0">{booking.name}</h3>
                        {booking.is_locked && <LockOutlined className="text-amber-500 text-xs" />}
                      </div>
                      <CheckCircleOutlined className="text-emerald-500" />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{booking.email}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-100 px-2 py-1">
                        <CalendarOutlined /> {booking.date}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-100 px-2 py-1">
                        <ClockCircleOutlined /> {formatTime(booking.start_time)} - {formatTime(booking.end_time)}{' '}
                        {booking.timezone}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      {booking.share_link_title || 'Public booking link'}
                    </p>
                    {booking.notes && (
                      <p className="mt-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs leading-relaxed text-amber-900">
                        {booking.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bulk Edit Modal for Links */}
      <Modal
        title={`Bulk Edit ${selectedLinkIds.length} Links`}
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={handleBulkEditLinksSubmit}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" className="mt-4">
          <Form.Item name="title" label="Link Title (Optional)">
            <Input placeholder="Leave empty to keep current" />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="duration_days" label="Duration (Days)">
              <InputNumber min={1} max={90} className="w-full" placeholder="Days" />
            </Form.Item>
            <Form.Item name="booking_block_minutes" label="Slot Duration">
              <Select
                placeholder="Select duration"
                options={[
                  { value: 15, label: '15 min' },
                  { value: 30, label: '30 min' },
                  { value: 45, label: '45 min' },
                  { value: 60, label: '60 min' },
                ]}
              />
            </Form.Item>
          </div>
          <Form.Item name="max_bookings_per_day" label="Daily Booking Limit (0 for no limit)">
            <InputNumber min={0} max={20} className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PublicBookingManager;

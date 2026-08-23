import type React from 'react';
import { Card, Tooltip, Button, Pagination } from 'antd';
import { LockOutlined, UnlockOutlined, DeleteOutlined } from '@ant-design/icons';
import type { Event } from '../../types';
import BulkActionHeader from '../../components/BulkActionHeader';
import EventsGrid from './components/EventsGrid';

type Props = {
  events: any;
  eventsTotal: any;
  formatEventTime: any;
  handleBulkDelete: any;
  handleBulkToggleLock: any;
  handleDeleteAction: any;
  handleDuplicate: any;
  handleEdit: any;
  handleSelectAll: any;
  handleSelectChange: any;
  isAnySelectedLocked: any;
  loading: any;
  selectedIds: any;
  setSelectedIds: any;
  toggleLock: any;
  userTimezone: any;
  currentPage: number;
  isMobile: any;
  pageSize: number;
  paginatedEvents: any;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  setPageSize: React.Dispatch<React.SetStateAction<number>>;
  setViewingEvent: React.Dispatch<React.SetStateAction<Event | null>>;
  viewingDay: string | null;
};

const EventsListSection = ({
  currentPage,
  isMobile,
  pageSize,
  paginatedEvents,
  setCurrentPage,
  setPageSize,
  setViewingEvent,
  viewingDay,
  events,
  eventsTotal,
  formatEventTime,
  handleBulkDelete,
  handleBulkToggleLock,
  handleDeleteAction,
  handleDuplicate,
  handleEdit,
  handleSelectAll,
  handleSelectChange,
  isAnySelectedLocked,
  loading,
  selectedIds,
  setSelectedIds,
  toggleLock,
  userTimezone,
}: Props) => (
  <Card
    className="enterprise-section overflow-hidden"
    title={
      <BulkActionHeader
        selectedCount={selectedIds.length}
        totalCount={events.length}
        onSelectAll={handleSelectAll}
        onCancelSelection={() => setSelectedIds([])}
        title="All Events"
        bulkActions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => handleBulkToggleLock(true)} icon={<LockOutlined />}>
              Lock
            </Button>
            <Button onClick={() => handleBulkToggleLock(false)} icon={<UnlockOutlined />}>
              Unlock
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
          </div>
        }
      />
    }
  >
    <EventsGrid
      loading={loading}
      events={paginatedEvents}
      userTimezone={userTimezone}
      onToggleLock={toggleLock}
      onView={setViewingEvent}
      onEdit={(event: Event) => handleEdit(event, viewingDay || undefined)}
      onDuplicate={handleDuplicate}
      onDelete={handleDeleteAction}
      formatEventTime={formatEventTime}
      selectedIds={selectedIds}
      onSelectChange={handleSelectChange}
    />

    {!loading && eventsTotal > pageSize && (
      <div className="flex justify-end mt-6 pb-4 px-4">
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={eventsTotal}
          onChange={(page, size) => {
            setCurrentPage(page);
            if (size && size !== pageSize) {
              setPageSize(size);
              setCurrentPage(1);
            }
          }}
          showSizeChanger
          pageSizeOptions={['12', '24', '48', '96']}
          size={isMobile ? 'small' : undefined}
        />
      </div>
    )}
  </Card>
);

export default EventsListSection;

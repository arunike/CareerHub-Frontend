import { Button, Col, Row, Space, Typography } from 'antd';
import { CopyOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import Modal from '../../../components/MobileModal';
import dayjs from 'dayjs';
import type { Event } from '../../../types';
import {
  confirmEventDeletion,
  type EventDeleteScope,
} from '../../../components/calendarView/confirmCalendarDeletion';

const { Text } = Typography;

type EventViewModalProps = {
  event: Event | null;
  onClose: () => void;
  onEdit: (event: Event) => void;
  onDuplicate?: (event: Event) => void;
  onDelete?: (event: Event, scope: EventDeleteScope) => boolean | void | Promise<boolean | void>;
};

const EventViewModal = ({ event, onClose, onEdit, onDuplicate, onDelete }: EventViewModalProps) => {
  return (
    <Modal
      title={event?.name}
      open={Boolean(event)}
      onCancel={onClose}
      footer={
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
          {event && onDelete && (
            <Button
              danger
              icon={<DeleteOutlined />}
              disabled={event.is_locked}
              title={event.is_locked ? 'Unlock this event to delete it' : undefined}
              className="sm:mr-auto"
              onClick={() => confirmEventDeletion(event, onDelete)}
            >
              Delete
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
          {onDuplicate && event && !event.is_locked && (
            <Button
              icon={<CopyOutlined />}
              onClick={() => {
                onDuplicate(event);
                onClose();
              }}
            >
              Duplicate
            </Button>
          )}
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              if (event) {
                onEdit(event);
                onClose();
              }
            }}
          >
            Edit
          </Button>
        </div>
      }
    >
      {event && (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Text type="secondary">Date</Text>
              <div>{dayjs(event.date).format('MMMM D, YYYY')}</div>
            </Col>
            <Col xs={24} sm={12}>
              <Text type="secondary">Time</Text>
              <div>
                {event.start_time} - {event.end_time}
              </div>
            </Col>
          </Row>
          {event.meeting_link && (
            <div>
              <Text type="secondary">Meeting</Text>
              <div>
                <a href={event.meeting_link} target="_blank" rel="noreferrer">
                  {event.meeting_link}
                </a>
              </div>
            </div>
          )}
          {event.notes && (
            <div>
              <Text type="secondary">Notes</Text>
              <div style={{ whiteSpace: 'pre-wrap' }}>{event.notes}</div>
            </div>
          )}
        </Space>
      )}
    </Modal>
  );
};

export default EventViewModal;

import { Button, Col, Modal, Row, Space, Typography } from 'antd';
import dayjs from 'dayjs';
import type { Event } from '../../../types';

const { Text } = Typography;

type EventViewModalProps = {
  event: Event | null;
  onClose: () => void;
  onEdit: (event: Event) => void;
};

const EventViewModal = ({ event, onClose, onEdit }: EventViewModalProps) => {
  return (
    <Modal
      title={event?.name}
      open={Boolean(event)}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        <Button
          key="edit"
          type="primary"
          onClick={() => {
            if (event) {
              onEdit(event);
              onClose();
            }
          }}
        >
          Edit
        </Button>,
      ]}
    >
      {event && (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Row>
            <Col span={12}>
              <Text type="secondary">Date</Text>
              <div>{dayjs(event.date).format('MMMM D, YYYY')}</div>
            </Col>
            <Col span={12}>
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

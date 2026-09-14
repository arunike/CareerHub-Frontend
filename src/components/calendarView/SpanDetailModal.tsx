import type { ReactNode } from 'react';
import { Button, Col, Row, Space, Typography } from 'antd';
import { CopyOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import Modal from '../MobileModal';

const { Text } = Typography;

export interface SpanDetailField {
  label: string;
  value: ReactNode;
  // Full width instead of a half-width column, for prose like notes.
  wide?: boolean;
}

type SpanDetailModalProps = {
  open: boolean;
  title?: ReactNode;
  fields: SpanDetailField[];
  onClose: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  // Already confirmed by the caller, which owns what deleting one of these means.
  onDelete?: () => void;
  deleteDisabled?: boolean;
  deleteTitle?: string;
  deleteLabel?: string;
};

// The one detail card for anything on the calendar, so an event and time off read the same.
const SpanDetailModal = ({
  open,
  title,
  fields,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  deleteDisabled,
  deleteTitle,
  deleteLabel = 'Delete',
}: SpanDetailModalProps) => (
  <Modal
    title={title}
    open={open}
    onCancel={onClose}
    footer={
      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
        {onDelete && (
          <Button
            danger
            icon={<DeleteOutlined />}
            disabled={deleteDisabled}
            title={deleteTitle}
            className="sm:mr-auto"
            onClick={onDelete}
          >
            {deleteLabel}
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
        {onDuplicate && (
          <Button icon={<CopyOutlined />} onClick={onDuplicate}>
            Duplicate
          </Button>
        )}
        {onEdit && (
          <Button type="primary" icon={<EditOutlined />} onClick={onEdit}>
            Edit
          </Button>
        )}
      </div>
    }
  >
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Row gutter={[16, 16]}>
        {fields
          .filter((field) => !field.wide)
          .map((field) => (
            <Col xs={24} sm={12} key={field.label}>
              <Text type="secondary">{field.label}</Text>
              <div>{field.value}</div>
            </Col>
          ))}
      </Row>
      {fields
        .filter((field) => field.wide)
        .map((field) => (
          <div key={field.label}>
            <Text type="secondary">{field.label}</Text>
            <div style={{ whiteSpace: 'pre-wrap' }}>{field.value}</div>
          </div>
        ))}
    </Space>
  </Modal>
);

export default SpanDetailModal;

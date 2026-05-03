import { type ReactNode, useMemo } from 'react';
import {
  Button,
  Descriptions,
  Drawer,
  Empty,
  List,
  Space,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { downloadDocument } from '../../api';
import type { Document } from '../../types';
import type { CareerApplication } from '../../types/application';
import ApplicationTimelinePanel from './ApplicationTimelinePanel';
import RichNotesEditor from './RichNotesEditor';

type Props = {
  application: CareerApplication | null;
  documents: Document[];
  open: boolean;
  mode?: 'view' | 'edit';
  editContent?: ReactNode;
  appStages?: Array<{ key: string; label: string; shortLabel?: string; tone?: string }>;
  onClose: () => void;
  onCancelEdit?: () => void;
  onEdit: (application: CareerApplication) => void;
  onGenerateCoverLetter: (application: CareerApplication) => void;
  onNotesUpdate?: (id: number, notes: string) => void;
};

const { Text, Title } = Typography;

const statusColor = (status?: string) => {
  if (status === 'OFFER' || status === 'ACCEPTED') return 'green';
  if (status === 'REJECTED') return 'red';
  if (status === 'GHOSTED') return 'default';
  return 'blue';
};

// ----- Main Drawer -----
const ApplicationDetailDrawer = ({
  application,
  documents,
  open,
  mode = 'view',
  editContent,
  appStages = [],
  onClose,
  onCancelEdit,
  onEdit,
  onGenerateCoverLetter,
  onNotesUpdate,
}: Props) => {
  const linkedDocuments = useMemo(
    () => documents.filter((document) => document.application === application?.id),
    [application?.id, documents]
  );

  const companyName = application?.company_details?.name || 'Application';

  const openDocument = async (record: Document) => {
    try {
      const response = await downloadDocument(record.id);
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const blob = new Blob([response.data], { type: contentType });
      const objectUrl = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = objectUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      message.error('Failed to open document');
      console.error(error);
    }
  };

  return (
    <Drawer
      title={
        <div className="min-w-0">
          <Title level={4} className="!mb-1 truncate">
            {companyName}
          </Title>
          <Text type="secondary">{application?.role_title}</Text>
        </div>
      }
      open={open}
      onClose={onClose}
      width={720}
      zIndex={1300}
      styles={{ body: { padding: 0 } }}
      extra={
        application ? (
          <Space>
            {mode === 'edit' ? (
              <Button onClick={onCancelEdit}>Overview</Button>
            ) : (
              <>
                <Button icon={<ThunderboltOutlined />} onClick={() => onGenerateCoverLetter(application)}>
                  Letter
                </Button>
                <Button type="primary" icon={<EditOutlined />} onClick={() => onEdit(application)}>
                  Edit
                </Button>
              </>
            )}
          </Space>
        ) : null
      }
    >
      {!application ? null : mode === 'edit' ? (
        <div className="px-6 py-5">{editContent}</div>
      ) : (
        <div className="px-6 pb-6">
          <Tabs
            defaultActiveKey="overview"
            items={[
              {
                key: 'overview',
                label: 'Overview',
                children: (
                  <div className="space-y-5">
                    <Descriptions column={1} size="small" bordered>
                      <Descriptions.Item label="Status">
                        <Tag color={statusColor(application.status)}>{application.status}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Date Applied">
                        {application.date_applied
                          ? dayjs(application.date_applied).format('MMM D, YYYY')
                          : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Location">
                        {application.office_location || application.location || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Employment Type">
                        {application.employment_type || 'full_time'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Current Round">
                        {application.current_round ?? 0}
                      </Descriptions.Item>
                      <Descriptions.Item label="Job Link">
                        {application.job_link ? (
                          <a href={application.job_link} target="_blank" rel="noreferrer">
                            Open posting
                          </a>
                        ) : (
                          '-'
                        )}
                      </Descriptions.Item>
                    </Descriptions>
                  </div>
                ),
              },
              {
                key: 'timeline',
                label: 'Timeline',
                children: (
                  <ApplicationTimelinePanel application={application} appStages={appStages} />
                ),
              },
              {
                key: 'documents',
                label: 'Documents',
                children:
                  linkedDocuments.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        <span className="text-sm text-slate-400">
                          No documents linked to this application yet.
                        </span>
                      }
                      className="py-10"
                    />
                  ) : (
                    <List
                      dataSource={linkedDocuments}
                      renderItem={(documentRecord) => (
                        <List.Item
                          className="!rounded-xl !border !border-slate-200 !px-4 !py-3 hover:!border-sky-200 hover:!bg-sky-50/30"
                          actions={[
                            <Button
                              key="view"
                              type="primary"
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={() => openDocument(documentRecord)}
                            >
                              View
                            </Button>,
                          ]}
                        >
                          <List.Item.Meta
                            avatar={<FileTextOutlined className="text-base text-slate-500" />}
                            title={
                              <span className="font-semibold text-slate-900">
                                {documentRecord.title}
                              </span>
                            }
                            description={
                              <span
                                className="cursor-pointer text-sky-500 hover:underline"
                                onClick={() => openDocument(documentRecord)}
                              >
                                {documentRecord.file_name || documentRecord.document_type}
                              </span>
                            }
                          />
                          <Tag>{documentRecord.document_type}</Tag>
                        </List.Item>
                      )}
                    />
                  ),
              },
              {
                key: 'notes',
                label: 'Notes',
                children: (
                  <RichNotesEditor
                    key={application.id}
                    applicationId={application.id}
                    initialNotes={application.notes || ''}
                    onSaved={(notes) => onNotesUpdate?.(application.id, notes)}
                  />
                ),
              },
            ]}
          />
        </div>
      )}
    </Drawer>
  );
};

export default ApplicationDetailDrawer;

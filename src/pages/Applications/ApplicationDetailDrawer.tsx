import { lazy, Suspense, type ReactNode, useMemo, useState } from 'react';
import {
  Button,
  Descriptions,
  Drawer,
  Empty,
  Grid,
  List,
  Space,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  CopyOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  UploadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { downloadDocument } from '../../api';
import type { Document } from '../../types';
import type { CareerApplication } from '../../types/application';
import ContactsPanel from '../../components/ContactsPanel';
import InterviewDebriefPanel from './InterviewDebriefPanel';
import UploadDocumentModal from '../Documents/UploadDocumentModal';
import ApplicationPrepWorkspace from './ApplicationPrepWorkspace';
import ApplicationTimelinePanel from './ApplicationTimelinePanel';
import { formatDateOnly } from '../../utils/dateOnly';
import { updateApplication } from '../../api/career';
import { getApiErrorMessage } from '../../utils/apiError';
import { safeExternalHref } from '../../utils/safeUrl';

const RichNotesEditor = lazy(() => import('./RichNotesEditor'));

const RichNotesFallback = () => (
  <div className="space-y-3 py-4" aria-busy="true" aria-label="Loading notes editor">
    <div className="shimmer-bg h-3 w-24 rounded-full" />
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex gap-2 border-b border-slate-100 px-3 py-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="shimmer-bg h-8 w-8 rounded-md" />
        ))}
      </div>
      <div className="space-y-3 px-4 py-5">
        <div className="shimmer-bg h-3 w-full rounded-full" />
        <div className="shimmer-bg h-3 w-5/6 rounded-full" />
        <div className="shimmer-bg h-3 w-2/3 rounded-full" />
      </div>
    </div>
  </div>
);

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
  onDuplicate?: (application: CareerApplication) => void;
  onGenerateCoverLetter: (application: CareerApplication) => void;
  onNotesUpdate?: (id: number, notes: string) => void;
  onSubmittedDocumentsChange?: (id: number, documentIds: number[]) => void;
  onDocumentsChange?: () => void;
};

const { Text, Title } = Typography;

const statusColor = (status?: string) => {
  if (status === 'OFFER' || status === 'ACCEPTED') return 'green';
  if (status === 'REJECTED') return 'red';
  if (status === 'GHOSTED') return 'default';
  return 'blue';
};

const formatStatusLabel = (
  status: string | undefined,
  stages: Array<{ key: string; label: string }>
) => {
  if (!status) return '-';
  return stages.find((stage) => stage.key === status)?.label || status;
};

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
  onDuplicate,
  onGenerateCoverLetter,
  onNotesUpdate,
  onSubmittedDocumentsChange,
  onDocumentsChange,
}: Props) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const linkedDocuments = useMemo(
    () => documents.filter((document) => document.application === application?.id),
    [application?.id, documents]
  );

  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const submittedIds = useMemo(
    () => new Set(application?.submitted_documents ?? []),
    [application?.submitted_documents]
  );

  const toggleSubmitted = async (documentId: number) => {
    if (!application) return;
    const next = new Set(submittedIds);
    if (next.has(documentId)) next.delete(documentId);
    else next.add(documentId);
    try {
      await updateApplication(application.id, { submitted_documents: Array.from(next) });
      onSubmittedDocumentsChange?.(application.id, Array.from(next));
    } catch (error) {
      console.error('Failed to update submitted documents', error);
      message.error(getApiErrorMessage(error, 'Could not update submitted documents'));
    }
  };

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
      width={isMobile ? '100%' : 720}
      zIndex={1300}
      styles={{
        body: { padding: 0 },
        header: { padding: isMobile ? '16px' : '20px 24px' },
      }}
      extra={
        application ? (
          <Space size={8}>
            {mode === 'edit' ? (
              <Button onClick={onCancelEdit} aria-label="Return to application overview">
                <span className="hidden sm:inline">Overview</span>
                <span className="sm:hidden">Back</span>
              </Button>
            ) : (
              <>
                <Button
                  icon={<ThunderboltOutlined />}
                  onClick={() => onGenerateCoverLetter(application)}
                  aria-label="Generate cover letter"
                >
                  <span className="hidden sm:inline">Letter</span>
                </Button>
                {onDuplicate && !application.is_locked && (
                  <Button
                    icon={<CopyOutlined />}
                    onClick={() => onDuplicate(application)}
                    aria-label="Duplicate application"
                  >
                    <span className="hidden sm:inline">Duplicate</span>
                  </Button>
                )}
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => onEdit(application)}
                  aria-label="Edit application"
                >
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              </>
            )}
          </Space>
        ) : null
      }
    >
      {!application ? null : mode === 'edit' ? (
        <div className="px-4 py-5 sm:px-6">{editContent}</div>
      ) : (
        <div className="px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:px-6 sm:pb-6">
          <Tabs
            defaultActiveKey="prep"
            tabBarGutter={20}
            items={[
              {
                key: 'prep',
                label: 'Prep',
                children: (
                  <ApplicationPrepWorkspace
                    application={application}
                    onGenerateCoverLetter={onGenerateCoverLetter}
                  />
                ),
              },
              {
                key: 'overview',
                label: 'Overview',
                children: (
                  <div className="space-y-5">
                    <Descriptions column={1} size="small" bordered>
                      <Descriptions.Item label="Status">
                        <Tag color={statusColor(application.status)}>
                          {formatStatusLabel(application.status, appStages)}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Date Applied">
                        {formatDateOnly(application.date_applied, '-')}
                      </Descriptions.Item>
                      <Descriptions.Item label="Location">
                        {application.office_location || application.location || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Employment Type">
                        {application.employment_type || 'full_time'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Salary Range">
                        {application.salary_range || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Job Link">
                        {application.job_link ? (
                          <a
                            href={safeExternalHref(application.job_link)}
                            target="_blank"
                            rel="noreferrer"
                          >
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
              // From the timeline, so a rejected-after-round-3 application still qualifies.
              ...(application.has_reached_interview
                ? [
                    {
                      key: 'debriefs',
                      label: 'Debriefs',
                      children: (
                        <InterviewDebriefPanel
                          applicationId={application.id}
                          appStages={appStages}
                        />
                      ),
                    },
                  ]
                : []),
              {
                key: 'contacts',
                label: 'Contacts',
                children: <ContactsPanel applicationId={application.id} />,
              },
              {
                key: 'documents',
                label: 'Documents',
                children: (
                  <>
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <p className="text-sm text-slate-500">Files linked to this application.</p>
                      <Button
                        size="small"
                        icon={<UploadOutlined />}
                        className="!rounded-lg !px-3 !text-xs !font-semibold"
                        onClick={() => setIsUploadOpen(true)}
                      >
                        Upload
                      </Button>
                    </div>
                    {linkedDocuments.length === 0 ? (
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
                                key="submitted"
                                size="small"
                                type={submittedIds.has(documentRecord.id) ? 'default' : 'text'}
                                className={
                                  submittedIds.has(documentRecord.id)
                                    ? '!border-emerald-200 !bg-emerald-50 !text-emerald-700'
                                    : '!text-slate-400'
                                }
                                onClick={() => toggleSubmitted(documentRecord.id)}
                                title={
                                  submittedIds.has(documentRecord.id)
                                    ? 'This exact version is recorded as submitted. A newer version will not replace it.'
                                    : 'Record this exact version as the one you submitted'
                                }
                              >
                                {submittedIds.has(documentRecord.id)
                                  ? `Submitted v${documentRecord.version_number ?? 1}`
                                  : 'Mark submitted'}
                              </Button>,
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
                    )}
                  </>
                ),
              },
              {
                key: 'notes',
                label: 'Notes',
                children: (
                  <Suspense fallback={<RichNotesFallback />}>
                    <RichNotesEditor
                      key={application.id}
                      applicationId={application.id}
                      initialNotes={application.notes || ''}
                      onSaved={(notes) => onNotesUpdate?.(application.id, notes)}
                    />
                  </Suspense>
                ),
              },
            ]}
          />
        </div>
      )}
      {isUploadOpen && application && (
        <UploadDocumentModal
          visible={isUploadOpen}
          lockedApplicationId={application.id}
          lockedApplicationLabel={`${application.role_title} @ ${companyName}`}
          onCancel={() => setIsUploadOpen(false)}
          onSuccess={() => {
            setIsUploadOpen(false);
            onDocumentsChange?.();
          }}
        />
      )}
    </Drawer>
  );
};

export default ApplicationDetailDrawer;

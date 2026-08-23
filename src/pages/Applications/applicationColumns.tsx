import { Button, Space, Tooltip, Typography } from 'antd';
import RowActions from '../../components/RowActions';
import { GlobalOutlined, InboxOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { EmploymentTypeBadge, StatusBadge } from './ApplicationBadges';
import type { EmploymentType } from '../../types';
import type { ApplicationOrdering, ApplicationStage } from './applicationTypes';
import type { CareerApplication } from '../../types/application';
import { dayjsDateOnlyLocal, formatDateOnly } from '../../utils/dateOnly';

const { Text, Link } = Typography;

type Handlers = {
  appStages: ApplicationStage[];
  empTypes: EmploymentType[];
  openDetailDrawer: (app: CareerApplication) => void;
  openEditDrawer: (app: CareerApplication) => void;
  handleDelete: (id: number) => void;
  handleDuplicateApplication: (app: CareerApplication) => void;
  toggleLock: (app: CareerApplication) => void;
  setCoverLetterApp: (app: CareerApplication | null) => void;
  applicationOrdering: ApplicationOrdering;
};

// The table columns, kept out of the page so the render body reads as layout.
export const buildApplicationColumns = ({
  appStages,
  empTypes,
  openDetailDrawer,
  openEditDrawer,
  handleDelete,
  handleDuplicateApplication,
  toggleLock,
  setCoverLetterApp,
  applicationOrdering,
}: Handlers) => [
  {
    title: 'Company',
    key: 'company',
    render: (_: unknown, record: CareerApplication) => (
      <Space direction="vertical" size={0}>
        <Button
          type="link"
          className="!h-auto !p-0 !font-semibold"
          onClick={() => openDetailDrawer(record)}
        >
          {record.company_details?.name}
        </Button>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {record.office_location || record.location || '—'}
        </Text>
      </Space>
    ),
    sorter: (a: CareerApplication, b: CareerApplication) =>
      (a.company_details?.name || '').localeCompare(b.company_details?.name || ''),
    defaultSortOrder: 'ascend' as const,
  },
  {
    title: 'Role',
    dataIndex: 'role_title',
    key: 'role',
    render: (text: string, record: CareerApplication) => (
      <Space direction="vertical" size={2}>
        <Space size={6} align="center">
          <Text>{text}</Text>
          <EmploymentTypeBadge type={record.employment_type} employmentTypes={empTypes} />
        </Space>
        {record.job_link && (
          <Link href={record.job_link} target="_blank" style={{ fontSize: 12 }}>
            <GlobalOutlined /> Link
          </Link>
        )}
      </Space>
    ),
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (status: string) => <StatusBadge status={status} stages={appStages} />,
    sorter: true,
    sortOrder:
      applicationOrdering === 'status'
        ? ('ascend' as const)
        : applicationOrdering === '-status'
          ? ('descend' as const)
          : undefined,
  },
  {
    title: 'Date Applied',
    dataIndex: 'date_applied',
    key: 'date_applied',
    render: (date: string) => formatDateOnly(date, '—'),
    sorter: (a: CareerApplication, b: CareerApplication) =>
      (dayjsDateOnlyLocal(a.date_applied)?.valueOf() ?? 0) -
      (dayjsDateOnlyLocal(b.date_applied)?.valueOf() ?? 0),
  },
  {
    title: 'Actions',
    key: 'actions',
    render: (_: unknown, record: CareerApplication) => (
      <Space>
        <Tooltip title="Details">
          <Button
            type="text"
            size="small"
            icon={<InboxOutlined style={{ color: '#334155' }} />}
            onClick={() => openDetailDrawer(record)}
            aria-label={`View ${record.company_details?.name || 'application'} details`}
          />
        </Tooltip>
        <Tooltip title="Generate Cover Letter">
          <Button
            type="text"
            size="small"
            icon={<ThunderboltOutlined style={{ color: '#0ea5e9' }} />}
            onClick={() => setCoverLetterApp(record)}
            aria-label={`Generate cover letter for ${record.company_details?.name || 'application'}`}
          />
        </Tooltip>
        <RowActions
          size="middle"
          isLocked={record.is_locked}
          onToggleLock={() => toggleLock(record)}
          onEdit={() => openEditDrawer(record)}
          onDuplicate={record.is_locked ? undefined : () => handleDuplicateApplication(record)}
          onDelete={() => handleDelete(record.id)}
          disableDelete={record.is_locked}
        />
      </Space>
    ),
  },
];

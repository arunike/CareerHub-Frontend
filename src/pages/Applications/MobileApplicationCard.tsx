import { Button, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  GlobalOutlined,
  InboxOutlined,
  LockOutlined,
  MoreOutlined,
  ThunderboltOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import type { EmploymentType } from '../../types';
import type { CareerApplication } from '../../types/application';
import { formatDateOnly } from '../../utils/dateOnly';
import { EmploymentTypeBadge, StatusBadge } from './ApplicationBadges';
import type { ApplicationStage } from './applicationTypes';
import SelectionCheckbox from '../../components/SelectionCheckbox';

type Props = {
  application: CareerApplication;
  applicationStages: ApplicationStage[];
  employmentTypes: EmploymentType[];
  selected: boolean;
  onSelectionChange: (selected: boolean) => void;
  onViewDetails: () => void;
  onGenerateLetter: () => void;
  onEdit: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
};

const MobileApplicationCard = ({
  application,
  applicationStages,
  employmentTypes,
  selected,
  onSelectionChange,
  onViewDetails,
  onGenerateLetter,
  onEdit,
  onToggleLock,
  onDelete,
}: Props) => {
  const companyName = application.company_details?.name || 'Unknown company';
  const menuItems: MenuProps['items'] = [
    ...(application.job_link
      ? [
          {
            key: 'open-link',
            label: 'Open job posting',
            icon: <GlobalOutlined />,
          },
        ]
      : []),
    {
      key: 'edit',
      label: 'Edit application',
      icon: <EditOutlined />,
    },
    {
      key: 'toggle-lock',
      label: application.is_locked ? 'Unlock application' : 'Lock application',
      icon: application.is_locked ? <UnlockOutlined /> : <LockOutlined />,
    },
    { type: 'divider' },
    {
      key: 'delete',
      label: application.is_locked ? 'Delete (unlock first)' : 'Delete application',
      icon: <DeleteOutlined />,
      danger: true,
      disabled: application.is_locked,
    },
  ];

  const handleMenuAction: MenuProps['onClick'] = ({ key, domEvent }) => {
    domEvent.stopPropagation();
    if (key === 'open-link') {
      window.open(application.job_link || '', '_blank', 'noopener,noreferrer');
    } else if (key === 'edit') {
      onEdit();
    } else if (key === 'toggle-lock') {
      onToggleLock();
    } else if (key === 'delete' && !application.is_locked) {
      onDelete();
    }
  };

  return (
    <article
      className={`enterprise-card p-4 ${selected ? 'border-blue-200 ring-2 ring-blue-100' : ''}`}
    >
      <div className="flex items-start gap-3">
        <SelectionCheckbox
          selectionLabel={`${companyName} ${application.role_title}`}
          checked={selected}
          onChange={(event) => onSelectionChange(event.target.checked)}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-base font-semibold text-slate-900">{companyName}</div>
              <div className="mt-1 text-sm text-slate-600">{application.role_title}</div>
            </div>
            <StatusBadge status={application.status} stages={applicationStages} />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
              Applied {formatDateOnly(application.date_applied, 'Unknown')}
            </span>
            {application.office_location || application.location ? (
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                {application.office_location || application.location}
              </span>
            ) : null}
            <EmploymentTypeBadge
              type={application.employment_type}
              employmentTypes={employmentTypes}
            />
            {application.is_locked ? (
              <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                Locked
              </span>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_48px] gap-2">
            <Button
              size="large"
              icon={<InboxOutlined />}
              className="!font-semibold"
              onClick={onViewDetails}
            >
              Details
            </Button>
            <Button size="large" icon={<ThunderboltOutlined />} onClick={onGenerateLetter}>
              Letter
            </Button>
            <Dropdown
              trigger={['click']}
              placement="bottomRight"
              menu={{ items: menuItems, onClick: handleMenuAction }}
            >
              <Button
                size="large"
                icon={<MoreOutlined />}
                aria-label={`More actions for ${companyName}`}
                className="!w-12 !px-0"
              />
            </Dropdown>
          </div>
        </div>
      </div>
    </article>
  );
};

export default MobileApplicationCard;

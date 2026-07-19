import {
  CalendarOutlined,
  CheckSquareOutlined,
  DollarOutlined,
  FileAddOutlined,
  ImportOutlined,
  RobotOutlined,
  ScheduleOutlined,
  SolutionOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { Drawer } from 'antd';
import { MOBILE_NAVIGATION_ITEMS } from '../constants/mobileNavigation';

const ACTIONS = {
  application: {
    key: 'application',
    label: 'Add application',
    description: 'Track a new opportunity',
    destination: '/applications?action=create',
    icon: SolutionOutlined,
  },
  jobImport: {
    key: 'job-import',
    label: 'Import job link',
    description: 'Extract details from a job posting',
    destination: '/applications?action=job-import',
    icon: ImportOutlined,
  },
  event: {
    key: 'event',
    label: 'Add event',
    description: 'Schedule an interview or follow-up',
    destination: '/events?action=create',
    icon: CalendarOutlined,
  },
  holiday: {
    key: 'holiday',
    label: 'Add holiday',
    description: 'Block one day or a date range',
    destination: '/holidays?action=create',
    icon: ScheduleOutlined,
  },
  task: {
    key: 'task',
    label: 'Add task',
    description: 'Capture the next action',
    destination: '/tasks?action=create',
    icon: CheckSquareOutlined,
  },
  document: {
    key: 'document',
    label: 'Add document',
    description: 'Upload a resume or supporting file',
    destination: '/documents?action=upload',
    icon: FileAddOutlined,
  },
  currentJob: {
    key: 'current-job',
    label: 'Add current job',
    description: 'Create the comparison baseline',
    destination: '/offers?action=current-job',
    icon: DollarOutlined,
  },
  scenario: {
    key: 'scenario',
    label: 'Add scenario',
    description: 'Compare a hypothetical offer',
    destination: '/offers?action=scenario',
    icon: DollarOutlined,
  },
  experience: {
    key: 'experience',
    label: 'Add experience',
    description: 'Record a role or internship',
    destination: '/experience?action=create',
    icon: TrophyOutlined,
  },
  experienceImport: {
    key: 'experience-import',
    label: 'Import experience',
    description: 'Restore structured work history',
    destination: '/experience?action=import',
    icon: ImportOutlined,
  },
  jdReports: {
    key: 'jd-reports',
    label: 'View JD reports',
    description: 'Review saved job matches',
    destination: '/jd-reports',
    icon: RobotOutlined,
  },
} as const;

type QuickAction = (typeof ACTIONS)[keyof typeof ACTIONS];

const GLOBAL_ACTIONS: QuickAction[] = [
  ACTIONS.application,
  ACTIONS.event,
  ACTIONS.task,
  ACTIONS.document,
];

const ACTIONS_BY_SOURCE: Record<string, QuickAction[]> = {
  '/': [ACTIONS.event, ACTIONS.holiday, ACTIONS.task],
  '/applications': [ACTIONS.application, ACTIONS.jobImport, ACTIONS.task],
  '/events': [ACTIONS.event, ACTIONS.holiday, ACTIONS.task],
  '/holidays': [ACTIONS.holiday, ACTIONS.event],
  '/offers': [ACTIONS.currentJob, ACTIONS.scenario, ACTIONS.application],
  '/documents': [ACTIONS.document, ACTIONS.application],
  '/tasks': [ACTIONS.task, ACTIONS.application],
  '/experience': [ACTIONS.experience, ACTIONS.experienceImport, ACTIONS.jdReports],
  '/jd-reports': [ACTIONS.jdReports, ACTIONS.experience],
  '/ai-tools?tab=cover-letters': [ACTIONS.application, ACTIONS.document],
  '/ai-tools?tab=negotiation-results': [ACTIONS.currentJob, ACTIONS.scenario],
  '/ai-tools?tab=promotion-reviews': [ACTIONS.experience, ACTIONS.jdReports],
  '/analytics': [ACTIONS.application, ACTIONS.task, ACTIONS.event],
};

interface MobileQuickActionsProps {
  open: boolean;
  sourceKey?: string;
  onClose: () => void;
  onNavigate: (destination: string) => void;
}

const MobileQuickActions = ({ open, sourceKey, onClose, onNavigate }: MobileQuickActionsProps) => {
  const sourceItem = MOBILE_NAVIGATION_ITEMS.find((item) => item.key === sourceKey);
  const actions = sourceKey ? ACTIONS_BY_SOURCE[sourceKey] || GLOBAL_ACTIONS : GLOBAL_ACTIONS;
  const HeaderIcon = sourceItem?.icon || ThunderboltOutlined;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="bottom"
      height="auto"
      closable={false}
      rootClassName="careerhub-quick-actions-drawer"
      styles={{ body: { padding: 0 } }}
    >
      <div className="mx-auto w-full max-w-xl px-4 pb-[calc(18px+env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300" aria-hidden="true" />
        <div className="mb-4 flex items-center gap-3 px-1">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <HeaderIcon />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {sourceItem ? `${sourceItem.label} actions` : 'Quick actions'}
            </h2>
            <p className="text-sm text-slate-600">
              {sourceItem
                ? `Start a common ${sourceItem.label.toLowerCase()} task.`
                : 'Start a common task without hunting through menus.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.key}
                type="button"
                onClick={() => onNavigate(action.destination)}
                className="group min-h-[96px] rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.98]"
              >
                <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-base text-slate-700 transition-colors group-hover:bg-white group-hover:text-blue-600">
                  <Icon />
                </span>
                <span className="block text-sm font-bold text-slate-900">{action.label}</span>
                <span className="mt-0.5 block text-xs leading-4 text-slate-600">
                  {action.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </Drawer>
  );
};

export default MobileQuickActions;

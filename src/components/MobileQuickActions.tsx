import {
  CalendarOutlined,
  CheckSquareOutlined,
  DollarOutlined,
  FileAddOutlined,
  ImportOutlined,
  ScheduleOutlined,
  SolutionOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { Drawer } from 'antd';
import { MOBILE_NAVIGATION_ITEMS, type MobileNavigationKey } from '../constants/mobileNavigation';

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
} as const;

type QuickAction = (typeof ACTIONS)[keyof typeof ACTIONS];

type QuickActionGroup = {
  description: string;
  actions: readonly QuickAction[];
};

const ACTION_GROUPS_BY_SOURCE = {
  '/applications': {
    description: 'Track opportunities or import a job posting.',
    actions: [ACTIONS.application, ACTIONS.jobImport],
  },
  '/events': {
    description: 'Schedule an interview or follow-up.',
    actions: [ACTIONS.event],
  },
  '/holidays': {
    description: 'Add a personal holiday or blocked date.',
    actions: [ACTIONS.holiday],
  },
  '/offers': {
    description: 'Set up a baseline or comparison scenario.',
    actions: [ACTIONS.currentJob, ACTIONS.scenario],
  },
  '/documents': {
    description: 'Add a resume or another supporting file.',
    actions: [ACTIONS.document],
  },
  '/tasks': {
    description: 'Capture a next step or reminder.',
    actions: [ACTIONS.task],
  },
  '/experience': {
    description: 'Add or import your work history.',
    actions: [ACTIONS.experience, ACTIONS.experienceImport],
  },
} as const satisfies Partial<Record<MobileNavigationKey, QuickActionGroup>>;

type QuickActionSourceKey = keyof typeof ACTION_GROUPS_BY_SOURCE;

const isQuickActionSourceKey = (sourceKey: string): sourceKey is QuickActionSourceKey =>
  Object.prototype.hasOwnProperty.call(ACTION_GROUPS_BY_SOURCE, sourceKey);

const getQuickActionGroup = (sourceKey?: string) =>
  sourceKey && isQuickActionSourceKey(sourceKey) ? ACTION_GROUPS_BY_SOURCE[sourceKey] : undefined;

export const hasMobileQuickActionsForSource = (sourceKey: string) =>
  Boolean(getQuickActionGroup(sourceKey)?.actions.length);

interface MobileQuickActionsProps {
  open: boolean;
  sourceKey?: string;
  onClose: () => void;
  onNavigate: (destination: string) => void;
}

const MobileQuickActions = ({ open, sourceKey, onClose, onNavigate }: MobileQuickActionsProps) => {
  const sourceItem = MOBILE_NAVIGATION_ITEMS.find((item) => item.key === sourceKey);
  const actionGroup = getQuickActionGroup(sourceKey);
  const HeaderIcon = sourceItem?.icon;

  if (!sourceItem || !HeaderIcon || !actionGroup) return null;

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
            <h2 className="text-base font-bold text-slate-900">{sourceItem.label} actions</h2>
            <p className="text-sm text-slate-600">{actionGroup.description}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {actionGroup.actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.key}
                type="button"
                onClick={() => onNavigate(action.destination)}
                className="group flex min-h-[76px] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.98]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-base text-slate-700 transition-colors group-hover:bg-white group-hover:text-blue-600">
                  <Icon />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900">{action.label}</span>
                  <span className="mt-0.5 block text-xs leading-4 text-slate-600">
                    {action.description}
                  </span>
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

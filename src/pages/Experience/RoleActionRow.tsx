import type { ReactNode } from 'react';
import { Button, Tooltip } from 'antd';
import {
  LinkOutlined,
  RiseOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons';

// Two per row at 8px gap.
const HALF = 'basis-[calc(50%-0.25rem)] sm:basis-auto';
const REVEAL = 'opacity-100 transition-all duration-200 lg:opacity-0 lg:group-hover:opacity-100';

const ACTION_BUTTON = 'w-full justify-center whitespace-nowrap sm:w-auto';

const RoleActionRow = ({
  onPromotion,
  onTeamNorms,
  onContacts,
  onRaiseHistory,
  onLinkOffer,
  trailing,
  className = '',
}: {
  onPromotion: () => void;
  onTeamNorms: () => void;
  onContacts?: () => void;
  onRaiseHistory?: () => void;
  // Shown in Raise History's place when there is no offer to read raises from.
  onLinkOffer?: () => void;
  // Edit / duplicate / delete.
  trailing?: ReactNode;
  className?: string;
}) => (
  <div
    className={`experience-card-actions flex w-full min-w-0 flex-wrap items-center gap-2 lg:w-auto lg:max-w-[55%] lg:justify-end ${className}`}
  >
    <Tooltip title="Evaluate promotion readiness for this role">
      <div className={`${HALF} ${REVEAL}`}>
        <Button
          size="small"
          icon={<RiseOutlined />}
          onClick={onPromotion}
          className={`${ACTION_BUTTON} text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/25 bg-indigo-50 dark:bg-indigo-500/10 hover:!bg-indigo-100 dark:hover:!bg-indigo-500/15 hover:!border-indigo-300 dark:hover:!border-indigo-500/30 hover:!text-indigo-700 dark:hover:!text-indigo-300`}
        >
          Promotion
        </Button>
      </div>
    </Tooltip>
    <Tooltip title="View / edit team norms for this role">
      <div className={`${HALF} ${REVEAL}`}>
        <Button
          size="small"
          icon={<TeamOutlined />}
          onClick={onTeamNorms}
          className={`${ACTION_BUTTON} text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-500/25 bg-blue-50 dark:bg-blue-500/10 hover:!bg-blue-100 dark:hover:!bg-blue-500/15 hover:!border-blue-300 dark:hover:!border-blue-500/30 hover:!text-blue-700 dark:hover:!text-blue-300`}
        >
          Team Norms
        </Button>
      </div>
    </Tooltip>
    {onContacts && (
      <Tooltip title="People you worked with, plus anyone from the application that led here">
        <div className={`${HALF} ${REVEAL}`}>
          <Button
            size="small"
            icon={<UserOutlined />}
            onClick={onContacts}
            className={`${ACTION_BUTTON} text-slate-600 dark:text-ink-200 border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-ink-900 hover:!bg-slate-100 dark:hover:!bg-ink-800 hover:!border-slate-300 dark:hover:!border-white/[0.12] hover:!text-slate-700 dark:hover:!text-ink-100`}
          >
            Contacts
          </Button>
        </div>
      </Tooltip>
    )}
    {onRaiseHistory ? (
      <Tooltip title="View / edit raise history for this role">
        <div className={`${HALF} ${REVEAL}`}>
          <Button
            size="small"
            icon={<TrophyOutlined />}
            onClick={onRaiseHistory}
            className={`${ACTION_BUTTON} text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 hover:!bg-amber-100 dark:hover:!bg-amber-500/15 hover:!border-amber-300 dark:hover:!border-amber-500/30 hover:!text-amber-700 dark:hover:!text-amber-300`}
          >
            Raise History
          </Button>
        </div>
      </Tooltip>
    ) : onLinkOffer ? (
      <Tooltip title="Open Edit to link an offer and track raises">
        <div className={`${HALF} ${REVEAL}`}>
          <Button
            size="small"
            icon={<LinkOutlined />}
            onClick={onLinkOffer}
            className={`${ACTION_BUTTON} border-gray-200 dark:border-white/[0.08] text-gray-400 dark:text-ink-500 hover:!border-blue-300 dark:hover:!border-blue-500/30 hover:!text-blue-600 dark:hover:!text-blue-300`}
          >
            Link Offer
          </Button>
        </div>
      </Tooltip>
    ) : null}
    {trailing && (
      <div className={`flex basis-full justify-end sm:basis-auto ${REVEAL}`}>{trailing}</div>
    )}
  </div>
);

export default RoleActionRow;

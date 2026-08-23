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
          className={`${ACTION_BUTTON} text-indigo-600 border-indigo-200 bg-indigo-50 hover:!bg-indigo-100 hover:!border-indigo-300 hover:!text-indigo-700`}
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
          className={`${ACTION_BUTTON} text-blue-600 border-blue-200 bg-blue-50 hover:!bg-blue-100 hover:!border-blue-300 hover:!text-blue-700`}
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
            className={`${ACTION_BUTTON} text-slate-600 border-slate-200 bg-slate-50 hover:!bg-slate-100 hover:!border-slate-300 hover:!text-slate-700`}
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
            className={`${ACTION_BUTTON} text-amber-600 border-amber-200 bg-amber-50 hover:!bg-amber-100 hover:!border-amber-300 hover:!text-amber-700`}
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
            className={`${ACTION_BUTTON} border-gray-200 text-gray-400 hover:!border-blue-300 hover:!text-blue-600`}
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

import type React from 'react';
import { FlagOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { type DeadlineItem } from './notificationDeadlines';

type Props = {
  deadlines: DeadlineItem[];
  markTaskDone: (taskId: number, deadlineId: string, e: React.MouseEvent) => void;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  snoozeDeadline: (deadlineId: string, e: React.MouseEvent) => void;
};

const DeadlineRadarSection = ({ deadlines, markTaskDone, setIsOpen, snoozeDeadline }: Props) => (
  <div className="bg-amber-50/40">
    <div className="px-3 py-2 text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
      <FlagOutlined className="text-xs" />
      Deadline Radar
    </div>
    {deadlines.map((deadline) => (
      <div key={deadline.id} className="p-3 hover:bg-amber-50 transition-colors">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <div className="text-xs font-medium text-gray-900 truncate">{deadline.title}</div>
            <div className="text-[11px] text-gray-600 mt-1">{deadline.subtitle}</div>
          </div>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap font-medium ${
              deadline.priority === 'P0'
                ? 'bg-red-100 text-red-700'
                : deadline.priority === 'P1'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-blue-100 text-blue-700'
            }`}
          >
            {deadline.dueLabel}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <Link
            to={deadline.linkTo}
            className="inline-flex min-h-11 items-center text-xs font-semibold text-blue-600 hover:text-blue-700"
            onClick={() => setIsOpen(false)}
          >
            Open
          </Link>
          <div className="flex items-center gap-2">
            {deadline.kind === 'task' && deadline.taskId != null && (
              <button
                type="button"
                onClick={(e) => markTaskDone(deadline.taskId!, deadline.id, e)}
                className="min-h-11 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-600 hover:text-white"
              >
                Done
              </button>
            )}
            <button
              type="button"
              onClick={(e) => snoozeDeadline(deadline.id, e)}
              className="min-h-11 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100"
            >
              Dismiss 1d
            </button>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default DeadlineRadarSection;

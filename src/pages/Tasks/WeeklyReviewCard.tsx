import { Card, Empty } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { WeeklyReview } from '../../types';
import { PageState } from '../../components/PageState';

type Props = {
  fetchWeeklyReview: () => void;
  loading: boolean;
  weeklyReview: WeeklyReview | null;
  weeklyReviewLoadFailed: boolean;
  weeklyReviewLoading: boolean;
};

const WeeklyReviewCard = ({
  fetchWeeklyReview,
  weeklyReview,
  weeklyReviewLoadFailed,
  weeklyReviewLoading,
}: Props) => (
  <Card title="Weekly Review" loading={weeklyReviewLoading} className="enterprise-section">
    {weeklyReviewLoadFailed ? (
      <PageState
        tone="error"
        title="Weekly review could not be loaded"
        description="Your action items were not changed. Check your connection and try again."
        actionLabel="Retry weekly review"
        onAction={() => void fetchWeeklyReview()}
        icon={<InboxOutlined />}
        className="my-1"
      />
    ) : weeklyReview ? (
      <div className="space-y-3">
        <div className="text-sm text-gray-600 dark:text-ink-200">
          {dayjs(weeklyReview.start_date).format('MMM D')} -{' '}
          {dayjs(weeklyReview.end_date).format('MMM D, YYYY')}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="enterprise-kpi min-w-0 px-2 py-2 sm:px-3">
            <div className="text-xs text-gray-500 dark:text-ink-400 uppercase tracking-wide">
              Applications Sent
            </div>
            <div className="text-2xl font-semibold">{weeklyReview.applications_sent}</div>
          </div>
          <div className="enterprise-kpi min-w-0 px-2 py-2 sm:px-3">
            <div className="text-xs text-gray-500 dark:text-ink-400 uppercase tracking-wide">
              Interviews Done
            </div>
            <div className="text-2xl font-semibold">{weeklyReview.interviews_done}</div>
          </div>
          <div className="enterprise-kpi min-w-0 px-2 py-2 sm:px-3">
            <div className="text-xs text-gray-500 dark:text-ink-400 uppercase tracking-wide">
              Next Actions
            </div>
            <div className="text-2xl font-semibold">{weeklyReview.next_actions_count}</div>
          </div>
        </div>
        <div className="enterprise-card-list-item px-3 py-2 text-sm text-gray-700 dark:text-ink-100">
          {weeklyReview.summary_text}
        </div>
        {weeklyReview.next_actions.length > 0 ? (
          <div className="space-y-2">
            <div className="text-sm font-medium">Top Next Actions</div>
            <div className="space-y-1">
              {weeklyReview.next_actions.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="enterprise-card-list-item flex items-center justify-between px-2 py-1 text-sm"
                >
                  <span className="truncate pr-3">{item.title}</span>
                  <span
                    className={`text-xs ${item.is_overdue ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-ink-400'}`}
                  >
                    {item.due_date ? dayjs(item.due_date).format('YYYY-MM-DD') : 'No due date'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    ) : (
      <Empty description="No weekly review available" />
    )}
  </Card>
);

export default WeeklyReviewCard;

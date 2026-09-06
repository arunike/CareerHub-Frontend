import React from 'react';
import { Input, Tag, Typography } from 'antd';
import { BulbOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { PromotionReviewResult } from '../../lib/browserAi';
import type { StoredPromotionReview } from '../../utils/aiArtifactStorage';
import { parseInlineMarkdown } from '../../utils/simpleMarkdown';
import { asList, checklistToneClass, optionalFieldGroups } from './promotionReviewFields';

const { Text, Title } = Typography;
const { TextArea } = Input;

const ListBlock: React.FC<{ items?: string[]; empty?: string }> = ({ items, empty }) => {
  const rows = asList(items);
  if (!rows.length) return <Text type="secondary">{empty || 'No items provided.'}</Text>;
  return (
    <ul className="m-0 pl-5 space-y-1.5">
      {rows.map((item, index) => (
        <li
          key={`${item}-${index}`}
          className="text-sm leading-relaxed text-gray-700 dark:text-ink-100"
        >
          {parseInlineMarkdown(item)}
        </li>
      ))}
    </ul>
  );
};

export const ContextField: React.FC<{
  field: (typeof optionalFieldGroups)[number]['fields'][number];
  value: string;
  onChange: (value: string) => void;
}> = ({ field, value, onChange }) => (
  <label className={field.rows && field.rows >= 4 ? 'md:col-span-2 block' : 'block'}>
    <span className="mb-2 block text-[12px] font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-400">
      {field.label}
      {field.required && <span className="ml-1 text-blue-600 dark:text-blue-300">Required</span>}
    </span>
    {field.rows ? (
      <TextArea
        value={value}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) =>
          onChange(event.target.value)
        }
        placeholder={field.placeholder}
        rows={field.rows}
        className="!rounded-xl !border-slate-200 dark:!border-white/[0.08] !bg-white dark:!bg-ink-900 !px-3 !py-3 !text-[14px] !leading-relaxed shadow-[0_1px_0_rgba(15,23,42,0.03)] placeholder:!text-slate-400 dark:!text-ink-500 hover:!border-slate-300 dark:hover:!border-white/[0.12] focus:!border-slate-400 dark:focus:!border-white/[0.16] focus:!shadow-none"
      />
    ) : (
      <Input
        value={value}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) =>
          onChange(event.target.value)
        }
        placeholder={field.placeholder}
        className="!h-11 !rounded-xl !border-slate-200 dark:!border-white/[0.08] !bg-white dark:!bg-ink-900 !px-3 !text-[14px] shadow-[0_1px_0_rgba(15,23,42,0.03)] placeholder:!text-slate-400 dark:!text-ink-500 hover:!border-slate-300 dark:hover:!border-white/[0.12] focus:!border-slate-400 dark:focus:!border-white/[0.16] focus:!shadow-none"
      />
    )}
  </label>
);

export const EvidenceRow: React.FC<{ label: string; tone?: 'good' | 'muted' }> = ({
  label,
  tone = 'muted',
}) => (
  <div className="flex items-start gap-3 rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-white dark:bg-ink-900 p-4">
    <div
      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
        tone === 'good'
          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
          : 'bg-slate-100 dark:bg-ink-800 text-slate-500 dark:text-ink-400'
      }`}
    >
      <CheckCircleOutlined className="text-[12px]" />
    </div>
    <span className="text-sm font-medium leading-6 text-slate-700 dark:text-ink-100">{label}</span>
  </div>
);

export const PromotionReviewResultView: React.FC<{
  result: PromotionReviewResult;
  activeReviewId: string | null;
  historyReviews: StoredPromotionReview[];
}> = ({ activeReviewId, result, historyReviews }) => (
  <div className="space-y-6">
    {result.promotion_prediction && (
      <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Text className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-ink-400">
              Prediction
            </Text>
            <Title
              level={4}
              className="!mb-0 !mt-1 !text-base !font-bold text-slate-950 dark:text-ink-50"
            >
              Promotion chances and timing
            </Title>
          </div>
          <div className="rounded-2xl border border-blue-100 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 px-5 py-3 text-center">
            <div className="text-3xl font-black leading-none text-blue-700 dark:text-blue-300">
              {result.promotion_prediction.probability_percent}%
            </div>
            <div className="mt-1 text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">
              {result.promotion_prediction.chance_label} chance
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-ink-900 p-4">
            <Text className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-ink-400">
              Likely
            </Text>
            <Text className="mt-1 block text-sm font-bold text-slate-950 dark:text-ink-50">
              {result.promotion_prediction.likely_timeline}
            </Text>
          </div>
          <div className="rounded-xl border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/10 p-4">
            <Text className="block text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              Best case
            </Text>
            <Text className="mt-1 block text-sm font-bold text-emerald-950">
              {result.promotion_prediction.earliest_reasonable_timeline}
            </Text>
          </div>
          <div className="rounded-xl border border-amber-100 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/10 p-4">
            <Text className="block text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              If gaps remain
            </Text>
            <Text className="mt-1 block text-sm font-bold text-amber-950">
              {result.promotion_prediction.latest_likely_timeline}
            </Text>
          </div>
        </div>
        <p className="mb-0 mt-4 text-sm leading-6 text-slate-700 dark:text-ink-100">
          {parseInlineMarkdown(result.promotion_prediction.rationale)}
        </p>
        {historyReviews.filter((review) => review.review?.promotion_prediction).length > 1 && (
          <div className="mt-4 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-ink-900 p-4">
            <Text className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-ink-400">
              Prediction history
            </Text>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {historyReviews
                .filter((review) => review.review?.promotion_prediction)
                .slice(0, 5)
                .reverse()
                .map((review) => (
                  <Tag
                    key={review.id}
                    className={`m-0 rounded-full px-3 py-1 text-xs font-bold ${
                      review.id === activeReviewId
                        ? 'border-blue-200 dark:border-blue-500/25 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300'
                        : 'border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 text-slate-600 dark:text-ink-200'
                    }`}
                  >
                    {review.review.promotion_prediction?.probability_percent}%
                  </Tag>
                ))}
            </div>
          </div>
        )}
      </div>
    )}

    {result.readiness_dashboard && (
      <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Text className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-ink-400">
              Readiness dashboard
            </Text>
            <Title
              level={4}
              className="!mb-0 !mt-1 !text-base !font-bold text-slate-950 dark:text-ink-50"
            >
              Packet and conversation readiness
            </Title>
          </div>
          <Tag className="m-0 rounded-full px-3 py-1 text-xs font-bold capitalize">
            {result.readiness_dashboard.manager_conversation_readiness}
          </Tag>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[150px_minmax(0,1fr)]">
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-ink-900 p-4">
            <Text className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-ink-400">
              Packet score
            </Text>
            <div className="mt-1 text-3xl font-black leading-none text-slate-950 dark:text-ink-50">
              {result.readiness_dashboard.packet_readiness_score}
            </div>
            <div className="mt-1 text-xs font-bold capitalize text-slate-500 dark:text-ink-400">
              {result.readiness_dashboard.packet_readiness_label}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 p-4">
            <Text className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-ink-400">
              Why confidence is what it is
            </Text>
            <p className="mb-0 mt-1 text-sm leading-6 text-slate-700 dark:text-ink-100">
              {parseInlineMarkdown(result.readiness_dashboard.confidence_explanation)}
            </p>
          </div>
        </div>
        {result.readiness_dashboard.top_odds_improvers?.length > 0 && (
          <div className="mt-4 rounded-xl border border-blue-100 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/10 p-4">
            <Text className="block text-[11px] font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">
              Fastest ways to raise odds
            </Text>
            <ListBlock items={result.readiness_dashboard.top_odds_improvers.slice(0, 3)} />
          </div>
        )}
        {result.readiness_dashboard.evidence_checklist?.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
            {result.readiness_dashboard.evidence_checklist.slice(0, 6).map((item) => (
              <div
                key={item.item}
                className={`rounded-xl border px-3 py-2 ${checklistToneClass(item.status)}`}
              >
                <div className="text-xs font-bold capitalize">{item.status}</div>
                <div className="mt-0.5 text-sm font-semibold">{item.item}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    {/* View Detailed Breakdown Footer Banner */}
    <div className="rounded-2xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-500/10 p-5 shadow-sm flex items-start gap-3">
      <BulbOutlined className="text-indigo-600 dark:text-indigo-300 text-lg mt-0.5 shrink-0" />
      <div>
        <Text strong className="text-indigo-950 text-[15px] block">
          Continue on the full review page
        </Text>
        <Text className="text-sm text-indigo-800 dark:text-indigo-200 block mt-1 leading-relaxed">
          Open the full detailed review for evidence, 30/60/90 actions, manager talking points, and
          the follow-up coach chat.
        </Text>
        <Link
          to={
            activeReviewId
              ? `/promotion-review/${activeReviewId}`
              : '/ai-tools?tab=promotion-reviews'
          }
          className="text-[13px] font-bold text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 inline-flex items-center gap-1 mt-3"
        >
          {activeReviewId
            ? 'View Full Detailed Review →'
            : 'View Full Detailed Review in AI Tools →'}
        </Link>
      </div>
    </div>
  </div>
);

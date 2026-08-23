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
        <li key={`${item}-${index}`} className="text-sm leading-relaxed text-gray-700">
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
    <span className="mb-2 block text-[12px] font-semibold uppercase tracking-wide text-slate-500">
      {field.label}
      {field.required && <span className="ml-1 text-blue-600">Required</span>}
    </span>
    {field.rows ? (
      <TextArea
        value={value}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) =>
          onChange(event.target.value)
        }
        placeholder={field.placeholder}
        rows={field.rows}
        className="!rounded-xl !border-slate-200 !bg-white !px-3 !py-3 !text-[14px] !leading-relaxed shadow-[0_1px_0_rgba(15,23,42,0.03)] placeholder:!text-slate-400 hover:!border-slate-300 focus:!border-slate-400 focus:!shadow-none"
      />
    ) : (
      <Input
        value={value}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) =>
          onChange(event.target.value)
        }
        placeholder={field.placeholder}
        className="!h-11 !rounded-xl !border-slate-200 !bg-white !px-3 !text-[14px] shadow-[0_1px_0_rgba(15,23,42,0.03)] placeholder:!text-slate-400 hover:!border-slate-300 focus:!border-slate-400 focus:!shadow-none"
      />
    )}
  </label>
);

export const EvidenceRow: React.FC<{ label: string; tone?: 'good' | 'muted' }> = ({
  label,
  tone = 'muted',
}) => (
  <div className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-white p-4">
    <div
      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
        tone === 'good' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
      }`}
    >
      <CheckCircleOutlined className="text-[12px]" />
    </div>
    <span className="text-sm font-medium leading-6 text-slate-700">{label}</span>
  </div>
);

export const PromotionReviewResultView: React.FC<{
  result: PromotionReviewResult;
  activeReviewId: string | null;
  historyReviews: StoredPromotionReview[];
}> = ({ activeReviewId, result, historyReviews }) => (
  <div className="space-y-6">
    {result.promotion_prediction && (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Text className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Prediction
            </Text>
            <Title level={4} className="!mb-0 !mt-1 !text-base !font-bold text-slate-950">
              Promotion chances and timing
            </Title>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-3 text-center">
            <div className="text-3xl font-black leading-none text-blue-700">
              {result.promotion_prediction.probability_percent}%
            </div>
            <div className="mt-1 text-xs font-bold uppercase tracking-wide text-blue-700">
              {result.promotion_prediction.chance_label} chance
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Text className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Likely
            </Text>
            <Text className="mt-1 block text-sm font-bold text-slate-950">
              {result.promotion_prediction.likely_timeline}
            </Text>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
            <Text className="block text-[11px] font-bold uppercase tracking-wide text-emerald-700">
              Best case
            </Text>
            <Text className="mt-1 block text-sm font-bold text-emerald-950">
              {result.promotion_prediction.earliest_reasonable_timeline}
            </Text>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
            <Text className="block text-[11px] font-bold uppercase tracking-wide text-amber-700">
              If gaps remain
            </Text>
            <Text className="mt-1 block text-sm font-bold text-amber-950">
              {result.promotion_prediction.latest_likely_timeline}
            </Text>
          </div>
        </div>
        <p className="mb-0 mt-4 text-sm leading-6 text-slate-700">
          {parseInlineMarkdown(result.promotion_prediction.rationale)}
        </p>
        {historyReviews.filter((review) => review.review?.promotion_prediction).length > 1 && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Text className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
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
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600'
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
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Text className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Readiness dashboard
            </Text>
            <Title level={4} className="!mb-0 !mt-1 !text-base !font-bold text-slate-950">
              Packet and conversation readiness
            </Title>
          </div>
          <Tag className="m-0 rounded-full px-3 py-1 text-xs font-bold capitalize">
            {result.readiness_dashboard.manager_conversation_readiness}
          </Tag>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[150px_minmax(0,1fr)]">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Text className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Packet score
            </Text>
            <div className="mt-1 text-3xl font-black leading-none text-slate-950">
              {result.readiness_dashboard.packet_readiness_score}
            </div>
            <div className="mt-1 text-xs font-bold capitalize text-slate-500">
              {result.readiness_dashboard.packet_readiness_label}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <Text className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Why confidence is what it is
            </Text>
            <p className="mb-0 mt-1 text-sm leading-6 text-slate-700">
              {parseInlineMarkdown(result.readiness_dashboard.confidence_explanation)}
            </p>
          </div>
        </div>
        {result.readiness_dashboard.top_odds_improvers?.length > 0 && (
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <Text className="block text-[11px] font-bold uppercase tracking-wide text-blue-700">
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
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 shadow-sm flex items-start gap-3">
      <BulbOutlined className="text-indigo-600 text-lg mt-0.5 shrink-0" />
      <div>
        <Text strong className="text-indigo-950 text-[15px] block">
          Continue on the full review page
        </Text>
        <Text className="text-sm text-indigo-800 block mt-1 leading-relaxed">
          Open the full detailed review for evidence, 30/60/90 actions, manager talking points, and
          the follow-up coach chat.
        </Text>
        <Link
          to={
            activeReviewId
              ? `/promotion-review/${activeReviewId}`
              : '/ai-tools?tab=promotion-reviews'
          }
          className="text-[13px] font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 mt-3"
        >
          {activeReviewId
            ? 'View Full Detailed Review →'
            : 'View Full Detailed Review in AI Tools →'}
        </Link>
      </div>
    </div>
  </div>
);

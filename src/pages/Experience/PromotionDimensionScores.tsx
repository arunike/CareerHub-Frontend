import type { PromotionReviewResult } from '../../lib/browserAi';
import {
  ListBlock,
  SectionHeading,
  hasItems,
  ratingClass,
  scoreToneClass,
} from './promotionReviewPrimitives';
import { Tag } from 'antd';
import { BulbOutlined } from '@ant-design/icons';
import { parseInlineMarkdown } from '../../utils/simpleMarkdown';

type Props = {
  review: PromotionReviewResult;
};

const PromotionDimensionScores = ({ review }: Props) => (
  <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-[0_20px_55px_-46px_rgba(15,23,42,0.7)] sm:p-6">
    <SectionHeading
      eyebrow="Evaluation"
      title="Promotion dimensions"
      description="Each dimension keeps the rating compact, then separates proof, gaps, and the next useful move."
    />
    <div className="grid grid-cols-1 gap-4">
      {(review.dimension_scores ?? []).map((score) => (
        <div
          key={score.dimension}
          className={`rounded-2xl border p-5 ${scoreToneClass(score.rating)}`}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="m-0 text-base font-bold text-slate-950">{score.dimension}</h3>
              <div className="mt-1 text-xs font-medium capitalize text-slate-500">
                Confidence: {score.confidence}
              </div>
            </div>
            <Tag
              color={ratingClass(score.rating)}
              className="m-0 rounded-md px-3 py-1 text-sm font-semibold capitalize"
            >
              {score.rating}
            </Tag>
          </div>
          {(hasItems(score.supporting_evidence) || hasItems(score.missing_evidence)) && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {hasItems(score.supporting_evidence) && (
                <div>
                  <ListBlock items={score.supporting_evidence} />
                </div>
              )}
              {hasItems(score.missing_evidence) && (
                <div>
                  <ListBlock title="Missing evidence" items={score.missing_evidence} />
                </div>
              )}
            </div>
          )}
          {score.how_to_strengthen && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white/75 p-4 text-[13px] leading-6 text-slate-700">
              <BulbOutlined className="mr-1.5 inline-block align-middle text-sm text-amber-500" />
              <span className="inline align-middle">
                <strong className="text-slate-950">Next action:</strong>{' '}
                {parseInlineMarkdown(score.how_to_strengthen)}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

export default PromotionDimensionScores;

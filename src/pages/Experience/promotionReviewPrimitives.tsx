import React from 'react';
import { Typography } from 'antd';
import { parseInlineMarkdown } from '../../utils/simpleMarkdown';
import { asList } from './promotionReviewFields';

const { Text } = Typography;

export const SmartListItem: React.FC<{ item: string }> = ({ item }) => {
  const { lead, subpoints } = splitSubpoints(item);

  return (
    <li className="text-sm leading-6 text-slate-700">
      <span>{parseInlineMarkdown(lead)}</span>
      {subpoints.length > 0 && (
        <ul className="mt-2 space-y-1.5 border-l border-slate-200 pl-4">
          {subpoints.map((subpoint, index) => (
            <li
              key={`${subpoint}-${index}`}
              className="list-none text-[13px] leading-6 text-slate-600"
            >
              {parseInlineMarkdown(subpoint)}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
};

export const hasItems = (items?: string[]) => asList(items).length > 0;

const splitSubpoints = (item: string) => {
  const normalized = item.replace(/\s+-\s+/g, '\n- ');
  const [lead, ...subpoints] = normalized
    .split('\n- ')
    .map((part) => part.trim())
    .filter(Boolean);

  return { lead, subpoints };
};

export const ListBlock: React.FC<{ title?: string; items?: string[]; compact?: boolean }> = ({
  title,
  items,
  compact = false,
}) => {
  const rows = asList(items);
  if (!rows.length) return null;
  return (
    <div>
      {title && (
        <Text className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          {title}
        </Text>
      )}
      <ul className={`m-0 list-disc pl-5 ${compact ? 'space-y-1.5' : 'space-y-3'}`}>
        {rows.map((item, index) => (
          <SmartListItem key={`${item}-${index}`} item={item} />
        ))}
      </ul>
    </div>
  );
};

export const verdictColor = (label?: string) => {
  const normalized = (label || '').toLowerCase();
  if (normalized.includes('strong')) return 'green';
  if (normalized.includes('ready')) return 'blue';
  if (normalized.includes('building')) return 'gold';
  return 'default';
};

export const ratingClass = (rating: string) => {
  const normalized = rating.toLowerCase();
  if (normalized.includes('strong')) return 'green';
  if (normalized.includes('solid')) return 'blue';
  if (normalized.includes('develop')) return 'gold';
  return 'default';
};

export const scoreToneClass = (rating: string) => {
  const normalized = rating.toLowerCase();
  if (normalized.includes('strong')) return 'border-emerald-200 bg-emerald-50/30';
  if (normalized.includes('solid')) return 'border-blue-200 bg-blue-50/30';
  if (normalized.includes('develop')) return 'border-amber-200 bg-amber-50/30';
  if (normalized.includes('weak')) return 'border-rose-200 bg-rose-50/30';
  return 'border-slate-200 bg-white';
};

export const SectionHeading: React.FC<{
  eyebrow?: string;
  title: string;
  description?: string;
}> = ({ eyebrow, title, description }) => (
  <div className="mb-5">
    {eyebrow && (
      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
        {eyebrow}
      </div>
    )}
    <h2 className="m-0 text-xl font-bold tracking-tight text-slate-950">{title}</h2>
    {description && (
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
    )}
  </div>
);

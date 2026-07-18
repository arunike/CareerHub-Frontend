import type { ReactNode } from 'react';
import { SkeletonBlock } from './SkeletonLoader';

type PageStateProps = {
  title: string;
  description: string;
  tone?: 'neutral' | 'error';
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
  className?: string;
};

export const PageState = ({
  title,
  description,
  tone = 'neutral',
  actionLabel,
  onAction,
  icon,
  className = '',
}: PageStateProps) => (
  <section
    className={`enterprise-empty mx-auto box-border min-w-0 w-full max-w-[calc(100vw-2rem)] overflow-hidden px-5 py-8 text-center sm:max-w-xl sm:px-8 ${className}`.trim()}
    role={tone === 'error' ? 'alert' : 'status'}
  >
    {icon ? (
      <div
        className={`mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${
          tone === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'
        }`}
        aria-hidden="true"
      >
        {icon}
      </div>
    ) : null}
    <h2 className="text-lg font-bold text-slate-900">{title}</h2>
    <p className="mx-auto mt-2 max-w-md break-words text-sm leading-6 text-slate-600">
      {description}
    </p>
    {actionLabel && onAction ? (
      <button
        type="button"
        onClick={onAction}
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        {actionLabel}
      </button>
    ) : null}
  </section>
);

export const PanelSkeleton = ({
  rows = 4,
  className = '',
}: {
  rows?: number;
  className?: string;
}) => (
  <div
    className={`rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 ${className}`.trim()}
    aria-busy="true"
    aria-label="Loading content"
  >
    <div className="space-y-3">
      <SkeletonBlock width="42%" height="1.1rem" />
      <SkeletonBlock width="68%" height="0.75rem" className="opacity-70" />
    </div>
    <div className="mt-6 space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonBlock key={index} width={index % 2 === 0 ? '100%' : '84%'} height="2.75rem" />
      ))}
    </div>
  </div>
);

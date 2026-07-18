import type { ReactNode } from 'react';
import { ArrowLeftOutlined } from '@ant-design/icons';

type ArtifactPageToolbarProps = {
  backLabel: string;
  contextLabel: string;
  contextIcon: ReactNode;
  onBack: () => void;
  actions?: ReactNode;
  maxWidthClassName?: string;
};

const ArtifactPageToolbar = ({
  backLabel,
  contextLabel,
  contextIcon,
  onBack,
  actions,
  maxWidthClassName = 'max-w-6xl',
}: ArtifactPageToolbarProps) => (
  <div className="no-print sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:px-6">
    <div
      className={`mx-auto flex w-full ${maxWidthClassName} flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
        >
          <ArrowLeftOutlined />
          <span>{backLabel}</span>
        </button>
        <span className="hidden h-5 w-px shrink-0 bg-slate-200 sm:block" />
        <div className="hidden min-w-0 items-center gap-2 text-sm font-semibold text-slate-700 sm:flex">
          <span className="flex shrink-0 items-center text-blue-600">{contextIcon}</span>
          <span className="truncate">{contextLabel}</span>
        </div>
      </div>

      {actions ? (
        <div className="flex w-full flex-wrap gap-2 pl-0 sm:w-auto sm:justify-end sm:pl-0 [&_.ant-btn]:min-h-11 [&_.ant-btn]:flex-1 sm:[&_.ant-btn]:flex-none">
          {actions}
        </div>
      ) : null}
    </div>
  </div>
);

export default ArtifactPageToolbar;

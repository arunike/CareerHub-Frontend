import type { ReactNode } from 'react';
import { Tooltip, type TooltipProps } from 'antd';
import clsx from 'clsx';
import CrispInfoIcon from './CrispInfoIcon';

type HelpTooltipTriggerProps = {
  ariaLabel: string;
  children?: ReactNode;
  className?: string;
  density?: 'compact' | 'comfortable';
  placement?: TooltipProps['placement'];
  title: ReactNode;
};

const HelpTooltipTrigger = ({
  ariaLabel,
  children,
  className,
  density = 'compact',
  placement = 'top',
  title,
}: HelpTooltipTriggerProps) => (
  <Tooltip title={title} placement={placement} trigger={['hover', 'focus', 'click']}>
    <button
      type="button"
      aria-label={ariaLabel}
      className={clsx(
        'group inline-flex min-h-11 min-w-11 items-center gap-1.5 rounded-md bg-transparent p-0 transition-colors',
        'hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/45 focus-visible:ring-offset-2',
        'lg:min-h-6 lg:min-w-6',
        density === 'compact' && '-my-3.5 lg:-my-1',
        children == null && 'justify-center',
        children == null && density === 'compact' && '-mx-3.5 lg:-mx-1',
        className
      )}
    >
      {children}
      <span className="inline-flex shrink-0 items-center justify-center text-slate-400/90 dark:text-ink-500/90 transition-colors group-hover:text-blue-600">
        <CrispInfoIcon
          size={14}
          className="text-slate-400 dark:text-ink-500 group-hover:text-blue-600"
        />
      </span>
    </button>
  </Tooltip>
);

export default HelpTooltipTrigger;

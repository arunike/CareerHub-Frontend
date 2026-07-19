import type { ReactNode } from 'react';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Tooltip, type TooltipProps } from 'antd';
import clsx from 'clsx';

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
        'inline-flex min-h-11 min-w-11 items-center gap-1 rounded-md bg-transparent p-0 transition-colors',
        'hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/45 focus-visible:ring-offset-2',
        'lg:min-h-6 lg:min-w-6',
        density === 'compact' && '-my-3.5 lg:-my-1',
        children == null && 'justify-center',
        children == null && density === 'compact' && '-mx-3.5 lg:-mx-1',
        className
      )}
    >
      {children}
      <InfoCircleOutlined aria-hidden="true" className="shrink-0 text-xs text-slate-400" />
    </button>
  </Tooltip>
);

export default HelpTooltipTrigger;

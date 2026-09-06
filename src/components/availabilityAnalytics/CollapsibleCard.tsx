import type React from 'react';
import { WidgetCollapseToggle, useWidgetCollapse } from '../jobHuntAnalytics/widgetCollapse';

export const CollapsibleCard = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => {
  const collapsed = useWidgetCollapse()?.collapsed ?? false;

  return (
    <div className={`enterprise-card p-4 sm:p-6 ${collapsed ? 'h-auto' : 'h-full'}`}>
      <div className={`flex items-center gap-2 ${collapsed ? '' : 'mb-5'}`}>
        {icon}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-ink-50">{title}</h3>
        <WidgetCollapseToggle title={title} />
      </div>
      {collapsed ? null : children}
    </div>
  );
};

export default CollapsibleCard;

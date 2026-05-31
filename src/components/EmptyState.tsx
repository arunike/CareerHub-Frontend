import React from 'react';

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action }) => {
  return (
    <div className="enterprise-empty p-12 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-300 shadow-sm">
        <Icon className="text-2xl" />
      </div>
      <h3 className="text-lg font-semibold tracking-[-0.01em] text-slate-950">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">{description}</p>
      {action && <div className="mt-4 flex justify-center gap-3">{action}</div>}
    </div>
  );
};

export default EmptyState;

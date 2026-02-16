import React from 'react';

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action }) => {
  return (
    <div className="bg-white p-12 rounded-xl border border-gray-200 border-dashed text-center">
      <div className="mx-auto h-12 w-12 text-gray-300 bg-gray-50 rounded-full flex items-center justify-center mb-4">
        <Icon className="text-2xl" />
      </div>
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">{description}</p>
      {action && <div className="mt-4 flex justify-center gap-3">{action}</div>}
    </div>
  );
};

export default EmptyState;

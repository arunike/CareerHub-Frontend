import type { ApplicationSummary } from './applicationTypes';

type Filters = {
  statusFilter: string;
  isLockedFilter: boolean | undefined;
  setStatusFilter: (value: string) => void;
  setIsLockedFilter: (value: boolean | undefined) => void;
};

// The four headline tiles double as filters, so each one carries the filter it applies.
export const buildApplicationMetrics = (
  applicationSummary: ApplicationSummary,
  { statusFilter, isLockedFilter, setStatusFilter, setIsLockedFilter }: Filters
) => {
  return [
    {
      label: 'Matching records',
      value: applicationSummary.total.toLocaleString(),
      tone: 'slate' as const,
      isActive: statusFilter === 'ALL' && isLockedFilter === undefined,
      onClick: () => {
        setStatusFilter('ALL');
        setIsLockedFilter(undefined);
      },
    },
    {
      label: 'Total interviews',
      value: applicationSummary.interviews.toLocaleString(),
      tone: 'blue' as const,
      isActive: statusFilter === 'INTERVIEWS',
      onClick: () => {
        setStatusFilter('INTERVIEWS');
        setIsLockedFilter(undefined);
      },
    },
    {
      label: 'Total offers',
      value: applicationSummary.offers.toLocaleString(),
      tone: 'emerald' as const,
      isActive: statusFilter === 'OFFER',
      onClick: () => {
        setStatusFilter('OFFER');
        setIsLockedFilter(undefined);
      },
    },
    {
      label: 'Total locked',
      value: applicationSummary.locked.toLocaleString(),
      tone: 'amber' as const,
      isActive: isLockedFilter === true,
      onClick: () => {
        setStatusFilter('ALL');
        setIsLockedFilter(true);
      },
    },
  ];
};

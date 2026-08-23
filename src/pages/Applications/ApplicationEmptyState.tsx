import { InboxOutlined } from '@ant-design/icons';
import { PageState } from '../../components/PageState';

const ApplicationEmptyState = ({
  hasActiveSearchFilters,
  isYearFiltered,
  selectedYear,
  onClearFilters,
  onShowAllYears,
  onAddApplication,
}: {
  hasActiveSearchFilters: boolean;
  isYearFiltered: boolean;
  selectedYear: number | 'all';
  onClearFilters: () => void;
  onShowAllYears: () => void;
  onAddApplication: () => void;
}) => (
  <PageState
    title={
      hasActiveSearchFilters
        ? 'No matching applications'
        : isYearFiltered
          ? `No applications in ${selectedYear}`
          : 'No applications yet'
    }
    description={
      hasActiveSearchFilters
        ? 'No saved applications match the current search and filters.'
        : isYearFiltered
          ? 'Choose another year, show all years, or add an application for this year.'
          : 'Add an application to track its status, interviews, documents, and next steps.'
    }
    actionLabel={
      hasActiveSearchFilters
        ? 'Clear filters'
        : isYearFiltered
          ? 'Show all years'
          : 'Add application'
    }
    onAction={
      hasActiveSearchFilters ? onClearFilters : isYearFiltered ? onShowAllYears : onAddApplication
    }
    icon={<InboxOutlined />}
  />
);

export default ApplicationEmptyState;

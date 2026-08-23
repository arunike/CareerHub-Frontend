import { Button } from 'antd';
import { PlusOutlined, GlobalOutlined } from '@ant-design/icons';
import PageActionToolbar from '../../components/PageActionToolbar';

type Props = {
  applicationsTotal: number;
  availableYears: number[];
  handleYearChange: (year: number | 'all') => void;
  selectedYear: number | 'all';
  onJobImport: () => void;
  onCsvImport: () => void;
  onDeleteAll: () => void;
  onExport: (format: string) => Promise<{ data: Blob; headers: Record<string, string> }>;
  onAddApplication: () => void;
};

const ApplicationsToolbar = ({
  applicationsTotal,
  availableYears,
  handleYearChange,
  selectedYear,
  onJobImport,
  onCsvImport,
  onDeleteAll,
  onExport,
  onAddApplication,
}: Props) => (
  <div style={{ marginBottom: 24 }}>
    <PageActionToolbar
      title={<span className="whitespace-nowrap">Job Applications</span>}
      subtitle={`${applicationsTotal.toLocaleString()} applications tracked`}
      singleRowDesktop
      selectedYear={selectedYear}
      onYearChange={handleYearChange}
      availableYears={availableYears}
      secondaryActions={
        <Button
          className="toolbar-btn"
          size="large"
          icon={<GlobalOutlined />}
          onClick={onJobImport}
        >
          Import URL
        </Button>
      }
      secondaryMenuItems={[
        {
          key: 'import-url',
          icon: <GlobalOutlined />,
          label: 'Import from URL',
          onClick: onJobImport,
        },
      ]}
      onDeleteAll={onDeleteAll}
      deleteAllConfirmTitle="Delete All Applications?"
      deleteAllConfirmDescription="This will delete all unlocked applications. This cannot be undone."
      onExport={onExport}
      exportFilename="applications"
      onImport={onCsvImport}
      onPrimaryAction={onAddApplication}
      primaryActionLabel="Add Application"
      primaryActionIcon={<PlusOutlined />}
    />
  </div>
);

export default ApplicationsToolbar;

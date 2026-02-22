import React from 'react';
import { Button, Popconfirm, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import YearFilter from './YearFilter';
import ExportButton from './ExportButton';

interface PageActionToolbarProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  selectedYear?: number | 'all';
  onYearChange?: (year: number | 'all') => void;
  availableYears?: number[];
  extraActions?: React.ReactNode;
  onDeleteAll?: () => void;
  deleteAllLabel?: string;
  deleteAllDisabled?: boolean;
  deleteAllConfirmTitle?: string;
  deleteAllConfirmDescription?: string;
  onExport?: (format: string) => Promise<{ data: Blob; headers: Record<string, string> }>;
  exportFilename?: string;
  exportLabel?: string;
  onImport?: () => void;
  importLabel?: string;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
  primaryActionIcon?: React.ReactNode;
  singleRowDesktop?: boolean;
}

const PageActionToolbar: React.FC<PageActionToolbarProps> = ({
  title,
  subtitle,
  selectedYear,
  onYearChange,
  availableYears = [],
  extraActions,
  onDeleteAll,
  deleteAllLabel = 'Delete All',
  deleteAllDisabled = false,
  deleteAllConfirmTitle,
  deleteAllConfirmDescription,
  onExport,
  exportFilename = 'export',
  exportLabel = 'Export',
  onImport,
  importLabel = 'Import',
  onPrimaryAction,
  primaryActionLabel = 'Add',
  primaryActionIcon = <PlusOutlined />,
  singleRowDesktop = false,
}) => {
  return (
    <div className={`page-toolbar ${singleRowDesktop ? 'page-toolbar-single-row' : ''}`.trim()}>
      <div>
        <Typography.Title level={2} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        {subtitle ? <Typography.Text type="secondary">{subtitle}</Typography.Text> : null}
      </div>

      <div className="page-toolbar-actions">
        {typeof selectedYear !== 'undefined' && onYearChange ? (
          <YearFilter
            selectedYear={selectedYear}
            onYearChange={onYearChange}
            availableYears={availableYears}
            className="toolbar-select"
            size="large"
          />
        ) : null}

        {extraActions}

        {onDeleteAll && deleteAllConfirmTitle ? (
          <Popconfirm
            title={deleteAllConfirmTitle}
            description={deleteAllConfirmDescription}
            okText={deleteAllLabel}
            okType="danger"
            onConfirm={onDeleteAll}
          >
            <Button
              className="toolbar-btn"
              size="large"
              danger
              icon={<DeleteOutlined />}
              disabled={deleteAllDisabled}
            >
              {deleteAllLabel}
            </Button>
          </Popconfirm>
        ) : null}

        {onDeleteAll && !deleteAllConfirmTitle ? (
          <Button
            className="toolbar-btn"
            size="large"
            danger
            icon={<DeleteOutlined />}
            disabled={deleteAllDisabled}
            onClick={onDeleteAll}
          >
            {deleteAllLabel}
          </Button>
        ) : null}

        {onExport ? (
          <ExportButton
            onExport={onExport}
            filename={exportFilename}
            label={exportLabel}
            className="toolbar-btn"
            size="large"
          />
        ) : null}

        {onImport ? (
          <Button className="toolbar-btn" size="large" icon={<UploadOutlined />} onClick={onImport}>
            {importLabel}
          </Button>
        ) : null}

        {onPrimaryAction ? (
          <Button
            className="toolbar-btn"
            size="large"
            type="primary"
            icon={primaryActionIcon}
            onClick={onPrimaryAction}
          >
            {primaryActionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default PageActionToolbar;

import React, { useMemo, useState } from 'react';
import { Button, Grid, Popconfirm, Typography } from 'antd';
import {
  DeleteOutlined,
  DownOutlined,
  PlusOutlined,
  UpOutlined,
  UploadOutlined,
} from '@ant-design/icons';
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
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);

  const yearFilterNode =
    typeof selectedYear !== 'undefined' && onYearChange ? (
      <YearFilter
        selectedYear={selectedYear}
        onYearChange={onYearChange}
        availableYears={availableYears}
        className="toolbar-select"
        size="large"
      />
    ) : null;

  const deleteAllNode =
    onDeleteAll && deleteAllConfirmTitle ? (
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
    ) : onDeleteAll ? (
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
    ) : null;

  const exportNode = onExport ? (
    <ExportButton
      onExport={onExport}
      filename={exportFilename}
      label={exportLabel}
      className="toolbar-btn"
      size="large"
    />
  ) : null;

  const importNode = onImport ? (
    <Button className="toolbar-btn" size="large" icon={<UploadOutlined />} onClick={onImport}>
      {importLabel}
    </Button>
  ) : null;

  const primaryActionNode = onPrimaryAction ? (
    <Button
      className="toolbar-btn"
      size="large"
      type="primary"
      icon={primaryActionIcon}
      onClick={onPrimaryAction}
    >
      {primaryActionLabel}
    </Button>
  ) : null;

  const mobileSecondaryActionCount = useMemo(
    () =>
      [yearFilterNode, extraActions, deleteAllNode, exportNode, importNode].filter(Boolean).length,
    [deleteAllNode, exportNode, extraActions, importNode, yearFilterNode]
  );

  if (isMobile) {
    return (
      <>
        <div className="space-y-4">
          <div className="min-w-0">
            <Typography.Title
              level={2}
              style={{
                margin: 0,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}
            >
              {title}
            </Typography.Title>
            {subtitle ? (
              <Typography.Text
                type="secondary"
                style={{ fontSize: '14px', display: 'block', marginTop: '4px' }}
              >
                {subtitle}
              </Typography.Text>
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
            {primaryActionNode ? (
              <div className="w-full [&_.ant-btn]:!h-12 [&_.ant-btn]:w-full [&_.ant-btn]:!rounded-2xl [&_.ant-btn]:!font-semibold [&_.ant-btn]:shadow-sm">
                {primaryActionNode}
              </div>
            ) : null}

            {yearFilterNode ? <div className="w-full">{yearFilterNode}</div> : null}

            {mobileSecondaryActionCount > (yearFilterNode ? 1 : 0) ? (
              <Button
                size="large"
                className="toolbar-native-btn"
                onClick={() => setMobileActionsOpen((current) => !current)}
                icon={mobileActionsOpen ? <UpOutlined /> : <DownOutlined />}
              >
                {mobileActionsOpen ? 'Hide More Actions' : 'More Actions'}
              </Button>
            ) : null}

            {mobileActionsOpen ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="grid grid-cols-1 gap-3">
                  {extraActions ? <div className="w-full">{extraActions}</div> : null}
                  {deleteAllNode ? <div className="w-full">{deleteAllNode}</div> : null}
                  {exportNode ? <div className="w-full">{exportNode}</div> : null}
                  {importNode ? <div className="w-full">{importNode}</div> : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className={`page-toolbar ${singleRowDesktop ? 'page-toolbar-single-row' : ''}`.trim()}>
      <div className="page-toolbar-heading">
        <div className="flex items-center gap-4">
          <div className="min-w-0">
            <Typography.Title
              level={2}
              style={{
                margin: 0,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}
            >
              {title}
            </Typography.Title>
            {subtitle ? (
              <Typography.Text
                type="secondary"
                style={{ fontSize: '14px', display: 'block', marginTop: '2px' }}
              >
                {subtitle}
              </Typography.Text>
            ) : null}
          </div>
        </div>
      </div>

      <div className="page-toolbar-actions">
        {yearFilterNode}
        {extraActions}
        {deleteAllNode}
        {exportNode}
        {importNode}
        {primaryActionNode}
      </div>
    </div>
  );
};

export default PageActionToolbar;

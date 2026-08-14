import React from 'react';
import { Button, Dropdown, Grid, Modal, Typography } from 'antd';
import type { MenuProps } from 'antd';
import {
  DeleteOutlined,
  DownOutlined,
  DownloadOutlined,
  MoreOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import YearFilter from './YearFilter';
import { useExport } from './ExportButton';

interface PageActionToolbarProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  selectedYear?: number | 'all';
  onYearChange?: (year: number | 'all') => void;
  availableYears?: number[];
  // Controls that change what you are looking at (view switches, filters).
  extraActions?: React.ReactNode;
  // Verbs. These belong with the primary action, not among the filters, so a button is
  // never mistaken for a filter or the other way round.
  secondaryActions?: React.ReactNode;
  // The same verbs as menu entries. On a phone they fold into the More menu instead of
  // spending a row each; a page supplies both and the layout picks.
  secondaryMenuItems?: MenuProps['items'];
  // The one control worth permanent space, e.g. a list/calendar switch. Kept out of
  // extraActions so a phone can show it and demote the rest.
  viewSwitch?: React.ReactNode;
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
  primaryActionLoading?: boolean;
  singleRowDesktop?: boolean;
}

const PageActionToolbar: React.FC<PageActionToolbarProps> = ({
  title,
  subtitle,
  selectedYear,
  onYearChange,
  availableYears = [],
  extraActions,
  secondaryActions,
  secondaryMenuItems,
  viewSwitch,
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
  primaryActionLoading = false,
  singleRowDesktop = false,
}) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

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

  const primaryActionNode = onPrimaryAction ? (
    <Button
      className="toolbar-btn"
      size="large"
      type="primary"
      icon={primaryActionIcon}
      onClick={() => onPrimaryAction?.()}
      loading={primaryActionLoading}
    >
      {primaryActionLabel}
    </Button>
  ) : null;

  const exportMenu = useExport(
    onExport ?? (async () => ({ data: new Blob(), headers: {} })),
    exportFilename
  );

  const confirmDeleteAll = () => {
    if (!onDeleteAll) return;
    if (!deleteAllConfirmTitle) {
      onDeleteAll();
      return;
    }
    Modal.confirm({
      title: deleteAllConfirmTitle,
      content: deleteAllConfirmDescription,
      okText: deleteAllLabel,
      okType: 'danger',
      onOk: onDeleteAll,
    });
  };

  const dataMenuItems: MenuProps['items'] = [
    ...(isMobile && secondaryMenuItems?.length
      ? [...secondaryMenuItems, { type: 'divider' as const, key: 'verbs-divider' }]
      : []),
    onImport
      ? { key: 'import', icon: <UploadOutlined />, label: importLabel, onClick: () => onImport() }
      : null,
    onExport
      ? {
          key: 'export',
          icon: <DownloadOutlined />,
          label: exportLabel,
          children: exportMenu.items,
        }
      : null,
    (onImport || onExport) && onDeleteAll ? { type: 'divider' as const, key: 'divider' } : null,
    onDeleteAll
      ? {
          key: 'delete',
          icon: <DeleteOutlined />,
          label: deleteAllLabel,
          danger: true,
          disabled: deleteAllDisabled,
          onClick: confirmDeleteAll,
        }
      : null,
  ].filter(Boolean) as MenuProps['items'];

  const hasDataMenu = Boolean(dataMenuItems && dataMenuItems.length > 0);

  // An unlabelled dot menu hides Import and Export completely. The word plus a caret
  // says "there is more in here" without spending a button per action.
  const dataMenuIconNode = hasDataMenu ? (
    <Dropdown menu={{ items: dataMenuItems }} trigger={['click']} placement="bottomRight">
      <Button
        className="page-toolbar-mobile-more"
        icon={<MoreOutlined />}
        aria-label="Import, export and bulk actions"
      />
    </Dropdown>
  ) : null;

  const dataMenuNode = hasDataMenu ? (
    <Dropdown menu={{ items: dataMenuItems }} trigger={['click']} placement="bottomRight">
      <Button className="toolbar-btn" size="large" icon={<MoreOutlined />}>
        More <DownOutlined className="text-[10px]" />
      </Button>
    </Dropdown>
  ) : null;

  const hasOtherFilters = Boolean(yearFilterNode || extraActions);
  // A filter row holding nothing but the view switch is a full-width band of empty space.
  // With nothing to sit beside, the switch belongs up on the title line.
  const hoistViewSwitch = Boolean(viewSwitch) && !hasOtherFilters;
  const hasFilterRow = hasOtherFilters || (Boolean(viewSwitch) && !hoistViewSwitch);

  if (isMobile) {
    return (
      <div className="space-y-3">
        {/* The overflow rides the title line. Given its own row it either stranded itself
            at half width or added a bar of pure chrome to pages with no primary action. */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Typography.Title
              level={1}
              className="text-balance"
              style={{
                margin: 0,
                color: '#111827',
                fontWeight: 740,
                letterSpacing: '-0.015em',
                lineHeight: 1.08,
              }}
            >
              {title}
            </Typography.Title>
            {subtitle ? (
              <Typography.Text
                type="secondary"
                style={{ fontSize: '13px', display: 'block', marginTop: '4px' }}
              >
                {subtitle}
              </Typography.Text>
            ) : null}
          </div>
          {dataMenuIconNode}
        </div>

        {primaryActionNode ? (
          <div className="page-toolbar-mobile-primary">{primaryActionNode}</div>
        ) : null}

        {/* Verbs only get a row of their own when the page has not given us menu entries
            for them. */}
        {secondaryActions && !secondaryMenuItems?.length ? (
          <div className="page-toolbar-mobile-verbs">{secondaryActions}</div>
        ) : null}

        {viewSwitch ? <div className="page-toolbar-mobile-view">{viewSwitch}</div> : null}

        {yearFilterNode || extraActions ? (
          <div className="page-toolbar-mobile-filters">
            {yearFilterNode}
            {extraActions}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`page-toolbar ${singleRowDesktop ? 'page-toolbar-single-row' : ''}`.trim()}>
      {exportMenu.contextHolder}
      <div className="page-toolbar-heading">
        <div className="flex items-center gap-4">
          <div className="min-w-0">
            <Typography.Title
              level={1}
              className="text-balance"
              style={{
                margin: 0,
                color: '#111827',
                fontWeight: 740,
                letterSpacing: '-0.015em',
                lineHeight: 1.08,
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

      {singleRowDesktop ? (
        <div className="page-toolbar-actions">
          {yearFilterNode}
          {extraActions}
          {dataMenuNode}
          {primaryActionNode}
        </div>
      ) : (
        <>
          {primaryActionNode || dataMenuNode || secondaryActions || hoistViewSwitch ? (
            <div className="page-toolbar-actions page-toolbar-actions-primary">
              {hoistViewSwitch ? viewSwitch : null}
              {secondaryActions}
              {dataMenuNode}
              {primaryActionNode}
            </div>
          ) : null}
          {hasFilterRow ? (
            <div className="page-toolbar-filters">
              {hoistViewSwitch ? null : viewSwitch}
              {yearFilterNode}
              {extraActions}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

export default PageActionToolbar;

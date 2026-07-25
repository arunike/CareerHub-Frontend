import React from 'react';
import { Space, Typography, Button } from 'antd';
import SelectionCheckbox from './SelectionCheckbox';

const { Title } = Typography;

export interface BulkActionHeaderProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll?: (checked: boolean) => void;
  title: React.ReactNode;
  className?: string;
  defaultActions?: React.ReactNode;
  bulkActions?: React.ReactNode;
  onCancelSelection?: () => void;
}

const BulkActionHeader: React.FC<BulkActionHeaderProps> = ({
  selectedCount,
  totalCount,
  onSelectAll,
  title,
  className = '',
  defaultActions,
  bulkActions,
  onCancelSelection,
}) => {
  const allSelected = totalCount > 0 && selectedCount === totalCount;
  const someSelected = selectedCount > 0 && selectedCount < totalCount;
  const isBulkMode = selectedCount > 0;

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`.trim()}
    >
      <div className="flex items-center gap-3">
        {onSelectAll && (
          <SelectionCheckbox
            selectionLabel={`all ${totalCount} items`}
            checked={allSelected}
            indeterminate={someSelected}
            onChange={(e) => onSelectAll(e.target.checked)}
            disabled={totalCount === 0}
          />
        )}
        {isBulkMode ? (
          <Title level={5} style={{ margin: 0, color: '#2563eb' }}>
            {selectedCount} Selected
          </Title>
        ) : (
          <Title level={5} style={{ margin: 0 }}>
            {title}
          </Title>
        )}
      </div>

      <Space wrap className={`bulk-action-buttons ${isBulkMode ? 'pt-3 pb-1 sm:pl-4' : ''}`.trim()}>
        {isBulkMode ? (
          <>
            {bulkActions}
            {onCancelSelection && <Button onClick={onCancelSelection}>Cancel</Button>}
          </>
        ) : (
          defaultActions
        )}
      </Space>
    </div>
  );
};

export default BulkActionHeader;

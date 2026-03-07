import React from 'react';
import { Space, Typography, Checkbox, Button } from 'antd';

const { Title } = Typography;

export interface BulkActionHeaderProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll?: (checked: boolean) => void;
  title: React.ReactNode;
  defaultActions?: React.ReactNode;
  bulkActions?: React.ReactNode;
  onCancelSelection?: () => void;
}

const BulkActionHeader: React.FC<BulkActionHeaderProps> = ({
  selectedCount,
  totalCount,
  onSelectAll,
  title,
  defaultActions,
  bulkActions,
  onCancelSelection,
}) => {
  const allSelected = totalCount > 0 && selectedCount === totalCount;
  const someSelected = selectedCount > 0 && selectedCount < totalCount;
  const isBulkMode = selectedCount > 0;

  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
      <div className="flex items-center gap-3">
        {onSelectAll && (
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={(e) => onSelectAll(e.target.checked)}
            disabled={totalCount === 0}
          />
        )}
        {isBulkMode ? (
          <Title level={5} style={{ margin: 0, color: '#1890ff' }}>
            {selectedCount} Selected
          </Title>
        ) : (
          <Title level={5} style={{ margin: 0 }}>
            {title}
          </Title>
        )}
      </div>

      <Space wrap>
        {isBulkMode ? (
          <>
            {bulkActions}
            {onCancelSelection && (
              <Button onClick={onCancelSelection}>Cancel</Button>
            )}
          </>
        ) : (
          defaultActions
        )}
      </Space>
    </div>
  );
};

export default BulkActionHeader;

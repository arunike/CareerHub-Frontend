import type React from 'react';
import { Button, Tooltip } from 'antd';
import { LockOutlined, UnlockOutlined, DeleteOutlined } from '@ant-design/icons';
import BulkActionHeader from '../../components/BulkActionHeader';

type Props = {
  totalCount: number;
  isAnySelectedLocked: boolean;
  handleBulkToggleLock: (lock: boolean) => void;
  handleBulkDelete: () => void;
  selectedRowKeys: React.Key[];
  setSelectedRowKeys: React.Dispatch<React.SetStateAction<React.Key[]>>;
};

const ApplicationBulkBar = ({
  totalCount,
  isAnySelectedLocked,
  handleBulkToggleLock,
  handleBulkDelete,
  selectedRowKeys,
  setSelectedRowKeys,
}: Props) => (
  <div className="enterprise-filter-bar mb-4 p-4">
    <BulkActionHeader
      selectedCount={selectedRowKeys.length}
      totalCount={totalCount}
      title="All Applications"
      onCancelSelection={() => setSelectedRowKeys([])}
      bulkActions={
        <>
          <Button onClick={() => handleBulkToggleLock(true)} icon={<LockOutlined />}>
            Lock
          </Button>
          <Button onClick={() => handleBulkToggleLock(false)} icon={<UnlockOutlined />}>
            Unlock
          </Button>
          <Tooltip title={isAnySelectedLocked ? 'Unlock selected items before deleting' : ''}>
            <Button
              danger
              onClick={handleBulkDelete}
              icon={<DeleteOutlined />}
              disabled={isAnySelectedLocked}
            >
              Delete
            </Button>
          </Tooltip>
        </>
      }
    />
  </div>
);

export default ApplicationBulkBar;

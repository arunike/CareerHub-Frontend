import React from 'react';
import { Button, Popconfirm, Space, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';

interface RowActionsProps {
  isLocked?: boolean;
  onToggleLock?: () => void;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  disableEdit?: boolean;
  disableDelete?: boolean;
  lockTitle?: string;
  viewTitle?: string;
  editTitle?: string;
  deleteTitle?: string;
  deleteDescription?: string;
  deleteButtonTooltip?: string;
  confirmDelete?: boolean;
  size?: 'small' | 'middle' | 'large';
}

const RowActions: React.FC<RowActionsProps> = ({
  isLocked = false,
  onToggleLock,
  onView,
  onEdit,
  onDelete,
  disableEdit = false,
  disableDelete = false,
  lockTitle,
  viewTitle = 'View',
  editTitle = 'Edit',
  deleteTitle = 'Delete?',
  deleteDescription,
  deleteButtonTooltip,
  confirmDelete = true,
  size = 'small',
}) => {
  const stopAndRun = (fn?: () => void) => (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    fn?.();
  };

  return (
    <Space>
      {onToggleLock ? (
        <Tooltip title={lockTitle ?? (isLocked ? 'Unlock' : 'Lock')}>
          <Button
            type="text"
            size={size}
            icon={isLocked ? <UnlockOutlined /> : <LockOutlined />}
            onClick={stopAndRun(onToggleLock)}
          />
        </Tooltip>
      ) : null}

      {onView ? (
        <Tooltip title={viewTitle}>
          <Button type="text" size={size} icon={<EyeOutlined />} onClick={stopAndRun(onView)} />
        </Tooltip>
      ) : null}

      {onEdit ? (
        <Tooltip title={editTitle}>
          <Button type="text" size={size} icon={<EditOutlined />} onClick={stopAndRun(onEdit)} disabled={disableEdit} />
        </Tooltip>
      ) : null}

      {onDelete ? (() => {
        const deleteButton = (
          <Button
            type="text"
            size={size}
            danger
            icon={<DeleteOutlined />}
            disabled={disableDelete}
            onClick={confirmDelete ? (e) => e.stopPropagation() : stopAndRun(onDelete)}
          />
        );
        const withConfirm =
          confirmDelete && !disableDelete ? (
            <Popconfirm title={deleteTitle} description={deleteDescription} onConfirm={onDelete}>
              {deleteButton}
            </Popconfirm>
          ) : (
            deleteButton
          );
        return deleteButtonTooltip ? (
          <Tooltip title={deleteButtonTooltip}>{withConfirm}</Tooltip>
        ) : (
          withConfirm
        );
      })() : null}
    </Space>
  );
};

export default RowActions;

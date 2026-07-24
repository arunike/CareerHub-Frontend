import React from 'react';
import { Button, Popconfirm, Space, Tooltip } from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  LockOutlined,
  UnlockOutlined,
  PushpinOutlined,
  PushpinFilled,
  CopyOutlined,
} from '@ant-design/icons';

interface RowActionsProps {
  isLocked?: boolean;
  onToggleLock?: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
  onView?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  disableEdit?: boolean;
  disableDuplicate?: boolean;
  disableDelete?: boolean;
  lockTitle?: string;
  viewTitle?: string;
  editTitle?: string;
  duplicateTitle?: string;
  deleteTitle?: string;
  deleteDescription?: string;
  deleteButtonTooltip?: string;
  confirmDelete?: boolean;
  size?: 'small' | 'middle' | 'large';
}

const RowActions: React.FC<RowActionsProps> = ({
  isLocked = false,
  onToggleLock,
  isPinned = false,
  onTogglePin,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  disableEdit = false,
  disableDuplicate = false,
  disableDelete = false,
  lockTitle,
  viewTitle = 'View',
  editTitle = 'Edit',
  duplicateTitle = 'Duplicate',
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
    <Space size={4} className="row-actions">
      {onToggleLock ? (
        <Tooltip title={lockTitle ?? (isLocked ? 'Unlock' : 'Lock')}>
          <Button
            type="text"
            size={size}
            icon={isLocked ? <UnlockOutlined /> : <LockOutlined />}
            onClick={stopAndRun(onToggleLock)}
            aria-label={lockTitle ?? (isLocked ? 'Unlock' : 'Lock')}
          />
        </Tooltip>
      ) : null}

      {onView ? (
        <Tooltip title={viewTitle}>
          <Button
            type="text"
            size={size}
            icon={<EyeOutlined />}
            onClick={stopAndRun(onView)}
            aria-label={viewTitle}
          />
        </Tooltip>
      ) : null}

      {onEdit ? (
        <Tooltip title={editTitle}>
          <Button
            type="text"
            size={size}
            icon={<EditOutlined />}
            onClick={stopAndRun(onEdit)}
            disabled={disableEdit}
            aria-label={editTitle}
          />
        </Tooltip>
      ) : null}

      {onDuplicate ? (
        <Tooltip title={duplicateTitle}>
          <Button
            type="text"
            size={size}
            icon={<CopyOutlined />}
            onClick={stopAndRun(onDuplicate)}
            disabled={disableDuplicate}
            aria-label={duplicateTitle}
          />
        </Tooltip>
      ) : null}

      {onTogglePin ? (
        <Tooltip title={isPinned ? 'Unpin' : 'Pin to top'}>
          <Button
            type="text"
            size={size}
            icon={isPinned ? <PushpinFilled className="text-amber-500" /> : <PushpinOutlined />}
            onClick={stopAndRun(onTogglePin)}
            aria-label={isPinned ? 'Unpin' : 'Pin to top'}
          />
        </Tooltip>
      ) : null}

      {onDelete
        ? (() => {
            const deleteButton = (
              <Button
                type="text"
                size={size}
                danger
                icon={<DeleteOutlined />}
                disabled={disableDelete}
                onClick={confirmDelete ? (e) => e.stopPropagation() : stopAndRun(onDelete)}
                aria-label={deleteTitle}
              />
            );
            const withConfirm =
              confirmDelete && !disableDelete ? (
                <Popconfirm
                  title={deleteTitle}
                  description={deleteDescription}
                  onConfirm={onDelete}
                >
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
          })()
        : null}
    </Space>
  );
};

export default RowActions;

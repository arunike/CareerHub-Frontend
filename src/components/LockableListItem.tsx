import React from 'react';
import { Button, Tooltip } from 'antd';
import { LockOutlined, UnlockOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

interface LockableListItemProps {
  isLocked: boolean;
  onToggleLock: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  sectionLocked?: boolean;
  children: React.ReactNode;
}

const LockableListItem: React.FC<LockableListItemProps> = ({
  isLocked,
  onToggleLock,
  onEdit,
  onDelete,
  sectionLocked = false,
  children,
}) => {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition group">
      <div className="flex items-center gap-2 min-w-0">{children}</div>

      {!sectionLocked && (
        <div className="flex items-center gap-0.5 shrink-0">
          {isLocked ? (
            <Tooltip title="Unlock item">
              <Button
                type="text"
                size="small"
                icon={<LockOutlined />}
                onClick={onToggleLock}
                className="text-amber-500!"
              />
            </Tooltip>
          ) : (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
              <Tooltip title="Lock item">
                <Button
                  type="text"
                  size="small"
                  icon={<UnlockOutlined />}
                  onClick={onToggleLock}
                  className="text-gray-300!"
                />
              </Tooltip>
              {onEdit && (
                <Tooltip title="Edit">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={onEdit}
                    className="text-gray-400! hover:text-blue-600!"
                  />
                </Tooltip>
              )}
              {onDelete && (
                <Tooltip title="Delete">
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={onDelete}
                    danger
                    className="text-gray-400!"
                  />
                </Tooltip>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LockableListItem;

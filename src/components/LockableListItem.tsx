import React from 'react';
import RowActions from './RowActions';

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
    <div className="group flex flex-col gap-2 rounded-lg border border-gray-100 p-3 transition hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-2">{children}</div>

      {!sectionLocked && (
        <div className="flex w-full shrink-0 justify-end opacity-100 transition-opacity sm:w-auto md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <RowActions
            isLocked={isLocked}
            onToggleLock={onToggleLock}
            onEdit={isLocked ? undefined : onEdit}
            onDelete={isLocked ? undefined : onDelete}
            lockTitle={isLocked ? 'Unlock item' : 'Lock item'}
            deleteTitle="Delete item?"
          />
        </div>
      )}
    </div>
  );
};

export default LockableListItem;

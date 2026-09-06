import type { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HolderOutlined } from '@ant-design/icons';
import LockableListItem from '../../components/LockableListItem';
import type { UserSettings } from '../../types';

export type ApplicationStage = NonNullable<UserSettings['application_stages']>[number];

export const SortableStageRow = ({
  id,
  disabled,
  isLocked,
  sectionLocked,
  onToggleLock,
  onEdit,
  onDelete,
  children,
}: {
  id: string;
  disabled?: boolean;
  isLocked: boolean;
  sectionLocked?: boolean;
  onToggleLock: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  children: ReactNode;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : 1,
        zIndex: isDragging ? 10 : undefined,
        position: 'relative',
      }}
    >
      <LockableListItem
        isLocked={isLocked}
        sectionLocked={sectionLocked}
        onToggleLock={onToggleLock}
        onEdit={onEdit}
        onDelete={onDelete}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          disabled={disabled}
          aria-label={disabled ? 'Reordering disabled' : 'Drag to reorder stage'}
          title={
            disabled
              ? 'Unlock the stage to reorder it'
              : 'Drag to reorder — this sets the funnel order'
          }
          className={`shrink-0 rounded p-1 text-gray-300 dark:text-ink-600 transition-colors ${
            disabled
              ? 'cursor-not-allowed'
              : 'cursor-grab text-gray-400 dark:text-ink-500 hover:text-gray-600'
          }`}
        >
          <HolderOutlined />
        </button>
        {children}
      </LockableListItem>
    </div>
  );
};

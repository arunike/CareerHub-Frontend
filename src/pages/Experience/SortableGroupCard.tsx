import React from 'react';
import { HolderOutlined } from '@ant-design/icons';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface SortableGroupCardProps {
  id: number;
  children: React.ReactNode;
}

export const SortableGroupCard: React.FC<SortableGroupCardProps> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    position: 'relative',
    zIndex: isDragging ? 30 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group/sortable relative">
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-7 top-6 hidden md:flex items-center justify-center p-1.5 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 cursor-grab active:cursor-grabbing transition-colors z-20 touch-none"
        title="Drag to reorder career timeline"
      >
        <HolderOutlined style={{ fontSize: 18 }} />
      </div>
      {children}
    </div>
  );
};

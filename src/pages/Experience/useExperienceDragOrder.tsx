import { KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { message } from 'antd';
import { HolderOutlined } from '@ant-design/icons';
import Modal from '../../components/MobileModal';
import type React from 'react';
import type { Experience } from '../../types';
import { reorderExperiences } from '../../api/career';
import { reorderedExperiencePositions } from './experienceReorder';

export const useExperienceDragOrder = ({
  groupedExperiences,
  setExperiences,
  fetchExperiences,
}: {
  groupedExperiences: Experience[][];
  setExperiences: React.Dispatch<React.SetStateAction<Experience[]>>;
  fetchExperiences: () => Promise<void> | void;
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = groupedExperiences.findIndex((g) => g[0].id === active.id);
    const newIndex = groupedExperiences.findIndex((g) => g[0].id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const draggedGroup = groupedExperiences[oldIndex];
    const targetGroup = groupedExperiences[newIndex];
    const draggedTitle = `${draggedGroup[0].title} @ ${draggedGroup[0].company}`;
    const targetTitle = `${targetGroup[0].title} @ ${targetGroup[0].company}`;

    Modal.confirm({
      title: 'Confirm Timeline Order Change',
      icon: <HolderOutlined className="text-blue-500" />,
      content: (
        <div className="py-2">
          <p className="text-sm text-gray-600 mb-2">
            Are you sure you want to update the order of your work experiences on the timeline?
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs space-y-1">
            <div>
              <span className="font-semibold text-gray-700">Moving:</span> {draggedTitle}
            </div>
            <div>
              <span className="font-semibold text-gray-700">New position:</span> Position #
              {newIndex + 1} (near {targetTitle})
            </div>
          </div>
        </div>
      ),
      okText: 'Save Order',
      cancelText: 'Cancel',
      okButtonProps: { className: 'bg-blue-600 hover:bg-blue-700' },
      onOk: async () => {
        try {
          const { positions: newOrderPayload } = reorderedExperiencePositions(
            groupedExperiences,
            oldIndex,
            newIndex
          );

          // Optimistically update local experiences
          setExperiences((prevExps) => {
            const posMap = new Map(newOrderPayload.map((item) => [item.id, item.position]));
            return prevExps.map((e) => ({
              ...e,
              position: e.id && posMap.has(e.id) ? posMap.get(e.id) : e.position,
            }));
          });

          await reorderExperiences(newOrderPayload);
          message.success('Timeline order updated and saved successfully!');
        } catch {
          message.error('Failed to save timeline order. Please try again.');
          await fetchExperiences();
        }
      },
    });
  };
  return { sensors, handleDragEnd };
};

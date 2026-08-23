import { arrayMove } from '@dnd-kit/sortable';
import type { Experience } from '../../types';

// Positions are flat across every role, so moving a company moves its whole stint together.
export const reorderedExperiencePositions = (
  groups: Experience[][],
  fromIndex: number,
  toIndex: number
) => {
  const reordered = arrayMove(groups, fromIndex, toIndex);
  const positions: { id: number; position: number }[] = [];
  reordered.forEach((group) =>
    group.forEach((exp) => {
      if (exp.id) positions.push({ id: exp.id, position: positions.length });
    })
  );
  return { reordered, positions };
};

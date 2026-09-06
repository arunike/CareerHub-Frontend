import { PRIORITY_COLOR, STATUS_META, type TaskStatus } from './taskMeta';
import type { Task } from '../../types';
import type React from 'react';
import { Card, Empty, Tag } from 'antd';
import dayjs from 'dayjs';
import RowActions from '../../components/RowActions';

type Props = {
  groupedTasks: Record<TaskStatus, Task[]>;
  handleDelete: (task: Task) => void;
  handleDropStatus: (targetStatus: TaskStatus) => void;
  handleDuplicateTask: (task: Task) => void;
  isMobile: boolean;
  loading: boolean;
  openEditModal: (task: Task) => void;
  openViewModal: (task: Task) => void;
  setDraggingId: React.Dispatch<React.SetStateAction<number | null>>;
};

const TaskKanbanBoard = ({
  groupedTasks,
  handleDelete,
  handleDropStatus,
  handleDuplicateTask,
  isMobile,
  loading,
  openEditModal,
  openViewModal,
  setDraggingId,
}: Props) => (
  <div className="-mx-4 grid snap-x snap-mandatory grid-flow-col auto-cols-[minmax(280px,85vw)] gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid-flow-row md:grid-cols-3 md:px-0">
    {STATUS_META.map((column) => (
      <Card
        key={column.key}
        className="enterprise-section snap-start"
        title={
          <div className="flex items-center justify-between">
            <span>{column.label}</span>
            <Tag color={column.color}>{groupedTasks[column.key].length}</Tag>
          </div>
        }
        loading={loading}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => handleDropStatus(column.key)}
        bodyStyle={{ minHeight: 280 }}
      >
        {groupedTasks[column.key].length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No items" />
        ) : (
          <div className="flex flex-col gap-3 py-1">
            {groupedTasks[column.key].map((task) => (
              <Card
                key={task.id}
                className="enterprise-card overflow-hidden"
                size="small"
                hoverable
                draggable={!isMobile}
                onDragStart={() => setDraggingId(task.id)}
                onDragEnd={() => setDraggingId(null)}
                title={
                  <div className="pr-2">
                    <span className="font-medium">{task.title}</span>
                  </div>
                }
                extra={
                  <RowActions
                    size="small"
                    onView={() => openViewModal(task)}
                    onEdit={() => openEditModal(task)}
                    onDuplicate={() => handleDuplicateTask(task)}
                    onDelete={() => handleDelete(task)}
                    deleteTitle="Delete action item?"
                  />
                }
              >
                <div className="space-y-2">
                  {task.description ? (
                    <p className="text-sm text-gray-600 dark:text-ink-200 m-0">
                      {task.description}
                    </p>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <Tag color={PRIORITY_COLOR[task.priority]}>{task.priority}</Tag>
                    {task.due_date ? (
                      <span className="text-xs text-gray-500 dark:text-ink-400">
                        Due {dayjs(task.due_date).format('MMM D')}
                      </span>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    ))}
  </div>
);

export default TaskKanbanBoard;

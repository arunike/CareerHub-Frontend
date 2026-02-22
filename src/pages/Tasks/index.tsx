import React, { useEffect, useMemo, useState } from 'react';
import { Card, DatePicker, Empty, Form, Input, Modal, Select, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Task } from '../../types';
import { createTask, deleteTask, getTasks, reorderTasks, updateTask } from '../../api';
import PageActionToolbar from '../../components/PageActionToolbar';
import RowActions from '../../components/RowActions';

type TaskStatus = Task['status'];

const STATUS_META: Array<{ key: TaskStatus; label: string; color: string }> = [
  { key: 'TODO', label: 'To Do', color: 'default' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: 'processing' },
  { key: 'DONE', label: 'Done', color: 'success' },
];

const PRIORITY_COLOR: Record<Task['priority'], string> = {
  LOW: 'green',
  MEDIUM: 'gold',
  HIGH: 'red',
};

const Tasks: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'checklist'>('kanban');
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await getTasks();
      setTasks(response.data);
    } catch (error) {
      messageApi.error('Failed to load action items');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const groupedTasks = useMemo(() => {
    const result: Record<TaskStatus, Task[]> = {
      TODO: [],
      IN_PROGRESS: [],
      DONE: [],
    };

    tasks.forEach((task) => {
      result[task.status].push(task);
    });

    (Object.keys(result) as TaskStatus[]).forEach((status) => {
      result[status].sort((a, b) => a.position - b.position || a.id - b.id);
    });

    return result;
  }, [tasks]);

  const persistOrder = async (sourceTasks: Task[]) => {
    const updates: Array<{ id: number; status: TaskStatus; position: number }> = [];

    (['TODO', 'IN_PROGRESS', 'DONE'] as TaskStatus[]).forEach((status) => {
      sourceTasks
        .filter((task) => task.status === status)
        .sort((a, b) => a.position - b.position || a.id - b.id)
        .forEach((task, index) => {
          updates.push({ id: task.id, status, position: index });
        });
    });

    await reorderTasks(updates);
  };

  const openCreateModal = () => {
    setEditingTask(null);
    form.resetFields();
    form.setFieldsValue({ status: 'TODO', priority: 'MEDIUM' });
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    form.setFieldsValue({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      due_date: task.due_date ? dayjs(task.due_date) : null,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload = {
        title: values.title,
        description: values.description || '',
        status: values.status as TaskStatus,
        priority: values.priority as Task['priority'],
        due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
      };

      if (editingTask) {
        await updateTask(editingTask.id, payload);
        messageApi.success('Action item updated');
      } else {
        const nextPosition = groupedTasks[payload.status].length;
        await createTask({ ...payload, position: nextPosition });
        messageApi.success('Action item added');
      }

      setIsModalOpen(false);
      setEditingTask(null);
      form.resetFields();
      fetchTasks();
    } catch (error: any) {
      if (error?.errorFields) return;
      messageApi.error(error?.response?.data?.error || 'Failed to save action item');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (task: Task) => {
    try {
      await deleteTask(task.id);
      messageApi.success('Action item deleted');
      fetchTasks();
    } catch (error) {
      messageApi.error('Failed to delete action item');
      console.error(error);
    }
  };

  const handleChecklistToggle = async (task: Task, checked: boolean) => {
    try {
      await updateTask(task.id, { status: checked ? 'DONE' : 'TODO' });
      fetchTasks();
    } catch (error) {
      messageApi.error('Failed to update action item');
      console.error(error);
    }
  };

  const handleDropStatus = async (targetStatus: TaskStatus) => {
    if (!draggingId) return;
    const dragged = tasks.find((task) => task.id === draggingId);
    setDraggingId(null);
    if (!dragged || dragged.status === targetStatus) return;

    const nextTasks = tasks.map((task) =>
      task.id === draggingId
        ? { ...task, status: targetStatus, position: groupedTasks[targetStatus].length }
        : task
    );
    setTasks(nextTasks);

    try {
      await persistOrder(nextTasks);
      fetchTasks();
    } catch (error) {
      messageApi.error('Failed to move action item');
      console.error(error);
      fetchTasks();
    }
  };

  const checklistTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const statusOrder: Record<TaskStatus, number> = { TODO: 0, IN_PROGRESS: 1, DONE: 2 };
      return statusOrder[a.status] - statusOrder[b.status] || a.position - b.position || a.id - b.id;
    });
  }, [tasks]);

  return (
    <div className="space-y-6 w-full">
      {contextHolder}

      <PageActionToolbar
        title="Action Items"
        subtitle="Track your to-do list in Kanban or checklist view."
        extraActions={
          <div className="toolbar-toggle-group">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode('checklist')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                viewMode === 'checklist'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Checklist
            </button>
          </div>
        }
        onPrimaryAction={openCreateModal}
        primaryActionLabel="Add Action Item"
        primaryActionIcon={<PlusOutlined />}
      />

      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STATUS_META.map((column) => (
            <Card
              key={column.key}
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
                <div className="space-y-3">
                  {groupedTasks[column.key].map((task) => (
                    <Card
                      key={task.id}
                      size="small"
                      hoverable
                      draggable
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
                          onView={() => openEditModal(task)}
                          onEdit={() => openEditModal(task)}
                          onDelete={() => handleDelete(task)}
                          deleteTitle="Delete action item?"
                        />
                      }
                    >
                      <div className="space-y-2">
                        {task.description ? <p className="text-sm text-gray-600 m-0">{task.description}</p> : null}
                        <div className="flex items-center justify-between">
                          <Tag color={PRIORITY_COLOR[task.priority]}>{task.priority}</Tag>
                          {task.due_date ? (
                            <span className="text-xs text-gray-500">Due {dayjs(task.due_date).format('MMM D')}</span>
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
      ) : (
        <Card loading={loading}>
          {checklistTasks.length === 0 ? (
            <Empty description="No action items yet" />
          ) : (
            <div className="space-y-2">
              {checklistTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={task.status === 'DONE'}
                      onChange={(e) => handleChecklistToggle(task, e.target.checked)}
                    />
                    <div className="min-w-0">
                      <div className={`font-medium truncate ${task.status === 'DONE' ? 'line-through text-gray-400' : ''}`}>
                        {task.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Tag color={PRIORITY_COLOR[task.priority]}>{task.priority}</Tag>
                        {task.due_date ? <span>Due {dayjs(task.due_date).format('YYYY-MM-DD')}</span> : null}
                        <span>{STATUS_META.find((s) => s.key === task.status)?.label}</span>
                      </div>
                    </div>
                  </div>
                  <RowActions
                    size="small"
                    onView={() => openEditModal(task)}
                    onEdit={() => openEditModal(task)}
                    onDelete={() => handleDelete(task)}
                    deleteTitle="Delete action item?"
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Modal
        title={editingTask ? 'Edit Action Item' : 'Add Action Item'}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingTask(null);
          form.resetFields();
        }}
        onOk={handleSave}
        confirmLoading={saving}
        okText={editingTask ? 'Save' : 'Add'}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Please enter a title' }]}>
            <Input placeholder="e.g. Follow up with recruiter" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Optional details" />
          </Form.Item>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Form.Item name="status" label="Status" rules={[{ required: true }]}>
              <Select
                options={STATUS_META.map((status) => ({
                  label: status.label,
                  value: status.key,
                }))}
              />
            </Form.Item>
            <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
              <Select
                options={[
                  { label: 'Low', value: 'LOW' },
                  { label: 'Medium', value: 'MEDIUM' },
                  { label: 'High', value: 'HIGH' },
                ]}
              />
            </Form.Item>
          </div>
          <Form.Item name="due_date" label="Due Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Tasks;

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Grid,
  Input,
  Select,
  Tag,
  Tooltip,
  message,
} from 'antd';
import { BellOutlined, CheckCircleOutlined, InboxOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Task, WeeklyReview } from '../../types';
import {
  createTask,
  deleteTask,
  getTasks,
  getWeeklyReview,
  reorderTasks,
  updateTask,
} from '../../api';
import PageActionToolbar from '../../components/PageActionToolbar';
import RowActions from '../../components/RowActions';
import ModalShell from '../../components/ModalShell';
import { PageState } from '../../components/PageState';
import { parseSmartReminder } from '../../utils/smartReminder';

type TaskStatus = Task['status'];
const TASKS_UPDATED_EVENT = 'careerhub:tasks-updated';

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

type ApiError = { errorFields?: unknown; response?: { data?: { error?: string } } };

const Tasks: React.FC = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const location = useLocation();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [viewMode, setViewMode] = useState<'kanban' | 'checklist'>('kanban');
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [weeklyReview, setWeeklyReview] = useState<WeeklyReview | null>(null);
  const [weeklyReviewLoading, setWeeklyReviewLoading] = useState(true);
  const [weeklyReviewError, setWeeklyReviewError] = useState(false);
  const [smartReminderText, setSmartReminderText] = useState('');
  const [smartReminderSaving, setSmartReminderSaving] = useState(false);

  const smartReminderDraft = useMemo(
    () => parseSmartReminder(smartReminderText),
    [smartReminderText]
  );

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const response = await getTasks();
      setTasks(response.data);
    } catch (error) {
      setLoadError(true);
      messageApi.error('Failed to load action items');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  const notifyTasksUpdated = () => {
    window.dispatchEvent(new Event(TASKS_UPDATED_EVENT));
  };

  const fetchWeeklyReview = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      try {
        if (!silent) {
          setWeeklyReviewLoading(true);
          setWeeklyReviewError(false);
        }
        const response = await getWeeklyReview();
        setWeeklyReview(response.data);
      } catch (error) {
        if (!silent) setWeeklyReviewError(true);
        messageApi.error('Failed to load weekly review');
        console.error(error);
      } finally {
        if (!silent) setWeeklyReviewLoading(false);
      }
    },
    [messageApi]
  );

  useEffect(() => {
    void fetchTasks();
    void fetchWeeklyReview();
  }, [fetchTasks, fetchWeeklyReview]);

  useEffect(() => {
    const handleTasksUpdated = () => {
      void fetchWeeklyReview({ silent: true });
    };
    const handleWindowFocus = () => {
      void fetchWeeklyReview({ silent: true });
    };

    window.addEventListener(TASKS_UPDATED_EVENT, handleTasksUpdated);
    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.removeEventListener(TASKS_UPDATED_EVENT, handleTasksUpdated);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [fetchWeeklyReview]);

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
    setModalMode('create');
    setEditingTask(null);
    form.resetFields();
    form.setFieldsValue({ status: 'TODO', priority: 'MEDIUM' });
    setIsModalOpen(true);
  };

  const openEditModal = useCallback(
    (task: Task) => {
      setModalMode('edit');
      setEditingTask(task);
      form.setFieldsValue({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date ? dayjs(task.due_date) : null,
      });
      setIsModalOpen(true);
    },
    [form]
  );

  const openViewModal = useCallback(
    (task: Task) => {
      setModalMode('view');
      setEditingTask(task);
      form.setFieldsValue({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date ? dayjs(task.due_date) : null,
      });
      setIsModalOpen(true);
    },
    [form]
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'create') {
      setModalMode('create');
      setEditingTask(null);
      form.resetFields();
      form.setFieldsValue({ status: 'TODO', priority: 'MEDIUM' });
      setIsModalOpen(true);
      navigate('/tasks', { replace: true });
      return;
    }
    const taskIdParam = params.get('taskId');
    const modeParam = params.get('mode');
    if (!taskIdParam) return;

    const taskId = Number(taskIdParam);
    if (!Number.isFinite(taskId)) return;
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    if (modeParam === 'edit') {
      openEditModal(task);
    } else {
      openViewModal(task);
    }

    navigate('/tasks', { replace: true });
  }, [form, location.search, navigate, openEditModal, openViewModal, tasks]);

  const closeTaskModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
    setModalMode('create');
    form.resetFields();
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

      closeTaskModal();
      fetchTasks();
      notifyTasksUpdated();
    } catch (error: unknown) {
      const apiError = error as ApiError;
      if (apiError?.errorFields) return;
      messageApi.error(apiError?.response?.data?.error || 'Failed to save action item');
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
      notifyTasksUpdated();
    } catch (error) {
      messageApi.error('Failed to delete action item');
      console.error(error);
    }
  };

  const handleChecklistToggle = async (task: Task, checked: boolean) => {
    try {
      await updateTask(task.id, { status: checked ? 'DONE' : 'TODO' });
      fetchTasks();
      notifyTasksUpdated();
    } catch (error) {
      messageApi.error('Failed to update action item');
      console.error(error);
    }
  };

  const handleCreateSmartReminder = async (sourceText = smartReminderText) => {
    const draft = parseSmartReminder(sourceText);
    if (!draft) {
      messageApi.warning(
        'Try a reminder with a date, like "follow up after 7 days" or "offer deadline in 3 days".'
      );
      return;
    }

    try {
      setSmartReminderSaving(true);
      const nextPosition = groupedTasks.TODO.length;
      await createTask({
        title: draft.title,
        description: `Smart reminder created from: "${sourceText.trim()}"`,
        status: 'TODO',
        priority: draft.priority,
        due_date: draft.dueDate.format('YYYY-MM-DD'),
        position: nextPosition,
      });
      setSmartReminderText('');
      messageApi.success(`Reminder set for ${draft.dueDate.format('MMM D')}`);
      fetchTasks();
      notifyTasksUpdated();
    } catch (error) {
      messageApi.error('Failed to create smart reminder');
      console.error(error);
    } finally {
      setSmartReminderSaving(false);
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
      notifyTasksUpdated();
    } catch (error) {
      messageApi.error('Failed to move action item');
      console.error(error);
      fetchTasks();
    }
  };

  const checklistTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const statusOrder: Record<TaskStatus, number> = { TODO: 0, IN_PROGRESS: 1, DONE: 2 };
      return (
        statusOrder[a.status] - statusOrder[b.status] || a.position - b.position || a.id - b.id
      );
    });
  }, [tasks]);

  const tasksLoadFailed = loadError && tasks.length === 0;
  const weeklyReviewLoadFailed = weeklyReviewError && !weeklyReview;

  return (
    <div className="space-y-6 w-full">
      {contextHolder}

      <PageActionToolbar
        title="Action Items"
        subtitle="Track your to-do list in Kanban or checklist view."
        extraActions={
          <div className="toolbar-toggle-group" role="group" aria-label="Action item view">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`min-h-11 rounded-lg px-4 text-sm font-medium transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              aria-pressed={viewMode === 'kanban'}
            >
              Kanban
            </button>
            <button
              type="button"
              onClick={() => setViewMode('checklist')}
              className={`min-h-11 rounded-lg px-4 text-sm font-medium transition-colors ${
                viewMode === 'checklist'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              aria-pressed={viewMode === 'checklist'}
            >
              Checklist
            </button>
          </div>
        }
        onPrimaryAction={openCreateModal}
        primaryActionLabel="Add Action Item"
        primaryActionIcon={<PlusOutlined />}
      />

      <Card className="enterprise-section overflow-hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex items-start gap-3 lg:w-[280px]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <BellOutlined />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-900">Smart reminders</h2>
              <div className="text-xs text-slate-500">Type a reminder in natural language.</div>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <Input
              size="large"
              value={smartReminderText}
              onChange={(event) => setSmartReminderText(event.target.value)}
              onPressEnter={() => handleCreateSmartReminder()}
              placeholder="e.g. Follow up after 7 days"
              aria-label="Reminder description"
              aria-describedby="smart-reminder-help"
              disabled={smartReminderSaving}
              className="min-h-11 text-base sm:text-sm"
            />
            <div
              id="smart-reminder-help"
              className="mt-2 min-h-5 text-xs text-slate-500"
              aria-live="polite"
            >
              {smartReminderDraft ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                  <CheckCircleOutlined />
                  {smartReminderDraft.dueDate.format('MMM D, YYYY')} · {smartReminderDraft.priority}
                </span>
              ) : (
                <span>Understands tomorrow, after 7 days, in 3 days, next Friday.</span>
              )}
            </div>
            <div
              className="scrollbar-none -mx-1 mt-3 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
              role="group"
              aria-label="Reminder examples"
            >
              {[
                'Follow up after 7 days',
                'Prepare for interview tomorrow',
                'Offer deadline in 3 days',
              ].map((example) => (
                <Tooltip key={example} title="Use example">
                  <button
                    type="button"
                    onClick={() => setSmartReminderText(example)}
                    className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                  >
                    {example}
                  </button>
                </Tooltip>
              ))}
            </div>
          </div>

          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            loading={smartReminderSaving}
            disabled={!smartReminderText.trim()}
            onClick={() => handleCreateSmartReminder()}
            className="w-full lg:w-auto lg:self-start"
          >
            Set Reminder
          </Button>
        </div>
      </Card>

      <div>
        <Card title="Weekly Review" loading={weeklyReviewLoading} className="enterprise-section">
          {weeklyReviewLoadFailed ? (
            <PageState
              tone="error"
              title="Weekly review could not be loaded"
              description="Your action items were not changed. Check your connection and try again."
              actionLabel="Retry weekly review"
              onAction={() => void fetchWeeklyReview()}
              icon={<InboxOutlined />}
              className="my-1"
            />
          ) : weeklyReview ? (
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                {dayjs(weeklyReview.start_date).format('MMM D')} -{' '}
                {dayjs(weeklyReview.end_date).format('MMM D, YYYY')}
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="enterprise-kpi min-w-0 px-2 py-2 sm:px-3">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">
                    Applications Sent
                  </div>
                  <div className="text-2xl font-semibold">{weeklyReview.applications_sent}</div>
                </div>
                <div className="enterprise-kpi min-w-0 px-2 py-2 sm:px-3">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">
                    Interviews Done
                  </div>
                  <div className="text-2xl font-semibold">{weeklyReview.interviews_done}</div>
                </div>
                <div className="enterprise-kpi min-w-0 px-2 py-2 sm:px-3">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Next Actions</div>
                  <div className="text-2xl font-semibold">{weeklyReview.next_actions_count}</div>
                </div>
              </div>
              <div className="enterprise-card-list-item px-3 py-2 text-sm text-gray-700">
                {weeklyReview.summary_text}
              </div>
              {weeklyReview.next_actions.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Top Next Actions</div>
                  <div className="space-y-1">
                    {weeklyReview.next_actions.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="enterprise-card-list-item flex items-center justify-between px-2 py-1 text-sm"
                      >
                        <span className="truncate pr-3">{item.title}</span>
                        <span
                          className={`text-xs ${item.is_overdue ? 'text-red-500' : 'text-gray-500'}`}
                        >
                          {item.due_date
                            ? dayjs(item.due_date).format('YYYY-MM-DD')
                            : 'No due date'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <Empty description="No weekly review available" />
          )}
        </Card>
      </div>

      {tasksLoadFailed ? (
        <PageState
          tone="error"
          title="Action items could not be loaded"
          description="Your saved action items were not changed. Check your connection and try again."
          actionLabel="Retry loading action items"
          onAction={() => void fetchTasks()}
          icon={<InboxOutlined />}
        />
      ) : !loading && tasks.length === 0 ? (
        <PageState
          title="No action items yet"
          description="Add the next concrete step for an application, interview, offer, or career goal."
          actionLabel="Add action item"
          onAction={openCreateModal}
          icon={<CheckCircleOutlined />}
        />
      ) : viewMode === 'kanban' ? (
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
                          onDelete={() => handleDelete(task)}
                          deleteTitle="Delete action item?"
                        />
                      }
                    >
                      <div className="space-y-2">
                        {task.description ? (
                          <p className="text-sm text-gray-600 m-0">{task.description}</p>
                        ) : null}
                        <div className="flex items-center justify-between">
                          <Tag color={PRIORITY_COLOR[task.priority]}>{task.priority}</Tag>
                          {task.due_date ? (
                            <span className="text-xs text-gray-500">
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
      ) : (
        <Card loading={loading} className="enterprise-section">
          {checklistTasks.length === 0 ? (
            <Empty description="No action items yet" />
          ) : (
            <div className="space-y-2">
              {checklistTasks.map((task) => (
                <div
                  key={task.id}
                  className="enterprise-card-list-item flex min-h-14 items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <input
                      type="checkbox"
                      checked={task.status === 'DONE'}
                      onChange={(e) => handleChecklistToggle(task, e.target.checked)}
                      className="h-5 w-5 shrink-0 accent-blue-600"
                      aria-label={`Mark ${task.title} as ${task.status === 'DONE' ? 'not done' : 'done'}`}
                    />
                    <div className="min-w-0">
                      <div
                        className={`font-medium truncate ${task.status === 'DONE' ? 'line-through text-gray-400' : ''}`}
                      >
                        {task.title}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <Tag color={PRIORITY_COLOR[task.priority]}>{task.priority}</Tag>
                        {task.due_date ? (
                          <span>Due {dayjs(task.due_date).format('YYYY-MM-DD')}</span>
                        ) : null}
                        <span>{STATUS_META.find((s) => s.key === task.status)?.label}</span>
                      </div>
                    </div>
                  </div>
                  <RowActions
                    size="small"
                    onView={() => openViewModal(task)}
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

      <ModalShell
        isOpen={isModalOpen}
        title={
          modalMode === 'view'
            ? 'View Action Item'
            : editingTask
              ? 'Edit Action Item'
              : 'Add Action Item'
        }
        onClose={closeTaskModal}
        maxWidthClass="max-w-lg"
        bodyClassName="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6"
        footer={
          modalMode === 'view' ? (
            <Button size="large" onClick={closeTaskModal} className="w-full sm:w-auto">
              Close
            </Button>
          ) : (
            <>
              <Button size="large" onClick={closeTaskModal} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button
                type="primary"
                size="large"
                loading={saving}
                onClick={() => void handleSave()}
                className="w-full sm:w-auto"
              >
                {editingTask ? 'Save action item' : 'Add action item'}
              </Button>
            </>
          )
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Please enter a title' }]}
          >
            <Input
              size="large"
              placeholder="e.g. Follow up with recruiter"
              disabled={modalMode === 'view'}
            />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea
              rows={3}
              placeholder="Optional details"
              disabled={modalMode === 'view'}
            />
          </Form.Item>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Form.Item name="status" label="Status" rules={[{ required: true }]}>
              <Select
                size="large"
                disabled={modalMode === 'view'}
                options={STATUS_META.map((status) => ({
                  label: status.label,
                  value: status.key,
                }))}
              />
            </Form.Item>
            <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
              <Select
                size="large"
                disabled={modalMode === 'view'}
                options={[
                  { label: 'Low', value: 'LOW' },
                  { label: 'Medium', value: 'MEDIUM' },
                  { label: 'High', value: 'HIGH' },
                ]}
              />
            </Form.Item>
          </div>
          <Form.Item name="due_date" label="Due Date">
            <DatePicker size="large" style={{ width: '100%' }} disabled={modalMode === 'view'} />
          </Form.Item>
        </Form>
      </ModalShell>
    </div>
  );
};

export default Tasks;

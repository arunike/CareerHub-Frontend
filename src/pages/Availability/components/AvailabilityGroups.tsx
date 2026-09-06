import React from 'react';
import { CheckCircleOutlined, CopyOutlined, EditOutlined } from '@ant-design/icons';
import clsx from 'clsx';
import { createOverride } from '../../../api';
import { message } from 'antd';
import EmptyState from '../../../components/EmptyState';
import { CalendarOutlined } from '@ant-design/icons';

type GroupItem = { displayDate: string; availability: string; fullText: string; date?: string };

type Group = {
  title: string;
  items: GroupItem[];
};

type Props = {
  groupedData: Group[];
  loading: boolean;
  hasData: boolean;
  copiedIndex: string | null;
  onCopy: (text: string, id: string) => void;
  onUpdate: () => void;
};

const AvailabilityGroups = ({
  groupedData,
  loading,
  hasData,
  copiedIndex,
  onCopy,
  onUpdate,
}: Props) => {
  if (!hasData && !loading) {
    return (
      <EmptyState
        icon={CalendarOutlined}
        title="No availability generated"
        description="Choose a start date and timezone, then generate your availability to see the schedule."
      />
    );
  }

  return (
    <div className="space-y-8">
      {groupedData.map((group) => {
        if (group.items.length === 0) return null;

        return (
          <div key={group.title}>
            <h3 className="text-sm font-bold text-gray-500 dark:text-ink-400 uppercase tracking-wider mb-3 ml-1">
              {group.title}
            </h3>
            <div className="space-y-3">
              {group.items.map((item, idx) => (
                <AvailabilityItem
                  key={`${group.title}-${idx}`}
                  item={item}
                  onUpdate={onUpdate}
                  itemId={`${group.title}-${idx}`}
                  copiedIndex={copiedIndex}
                  onCopy={onCopy}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const AvailabilityItem = ({
  item,
  onUpdate,
  itemId,
  copiedIndex,
  onCopy,
}: {
  item: GroupItem;
  onUpdate: () => void;
  itemId: string;
  copiedIndex: string | null;
  onCopy: (text: string, id: string) => void;
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editText, setEditText] = React.useState(item.availability || '');
  const [saving, setSaving] = React.useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!item.date) {
        messageApi.error(
          'Cannot edit a combined range. Please switch to Detailed view to edit specific days.'
        );
        setIsEditing(false);
        setSaving(false);
        return;
      }

      await createOverride({
        date: item.date,
        availability_text: editText,
      });

      setIsEditing(false);
      onUpdate();
      messageApi.success('Override saved');
    } catch (error) {
      messageApi.error('Failed to save override');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="group relative rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 p-4 sm:p-6 transition-all duration-300 hover:border-blue-300 hover:shadow-md">
      {contextHolder}
      <div className="flex min-w-0 items-start justify-between gap-4 md:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-semibold text-gray-900 dark:text-ink-50">{item.displayDate}</span>
          </div>

          {isEditing ? (
            <div className="mt-2 flex min-w-0 flex-col gap-2 sm:flex-row">
              <input
                className="min-h-11 min-w-0 flex-1 rounded border border-gray-300 dark:border-white/[0.12] px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                autoFocus
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="min-h-11 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="min-h-11 rounded bg-gray-100 dark:bg-ink-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-ink-100 hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="group/text flex min-w-0 items-center gap-2">
              <p className="min-w-0 break-words font-mono text-sm font-medium text-gray-700 dark:text-ink-100 [overflow-wrap:anywhere] md:text-base">
                {item.availability}
              </p>
              {item.date && (
                <button
                  onClick={() => {
                    setEditText(item.availability);
                    setIsEditing(true);
                  }}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-400 dark:text-ink-500 opacity-100 transition-opacity hover:bg-gray-100 hover:text-blue-600 md:min-h-0 md:min-w-0 md:p-1 md:opacity-0 md:group-hover/text:opacity-100 md:group-focus-within/text:opacity-100"
                  title="Edit availability"
                  aria-label={`Edit availability for ${item.displayDate}`}
                >
                  <EditOutlined className="text-xs" />
                </button>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => onCopy(item.fullText, itemId)}
          className={clsx(
            'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 transition-colors',
            copiedIndex === itemId
              ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-300'
              : 'bg-gray-50 dark:bg-ink-900 text-gray-400 dark:text-ink-500 opacity-100 hover:bg-gray-100 hover:text-gray-600 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100'
          )}
          title="Copy line"
          aria-label={`Copy availability for ${item.displayDate}`}
        >
          {copiedIndex === itemId ? (
            <CheckCircleOutlined className="text-xl" />
          ) : (
            <CopyOutlined className="text-xl" />
          )}
        </button>
      </div>

      <div className="absolute left-0 top-4 bottom-4 w-1 bg-blue-500 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

export default AvailabilityGroups;

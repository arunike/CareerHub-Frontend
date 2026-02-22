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

const AvailabilityGroups = ({ groupedData, loading, hasData, copiedIndex, onCopy, onUpdate }: Props) => {
  if (!hasData && !loading) {
    return (
      <EmptyState
        icon={CalendarOutlined}
        title="No availability generated"
        description="Select a Start Date and Timezone, then click 'Generate AvailabilityType' to see your schedule."
      />
    );
  }

  return (
    <div className="space-y-8">
      {groupedData.map((group, groupIdx) => {
        if (group.items.length === 0) return null;

        return (
          <div
            key={group.title}
            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: `${groupIdx * 100}ms` }}
          >
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">{group.title}</h3>
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
        messageApi.error('Cannot edit a combined range. Please switch to Detailed view to edit specific days.');
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
    <div className="group relative bg-white rounded-xl p-5 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-300">
      {contextHolder}
      <div className="flex items-start md:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-semibold text-gray-900">{item.displayDate}</span>
          </div>

          {isEditing ? (
            <div className="flex gap-2 mt-1">
              <input
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                autoFocus
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-xs font-medium hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group/text">
              <p className="text-gray-700 font-medium font-mono text-sm md:text-base">{item.availability}</p>
              {item.date && (
                <button
                  onClick={() => {
                    setEditText(item.availability);
                    setIsEditing(true);
                  }}
                  className="opacity-0 group-hover/text:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity p-1"
                  title="Override AvailabilityType"
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
            'p-2 rounded-lg transition-colors',
            copiedIndex === itemId
              ? 'bg-green-50 text-green-600'
              : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100 opacity-0'
          )}
          title="Copy line"
        >
          {copiedIndex === itemId ? <CheckCircleOutlined className="text-xl" /> : <CopyOutlined className="text-xl" />}
        </button>
      </div>

      <div className="absolute left-0 top-4 bottom-4 w-1 bg-blue-500 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

export default AvailabilityGroups;

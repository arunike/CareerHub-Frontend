import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CloseOutlined,
  PlusOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { Button } from 'antd';
import {
  DEFAULT_MOBILE_TOOLBAR_KEYS,
  MOBILE_NAVIGATION_ITEMS,
  getMobileToolbarItems,
} from '../../constants/mobileNavigation';

interface MobileToolbarSettingsProps {
  value?: string[];
  onChange: (keys: string[]) => void;
}

const MobileToolbarSettings = ({ value, onChange }: MobileToolbarSettingsProps) => {
  const selectedItems = getMobileToolbarItems(value);
  const selectedKeys = selectedItems.map((item) => item.key);
  const availableItems = MOBILE_NAVIGATION_ITEMS.filter((item) => !selectedKeys.includes(item.key));

  const moveItem = (index: number, offset: -1 | 1) => {
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= selectedKeys.length) return;
    const nextKeys = [...selectedKeys];
    [nextKeys[index], nextKeys[nextIndex]] = [nextKeys[nextIndex], nextKeys[index]];
    onChange(nextKeys);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Mobile Toolbar</h2>
          <p className="mt-0.5 text-xs text-gray-400">
            Pin and order up to four shortcuts. More always stays at the end.
          </p>
        </div>
        <Button
          type="text"
          size="small"
          icon={<UndoOutlined />}
          onClick={() => onChange([...DEFAULT_MOBILE_TOOLBAR_KEYS])}
        >
          Reset default
        </Button>
      </div>

      <div className="space-y-2">
        {selectedItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">
                <Icon />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{item.label}</p>
                <p className="text-[11px] text-slate-400">Position {index + 1}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="text"
                  size="small"
                  icon={<ArrowUpOutlined />}
                  disabled={index === 0}
                  onClick={() => moveItem(index, -1)}
                  aria-label={`Move ${item.label} up`}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<ArrowDownOutlined />}
                  disabled={index === selectedItems.length - 1}
                  onClick={() => moveItem(index, 1)}
                  aria-label={`Move ${item.label} down`}
                />
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<CloseOutlined />}
                  disabled={selectedItems.length === 1}
                  onClick={() => onChange(selectedKeys.filter((key) => key !== item.key))}
                  aria-label={`Remove ${item.label} from mobile toolbar`}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
          Add shortcut
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {availableItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                disabled={selectedItems.length >= 4}
                onClick={() => onChange([...selectedKeys, item.key])}
                className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Icon className="text-base" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <PlusOutlined className="text-xs" />
              </button>
            );
          })}
        </div>
        {selectedItems.length >= 4 && (
          <p className="mt-3 text-xs text-slate-400">
            Remove a shortcut before adding another one.
          </p>
        )}
      </div>
    </div>
  );
};

export default MobileToolbarSettings;

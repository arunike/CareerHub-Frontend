import {
  CloseOutlined,
  HolderOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AppstoreOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import {
  DEFAULT_MOBILE_TOOLBAR_KEYS,
  MOBILE_NAVIGATION_ITEMS,
  MOBILE_SMART_SLOT_KEY,
  getMobileToolbarSlots,
  normalizeMobileToolbarKeys,
  type MobileToolbarSlot,
} from '../../constants/mobileNavigation';

interface MobileToolbarSettingsProps {
  value?: string[];
  onChange: (keys: string[]) => void;
}

interface SortableToolbarItemProps {
  item: MobileToolbarSlot;
  index: number;
  canRemove: boolean;
  onRemove: () => void;
}

const SortableToolbarItem = ({ item, index, canRemove, onRemove }: SortableToolbarItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.slotKey,
  });
  const Icon = item.icon;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex min-h-[64px] items-center gap-3 rounded-xl border px-2 py-2 transition-shadow ${
        isDragging
          ? 'z-10 border-blue-300 bg-white shadow-xl shadow-blue-900/10'
          : item.isSmart
            ? 'border-blue-200 bg-blue-50/70'
            : 'border-slate-200 bg-slate-50'
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Drag ${item.label} to reorder`}
        className="flex h-11 w-11 shrink-0 touch-none items-center justify-center rounded-xl text-slate-500 transition hover:bg-white hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <HolderOutlined />
      </button>
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ${
          item.isSmart ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'
        }`}
      >
        <Icon />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-900">{item.label}</p>
        <p className="text-xs text-slate-600">
          {item.isSmart ? 'Adapts to context and recent use' : `Position ${index + 1}`}
        </p>
      </div>
      <button
        type="button"
        disabled={!canRemove}
        onClick={onRemove}
        aria-label={`Remove ${item.label} from mobile toolbar`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-35"
      >
        <CloseOutlined />
      </button>
    </div>
  );
};

const MobileToolbarSettings = ({ value, onChange }: MobileToolbarSettingsProps) => {
  const selectedKeys = normalizeMobileToolbarKeys(value);
  const selectedItems = getMobileToolbarSlots(value);
  const availableItems = MOBILE_NAVIGATION_ITEMS.filter((item) => !selectedKeys.includes(item.key));
  const smartSlotSelected = selectedKeys.includes(MOBILE_SMART_SLOT_KEY);
  const canAdd = selectedItems.length < 4;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = selectedKeys.indexOf(String(active.id));
    const newIndex = selectedKeys.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(selectedKeys, oldIndex, newIndex));
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold text-gray-900">Mobile Toolbar</h2>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            Drag up to four shortcuts into priority order. More always stays at the end. On mobile,
            press and hold a supported shortcut for actions from that page only.
          </p>
        </div>
        <Button
          type="text"
          icon={<UndoOutlined />}
          onClick={() => onChange([...DEFAULT_MOBILE_TOOLBAR_KEYS])}
        >
          Reset default
        </Button>
      </div>

      <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <p className="mb-3 text-xs font-bold text-slate-600">Live preview</p>
        <div className="grid grid-cols-5 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {Array.from({ length: 4 }).map((_, index) => {
            const item = selectedItems[index];
            const Icon = item?.icon;
            return (
              <div
                key={item?.slotKey || `empty-${index}`}
                className={`flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold ${
                  item?.isSmart ? 'bg-blue-50 text-blue-700' : 'text-slate-500'
                }`}
              >
                {Icon ? <Icon className="text-base" /> : <span className="text-slate-300">+</span>}
                <span className="max-w-full truncate">{item?.shortLabel || 'Empty'}</span>
              </div>
            );
          })}
          <div className="flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl bg-slate-900 px-1 text-[10px] font-semibold text-white">
            <AppstoreOutlined className="text-base" />
            <span>More</span>
          </div>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={selectedKeys} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {selectedItems.map((item, index) => (
              <SortableToolbarItem
                key={item.slotKey}
                item={item}
                index={index}
                canRemove={selectedItems.length > 1}
                onRemove={() => onChange(selectedKeys.filter((key) => key !== item.slotKey))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate-800">Add shortcut</p>
          <span className="text-xs text-slate-600">{selectedItems.length}/4 used</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {!smartSlotSelected && (
            <button
              type="button"
              disabled={!canAdd}
              onClick={() => onChange([...selectedKeys, MOBILE_SMART_SLOT_KEY])}
              className="flex min-h-[68px] items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-left transition hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                <ThunderboltOutlined />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-blue-900">Smart Slot</span>
                <span className="block text-xs leading-4 text-blue-800">
                  Suggests an unpinned destination
                </span>
              </span>
              <PlusOutlined className="text-blue-700" />
            </button>
          )}
          {availableItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                disabled={!canAdd}
                onClick={() => onChange([...selectedKeys, item.key])}
                className="flex min-h-[60px] items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Icon className="text-base" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <PlusOutlined className="text-xs" />
              </button>
            );
          })}
        </div>
        {!canAdd && (
          <p className="mt-3 text-sm text-slate-600">
            Remove a shortcut before adding another one.
          </p>
        )}
      </div>
    </section>
  );
};

export default MobileToolbarSettings;

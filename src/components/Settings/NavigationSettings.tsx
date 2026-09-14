import { useEffect, useRef, useState } from 'react';
import {
  AppstoreOutlined,
  HolderOutlined,
  MenuOutlined,
  PushpinFilled,
  ReloadOutlined,
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
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input, Popconfirm, Tooltip } from 'antd';
import {
  DEFAULT_MOBILE_TOOLBAR_KEYS,
  MOBILE_SMART_SLOT_KEY,
  getMobileToolbarSlots,
  normalizeMobileToolbarKeys,
  type MobileToolbarSlot,
} from '../../constants/mobileNavigation';
import { NAV_GROUPS, applyNavOrder, navLabel, type NavItem } from '../../constants/navigationItems';

// The preview is the editor: the tiles are the toolbar order.
const SortableToolbarSlot = ({ slot, index }: { slot: MobileToolbarSlot; index: number }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slot.slotKey,
  });
  const Icon = slot.icon;
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-label={`Drag ${slot.label} to reorder the mobile toolbar. Position ${index + 1}.`}
      className={`flex min-h-[58px] min-w-0 cursor-grab touch-none flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold transition active:cursor-grabbing ${
        isDragging
          ? 'z-10 bg-white dark:bg-ink-900 opacity-90 shadow-lg ring-2 ring-blue-400'
          : slot.isSmart
            ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
            : 'text-slate-500 dark:text-ink-400 hover:bg-slate-100'
      }`}
    >
      <Icon className="text-base" />
      <span className="max-w-full truncate">{slot.shortLabel}</span>
    </div>
  );
};

// More occupies a slot of its own, so four pins fill the bar's five columns.
const MAX_PINNED = 4;

const NAME_MAX_LENGTH = 40;

interface Props {
  hiddenNavItems?: string[];
  onHiddenNavItemsChange: (keys: string[]) => void;
  navItemOrder?: string[];
  onNavItemOrderChange: (keys: string[]) => void;
  mobileToolbarItems?: string[];
  onMobileToolbarItemsChange: (keys: string[]) => void;
  navItemLabels?: Record<string, string>;
  onNavItemLabelsChange: (labels: Record<string, string>) => void;
}

// The built-in name is the placeholder, so emptying the field restores the default.
const NameField = ({
  itemKey,
  defaultLabel,
  labels,
  onChange,
  className = '',
}: {
  itemKey: string;
  defaultLabel: string;
  labels: Record<string, string>;
  onChange: (labels: Record<string, string>) => void;
  className?: string;
}) => {
  const stored = labels[itemKey];
  // Value, not placeholder: placeholder grey made unrenamed entries look disabled.
  const [draft, setDraft] = useState(stored ?? defaultLabel);
  const focused = useRef(false);

  // Pick up an outside change, e.g. Reset to default, but never while it is being typed in.
  useEffect(() => {
    if (!focused.current) setDraft(stored ?? defaultLabel);
  }, [stored, defaultLabel]);

  const commit = (value: string) => {
    setDraft(value);
    const next = { ...labels };
    const trimmed = value.trim();
    // Only real differences are stored, so renaming back to the default clears the override.
    if (trimmed && trimmed !== defaultLabel) next[itemKey] = trimmed;
    else delete next[itemKey];
    onChange(next);
  };

  return (
    <Input
      variant="borderless"
      size="small"
      maxLength={NAME_MAX_LENGTH}
      value={draft}
      placeholder={defaultLabel}
      aria-label={`Rename ${defaultLabel}`}
      className={`!px-1.5 !rounded-md transition-colors hover:!bg-slate-100 dark:hover:!bg-ink-800 focus:!bg-white dark:focus:!bg-ink-900 focus:!ring-2 focus:!ring-blue-500/40 ${className}`}
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={() => {
        focused.current = false;
        // An emptied field means "use the built-in name", so show it again.
        if (!draft.trim()) setDraft(defaultLabel);
      }}
      onChange={(event) => commit(event.target.value)}
    />
  );
};

const VisibilityToggle = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={`${checked ? 'Hide' : 'Show'} ${label} in the sidebar`}
    onClick={onChange}
    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
      checked ? 'bg-sky-500' : 'bg-gray-200 dark:bg-ink-800'
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white dark:bg-ink-900 shadow-sm transition-transform ${
        checked ? 'translate-x-4' : 'translate-x-0'
      }`}
    />
  </button>
);

const PinButton = ({
  pinned,
  disabled,
  onChange,
  label,
}: {
  pinned: boolean;
  disabled: boolean;
  onChange: () => void;
  label: string;
}) => (
  <Tooltip
    title={
      pinned
        ? 'Pinned to the mobile toolbar'
        : disabled
          ? `Mobile toolbar is full (${MAX_PINNED})`
          : 'Pin to the mobile toolbar'
    }
  >
    <button
      type="button"
      role="switch"
      aria-checked={pinned}
      aria-label={`${pinned ? 'Unpin' : 'Pin'} ${label} on the mobile toolbar`}
      disabled={disabled && !pinned}
      onClick={onChange}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        pinned
          ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300'
          : 'text-slate-300 dark:text-ink-600 hover:bg-slate-100 hover:text-slate-500 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-300'
      }`}
    >
      <PushpinFilled />
    </button>
  </Tooltip>
);

const SortableNavRow = ({
  item,
  hidden,
  pinned,
  pinDisabled,
  pinnable,
  onToggleHidden,
  onTogglePinned,
  labels,
  onLabelsChange,
  children,
}: {
  item: NavItem;
  hidden: boolean;
  pinned: boolean;
  pinDisabled: boolean;
  pinnable: boolean;
  onToggleHidden: () => void;
  onTogglePinned: () => void;
  labels: Record<string, string>;
  onLabelsChange: (labels: Record<string, string>) => void;
  children?: React.ReactNode;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.key,
  });
  const isGroup = !!item.children;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-xl border transition-shadow ${
        isDragging
          ? 'z-10 border-blue-300 dark:border-blue-500/30 bg-white dark:bg-ink-900 shadow-xl shadow-blue-900/10'
          : 'border-transparent'
      }`}
    >
      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/[0.07] py-1.5 pl-1 pr-2 last:border-b-0">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag ${navLabel(item.key, item.label, labels)} to reorder`}
          className="flex h-8 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-slate-300 dark:text-ink-600 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:cursor-grabbing"
        >
          <HolderOutlined />
        </button>
        <NameField
          itemKey={item.key}
          defaultLabel={item.label}
          labels={labels}
          onChange={onLabelsChange}
          className={`min-w-0 flex-1 !text-sm ${
            hidden
              ? '!text-slate-400 dark:!text-ink-500 line-through'
              : '!text-slate-800 dark:!text-ink-50'
          }`}
        />
        {isGroup ? (
          <VisibilityToggle
            checked={!hidden}
            onChange={onToggleHidden}
            label={navLabel(item.key, item.label, labels)}
          />
        ) : (
          <>
            {pinnable && (
              <PinButton
                pinned={pinned}
                disabled={pinDisabled}
                onChange={onTogglePinned}
                label={navLabel(item.key, item.label, labels)}
              />
            )}
            <VisibilityToggle
              checked={!hidden}
              onChange={onToggleHidden}
              label={navLabel(item.key, item.label, labels)}
            />
          </>
        )}
      </div>
      {children}
    </div>
  );
};

const NavigationSettings = ({
  hiddenNavItems,
  onHiddenNavItemsChange,
  navItemOrder,
  onNavItemOrderChange,
  mobileToolbarItems,
  onMobileToolbarItemsChange,
  navItemLabels,
  onNavItemLabelsChange,
}: Props) => {
  const hidden = hiddenNavItems || [];
  const labels = navItemLabels || {};
  const pinnedKeys = normalizeMobileToolbarKeys(mobileToolbarItems);
  const previewSlots = getMobileToolbarSlots(mobileToolbarItems);
  const pinnedCount = pinnedKeys.length;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const toggleHidden = (key: string) =>
    onHiddenNavItemsChange(
      hidden.includes(key) ? hidden.filter((item) => item !== key) : [...hidden, key]
    );

  const togglePinned = (key: string) => {
    if (pinnedKeys.includes(key)) {
      onMobileToolbarItemsChange(pinnedKeys.filter((item) => item !== key));
      return;
    }
    if (pinnedKeys.length >= MAX_PINNED) return;
    onMobileToolbarItemsChange([...pinnedKeys, key]);
  };

  const handleToolbarDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = pinnedKeys.indexOf(String(active.id));
    const to = pinnedKeys.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onMobileToolbarItemsChange(arrayMove(pinnedKeys, from, to));
  };

  // Groups sort independently; the saved order is every list concatenated.
  const orderedGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: applyNavOrder(group.items, navItemOrder).map((item) =>
      item.children ? { ...item, children: applyNavOrder(item.children, navItemOrder) } : item
    ),
  }));

  const currentOrder = orderedGroups.flatMap((group) =>
    group.items.flatMap((item) => [item.key, ...(item.children?.map((child) => child.key) ?? [])])
  );

  const handleDragEnd = (keys: string[]) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = keys.indexOf(String(active.id));
    const to = keys.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const reordered = arrayMove(keys, from, to);
    // Replace just this list's slice of the overall order, leaving other groups alone.
    const next = currentOrder.filter((key) => !keys.includes(key));
    const anchor = currentOrder.findIndex((key) => keys.includes(key));
    next.splice(anchor, 0, ...reordered);
    onNavItemOrderChange(next);
  };

  return (
    <section className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 dark:border-white/[0.08] pb-3">
        <div className="max-w-2xl">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-ink-50">
            <span className="text-slate-400 dark:text-ink-500">
              <MenuOutlined />
            </span>
            Navigation
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-ink-400">
            Drag to reorder the sidebar, rename anything by typing over its name, switch off a
            single entry or a whole group, and pin up to {MAX_PINNED} shortcuts to the mobile
            toolbar. Items stay within their group.
          </p>
        </div>
        <Popconfirm
          title="Reset navigation to default?"
          description="Your sidebar order, custom names, hidden items and pinned mobile shortcuts will all go back to the defaults."
          okText="Reset"
          okButtonProps={{ danger: true }}
          cancelText="Cancel"
          placement="bottomRight"
          onConfirm={() => {
            onNavItemOrderChange([]);
            onHiddenNavItemsChange([]);
            onMobileToolbarItemsChange([...DEFAULT_MOBILE_TOOLBAR_KEYS]);
            onNavItemLabelsChange({});
          }}
        >
          <button
            type="button"
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] px-2.5 text-xs font-semibold text-slate-600 dark:text-ink-200 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 sm:h-9"
          >
            <ReloadOutlined className="text-xs" />
            Reset to default
          </button>
        </Popconfirm>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-ink-900 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-600 dark:text-ink-200">
            Mobile toolbar{' '}
            <span className="font-normal text-slate-400 dark:text-ink-500">· drag to reorder</span>
          </p>
          <span className="text-xs text-slate-500 dark:text-ink-400">
            {pinnedCount}/{MAX_PINNED} pinned
          </span>
        </div>
        {/* DndContext wraps the grid: its screen-reader nodes would otherwise take up cells. */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleToolbarDragEnd}
        >
          <div
            className="grid gap-1 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 p-2 shadow-sm"
            style={{ gridTemplateColumns: `repeat(${MAX_PINNED + 1}, minmax(0, 1fr))` }}
          >
            <SortableContext items={pinnedKeys} strategy={horizontalListSortingStrategy}>
              {previewSlots.map((slot, index) => (
                <SortableToolbarSlot key={slot.slotKey} slot={slot} index={index} />
              ))}
            </SortableContext>
            {Array.from({ length: MAX_PINNED - previewSlots.length }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className="flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-200 dark:border-white/[0.08] px-1 text-[10px] font-semibold text-slate-400 dark:text-ink-500"
              >
                <span className="text-slate-300 dark:text-ink-600">+</span>
                <span>Empty</span>
              </div>
            ))}
            <div className="flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl bg-slate-900 px-1 text-[10px] font-semibold text-white">
              <AppstoreOutlined className="text-base" />
              <span>More</span>
            </div>
          </div>
        </DndContext>
        {pinnedKeys.includes(MOBILE_SMART_SLOT_KEY) && (
          <p className="mt-2 text-[11px] text-slate-500 dark:text-ink-400">
            The Smart Slot adapts to context and recent use.
          </p>
        )}
      </div>

      <div className="space-y-5">
        {orderedGroups.map((group) => {
          const groupKeys = group.items.map((item) => item.key);
          const groupHidden = hidden.includes(group.key);
          return (
            <div key={group.key}>
              <div className="mb-1 flex items-center gap-2 px-1">
                <NameField
                  itemKey={group.key}
                  defaultLabel={group.label}
                  labels={labels}
                  onChange={onNavItemLabelsChange}
                  className={`min-w-0 flex-1 !text-[11px] !font-semibold !uppercase !tracking-wide ${
                    groupHidden
                      ? '!text-slate-300 dark:!text-ink-600 line-through'
                      : '!text-slate-400 dark:!text-ink-500'
                  }`}
                />
                <VisibilityToggle
                  checked={!groupHidden}
                  onChange={() => toggleHidden(group.key)}
                  label={`the ${navLabel(group.key, group.label, labels)} group`}
                />
              </div>
              <div
                className={`rounded-xl border border-slate-200 dark:border-white/[0.08] transition-opacity ${
                  groupHidden ? 'opacity-50' : ''
                }`}
              >
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd(groupKeys)}
                >
                  <SortableContext items={groupKeys} strategy={verticalListSortingStrategy}>
                    {group.items.map((item) => {
                      const childKeys = item.children?.map((child) => child.key) ?? [];
                      return (
                        <SortableNavRow
                          key={item.key}
                          item={item}
                          hidden={hidden.includes(item.key)}
                          pinned={pinnedKeys.includes(item.key)}
                          pinDisabled={pinnedCount >= MAX_PINNED}
                          pinnable
                          onToggleHidden={() => toggleHidden(item.key)}
                          onTogglePinned={() => togglePinned(item.key)}
                          labels={labels}
                          onLabelsChange={onNavItemLabelsChange}
                        >
                          {item.children && (
                            <div className="pl-8">
                              <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd(childKeys)}
                              >
                                <SortableContext
                                  items={childKeys}
                                  strategy={verticalListSortingStrategy}
                                >
                                  {item.children.map((child) => (
                                    <SortableNavRow
                                      key={child.key}
                                      item={child}
                                      hidden={hidden.includes(child.key)}
                                      pinned={pinnedKeys.includes(child.key)}
                                      pinDisabled={pinnedCount >= MAX_PINNED}
                                      pinnable
                                      onToggleHidden={() => toggleHidden(child.key)}
                                      onTogglePinned={() => togglePinned(child.key)}
                                      labels={labels}
                                      onLabelsChange={onNavItemLabelsChange}
                                    />
                                  ))}
                                </SortableContext>
                              </DndContext>
                            </div>
                          )}
                        </SortableNavRow>
                      );
                    })}
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default NavigationSettings;

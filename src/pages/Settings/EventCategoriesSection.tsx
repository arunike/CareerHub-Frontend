import type { ReactNode } from 'react';
import type React from 'react';
import { patchCategory } from '../../api';
import type { EventCategory } from '../../types';
import { PlusOutlined, CloseOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import IconPicker from '../../components/IconPicker';
import CategoryBadge from '../../components/CategoryBadge';
import ColorSwatchPicker from '../../components/ColorSwatchPicker';
import LockableListItem from '../../components/LockableListItem';
import { SECTION_ICONS } from './settingsChrome';

type Props = {
  messageApi: ReturnType<typeof import('antd').message.useMessage>[0];
  categories: EventCategory[];
  editingCategory: EventCategory | null;
  handleCancelEdit: () => void;
  handleDeleteCategory: (id: number) => void;
  handleEditCategory: (cat: EventCategory) => void;
  handleSaveCategory: (e: React.FormEvent) => void;
  isAddingCategory: boolean;
  isCategoriesLocked: boolean;
  isLocked: boolean;
  newCategoryColor: string;
  newCategoryIcon: string;
  newCategoryName: string;
  renderClashNotice: (
    color: string | null | undefined,
    excluding?: { kind: 'category' | 'holiday'; label: string }
  ) => ReactNode;
  setCategories: React.Dispatch<React.SetStateAction<EventCategory[]>>;
  setIsAddingCategory: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCategoriesLocked: React.Dispatch<React.SetStateAction<boolean>>;
  setNewCategoryColor: React.Dispatch<React.SetStateAction<string>>;
  setNewCategoryIcon: React.Dispatch<React.SetStateAction<string>>;
  setNewCategoryName: React.Dispatch<React.SetStateAction<string>>;
};

const EventCategoriesSection = ({
  messageApi,
  categories,
  editingCategory,
  handleCancelEdit,
  handleDeleteCategory,
  handleEditCategory,
  handleSaveCategory,
  isAddingCategory,
  isCategoriesLocked,
  newCategoryColor,
  newCategoryIcon,
  newCategoryName,
  renderClashNotice,
  setCategories,
  setIsAddingCategory,
  setIsCategoriesLocked,
  setNewCategoryColor,
  setNewCategoryIcon,
  setNewCategoryName,
}: Props) => (
  <div
    id="settings-section-categories"
    className="scroll-mt-24 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 p-4 shadow-sm sm:p-6"
  >
    <div className="mb-4 flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-ink-50">
        <span className="text-slate-400 dark:text-ink-500">{SECTION_ICONS.categories}</span>
        Manage Categories
      </h2>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setIsCategoriesLocked((l) => !l)}
          className={`flex h-11 w-11 items-center justify-center rounded-lg transition-colors sm:h-9 sm:w-9 ${isCategoriesLocked ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-100' : 'text-gray-600 dark:text-ink-200 hover:bg-gray-100 hover:text-gray-800'}`}
          title={isCategoriesLocked ? 'Unlock section' : 'Lock section'}
          aria-pressed={isCategoriesLocked}
        >
          {isCategoriesLocked ? (
            <LockOutlined className="text-base" />
          ) : (
            <UnlockOutlined className="text-base" />
          )}
        </button>
        {!isCategoriesLocked && (
          <button
            onClick={() => {
              if (isAddingCategory) {
                handleCancelEdit();
              } else {
                setIsAddingCategory(true);
              }
            }}
            className="flex min-h-11 items-center gap-1 rounded-xl bg-blue-50 dark:bg-blue-500/10 px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 transition hover:bg-blue-100 sm:min-h-9 sm:rounded-lg sm:py-1.5"
          >
            {isAddingCategory ? (
              <CloseOutlined className="text-base" />
            ) : (
              <PlusOutlined className="text-base" />
            )}
            {isAddingCategory ? 'Cancel' : 'Add Category'}
          </button>
        )}
      </div>
    </div>

    {isAddingCategory && !isCategoriesLocked && (
      <form
        onSubmit={handleSaveCategory}
        className="mb-6 bg-gray-50 dark:bg-ink-900 p-4 rounded-lg border border-gray-200 dark:border-white/[0.08]"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-ink-400 mb-1">
                Name
              </label>
              <input
                type="text"
                placeholder="e.g. Health, Finance"
                className="w-full rounded-lg border border-gray-300 dark:border-white/[0.12] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-ink-400 mb-1">
                Icon
              </label>
              <IconPicker value={newCategoryIcon} onChange={setNewCategoryIcon} />
            </div>
            <button
              type="submit"
              disabled={!newCategoryName.trim()}
              className="min-h-11 w-full rounded-xl bg-blue-600 px-4 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
            >
              {editingCategory ? 'Update' : 'Add'}
            </button>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-ink-400 mb-1">
              Color
            </label>
            <ColorSwatchPicker
              value={newCategoryColor}
              onChange={setNewCategoryColor}
              mode="hex"
              allowCustomHex
            />
            {renderClashNotice(
              newCategoryColor,
              editingCategory ? { kind: 'category', label: editingCategory.name } : undefined
            )}
          </div>
        </div>
      </form>
    )}

    <div className="space-y-2">
      {categories.length === 0 ? (
        <p className="text-gray-500 dark:text-ink-400 text-sm text-center py-4">
          No categories defined.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.map((cat) => (
            <LockableListItem
              key={cat.id}
              isLocked={!!cat.is_locked}
              sectionLocked={isCategoriesLocked}
              onToggleLock={async () => {
                const newLocked = !cat.is_locked;

                setCategories((prev) =>
                  prev.map((c) => (c.id === cat.id ? { ...c, is_locked: newLocked } : c))
                );

                try {
                  await patchCategory(cat.id, { is_locked: newLocked });
                } catch {
                  setCategories((prev) =>
                    prev.map((c) => (c.id === cat.id ? { ...c, is_locked: !newLocked } : c))
                  );
                  messageApi.error('Failed to update lock');
                }
              }}
              onEdit={() => handleEditCategory(cat)}
              onDelete={() => handleDeleteCategory(cat.id)}
            >
              <CategoryBadge category={cat} />
            </LockableListItem>
          ))}
        </div>
      )}
    </div>
  </div>
);

export default EventCategoriesSection;

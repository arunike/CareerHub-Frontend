import { useCallback, useState } from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import { createCategory, deleteCategory, getCategories, updateCategory } from '../../api';
import type { EventCategory } from '../../types';
import { DEFAULT_PALETTE_COLOR, getPaletteColor } from '../../utils/colorPalette';

export const useEventCategoryEditor = ({ messageApi }: { messageApi: MessageInstance }) => {
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [isCategoriesLocked, setIsCategoriesLocked] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(
    getPaletteColor(DEFAULT_PALETTE_COLOR).dot
  );
  const [newCategoryIcon, setNewCategoryIcon] = useState('tag');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EventCategory | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const resp = await getCategories();
      setCategories(resp.data);
    } catch (error) {
      messageApi.error('Failed to fetch categories');
      console.error('Error fetching categories:', error);
    }
  }, [messageApi]);

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: newCategoryName,
          color: newCategoryColor,
          icon: newCategoryIcon,
        });
        messageApi.success('Category updated');
      } else {
        await createCategory({
          name: newCategoryName,
          color: newCategoryColor,
          icon: newCategoryIcon,
        });
        messageApi.success('Category created');
      }

      setNewCategoryName('');
      setNewCategoryColor(getPaletteColor(DEFAULT_PALETTE_COLOR).dot);
      setNewCategoryIcon('tag');
      setIsAddingCategory(false);
      setEditingCategory(null);
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      messageApi.error('Failed to save category');
      console.error('Error saving category:', error);
    }
  };

  const handleEditCategory = (cat: EventCategory) => {
    setEditingCategory(cat);
    setNewCategoryName(cat.name);
    setNewCategoryColor(cat.color);
    setNewCategoryIcon(cat.icon || 'tag');
    setIsAddingCategory(true);
  };

  const handleCancelEdit = () => {
    setIsAddingCategory(false);
    setEditingCategory(null);
    setNewCategoryName('');
    setNewCategoryColor(getPaletteColor(DEFAULT_PALETTE_COLOR).dot);
    setNewCategoryIcon('tag');
  };

  const handleDeleteCategory = (id: number) => {
    setDeletingCategoryId(id);
  };

  const confirmDeleteCategory = async () => {
    if (deletingCategoryId === null) return;
    try {
      await deleteCategory(deletingCategoryId);
      fetchCategories();
      messageApi.success('Category deleted');
      setDeletingCategoryId(null);
    } catch (error) {
      messageApi.error('Failed to delete category');
      setDeletingCategoryId(null);
      console.error('Error deleting category:', error);
    }
  };

  return {
    categories,
    setCategories,
    isCategoriesLocked,
    setIsCategoriesLocked,
    newCategoryName,
    setNewCategoryName,
    newCategoryColor,
    setNewCategoryColor,
    newCategoryIcon,
    setNewCategoryIcon,
    isAddingCategory,
    setIsAddingCategory,
    editingCategory,
    deletingCategoryId,
    setDeletingCategoryId,
    fetchCategories,
    handleSaveCategory,
    handleEditCategory,
    handleCancelEdit,
    handleDeleteCategory,
    confirmDeleteCategory,
  };
};

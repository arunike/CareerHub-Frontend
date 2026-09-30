import { confirmDestructive } from './confirmDestructive';

// One wording for losing unsaved work, wherever it is about to be lost.
export const confirmLeaveDialog = (label: string) =>
  new Promise<boolean>((resolve) => {
    confirmDestructive({
      title: 'Leave without saving?',
      content: `Your unsaved ${label} will be lost.`,
      okText: 'Leave',
      cancelText: 'Stay on this page',
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });

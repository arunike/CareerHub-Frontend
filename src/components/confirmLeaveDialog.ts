import Modal from './MobileModal';

// One wording for losing unsaved work, wherever it is about to be lost.
export const confirmLeaveDialog = (label: string) =>
  new Promise<boolean>((resolve) => {
    Modal.confirm({
      title: 'Leave without saving?',
      content: `Your unsaved ${label} will be lost.`,
      okText: 'Leave',
      okButtonProps: { danger: true },
      cancelText: 'Stay on this page',
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });

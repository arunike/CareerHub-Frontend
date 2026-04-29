import React from 'react';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import clsx from 'clsx';
import ModalShell from './ModalShell';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <ModalShell
      isOpen={isOpen}
      title={title}
      onClose={onCancel}
      maxWidthClass="max-w-sm"
      bodyClassName="overflow-y-auto px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-6"
      titleClassName="text-lg font-bold text-gray-900"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 sm:flex-none"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={clsx(
              'min-h-11 flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition shadow-sm sm:flex-none',
              type === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : type === 'warning'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-blue-600 hover:bg-blue-700'
            )}
          >
            {confirmText}
          </button>
        </>
      }
    >
      <div className="mb-1 flex items-start gap-3 sm:mb-0">
        <div
          className={clsx(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
            type === 'danger' && 'bg-red-100',
            type === 'warning' && 'bg-amber-100',
            type === 'info' && 'bg-blue-100'
          )}
        >
          <ExclamationCircleOutlined
            className={clsx(
              'text-2xl',
              type === 'danger' && 'text-red-600',
              type === 'warning' && 'text-amber-600',
              type === 'info' && 'text-blue-600'
            )}
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-wrap">{message}</p>
        </div>
      </div>
    </ModalShell>
  );
};

export default ConfirmModal;

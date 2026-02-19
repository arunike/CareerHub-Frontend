import React from 'react';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import clsx from 'clsx';

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-100">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div
            className={clsx(
              'w-12 h-12 rounded-full flex items-center justify-center shrink-0',
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
          <div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{message}</p>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={clsx(
              'px-4 py-2.5 rounded-lg text-white transition font-medium shadow-sm',
              type === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : type === 'warning'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-blue-600 hover:bg-blue-700'
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

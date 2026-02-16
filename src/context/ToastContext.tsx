/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { CloseOutlined, CheckCircleFilled, ExclamationCircleFilled, InfoCircleFilled } from '@ant-design/icons';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto remove after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}

      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border w-80 pointer-events-auto transform transition-all duration-300 animate-in slide-in-from-right-10 fade-in
              ${toast.type === 'success' ? 'bg-white border-green-100 text-gray-800' : ''}
              ${toast.type === 'error' ? 'bg-white border-red-100 text-gray-800' : ''}
              ${toast.type === 'warning' ? 'bg-white border-yellow-100 text-gray-800' : ''}
              ${toast.type === 'info' ? 'bg-white border-blue-100 text-gray-800' : ''}
            `}
          >
            {/* Icon */}
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircleFilled className="text-xl text-green-500" />}
              {toast.type === 'error' && <ExclamationCircleFilled className="text-xl text-red-500" />}
              {toast.type === 'warning' && <ExclamationCircleFilled className="text-xl text-amber-500" />}
              {toast.type === 'info' && <InfoCircleFilled className="text-xl text-blue-500" />}
            </div>

            <div className="flex-1 text-sm font-medium">{toast.message}</div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <CloseOutlined className="text-sm" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

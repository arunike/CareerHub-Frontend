import { CloseOutlined } from '@ant-design/icons';
import { createPortal } from 'react-dom';
import { useEffect, type ReactNode } from 'react';

type Props = {
  isOpen: boolean;
  title?: string;
  titleNode?: ReactNode;
  onClose: () => void;
  maxWidthClass?: string;
  bodyClassName?: string;
  wrapperClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  closeButtonClassName?: string;
  zIndex?: number;
  footer?: ReactNode;
  showMobileHandle?: boolean;
  children: ReactNode;
};

const ModalShell = ({
  isOpen,
  title,
  titleNode,
  onClose,
  maxWidthClass = 'max-w-lg',
  bodyClassName = 'flex-1 min-h-0 overflow-y-auto',
  wrapperClassName = '',
  headerClassName = 'flex items-center justify-between border-b border-slate-200/80 bg-slate-50/80 px-4 py-4 sm:px-6',
  titleClassName = 'font-semibold tracking-[-0.01em] text-base sm:text-lg text-slate-950',
  closeButtonClassName = 'inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600',
  zIndex = 1000,
  footer,
  showMobileHandle = true,
  children,
}: Props) => {
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      style={{ zIndex }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        className={`mt-auto flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[24px] border border-slate-200/80 bg-white shadow-[0_28px_80px_-44px_rgba(15,23,42,0.72)] sm:mt-0 sm:max-h-[90vh] sm:rounded-xl ${maxWidthClass} ${wrapperClassName}`.trim()}
        onClick={(event) => event.stopPropagation()}
      >
        {showMobileHandle ? (
          <div className="flex justify-center px-4 pt-3 sm:hidden">
            <span className="h-1.5 w-12 rounded-full bg-slate-300" aria-hidden="true" />
          </div>
        ) : null}
        <div className={headerClassName}>
          <h3 className={titleClassName}>{titleNode ?? title}</h3>
          <button
            type="button"
            onClick={onClose}
            className={closeButtonClassName}
            aria-label="Close modal"
          >
            <CloseOutlined className="text-lg" />
          </button>
        </div>
        <div className={bodyClassName}>{children}</div>
        {footer ? (
          <div className="flex flex-col-reverse justify-end gap-3 border-t border-slate-200/80 bg-slate-50/80 px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:flex-row sm:px-6 sm:py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
};

export default ModalShell;

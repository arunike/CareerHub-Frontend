import { CloseOutlined } from '@ant-design/icons';
import { createPortal } from 'react-dom';
import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { useMobileSheetDrag } from '../hooks/useMobileSheetDrag';

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
  footerClassName?: string;
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
  closeButtonClassName = 'inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 sm:h-10 sm:w-10',
  footerClassName = 'flex flex-col-reverse justify-end gap-3 border-t border-slate-200/80 bg-slate-50/80 px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:flex-row sm:px-6 sm:py-4',
  zIndex = 1100,
  footer,
  showMobileHandle = true,
  children,
}: Props) => {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const mobileSheet = useMobileSheetDrag({ isOpen, onClose });

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return undefined;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusFrame = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const initialTarget = dialog.querySelector<HTMLElement>(
        '[data-modal-initial-focus], button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      (initialTarget || dialog).focus();
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousBodyOverflow;
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key !== 'Tab') return;

    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => element.offsetParent !== null);

    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

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
        ref={dialogRef}
        className={`careerhub-modal-shell mt-auto flex w-full min-h-0 flex-col overflow-hidden border-slate-200/80 bg-white shadow-[0_28px_80px_-44px_rgba(15,23,42,0.72)] ${
          mobileSheet.isExpanded
            ? 'fixed inset-0 h-[100dvh] max-h-[100dvh] rounded-none border-0'
            : 'max-h-[92dvh] rounded-t-[24px] border'
        } sm:static sm:inset-auto sm:mt-0 sm:h-auto sm:max-h-[90vh] sm:rounded-xl sm:border ${maxWidthClass} ${wrapperClassName}`.trim()}
        style={mobileSheet.sheetStyle}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleDialogKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        {showMobileHandle ? (
          <button
            type="button"
            className={`group flex min-h-11 w-full shrink-0 touch-none items-center justify-center px-4 sm:hidden ${
              mobileSheet.isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{
              paddingTop: mobileSheet.isExpanded
                ? 'max(env(safe-area-inset-top), 0.25rem)'
                : undefined,
            }}
            aria-label={
              mobileSheet.isExpanded
                ? 'Restore modal to compact size'
                : 'Expand modal to full screen'
            }
            aria-pressed={mobileSheet.isExpanded}
            {...mobileSheet.handleProps}
          >
            <span
              className={`h-1.5 w-12 rounded-full transition-colors ${
                mobileSheet.isDragging ? 'bg-blue-400' : 'bg-slate-300 group-active:bg-blue-400'
              }`}
              aria-hidden="true"
            />
          </button>
        ) : null}
        <div className={headerClassName}>
          <h3 id={titleId} className={titleClassName}>
            {titleNode ?? title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            data-modal-initial-focus
            className={`${closeButtonClassName} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
            aria-label="Close modal"
          >
            <CloseOutlined className="text-lg" />
          </button>
        </div>
        <div className={bodyClassName}>{children}</div>
        {footer ? <div className={footerClassName}>{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
};

export default ModalShell;

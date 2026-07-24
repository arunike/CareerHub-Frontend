import { CloseOutlined, FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import { createPortal } from 'react-dom';
import { Drawer as AntDrawer } from 'antd';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';

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
  mobileExpandable?: boolean;
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
  mobileExpandable = true,
  children,
}: Props) => {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isContentShort, setIsContentShort] = useState(true);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Measure content height on open or children change
  useEffect(() => {
    if (!isOpen || !isMobile) return;

    const timer = setTimeout(() => {
      if (bodyRef.current) {
        const height = bodyRef.current.scrollHeight;
        setIsContentShort(height < 350);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen, isMobile, children]);

  // Reset expansion state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setIsExpanded(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || isMobile || typeof window === 'undefined') return undefined;

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
  }, [isOpen, isMobile]);

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
    );
    if (focusable.length === 0) return;
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

  if (!isOpen) return null;

  if (isMobile) {
    const drawerTitle = (
      <div className="careerhub-mobile-drawer-title-wrapper">
        <div className="careerhub-mobile-drawer-handle-bar">
          <span />
        </div>
        <div className="careerhub-mobile-drawer-header-row">
          <div className="careerhub-mobile-drawer-title-text">{titleNode ?? title}</div>
          {mobileExpandable && !isContentShort && (
            <div className="careerhub-mobile-drawer-actions">
              <button
                type="button"
                className="careerhub-mobile-drawer-action-btn"
                onClick={() => setIsExpanded((curr) => !curr)}
                aria-label={isExpanded ? 'Exit fullscreen' : 'Expand to fullscreen'}
              >
                {isExpanded ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              </button>
            </div>
          )}
        </div>
      </div>
    );

    const mobileFooter = footer ? (
      <div className="flex flex-col gap-3 w-full sm:flex-row sm:justify-end sm:gap-3">{footer}</div>
    ) : null;

    return (
      <AntDrawer
        open={isOpen}
        onClose={onClose}
        title={drawerTitle}
        footer={mobileFooter}
        destroyOnClose
        placement="bottom"
        height={isExpanded ? '100dvh' : undefined}
        zIndex={zIndex}
        maskClosable={false}
        rootClassName={`careerhub-mobile-drawer ${
          isExpanded ? 'careerhub-mobile-drawer-expanded' : ''
        } ${isContentShort ? 'careerhub-mobile-drawer-short' : ''}`}
        className={wrapperClassName}
      >
        <div className={bodyClassName} ref={bodyRef}>
          {children}
        </div>
      </AntDrawer>
    );
  }

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
        className={`careerhub-modal-shell mt-auto flex w-full min-h-0 flex-col overflow-hidden border-slate-200/80 bg-white shadow-[0_28px_80px_-44px_rgba(15,23,42,0.72)] max-h-[92dvh] rounded-t-[24px] border sm:static sm:inset-auto sm:mt-0 sm:h-auto sm:max-h-[90vh] sm:rounded-xl sm:border ${maxWidthClass} ${wrapperClassName}`.trim()}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleDialogKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
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

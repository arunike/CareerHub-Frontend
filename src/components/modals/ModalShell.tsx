import { CloseOutlined } from '@ant-design/icons';
import { type ReactNode } from 'react';
import { Modal as AntModal } from 'antd';
import { useIsMobile } from '../../hooks/useIsMobile';
import MobileSheet from './MobileSheet';

type Props = {
  isOpen: boolean;
  title?: string;
  titleNode?: ReactNode;
  onClose: () => void;
  // A px width, the way antd sizes a dialog; its own cap keeps it inside a narrow screen.
  width?: number;
  bodyClassName?: string;
  wrapperClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  closeButtonClassName?: string;
  footerClassName?: string;
  // Left to antd unless a caller needs a specific layer; it assigns from its own counter.
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
  width = 512,
  bodyClassName = 'flex-1 min-h-0 overflow-y-auto',
  wrapperClassName = '',
  headerClassName = 'flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/80 dark:bg-ink-900/80 px-4 py-4 sm:px-6',
  titleClassName = 'font-semibold tracking-[-0.01em] text-base sm:text-lg text-slate-950 dark:text-ink-50',
  closeButtonClassName = 'inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 dark:text-ink-500 transition hover:bg-slate-100 hover:text-slate-600 sm:h-10 sm:w-10',
  footerClassName = 'flex flex-col-reverse justify-end gap-3 border-t border-slate-200/80 dark:border-white/[0.08] bg-slate-50/80 dark:bg-ink-900/80 px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:flex-row sm:px-6 sm:py-4',
  zIndex,
  footer,
  mobileExpandable = true,
  children,
}: Props) => {
  const isMobile = useIsMobile();

  if (!isOpen) return null;

  if (isMobile) {
    return (
      <MobileSheet
        isOpen={isOpen}
        onClose={onClose}
        title={titleNode ?? title}
        footer={
          footer ? (
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end sm:gap-3">
              {footer}
            </div>
          ) : null
        }
        bodyClassName={bodyClassName}
        className={wrapperClassName}
        zIndex={zIndex}
        mobileExpandable={mobileExpandable}
        destroyOnClose
      >
        {children}
      </MobileSheet>
    );
  }

  // antd owns the dialog: focus trap, Escape, z-index and animation. The chrome below is ours.
  return (
    <AntModal
      open={isOpen}
      onCancel={onClose}
      // The header goes in as antd's title: that is what makes antd name the dialog for a reader.
      title={
        <div className={headerClassName}>
          <h3 className={titleClassName}>{titleNode ?? title}</h3>
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
      }
      footer={footer ? <div className={footerClassName}>{footer}</div> : null}
      closable={false}
      centered
      destroyOnHidden
      width={width}
      zIndex={zIndex}
      className={`careerhub-modal-shell ${wrapperClassName}`.trim()}
      styles={{
        // The panel caps the height; antd's own header and footer padding would double ours.
        container: { padding: 0, maxHeight: '90vh', display: 'flex', flexDirection: 'column' },
        header: { padding: 0, margin: 0, border: 'none', background: 'transparent' },
        body: { padding: 0, minHeight: 0, flex: 1, display: 'flex', flexDirection: 'column' },
        footer: { padding: 0, margin: 0, border: 'none' },
      }}
    >
      <div className={bodyClassName}>{children}</div>
    </AntModal>
  );
};

export default ModalShell;

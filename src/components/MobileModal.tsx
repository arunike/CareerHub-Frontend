import { useEffect, useState, useRef, type MouseEvent as ReactMouseEvent } from 'react';
import { Modal as AntModal, Drawer as AntDrawer, type ModalProps } from 'antd';
import { FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';

interface MobileModalProps extends ModalProps {
  mobileExpandable?: boolean;
}

const MobileModalBase = ({
  modalRender,
  wrapClassName,
  mobileExpandable = true,
  // Every modal in the app is vertically centered unless it opts out. antd defaults to
  // pinning near the top, which reads as misaligned on tall screens.
  centered = true,
  ...props
}: MobileModalProps) => {
  const isOpen = Boolean(props.open);
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
  }, [isOpen, isMobile, props.children]);

  // Reset expansion state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setIsExpanded(false);
    }
  }, [isOpen]);

  if (!isMobile) {
    return (
      <AntModal
        {...props}
        centered={centered}
        wrapClassName={wrapClassName}
        modalRender={modalRender}
      />
    );
  }

  // Mobile viewport: Render a premium native bottom Drawer
  const handleClose = () => {
    props.onCancel?.({} as ReactMouseEvent<HTMLButtonElement, MouseEvent>);
  };

  const drawerTitle = (
    <div className="careerhub-mobile-drawer-title-wrapper">
      <div className="careerhub-mobile-drawer-handle-bar">
        <span />
      </div>
      <div className="careerhub-mobile-drawer-header-row">
        <div className="careerhub-mobile-drawer-title-text">{props.title as React.ReactNode}</div>
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

  return (
    <AntDrawer
      open={isOpen}
      onClose={handleClose}
      title={drawerTitle}
      footer={props.footer as React.ReactNode}
      destroyOnClose={props.destroyOnClose}
      placement="bottom"
      height={isExpanded ? '100dvh' : undefined}
      rootClassName={`careerhub-mobile-drawer ${
        isExpanded ? 'careerhub-mobile-drawer-expanded' : ''
      } ${isContentShort ? 'careerhub-mobile-drawer-short' : ''}`.trim()}
      className={props.className}
      closable={props.closable ?? true}
      keyboard={props.keyboard}
      mask={props.mask ?? true}
      maskClosable={props.maskClosable ?? false}
    >
      <div ref={bodyRef}>{props.children}</div>
    </AntDrawer>
  );
};

// The imperative dialogs bypass the component above, so centre them at the source rather
// than relying on every call site to remember.
type DialogFn = typeof AntModal.confirm;
const centeredDialog =
  (dialog: DialogFn): DialogFn =>
  (config) =>
    dialog({ centered: true, ...config });

const MobileModal = Object.assign(MobileModalBase, {
  info: centeredDialog(AntModal.info),
  success: centeredDialog(AntModal.success),
  error: centeredDialog(AntModal.error),
  warning: centeredDialog(AntModal.warning),
  warn: centeredDialog(AntModal.warn),
  confirm: centeredDialog(AntModal.confirm),
  destroyAll: AntModal.destroyAll,
  config: AntModal.config,
  useModal: AntModal.useModal,
});

export default MobileModal;

import { useEffect, useState, useRef, type MouseEvent as ReactMouseEvent } from 'react';
import { Button, Modal as AntModal, Drawer as AntDrawer, type ModalProps } from 'antd';
import { FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';

interface MobileModalProps extends ModalProps {
  mobileExpandable?: boolean;
}

const MobileModalBase = ({
  modalRender,
  wrapClassName,
  mobileExpandable = true,
  // antd pins near the top, which reads as misaligned on tall screens.
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
        // Fullscreen is only worth offering once the body outgrows the sheet's 88dvh cap.
        const height = bodyRef.current.scrollHeight;
        setIsContentShort(height <= window.innerHeight * 0.88 - 96);
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

  // antd defaults a footer when none is given; Drawer does not, so pass it explicitly.
  const drawerFooter =
    props.footer === undefined ? (
      <div className="careerhub-mobile-drawer-footer">
        <Button
          onClick={handleClose}
          disabled={props.cancelButtonProps?.disabled}
          {...props.cancelButtonProps}
        >
          {(props.cancelText as React.ReactNode) ?? 'Cancel'}
        </Button>
        <Button
          // okType allows antd's legacy 'danger' value, which Button's type prop rejects.
          type={props.okType === 'danger' ? 'primary' : (props.okType ?? 'primary')}
          danger={props.okType === 'danger'}
          loading={props.confirmLoading}
          onClick={(clickEvent) =>
            props.onOk?.(clickEvent as ReactMouseEvent<HTMLButtonElement, MouseEvent>)
          }
          {...props.okButtonProps}
        >
          {(props.okText as React.ReactNode) ?? 'OK'}
        </Button>
      </div>
    ) : (
      (props.footer as React.ReactNode)
    );

  return (
    <AntDrawer
      open={isOpen}
      onClose={handleClose}
      title={drawerTitle}
      footer={drawerFooter}
      destroyOnClose={props.destroyOnClose}
      placement="bottom"
      height={isExpanded ? '100dvh' : undefined}
      rootClassName={`careerhub-mobile-drawer ${
        isExpanded ? 'careerhub-mobile-drawer-expanded' : ''
      }`.trim()}
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

// The imperative dialogs bypass the component above, so they are centred at the source.
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

import { type MouseEvent as ReactMouseEvent } from 'react';
import { Button, Modal as AntModal, type ModalProps } from 'antd';
import { useIsMobile } from '../../hooks/useIsMobile';
import MobileSheet from './MobileSheet';

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
  const isMobile = useIsMobile();
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

  // Mobile viewport: a native bottom sheet, shared with ModalShell.
  const handleClose = () => {
    props.onCancel?.({} as ReactMouseEvent<HTMLButtonElement, MouseEvent>);
  };

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
    <MobileSheet
      isOpen={isOpen}
      onClose={handleClose}
      title={props.title as React.ReactNode}
      footer={drawerFooter}
      className={props.className}
      mobileExpandable={mobileExpandable}
      destroyOnClose={props.destroyOnClose}
      closable={props.closable ?? true}
      keyboard={props.keyboard}
      mask={props.mask ?? true}
      maskClosable={props.maskClosable ?? false}
    >
      {props.children}
    </MobileSheet>
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

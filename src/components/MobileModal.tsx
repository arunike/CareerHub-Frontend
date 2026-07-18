import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { Grid, Modal as AntModal, type ModalProps } from 'antd';
import { useMobileSheetDrag } from '../hooks/useMobileSheetDrag';

const MobileModalBase = ({ modalRender, wrapClassName, ...props }: ModalProps) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const isOpen = Boolean(props.open);
  const requestClose = () => props.onCancel?.({} as ReactMouseEvent<HTMLButtonElement, MouseEvent>);
  const mobileSheet = useMobileSheetDrag({ isOpen, onClose: requestClose });

  const renderModal = (node: ReactNode) => {
    const renderedNode = modalRender ? modalRender(node) : node;
    if (!isMobile) return renderedNode;

    return (
      <div
        className={`careerhub-mobile-modal-frame ${
          mobileSheet.isExpanded ? 'careerhub-mobile-modal-expanded' : ''
        }`}
        style={mobileSheet.sheetStyle}
      >
        <button
          type="button"
          className={`careerhub-mobile-modal-handle ${mobileSheet.isDragging ? 'is-dragging' : ''}`}
          aria-label={
            mobileSheet.isExpanded ? 'Restore modal to compact size' : 'Expand modal to full screen'
          }
          aria-pressed={mobileSheet.isExpanded}
          {...mobileSheet.handleProps}
        >
          <span aria-hidden="true" />
        </button>
        {renderedNode}
      </div>
    );
  };

  return (
    <AntModal
      {...props}
      wrapClassName={`careerhub-mobile-modal-wrap ${wrapClassName || ''}`.trim()}
      modalRender={renderModal}
    />
  );
};

const MobileModal = Object.assign(MobileModalBase, {
  info: AntModal.info,
  success: AntModal.success,
  error: AntModal.error,
  warning: AntModal.warning,
  warn: AntModal.warn,
  confirm: AntModal.confirm,
  destroyAll: AntModal.destroyAll,
  config: AntModal.config,
  useModal: AntModal.useModal,
});

export default MobileModal;

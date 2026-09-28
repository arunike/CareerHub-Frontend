import { FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import { Drawer as AntDrawer } from 'antd';
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  className?: string;
  zIndex?: number;
  mobileExpandable?: boolean;
  destroyOnClose?: boolean;
  // Taken from Drawer itself: antd's closable and mask are richer than a plain boolean.
  closable?: ComponentProps<typeof AntDrawer>['closable'];
  keyboard?: boolean;
  mask?: ComponentProps<typeof AntDrawer>['mask'];
  maskClosable?: boolean;
};

// The bottom sheet both shells drew: the measure, the expand and the drawer were identical in each.
const MobileSheet = ({
  isOpen,
  onClose,
  title,
  footer,
  children,
  bodyClassName,
  className,
  zIndex,
  mobileExpandable = true,
  destroyOnClose,
  closable = true,
  keyboard,
  mask = true,
  maskClosable = false,
}: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isContentShort, setIsContentShort] = useState(true);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (bodyRef.current) {
        // Fullscreen is only worth offering once the body outgrows the sheet's 88dvh cap.
        const height = bodyRef.current.scrollHeight;
        setIsContentShort(height <= window.innerHeight * 0.88 - 96);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen, children]);

  useEffect(() => {
    if (!isOpen) setIsExpanded(false);
  }, [isOpen]);

  const sheetTitle = (
    <div className="careerhub-mobile-drawer-title-wrapper">
      <div className="careerhub-mobile-drawer-handle-bar">
        <span />
      </div>
      <div className="careerhub-mobile-drawer-header-row">
        <div className="careerhub-mobile-drawer-title-text">{title}</div>
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
      onClose={onClose}
      title={sheetTitle}
      footer={footer}
      destroyOnClose={destroyOnClose}
      placement="bottom"
      height={isExpanded ? '100dvh' : undefined}
      zIndex={zIndex}
      rootClassName={`careerhub-mobile-drawer ${
        isExpanded ? 'careerhub-mobile-drawer-expanded' : ''
      }`.trim()}
      className={className}
      closable={closable}
      keyboard={keyboard}
      mask={mask}
      maskClosable={maskClosable}
    >
      <div className={bodyClassName} ref={bodyRef}>
        {children}
      </div>
    </AntDrawer>
  );
};

export default MobileSheet;

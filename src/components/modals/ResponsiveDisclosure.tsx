import { useState } from 'react';
import { Drawer, Popover } from 'antd';
import type { ReactNode } from 'react';

import { useIsMobile } from '../../hooks/useIsMobile';

export interface ResponsiveDisclosureProps {
  title: ReactNode;
  content: ReactNode;
  // Popover supplies its own onClick; passing one as well made each click toggle twice.
  trigger: (onClick?: () => void) => ReactNode;
  placement?: 'bottom' | 'bottomRight' | 'bottomLeft';
  open?: boolean;
  onOpenChange?: (next: boolean) => void;
}

// A bottom sheet on a phone and a popover on a desktop, so neither is re-decided per call site.
const ResponsiveDisclosure = ({
  title,
  content,
  trigger,
  placement = 'bottom',
  open,
  onOpenChange,
}: ResponsiveDisclosureProps) => {
  const isMobile = useIsMobile();
  const [uncontrolled, setUncontrolled] = useState(false);
  const isOpen = open ?? uncontrolled;
  const setOpen = onOpenChange ?? setUncontrolled;

  if (isMobile) {
    return (
      <>
        {trigger(() => setOpen(true))}
        <Drawer
          open={isOpen}
          onClose={() => setOpen(false)}
          placement="bottom"
          height="auto"
          title={title}
        >
          {content}
        </Drawer>
      </>
    );
  }

  return (
    <Popover
      open={isOpen}
      onOpenChange={setOpen}
      trigger="click"
      placement={placement}
      title={title}
      content={content}
    >
      {trigger()}
    </Popover>
  );
};

export default ResponsiveDisclosure;

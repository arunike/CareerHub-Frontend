import { CloseOutlined } from '@ant-design/icons';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

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
  footer?: ReactNode;
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
  headerClassName = 'px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50',
  titleClassName = 'font-semibold text-gray-900',
  closeButtonClassName = 'text-gray-400 hover:text-gray-600',
  footer,
  children,
}: Props) => {
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div
        className={`bg-white rounded-xl shadow-xl w-full ${maxWidthClass} max-h-[90vh] overflow-hidden flex flex-col ${wrapperClassName}`.trim()}
      >
        <div className={headerClassName}>
          <h3 className={titleClassName}>{titleNode ?? title}</h3>
          <button onClick={onClose} className={closeButtonClassName}>
            <CloseOutlined className="text-lg" />
          </button>
        </div>
        <div className={bodyClassName}>{children}</div>
        {footer ? <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
};

export default ModalShell;

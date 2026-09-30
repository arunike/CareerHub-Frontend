import MobileModal from './MobileModal';
import type { ModalFuncProps } from 'antd';

// One spelling of "this is destructive", through the centred dialog the app already standardised on.
export const confirmDestructive = (options: ModalFuncProps) =>
  MobileModal.confirm({ okType: 'danger', ...options });

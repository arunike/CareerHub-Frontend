import type { ReactNode } from 'react';
import { Button } from 'antd';
import ModalShell from '../../components/ModalShell';

type Props = {
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  onSubmit: () => void;
  renderApplicationForm: (props: {
    onCancel: () => void;
    submitLabel?: string;
    showActions?: boolean;
  }) => ReactNode;
};

const ApplicationAddModal = ({
  isAddModalOpen,
  setIsAddModalOpen,
  onSubmit,
  renderApplicationForm,
}: Props) => (
  <ModalShell
    isOpen={isAddModalOpen}
    title="Add Application"
    onClose={() => setIsAddModalOpen(false)}
    maxWidthClass="max-w-[700px]"
    bodyClassName="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6"
    footer={
      <div className="flex flex-col gap-3 w-full sm:flex-row sm:justify-end">
        <Button size="large" onClick={() => setIsAddModalOpen(false)} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button size="large" type="primary" onClick={onSubmit} className="w-full sm:w-auto">
          Add application
        </Button>
      </div>
    }
  >
    {isAddModalOpen
      ? renderApplicationForm({
          onCancel: () => setIsAddModalOpen(false),
          submitLabel: 'Save',
          showActions: false,
        })
      : null}
  </ModalShell>
);

export default ApplicationAddModal;

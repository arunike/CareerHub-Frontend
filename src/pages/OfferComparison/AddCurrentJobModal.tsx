import type React from 'react';
import ModalShell from '../../components/ModalShell';

type Props = {
  isOpen: boolean;
  newJobName: string;
  onNameChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
};

const AddCurrentJobModal = ({ isOpen, newJobName, onNameChange, onClose, onSubmit }: Props) => {
  return (
    <ModalShell
      isOpen={isOpen}
      title="Add Current Job"
      onClose={onClose}
      maxWidthClass="max-w-sm"
      bodyClassName=""
    >
      <form onSubmit={onSubmit}>
        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
          <input
            type="text"
            required
            value={newJobName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. Current Employer"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            autoFocus
          />
        </div>
        <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
          >
            Add Job
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

export default AddCurrentJobModal;

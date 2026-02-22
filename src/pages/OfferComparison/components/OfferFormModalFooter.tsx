type OfferFormModalFooterProps = {
  mode: 'view' | 'edit' | 'add';
  onClose: () => void;
  onSave?: () => void;
  submitFormId?: string;
  saveLabel?: string;
};

const OfferFormModalFooter = ({
  mode,
  onClose,
  onSave,
  submitFormId,
  saveLabel,
}: OfferFormModalFooterProps) => {
  const closeLabel = mode === 'view' ? 'Close' : 'Cancel';

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        {closeLabel}
      </button>
      {mode !== 'view' && (
        <button
          type={submitFormId ? 'submit' : 'button'}
          form={submitFormId}
          onClick={submitFormId ? undefined : onSave}
          className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
        >
          {saveLabel || (mode === 'add' ? 'Add' : 'Save')}
        </button>
      )}
    </>
  );
};

export default OfferFormModalFooter;

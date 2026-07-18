type OfferFormModalFooterProps = {
  mode: 'view' | 'edit' | 'add';
  onClose: () => void;
  onSave?: () => void;
  submitFormId?: string;
  saveLabel?: string;
  saveDisabled?: boolean;
};

const OfferFormModalFooter = ({
  mode,
  onClose,
  onSave,
  submitFormId,
  saveLabel,
  saveDisabled = false,
}: OfferFormModalFooterProps) => {
  const closeLabel = mode === 'view' ? 'Close' : 'Cancel';

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:translate-y-px sm:min-h-10"
      >
        {closeLabel}
      </button>
      {mode !== 'view' && (
        <button
          type={submitFormId ? 'submit' : 'button'}
          form={submitFormId}
          onClick={submitFormId ? undefined : onSave}
          disabled={saveDisabled}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-600 bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_-14px_rgba(37,99,235,0.85)] transition hover:border-blue-700 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none disabled:active:translate-y-0 sm:min-h-10"
        >
          {saveLabel || (mode === 'add' ? 'Add' : 'Save')}
        </button>
      )}
    </>
  );
};

export default OfferFormModalFooter;

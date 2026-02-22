import type { ApplicationOption } from './types';

type IdentitySectionProps = {
  showLinkApplication: boolean;
  linkedApplicationId: number | null;
  onLinkedApplicationChange?: (value: number | null) => void;
  applicationOptions: ApplicationOption[];
  shouldShowCompanyRole: boolean;
  companyName: string;
  onCompanyNameChange: (value: string) => void;
  roleTitle: string;
  onRoleTitleChange: (value: string) => void;
  companyPlaceholder: string;
  rolePlaceholder: string;
};

const IdentitySection = ({
  showLinkApplication,
  linkedApplicationId,
  onLinkedApplicationChange,
  applicationOptions,
  shouldShowCompanyRole,
  companyName,
  onCompanyNameChange,
  roleTitle,
  onRoleTitleChange,
  companyPlaceholder,
  rolePlaceholder,
}: IdentitySectionProps) => {
  return (
    <>
      {showLinkApplication && onLinkedApplicationChange && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Link Existing Application (Optional)
          </label>
          <select
            value={linkedApplicationId ?? ''}
            onChange={(e) => onLinkedApplicationChange(e.target.value ? Number(e.target.value) : null)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">No link (custom)</option>
            {applicationOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {shouldShowCompanyRole && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => onCompanyNameChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder={companyPlaceholder}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <input
              type="text"
              value={roleTitle}
              onChange={(e) => onRoleTitleChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder={rolePlaceholder}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default IdentitySection;

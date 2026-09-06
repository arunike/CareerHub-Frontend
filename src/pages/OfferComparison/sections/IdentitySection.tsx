import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import { useCompanyList } from '../../../hooks/useCompanyList';
import ApplicationSelect from '../../../components/ApplicationSelect';
import { CONTROL_CLASS } from '../../../components/formControls';

type IdentitySectionProps = {
  showLinkApplication: boolean;
  linkedApplicationId: number | null;
  onLinkedApplicationChange?: (value: number | null) => void;
  shouldShowCompanyRole: boolean;
  companyName: string;
  onCompanyNameChange: (value: string) => void;
  roleTitle: string;
  onRoleTitleChange: (value: string) => void;
  level?: string;
  onLevelChange?: (value: string) => void;
  // Set once a save has been attempted, so errors only appear after submitting.
  invalidCompanyName?: boolean;
  invalidRoleTitle?: boolean;
  deadline?: string | null;
  onDeadlineChange?: (value: string | null) => void;
  companyPlaceholder: string;
  rolePlaceholder: string;
};

const IdentitySection = ({
  showLinkApplication,
  linkedApplicationId,
  onLinkedApplicationChange,
  shouldShowCompanyRole,
  companyName,
  onCompanyNameChange,
  roleTitle,
  onRoleTitleChange,
  level = '',
  onLevelChange,
  invalidCompanyName = false,
  invalidRoleTitle = false,
  deadline = null,
  onDeadlineChange,
  companyPlaceholder,
  rolePlaceholder,
}: IdentitySectionProps) => {
  const { options: companyListOptions } = useCompanyList(shouldShowCompanyRole);

  return (
    <>
      {showLinkApplication && onLinkedApplicationChange && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-ink-100 mb-1">
            Link Existing Application (Optional)
          </label>
          <ApplicationSelect
            className="w-full"
            value={linkedApplicationId ?? undefined}
            onChange={(val) => onLinkedApplicationChange(val ?? null)}
            placeholder="No link (custom)"
            formatLabel={(a) =>
              `${a.company_details?.name || 'Unknown'} - ${a.role_title} (${a.status})`
            }
          />
        </div>
      )}

      {shouldShowCompanyRole && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-ink-100 mb-1">
                Company{' '}
                <span className="text-red-500 dark:text-red-400" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="offer-form-company-name"
                type="text"
                list="offer-form-company-list"
                required
                aria-required="true"
                value={companyName}
                onChange={(e) => onCompanyNameChange(e.target.value)}
                aria-invalid={invalidCompanyName}
                className={`w-full rounded-lg border px-3 py-2 text-sm transition ${
                  invalidCompanyName
                    ? 'border-rose-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100'
                    : 'border-gray-300 dark:border-white/[0.12] focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
                }`}
                placeholder={companyPlaceholder}
              />
              <datalist id="offer-form-company-list">
                {companyListOptions.map((option) => (
                  <option key={option.value} value={option.value} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-ink-100 mb-1">
                Role{' '}
                <span className="text-red-500 dark:text-red-400" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="offer-form-role-title"
                type="text"
                required
                aria-required="true"
                value={roleTitle}
                onChange={(e) => onRoleTitleChange(e.target.value)}
                aria-invalid={invalidRoleTitle}
                className={`w-full rounded-lg border px-3 py-2 text-sm transition ${
                  invalidRoleTitle
                    ? 'border-rose-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100'
                    : 'border-gray-300 dark:border-white/[0.12] focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
                }`}
                placeholder={rolePlaceholder}
              />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {onLevelChange !== undefined && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-ink-100 mb-1">
                  Level
                </label>
                <input
                  type="text"
                  value={level}
                  onChange={(e) => onLevelChange(e.target.value)}
                  className={CONTROL_CLASS}
                  placeholder="e.g. L5, Senior, Staff, E5, IC3"
                />
              </div>
            )}
            {onDeadlineChange !== undefined && (
              <div>
                <label
                  className="block text-sm font-medium text-gray-700 dark:text-ink-100 mb-1"
                  htmlFor="offer-form-deadline"
                >
                  Decision deadline
                </label>
                <DatePicker
                  id="offer-form-deadline"
                  className="w-full"
                  value={deadline ? dayjs(deadline) : null}
                  onChange={(date) => onDeadlineChange(date ? date.format('YYYY-MM-DD') : null)}
                  placeholder="When this offer expires"
                />
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default IdentitySection;

import type { OfferFormFieldsProps } from './OfferFormFields';
import { UserOutlined } from '@ant-design/icons';
import { IdentitySection } from './sections';
import OfferFormSection from './components/OfferFormSection';

type Props = OfferFormFieldsProps & {
  isActiveSection: (id: string) => boolean;
  sectionIds: Record<string, string>;
  shouldShowCompanyRole: boolean;
};

const OfferBasicsPanel = ({
  isActiveSection,
  sectionIds,
  shouldShowCompanyRole,
  companyName,
  companyPlaceholder = '',
  deadline,
  documentsSlot,
  invalidCompanyName,
  invalidRoleTitle,
  level,
  linkedApplicationId = null,
  onCompanyNameChange,
  onDeadlineChange,
  onLevelChange,
  onLinkedApplicationChange,
  onRoleTitleChange,
  rolePlaceholder = '',
  roleTitle,
  showLinkApplication = false,
}: Props) => (
  <div
    role="tabpanel"
    aria-labelledby={`${sectionIds.basics}-tab`}
    hidden={!isActiveSection(sectionIds.basics)}
  >
    <OfferFormSection
      id={sectionIds.basics}
      title="Offer details"
      description="Identify the role this offer is for. Working conditions and the commute have their own section."
      icon={<UserOutlined />}
    >
      <IdentitySection
        showLinkApplication={showLinkApplication}
        linkedApplicationId={linkedApplicationId}
        onLinkedApplicationChange={onLinkedApplicationChange}
        shouldShowCompanyRole={shouldShowCompanyRole}
        companyName={companyName}
        onCompanyNameChange={onCompanyNameChange}
        roleTitle={roleTitle}
        onRoleTitleChange={onRoleTitleChange}
        level={level}
        invalidCompanyName={invalidCompanyName}
        invalidRoleTitle={invalidRoleTitle}
        deadline={deadline}
        onDeadlineChange={onDeadlineChange}
        onLevelChange={onLevelChange}
        companyPlaceholder={companyPlaceholder}
        rolePlaceholder={rolePlaceholder}
      />

      {documentsSlot}
    </OfferFormSection>
  </div>
);

export default OfferBasicsPanel;

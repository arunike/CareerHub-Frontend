import { useNavigate } from 'react-router-dom';
import MobileSectionPicker from './MobileSectionPicker';

const INTELLIGENCE_SECTIONS = [
  { value: 'jd-reports', label: 'JD Reports', path: '/jd-reports' },
  { value: 'cover-letters', label: 'Cover Letters', path: '/ai-tools?tab=cover-letters' },
  {
    value: 'negotiation-results',
    label: 'Negotiation Results',
    path: '/ai-tools?tab=negotiation-results',
  },
  {
    value: 'promotion-reviews',
    label: 'Promotion Reviews',
    path: '/ai-tools?tab=promotion-reviews',
  },
] as const;

export type IntelligenceSection = (typeof INTELLIGENCE_SECTIONS)[number]['value'];

type IntelligenceSectionPickerProps = {
  value: IntelligenceSection;
};

const IntelligenceSectionPicker = ({ value }: IntelligenceSectionPickerProps) => {
  const navigate = useNavigate();

  const handleChange = (section: IntelligenceSection) => {
    const destination = INTELLIGENCE_SECTIONS.find((item) => item.value === section);
    if (destination) navigate(destination.path);
  };

  return (
    <MobileSectionPicker
      id="intelligence-section"
      label="Intelligence section"
      value={value}
      options={INTELLIGENCE_SECTIONS}
      onChange={handleChange}
      className="lg:hidden"
    />
  );
};

export default IntelligenceSectionPicker;

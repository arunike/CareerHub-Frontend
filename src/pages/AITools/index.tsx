import React from 'react';
import { useSearchParams } from 'react-router-dom';
import IntelligenceSectionPicker from '../../components/dashboard/IntelligenceSectionPicker';
import type { IntelligenceSection } from '../../components/dashboard/IntelligenceSectionPicker';
import CoverLettersTab from '../../components/AITools/CoverLettersTab';
import NegotiationResultsTab from '../../components/AITools/NegotiationResultsTab';
import PromotionReviewsTab from '../../components/AITools/PromotionReviewsTab';

const AIToolsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');
  const activeSection: IntelligenceSection =
    tab === 'negotiation-results' || tab === 'promotion-reviews' ? tab : 'cover-letters';

  const content =
    tab === 'negotiation-results' ? (
      <NegotiationResultsTab />
    ) : tab === 'promotion-reviews' ? (
      <PromotionReviewsTab />
    ) : (
      <CoverLettersTab />
    );

  return (
    <div className="space-y-4">
      <IntelligenceSectionPicker value={activeSection} />
      {content}
    </div>
  );
};

export default AIToolsPage;

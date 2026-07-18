import React from 'react';
import { useSearchParams } from 'react-router-dom';
import IntelligenceSectionPicker from '../../components/IntelligenceSectionPicker';
import type { IntelligenceSection } from '../../components/IntelligenceSectionPicker';
import CoverLettersTab from './CoverLettersTab';
import NegotiationResultsTab from './NegotiationResultsTab';
import PromotionReviewsTab from './PromotionReviewsTab';

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

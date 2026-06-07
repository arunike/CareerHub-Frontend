import React from 'react';
import { useSearchParams } from 'react-router-dom';
import CoverLettersTab from './CoverLettersTab';
import NegotiationResultsTab from './NegotiationResultsTab';
import PromotionReviewsTab from './PromotionReviewsTab';

const AIToolsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');

  if (tab === 'negotiation-results') return <NegotiationResultsTab />;
  if (tab === 'promotion-reviews') return <PromotionReviewsTab />;
  return <CoverLettersTab />;
};

export default AIToolsPage;

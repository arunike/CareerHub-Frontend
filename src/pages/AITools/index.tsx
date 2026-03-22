import React from 'react';
import { useSearchParams } from 'react-router-dom';
import CoverLettersTab from './CoverLettersTab';
import NegotiationResultsTab from './NegotiationResultsTab';

const AIToolsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');

  if (tab === 'negotiation-results') return <NegotiationResultsTab />;
  return <CoverLettersTab />;
};

export default AIToolsPage;

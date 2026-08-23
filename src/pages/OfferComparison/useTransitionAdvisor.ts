import { useState } from 'react';
import { getTransitionAdvice } from '../../api';
import { getApiErrorMessage } from '../../utils/apiError';
import type { SimulatedOffer } from './calculations';

export const useTransitionAdvisor = (simulatedOffers: SimulatedOffer[]) => {
  const [isAdvisorExpanded, setIsAdvisorExpanded] = useState(false);
  const [selectedPainPoints, setSelectedPainPoints] = useState<string[]>([]);
  const [customPainPoints, setCustomPainPoints] = useState('');
  const [promotionTimeline, setPromotionTimeline] = useState('unknown');
  const [includeJobHunting, setIncludeJobHunting] = useState(true);
  const [isAdvisorLoading, setIsAdvisorLoading] = useState(false);
  const [advisorResult, setAdvisorResult] = useState<unknown | null>(null);
  const [advisorError, setAdvisorError] = useState<string | null>(null);

  const handleGetTransitionAdvice = async () => {
    try {
      setIsAdvisorLoading(true);
      setAdvisorError(null);
      const res = await getTransitionAdvice({
        current_pain_points: selectedPainPoints,
        custom_pain_points: customPainPoints,
        promotion_timeline: promotionTimeline,
        include_job_hunting: includeJobHunting,
        simulated_offers: simulatedOffers,
      });
      setAdvisorResult(res.data);
    } catch (error) {
      console.error(error);
      setAdvisorError(
        getApiErrorMessage(
          error,
          'Failed to get career advice. Make sure your AI provider is configured in Settings.'
        )
      );
    } finally {
      setIsAdvisorLoading(false);
    }
  };

  return {
    isAdvisorExpanded,
    setIsAdvisorExpanded,
    selectedPainPoints,
    setSelectedPainPoints,
    customPainPoints,
    setCustomPainPoints,
    promotionTimeline,
    setPromotionTimeline,
    includeJobHunting,
    setIncludeJobHunting,
    isAdvisorLoading,
    advisorResult,
    advisorError,
    handleGetTransitionAdvice,
  };
};

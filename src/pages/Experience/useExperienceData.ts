import { useEffect, useState } from 'react';
import { message } from 'antd';
import {
  deleteAllExperiences,
  deleteExperience,
  getExperiences,
  getOffers,
  updateExperience,
} from '../../api';
import { getUserSettings } from '../../api/availability';
import { refineExperienceSkillsWithBrowserAI } from '../../lib/browserAi';
import { isLLMConfigurationError } from '../../lib/llmClient';
import type { EmploymentType, Experience } from '../../types';
import type { OfferLike as Offer } from '../OfferComparison/calculations';
import { DEFAULT_EMP_TYPES, parseExperienceDate } from './experienceUtils';
import { getApiErrorMessage } from '../../utils/apiError';

// Server data and its mutations; modal state and rendering stay in the page.
export const useExperienceData = () => {
  const [experiences, setExperiences] = useState<Experience[]>([]);

  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState(false);

  const [empTypes, setEmpTypes] = useState<EmploymentType[]>(DEFAULT_EMP_TYPES);

  const [allOffers, setAllOffers] = useState<Offer[]>([]);

  const [aiProviderConfigured, setAiProviderConfigured] = useState(false);

  const fetchOffersData = async () => {
    try {
      const res = await getOffers();
      setAllOffers(res.data as Offer[]);
    } catch {
      // no offer data
    }
  };

  useEffect(() => {
    fetchExperiences();
    getUserSettings()
      .then((res) => {
        const types = res.data.employment_types;
        if (types && types.length > 0) setEmpTypes(types);
        setAiProviderConfigured(Boolean(res.data.ai_provider_api_key_configured));
      })
      .catch(() => {
        // use defaults
      });
    fetchOffersData();
  }, []);

  const fetchExperiences = async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const res = await getExperiences();

      const sorted = res.data.sort((a, b) => {
        const dateA = parseExperienceDate(a.start_date)?.valueOf() ?? 0;
        const dateB = parseExperienceDate(b.start_date)?.valueOf() ?? 0;
        if (dateB !== dateA) return dateB - dateA;
        return (b.id || 0) - (a.id || 0);
      });
      setExperiences(sorted);
    } catch (err: any) {
      setLoadError(true);
      message.error('Failed to load experiences');
    } finally {
      setLoading(false);
    }
  };

  const maybeRefineSkillsWithAI = async (experience: Experience, skillsManuallyEdited: boolean) => {
    if (
      !aiProviderConfigured ||
      skillsManuallyEdited ||
      !experience.id ||
      !experience.description?.trim()
    ) {
      return;
    }

    try {
      const refinedSkills = await refineExperienceSkillsWithBrowserAI({ experience });
      if (refinedSkills.length === 0) return;

      const currentSkills = experience.skills || [];
      const unchanged =
        refinedSkills.length === currentSkills.length &&
        refinedSkills.every((skill, index) => skill === currentSkills[index]);
      if (unchanged) return;

      const response = await updateExperience(experience.id, { skills: refinedSkills });
      setExperiences((prev) => prev.map((exp) => (exp.id === experience.id ? response.data : exp)));
    } catch (error) {
      if (!isLLMConfigurationError(error)) {
        console.debug('AI skill refinement skipped:', error);
      }
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteExperience(id);
      message.success('Experience deleted');
      fetchExperiences();
    } catch (err: any) {
      message.error(getApiErrorMessage(err, 'Failed to delete experience'));
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllExperiences();
      message.success('All experiences deleted');
      fetchExperiences();
    } catch (err) {
      message.error('Failed to delete all experiences');
    }
  };

  const handleDeleteGroup = async (group: Experience[]) => {
    try {
      await Promise.all(
        group.filter((e) => !e.is_locked && e.id).map((e) => deleteExperience(e.id!))
      );
      message.success(
        `Deleted ${group.filter((e) => !e.is_locked).length} role(s) at ${group[0].company}`
      );
      fetchExperiences();
    } catch (err: any) {
      message.error(getApiErrorMessage(err, 'Failed to delete company experiences'));
    }
  };

  const handleToggleLock = async (exp: Experience) => {
    if (!exp.id) return;
    const group = experiences.filter((e) => e.company === exp.company);
    const isGroupLocked = group.length > 1 && group.every((e) => e.is_locked);
    if (isGroupLocked && exp.is_locked) {
      message.info('Company is locked. Unlock all roles at the company header first.');
      return;
    }
    try {
      await updateExperience(exp.id, { is_locked: !exp.is_locked });
      setExperiences((prev) =>
        prev.map((e) => (e.id === exp.id ? { ...e, is_locked: !exp.is_locked } : e))
      );
    } catch (err) {
      message.error('Failed to update lock status');
    }
  };

  const handleToggleGroupLock = async (group: Experience[]) => {
    const isAnyUnlocked = group.some((e) => !e.is_locked);
    const targetState = isAnyUnlocked;
    try {
      await Promise.all(group.map((e) => updateExperience(e.id!, { is_locked: targetState })));
      setExperiences((prev) =>
        prev.map((e) => (group.some((g) => g.id === e.id) ? { ...e, is_locked: targetState } : e))
      );
    } catch {
      message.error('Failed to update group lock status');
    }
  };

  const handleTogglePin = async (exp: Experience) => {
    if (!exp.id) return;
    try {
      await updateExperience(exp.id, { is_pinned: !exp.is_pinned });
      setExperiences((prev) =>
        prev.map((e) => (e.id === exp.id ? { ...e, is_pinned: !exp.is_pinned } : e))
      );
    } catch {
      message.error('Failed to update pin status');
    }
  };

  return {
    experiences,
    setExperiences,
    loading,
    loadError,
    empTypes,
    allOffers,
    aiProviderConfigured,
    fetchExperiences,
    fetchOffersData,
    setAllOffers,
    maybeRefineSkillsWithAI,
    handleDelete,
    handleDeleteAll,
    handleDeleteGroup,
    handleToggleLock,
    handleToggleGroupLock,
    handleTogglePin,
  };
};

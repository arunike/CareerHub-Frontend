import { Button, message, type UploadProps } from 'antd';
import type React from 'react';
import type { Experience, RaiseEntry, TeamEntry } from '../../types';
import type { OfferLike as Offer } from '../OfferComparison/calculations';
import {
  createExperience,
  exportExperiences,
  importExperiences,
  removeExperienceLogo,
  updateExperience,
  updateOffer,
  uploadExperienceLogo,
} from '../../api/career';
import { getApiErrorMessage } from '../../utils/apiError';
import { normalizeInternshipCompInputs } from './internshipCompInputs';
import type { InternshipCompInputs } from './internshipCompInputs';

export const useExperienceMutations = ({
  allOffers,
  setAllOffers,
  setExperiences,
  fetchExperiences,
  fetchOffersData,
  maybeRefineSkillsWithAI,
  getLinkedOffer,
  setIsImportModalOpen,
  setRaiseHistoryExp,
  setTeamHistoryExp,
  setSchedulePhasesExp,
  setCompBreakdownExp,
  raiseHistoryExp,
  teamHistoryExp,
  schedulePhasesExp,
  compBreakdownExp,
  editingExp,
  setContactsExp,
}: {
  experiences: Experience[];
  allOffers: Offer[];
  setAllOffers: React.Dispatch<React.SetStateAction<Offer[]>>;
  setExperiences: React.Dispatch<React.SetStateAction<Experience[]>>;
  fetchExperiences: () => Promise<void> | void;
  fetchOffersData: () => Promise<void> | void;
  maybeRefineSkillsWithAI: (experience: Experience, skillsManuallyEdited: boolean) => Promise<void>;
  getLinkedOffer: (exp: Experience) => Offer | undefined;
  setIsImportModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setEditingExp: React.Dispatch<React.SetStateAction<Experience | null>>;
  setRaiseHistoryExp: React.Dispatch<React.SetStateAction<Experience | null>>;
  setTeamHistoryExp: React.Dispatch<React.SetStateAction<Experience | null>>;
  setSchedulePhasesExp: React.Dispatch<React.SetStateAction<Experience | null>>;
  setCompBreakdownExp: React.Dispatch<React.SetStateAction<Experience | null>>;
  raiseHistoryExp: Experience | null;
  teamHistoryExp: Experience | null;
  schedulePhasesExp: Experience | null;
  compBreakdownExp: Experience | null;
  editingExp: Experience | null;
  setContactsExp: React.Dispatch<React.SetStateAction<Experience | null>>;
}) => {
  const handleCreateOrUpdate = async (
    data: Partial<Experience>,
    logoFile?: File | null,
    removeLogo?: boolean
  ) => {
    try {
      let expId: number | undefined;
      let savedExperience: Experience | null = null;
      const skillsManuallyEdited = Object.prototype.hasOwnProperty.call(data, 'skills');
      if (editingExp && editingExp.id) {
        const response = await updateExperience(editingExp.id, data);
        savedExperience = response.data;
        expId = editingExp.id;
        message.success('Experience updated successfully');
      } else {
        const res = await createExperience(data);
        savedExperience = res.data;
        expId = res.data.id;
      }

      if (expId) {
        if (logoFile) {
          const fd = new FormData();
          fd.append('logo', logoFile);
          const response = await uploadExperienceLogo(expId, fd);
          savedExperience = response.data;
        } else if (removeLogo) {
          const response = await removeExperienceLogo(expId);
          savedExperience = response.data;
        }
      }

      if (data.offer && (data.base_salary != null || data.bonus != null || data.equity != null)) {
        const linkedOffer = allOffers.find((o) => o.id === data.offer);
        if (linkedOffer) {
          const patch: Record<string, unknown> = { ...(linkedOffer as Record<string, unknown>) };
          if (data.base_salary != null) patch.base_salary = data.base_salary;
          if (data.bonus != null) patch.bonus = data.bonus;
          if (data.equity != null) patch.equity = data.equity;
          await updateOffer(linkedOffer.id!, patch);
          setAllOffers((prev) =>
            prev.map((o) => (o.id === linkedOffer.id ? { ...o, ...patch } : o))
          );
        }
      }

      await fetchExperiences();
      if (savedExperience) {
        void maybeRefineSkillsWithAI(savedExperience, skillsManuallyEdited);
        if (!editingExp) {
          const createdExperience = savedExperience;
          message.success({
            duration: 7,
            content: (
              <span>
                {data.offer
                  ? 'Experience added. Its application remains in Applications as Accepted.'
                  : 'Historical experience added.'}
                <Button
                  type="link"
                  size="small"
                  className="!px-2"
                  onClick={() => setContactsExp(createdExperience)}
                >
                  Review contacts
                </Button>
              </span>
            ),
          });
        }
      }
    } catch (err: any) {
      message.error(getApiErrorMessage(err, 'Failed to save experience'));
      throw err;
    }
  };

  const handleExportWrapper = async (format: string) => {
    const response = await exportExperiences(format);
    return {
      data: response.data,
      headers: response.headers as unknown as Record<string, string>,
    };
  };

  const importProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.json,.csv,.xlsx',
    beforeUpload: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      importExperiences(formData)
        .then(async (response) => {
          message.success(response.data?.message || 'Import successful');
          setIsImportModalOpen(false);
          await Promise.all([fetchExperiences(), fetchOffersData()]);
        })
        .catch((err) => {
          message.error(getApiErrorMessage(err, 'Import failed'));
        });
      return false;
    },
  };
  const handleSaveRaiseHistory = async (entries: RaiseEntry[]) => {
    if (!raiseHistoryExp) return;
    const offer = getLinkedOffer(raiseHistoryExp);
    if (!offer?.id) return;
    await updateOffer(offer.id, { ...(offer as Record<string, unknown>), raise_history: entries });
    setAllOffers((prev) =>
      prev.map((o) => (o.id === offer.id ? { ...o, raise_history: entries } : o))
    );
  };

  const handleRaiseHistoryClick = (exp: Experience) => {
    setRaiseHistoryExp(exp);
  };

  const handleSaveTeamHistory = async (entries: TeamEntry[]) => {
    if (!teamHistoryExp?.id) return;
    await updateExperience(teamHistoryExp.id, { team_history: entries } as Partial<Experience>);
    setExperiences((prev) =>
      prev.map((e) => (e.id === teamHistoryExp.id ? { ...e, team_history: entries } : e))
    );
    setTeamHistoryExp((prev) => (prev ? { ...prev, team_history: entries } : null));
  };

  const handleSaveSchedulePhases = async (phases: any[]) => {
    if (!schedulePhasesExp?.id) return;
    await updateExperience(schedulePhasesExp.id, {
      schedule_phases: phases,
    } as Partial<Experience>);
    setExperiences((prev) =>
      prev.map((e) => (e.id === schedulePhasesExp.id ? { ...e, schedule_phases: phases } : e))
    );
    setSchedulePhasesExp((prev) => (prev ? { ...prev, schedule_phases: phases } : null));

    if (compBreakdownExp?.id === schedulePhasesExp.id) {
      setCompBreakdownExp((prev) => (prev ? { ...prev, schedule_phases: phases } : null));
    }
  };
  const handleSaveInternshipCompInputs = async (updates: InternshipCompInputs) => {
    const experienceId = compBreakdownExp?.id;
    if (!compBreakdownExp || experienceId == null) return;

    const patch = normalizeInternshipCompInputs(updates, compBreakdownExp);
    await updateExperience(experienceId, patch);
    setExperiences((prev) =>
      prev.map((exp) => (exp.id === experienceId ? { ...exp, ...patch } : exp))
    );
    setCompBreakdownExp((prev) =>
      prev && prev.id === experienceId ? { ...prev, ...patch } : prev
    );
    message.success('Internship earnings inputs updated');
  };
  return {
    handleCreateOrUpdate,
    handleExportWrapper,
    importProps,
    handleSaveRaiseHistory,
    handleRaiseHistoryClick,
    handleSaveTeamHistory,
    handleSaveSchedulePhases,
    handleSaveInternshipCompInputs,
  };
};

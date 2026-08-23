import { useEffect } from 'react';
import type { FormInstance } from 'antd';
import dayjs from 'dayjs';
import type React from 'react';
import type { Experience } from '../../types';
import { message } from 'antd';
import type { CompValue } from '../../components/CompensationFields';

import type { OfferOption } from './ExperienceModal';

// Keeps the form in step with the modal opening, the experience being edited, and any linked offer.
export const useExperienceFormSync = ({
  open,
  experience,
  offers,
  form,
  importForm,
  setIsCurrent,
  setEmploymentType,
  setCompanyName,
  setLogoFile,
  setLogoPreview,
  setRemoveLogo,
  logoPreview,
  setActiveTab,
}: {
  open: boolean;
  experience: Experience | null | undefined;
  offers: OfferOption[];
  form: FormInstance;
  importForm: FormInstance;
  setIsCurrent: React.Dispatch<React.SetStateAction<boolean>>;
  setEmploymentType: React.Dispatch<React.SetStateAction<string>>;
  setCompanyName: React.Dispatch<React.SetStateAction<string>>;
  setLogoFile: React.Dispatch<React.SetStateAction<File | null>>;
  setLogoPreview: React.Dispatch<React.SetStateAction<string | null>>;
  setRemoveLogo: React.Dispatch<React.SetStateAction<boolean>>;
  logoPreview: string | null;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const handleOfferSelect = (offerId: number | null) => {
    if (!offerId) return;
    const linked = offers.find((o) => o.value === offerId);
    if (linked) {
      const currentVals = form.getFieldsValue();
      const updates: Record<string, any> = {
        comp: {
          base_salary: linked.base_salary ?? currentVals.comp?.base_salary ?? null,
          bonus: linked.bonus ?? currentVals.comp?.bonus ?? null,
          equity: linked.equity ?? currentVals.comp?.equity ?? null,
        } as CompValue,
      };

      if (linked.company) {
        updates.company = linked.company;
        setCompanyName(linked.company);
      }
      if (linked.title) updates.title = linked.title;
      if (linked.level) updates.level = linked.level;
      if (linked.location) updates.location = linked.location;
      if (linked.employment_type) {
        updates.employment_type = linked.employment_type;
        setEmploymentType(linked.employment_type);
      }

      form.setFieldsValue(updates);
      message.info('Autofilled role details from linked offer!');
    }
  };

  useEffect(() => {
    if (open) {
      if (experience) {
        setActiveTab('manual');
        setIsCurrent(!!experience.is_current);
        setCompanyName(experience.company || '');
        const empType = experience.employment_type || 'full_time';
        setEmploymentType(empType);
        form.setFieldsValue({
          title: experience.title,
          company: experience.company,
          level: experience.level || '',
          work_email: experience.work_email || '',
          location: experience.location,
          dates: experience.start_date
            ? [
                dayjs(experience.start_date),
                experience.end_date ? dayjs(experience.end_date) : undefined,
              ]
            : undefined,
          is_current: experience.is_current,
          employment_type: empType,
          description: experience.description,
          skills: experience.skills || [],
          is_promotion: experience.is_promotion || false,
          is_return_offer: experience.is_return_offer || false,
          role_context: experience.is_promotion
            ? 'promotion'
            : experience.is_return_offer
              ? 'return_offer'
              : 'none',
          offer: experience.offer ?? null,
          hourly_rate: experience.hourly_rate ?? null,
          hours_per_day: experience.hours_per_day ?? (empType === 'internship' ? 8 : null),
          working_days_per_week:
            experience.working_days_per_week ?? (empType === 'internship' ? 5 : null),
          total_hours_worked: experience.total_hours_worked ?? null,
          total_earnings_override: experience.total_earnings_override ?? null,
          comp: {
            base_salary: experience.base_salary ?? null,
            bonus: experience.bonus ?? null,
            equity: experience.equity ?? null,
          } as CompValue,
        });

        if (experience.offer) {
          const linked = offers.find((o) => o.value === experience.offer);
          if (linked) {
            form.setFieldsValue({
              comp: {
                base_salary: linked.base_salary ?? null,
                bonus: linked.bonus ?? null,
                equity: linked.equity ?? null,
              } as CompValue,
              level: experience.level || linked.level || '',
              location: experience.location || linked.location || '',
              title: experience.title || linked.title || '',
              company: experience.company || linked.company || '',
            });
          }
        }
      } else {
        form.resetFields();
        importForm.resetFields();
        setIsCurrent(false);
        setEmploymentType('full_time');
        setCompanyName('');
        form.setFieldsValue({ role_context: 'none' });
      }
      setLogoFile(null);
      setLogoPreview(null);
      setRemoveLogo(false);
    }
    // The setters come from useState in the modal and are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, experience, form, importForm, offers]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);
  return { handleOfferSelect };
};

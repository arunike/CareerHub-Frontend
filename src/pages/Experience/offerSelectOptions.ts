import type { OfferLike as Offer } from '../OfferComparison/calculations';

// Label an offer by company and role, however the payload happens to carry them.
export const buildOfferSelectOptions = (allOffers: Offer[]) => {
  return allOffers.map((o) => {
    const details = o.application_details || (o.application as any) || {};
    const company =
      typeof details.company === 'string'
        ? details.company
        : details.company?.name || (o as any).company_name || (o as any).custom_company_name;
    const role =
      details.role_title || details.title || (o as any).role_title || (o as any).custom_role_title;
    const level = details.level || (o as any).level || '';
    const location =
      details.office_location ||
      (o as any).office_location ||
      details.location ||
      (o as any).location ||
      '';
    const empType = details.employment_type || (o as any).employment_type || 'full_time';

    const label =
      company && role
        ? `${company} — ${role}${level ? ` (${level})` : ''}${o.is_current ? ' (current)' : ''}`
        : `Offer #${o.id} — $${Number(o.base_salary).toLocaleString()} base${o.is_current ? ' (current)' : ''}`;

    return {
      value: o.id as number,
      label,
      base_salary: Number(o.base_salary),
      bonus: Number(o.bonus),
      equity: Number(o.equity),
      company,
      title: role,
      level,
      location,
      employment_type: empType,
    };
  });
};

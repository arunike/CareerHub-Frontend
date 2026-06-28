import type { CareerApplication } from '../../types/application';

export const APPLICATION_IMPORT_REVIEW_FIELDS = [
  { key: 'company_name', label: 'Company', required: true },
  { key: 'role_title', label: 'Role', required: true },
  { key: 'status', label: 'Status', required: false },
  { key: 'location', label: 'Location', required: false },
  { key: 'salary_range', label: 'Salary', required: false },
  { key: 'job_link', label: 'Link', required: false },
] as const;

export type ApplicationImportReviewFieldKey =
  (typeof APPLICATION_IMPORT_REVIEW_FIELDS)[number]['key'];

const APPLICATION_IMPORT_REVIEW_FIELD_KEYS = new Set<string>(
  APPLICATION_IMPORT_REVIEW_FIELDS.map((field) => field.key)
);

export type EditableApplicationImportItem = {
  row: number;
  action: 'create' | 'update' | 'error';
  detail: string;
  company_name: string;
  role_title: string;
  status: string;
  local_object_id?: number | null;
  raw: Record<string, string>;
};

export const getCoreImportMapping = (mapping: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(mapping).filter(([fieldKey]) =>
      APPLICATION_IMPORT_REVIEW_FIELD_KEYS.has(fieldKey)
    )
  );

export const getImportFieldValue = (
  row: Record<string, string>,
  mapping: Record<string, string>,
  fieldKey: ApplicationImportReviewFieldKey
) => {
  const header = mapping[fieldKey];
  return header ? row[header] || '' : '';
};

export const buildEditableImportReview = ({
  rows,
  applications,
  mapping,
}: {
  rows: Array<Record<string, string>>;
  applications: CareerApplication[];
  mapping: Record<string, string>;
}) => {
  const companyApplications = new Map<string, CareerApplication[]>();
  applications.forEach((application) => {
    const companyName = application.company_details?.name || '';
    if (!companyName) return;
    const current = companyApplications.get(companyName) || [];
    current.push(application);
    companyApplications.set(companyName, current);
  });

  const items: EditableApplicationImportItem[] = rows.map((row, index) => {
    const companyName = getImportFieldValue(row, mapping, 'company_name').trim();
    const roleTitle = getImportFieldValue(row, mapping, 'role_title').trim();
    const statusValue = getImportFieldValue(row, mapping, 'status').trim() || 'APPLIED';
    let action: EditableApplicationImportItem['action'] = 'error';
    let detail = 'Company and role are required.';
    let localObjectId: number | null = null;

    if (companyName && roleTitle) {
      const existing = (companyApplications.get(companyName) || []).find(
        (application) => application.role_title === roleTitle
      );
      if (existing) {
        action = 'update';
        detail = 'Matches an existing application by company and role.';
        localObjectId = existing.id;
      } else {
        action = 'create';
        detail = 'New application.';
      }
    }

    return {
      row: index + 2,
      action,
      detail,
      company_name: companyName,
      role_title: roleTitle,
      status: statusValue,
      local_object_id: localObjectId,
      raw: row,
    };
  });

  return {
    items,
    summary: {
      total_rows: rows.length,
      creates: items.filter((item) => item.action === 'create').length,
      updates: items.filter((item) => item.action === 'update').length,
      errors: items.filter((item) => item.action === 'error').length,
    },
  };
};

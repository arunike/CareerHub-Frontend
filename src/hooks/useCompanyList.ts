import { useEffect, useMemo, useState } from 'react';
import { getCompanyList, type CompanyListItem } from '../api/career';

export const useCompanyList = (enabled = true) => {
  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    setLoading(true);
    getCompanyList()
      .then((response) => {
        if (active) setCompanies(response.data);
      })
      .catch((error) => {
        console.error('Failed to load company list', error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled]);

  const options = useMemo(
    () => companies.map((company) => ({ value: company.name, label: company.name })),
    [companies]
  );

  return { companies, options, loading };
};

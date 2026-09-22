import { useEffect, useState } from 'react';
import { getExperiences } from '../../api';

export interface PtoRole {
  id: number;
  label: string;
  startDate: string | null;
  endDate: string | null;
}

// Full-time only: an internship or a contract carries no PTO to charge a day against.
export const usePtoRoles = () => {
  const [roles, setRoles] = useState<PtoRole[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const response = await getExperiences();
        setRoles(
          (response.data as unknown as Array<Record<string, unknown>>)
            .filter((role) => (role.employment_type ?? 'full_time') === 'full_time')
            .map((role) => ({
              id: role.id as number,
              label: `${role.company as string} · ${role.title as string}`,
              startDate: (role.start_date as string) ?? null,
              endDate: (role.end_date as string) ?? null,
            }))
        );
      } catch {
        setRoles([]);
      }
    })();
  }, []);

  return roles;
};

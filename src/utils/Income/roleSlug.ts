import type { IncomeSource } from './incomeSources';

const kebab = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Company alone: callers pass one year's roles, where holding two at one employer is the rare case.
export const buildRoleSlugs = (sources: IncomeSource[]): Map<string, string> => {
  const perCompany = new Map<string, number>();
  for (const source of sources) {
    const base = kebab(source.company);
    perCompany.set(base, (perCompany.get(base) ?? 0) + 1);
  }

  const slugs = new Map<string, string>();
  const taken = new Set<string>();
  for (const source of sources) {
    const base = kebab(source.company);
    // A company that kebabs to nothing leaves the raw key, which is ugly but always resolves.
    if (!base) {
      slugs.set(source.key, source.key);
      taken.add(source.key);
      continue;
    }
    const wanted =
      (perCompany.get(base) ?? 0) > 1
        ? [base, kebab(source.roleTitle)].filter(Boolean).join('-')
        : base;
    let slug = wanted;
    let suffix = 2;
    while (taken.has(slug)) {
      slug = `${wanted}-${suffix}`;
      suffix += 1;
    }
    slugs.set(source.key, slug);
    taken.add(slug);
  }
  return slugs;
};

export const slugForKey = (sources: IncomeSource[], key: string): string =>
  buildRoleSlugs(sources).get(key) ?? key;

// Takes a slug or a legacy `experience-12` key, so links shared before the slugs still land.
export const keyFromRoleParam = (sources: IncomeSource[], raw: string | null): string => {
  if (!raw) return '';
  const wanted = raw.trim().toLowerCase();
  for (const [key, slug] of buildRoleSlugs(sources)) {
    if (slug.toLowerCase() === wanted) return key;
  }
  // Unresolvable falls through to '', which is what makes the default ranking apply.
  return sources.some((source) => source.key === raw) ? raw : '';
};

const slugify = (value: string) =>
  value
    .normalize('NFKD')
    // Dropped, not spaced: a combining accent left as a gap splits the word it belongs to.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// The company's own page, which lists its titles: levels.fyi 404s on a job family it has none for.
export const levelsFyiUrl = (company?: string | null) => {
  const slug = company ? slugify(company) : '';
  return slug ? `https://www.levels.fyi/companies/${slug}/salaries` : null;
};

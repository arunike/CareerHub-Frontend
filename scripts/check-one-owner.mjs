// Each of these was reimplemented 3-6 times and had already drifted; the owner is the only copy.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const OWNED = [
  { name: 'formatCurrency', owner: 'src/utils/Income/format.ts', pattern: /^(export )?const formatCurrency\s*=/m },
  { name: 'moneyWhole', owner: 'src/utils/Income/format.ts', pattern: /^(export )?const moneyWhole\s*=/m },
  { name: 'dayOf', owner: 'src/utils/localDay.ts', pattern: /^(export )?const dayOf\s*=/m },
  { name: 'DAY_MS', owner: 'src/utils/localDay.ts', pattern: /^(export )?const (DAY_MS|DAY)\s*=\s*86400000/m },
  { name: 'daysInYear', owner: 'src/utils/localDay.ts', pattern: /^(export )?const daysInYear\s*=/m },
  { name: 'epochDay', owner: 'src/utils/localDay.ts', pattern: /^(export )?const epochDay\s*=/m },
  { name: 'normalizeBenefitItem', owner: 'src/utils/OfferComparison/benefitItem.ts', pattern: /^(export )?const normalizeBenefitItem\s*=/m },
  { name: 'toNullableNumber', owner: 'src/utils/Experience/experienceUtils.ts', pattern: /^(export )?const toNullableNumber\s*=/m },
];

// A literal that belongs to a shared constant, and the two dialog spellings the helper replaced.
const LITERALS = [
  { text: 'className="block text-sm font-medium text-gray-700 dark:text-ink-100 mb-1"', use: 'FORM_LABEL_CLASS' },
  { text: 'className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-ink-500"', use: 'SECTION_LABEL_CLASS' },
  { text: "okType: 'danger'", use: 'confirmDestructive', owner: 'src/components/modals/confirmDestructive.ts' },
  { text: 'okButtonProps: { danger: true }', use: 'confirmDestructive' },
  {
    text: 'page-toolbar-view-switch',
    use: 'components/CalendarView/CalendarViewControls',
    owner: 'src/components/CalendarView/CalendarViewControls.tsx',
  },
  {
    text: "usePersistedState<'list' | 'calendar'>",
    use: 'hooks/useCalendarContentView',
    owner: 'src/hooks/useCalendarContentView.ts',
  },
];

const walk = async (dir) => {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(path)));
    else if (/\.tsx?$/.test(entry.name)) out.push(path);
  }
  return out;
};

const files = await walk('src');
const problems = [];
if (files.length < 100) problems.push(`only ${files.length} files found; the glob is wrong`);

for (const path of files) {
  const source = await readFile(path, 'utf8');
  for (const { name, owner, pattern } of OWNED) {
    if (path !== owner && pattern.test(source)) {
      problems.push(`${path}: defines ${name}. Import it from ${owner}.`);
    }
  }
  for (const { text, use, owner } of LITERALS) {
    if (path !== owner && source.includes(text)) {
      problems.push(`${path}: inlines "${text.slice(0, 48)}…". Use ${use}.`);
    }
  }
  // The responsive popover/drawer split, which existed twice before it was extracted.
  if (
    path !== 'src/components/modals/ResponsiveDisclosure.tsx' &&
    /useIsMobile/.test(source) && /<Drawer\b/.test(source) && /<Popover\b/.test(source)
  ) {
    problems.push(`${path}: re-implements the drawer/popover split. Use components/modals/ResponsiveDisclosure.`);
  }
}

if (problems.length) {
  console.error(`\nOne-owner check failed:\n${problems.map((p) => `  ${p}`).join('\n')}\n`);
  process.exit(1);
}
console.log(`one owner: ${files.length} files, no duplicate implementations`);

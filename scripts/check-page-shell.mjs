// Layout centres every page; a page that re-decides its chrome is what pushed Overview 108px in.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const PAGES = join(process.cwd(), 'src', 'pages');

// Rendered outside the app shell, so they own their own chrome.
const PUBLIC_PAGES = new Set(['Home', 'Legal', 'Login', 'PublicBooking']);

// Long-form reports with their own header card; the cap is a reading width, not a copied wrapper.
const READING_WIDTH_PAGES = new Set(['JDReport', 'NegotiationResult']);

const capsWidth = (source) =>
  /\bmax-w-/.test(source.match(/return \(\s*\n\s*<div className="([^"]*)"/)?.[1] ?? '');

const entries = await readdir(PAGES, { withFileTypes: true });
const pages = [];
for (const entry of entries) {
  if (!entry.isDirectory() || PUBLIC_PAGES.has(entry.name)) continue;
  pages.push({ name: entry.name, source: await readFile(join(PAGES, entry.name, 'index.tsx'), 'utf8') });
}

const problems = [];
if (pages.length < 10) problems.push(`only ${pages.length} pages found; the glob is wrong`);

for (const { name, source } of pages) {
  if (/<PageActionToolbar[\s/>]/.test(source)) {
    problems.push(`${name}: renders PageActionToolbar directly. Use components/layout/PageShell.`);
  }
  if (capsWidth(source) && !READING_WIDTH_PAGES.has(name)) {
    problems.push(`${name}: caps its own width. Layout already centres the page; drop the max-w-*.`);
  }
}

const capping = pages.filter((page) => capsWidth(page.source)).map((page) => page.name).sort();
const expected = [...READING_WIDTH_PAGES].sort();
if (capping.join() !== expected.join()) {
  problems.push(`reading-width list is stale: expected ${expected.join(', ')} but found ${capping.join(', ') || 'none'}`);
}

if (problems.length) {
  console.error(`\nPage shell check failed:\n${problems.map((p) => `  ${p}`).join('\n')}\n`);
  process.exit(1);
}
console.log(`page shell: ${pages.length} pages consistent`);

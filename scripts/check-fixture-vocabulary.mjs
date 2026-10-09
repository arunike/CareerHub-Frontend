// The api allowlist judges only api fixtures; a real employer in a .test.ts was caught by nothing
// durable, since the denylist goes stale and AGENTS.md says never to read it as proof.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const reference = JSON.parse(await readFile(join(process.cwd(), 'eslint-rules', 'substitutes.json'), 'utf8'));
const allowed = new Set([...reference.companies, ...reference.people]);
// Throwaway entities every fixture already spells this way: "Other Co", "Unused Company".
const scaffold = new RegExp(reference.scaffoldSuffixPattern);

// Only the shapes that name an employer, as against a stage, an event or a label.
const PATTERNS = [
  /company_details:\s*\{[^}]*?\bname:\s*'([^']+)'/gs,
  /\bcompany(?:_name|Name)?:\s*'([^']+)'/g,
  /\bcompany(?:_name|Name)?:\s*"([^"]+)"/g,
];

const walk = async (dir) => {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(path)));
    else if (/\.test\.tsx?$/.test(entry.name)) out.push(path);
  }
  return out;
};

const files = await walk(join(process.cwd(), 'src'));
const problems = [];
if (files.length < 20) problems.push(`only ${files.length} fixture files found; the glob is wrong`);

for (const path of files) {
  const source = await readFile(path, 'utf8');
  for (const pattern of PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      const name = match[1].trim();
      if (!name || allowed.has(name) || scaffold.test(name)) continue;
      problems.push(`${path.replace(process.cwd() + '/', '')}: names '${name}'`);
    }
  }
}

if (problems.length) {
  console.error(
    `\nFixture vocabulary check failed — an employer or person outside the published substitutes:\n` +
      `${[...new Set(problems)].map((p) => `  ${p}`).join('\n')}\n` +
      `Rebuild it from api/src/career/data/substitutes.json.\n`
  );
  process.exit(1);
}
console.log(`fixture vocabulary: ${files.length} fixture files, all names are substitutes`);

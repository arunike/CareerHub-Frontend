// Django routes are case-sensitive, so '/career/Contacts/' 404s while the page blames the network.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const API = join(process.cwd(), 'src', 'api');

const CALL = /\bapi\.(?:get|post|patch|put|delete)\s*(?:<[^(]*?>)?\s*\(\s*(['"`])((?:\\.|(?!\1).)*)\1/gs;

const walk = async (dir) => {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(path)));
    else if (entry.name.endsWith('.ts')) out.push(path);
  }
  return out;
};

const files = await walk(API);
const problems = [];
if (files.length === 0) problems.push('no api files found; the glob is wrong');

for (const file of files) {
  const source = await readFile(file, 'utf8');
  for (const match of source.matchAll(CALL)) {
    // Interpolations carry ids and are not part of the route.
    const path = match[2].replace(/\$\{[^}]*\}/g, '');
    if (/[A-Z]/.test(path)) {
      problems.push(`${file.replace(process.cwd() + '/', '')}: '${match[2]}' has an uppercase segment`);
    }
  }
}

if (problems.length) {
  console.error(`\nAPI path check failed:\n${problems.map((p) => `  ${p}`).join('\n')}\n`);
  process.exit(1);
}
console.log(`api paths: ${files.length} modules, all lowercase`);

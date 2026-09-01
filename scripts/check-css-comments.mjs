// The ESLint rule only sees TS/TSX, so the AGENTS.md comment rules reach CSS through this.
import { readFile } from 'node:fs/promises';
import { glob } from 'node:fs/promises';

const COMMENT = /\/\*[\s\S]*?\*\//g;

const lineOf = (source, index) => source.slice(0, index).split('\n').length;

const check = (path, source) => {
  const problems = [];
  const comments = [...source.matchAll(COMMENT)];

  for (const comment of comments) {
    const span = comment[0].split('\n').length;
    if (span > 1) {
      problems.push(
        `${path}:${lineOf(source, comment.index)}  comment spans ${span} lines. One line — cut it, do not reflow it.`
      );
    }
  }

  // A run is consecutive full-line comments with nothing else between them.
  const ownLine = comments.filter((comment) => {
    const before = source.slice(source.lastIndexOf('\n', comment.index) + 1, comment.index);
    return before.trim() === '';
  });

  let previousLine = null;
  let runStart = null;
  let runLength = 0;
  const flush = () => {
    if (runLength > 1) {
      problems.push(
        `${path}:${runStart}  ${runLength} comment lines in a row. One line — cut it, do not reflow it.`
      );
    }
  };
  for (const comment of ownLine) {
    const line = lineOf(source, comment.index);
    if (previousLine !== null && line === previousLine + 1) {
      runLength += 1;
    } else {
      flush();
      runStart = line;
      runLength = 1;
    }
    previousLine = line + comment[0].split('\n').length - 1;
  }
  flush();

  return problems;
};

const problems = [];
for await (const path of glob('src/**/*.css')) {
  problems.push(...check(path, await readFile(path, 'utf8')));
}

if (problems.length) {
  console.error(`AGENTS.md comment rules — ${problems.length} problem(s) in CSS:\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log('CSS comment style: clean');

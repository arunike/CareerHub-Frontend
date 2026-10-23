// A hover that only answers light mode paints a pale chip, or dark text, on a near-black card.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const SRC = join(process.cwd(), 'src');
const STATES = ['group-hover', 'hover', 'focus-visible', 'focus', 'active'];
// A tint this pale is a light-mode surface; dark mode needs its own wash.
const TINT = /^(?:white|[a-z]+-(?:50|100|200))$/;
// Text this deep is a light-mode ink; on a dark surface it has to climb, not deepen.
const INK = /^[a-z]+-(?:600|700|800|900|950)$/;

const walk = async (dir) => {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(path)));
    else if (/\.(tsx?|css)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(path);
  }
  return out;
};

const luminance = (colour) => {
  const raw =
    typeof colour === 'string'
      ? [1, 3, 5].map((i) => parseInt(colour.slice(i, i + 2), 16))
      : colour;
  const [r, g, b] = raw
    .map((v) => v / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
};

// ink-500 shipped at #6e727b, which is 3.88 on a card: the tier read as unlit rather than quiet.
const TEXT_TIERS = ['ink-50', 'ink-100', 'ink-200', 'ink-400', 'ink-500'];
// The surfaces body text sits on; ink-800 and above carry chips and disabled states only.
const DARK_SURFACES = ['ink-950', 'ink-900'];
const AA = 4.5;

const checkTokens = (css) => {
  const found = [];
  const hexOf = (name) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
  for (const tier of TEXT_TIERS) {
    const ink = hexOf(`color-${tier}`);
    if (!ink) { found.push(`index.css: --color-${tier} is not a hex token`); continue; }
    for (const surface of DARK_SURFACES) {
      const base = hexOf(`color-${surface}`);
      const ratio = contrast(ink, base);
      if (ratio < AA) found.push(`index.css: ${tier} on ${surface} is ${ratio.toFixed(2)}:1, under ${AA}`);
    }
  }
  // Scoped to the declaring block, since '@custom-variant dark' names the dark selector on line 3.
  const inBlock = (selector) =>
    css.match(new RegExp(`${selector}\\s*\\{[^}]*--careerhub-placeholder:\\s*(#[0-9a-fA-F]{6})`))?.[1];
  const pairs = [[inBlock(':root'), '#ffffff', 'light'], [inBlock("\\[data-theme='dark'\\]"), hexOf('color-ink-900'), 'dark']];
  for (const [ink, base, theme] of pairs) {
    if (!ink) { found.push(`index.css: no placeholder token for ${theme}`); continue; }
    const ratio = contrast(ink, base);
    if (ratio < AA) found.push(`index.css: the ${theme} placeholder is ${ratio.toFixed(2)}:1, under ${AA}`);
  }
  return found;
};

// Tailwind publishes its palette as oklch, so a mark's real colour needs converting first.
const oklchToHex = (L, C, deg) => {
  const h = (deg * Math.PI) / 180;
  const [a, b] = [C * Math.cos(h), C * Math.sin(h)];
  const [l, mm, ss] = [
    (L + 0.3963377774 * a + 0.2158037573 * b) ** 3,
    (L - 0.1055613458 * a - 0.0638541728 * b) ** 3,
    (L - 0.0894841775 * a - 1.291485548 * b) ** 3,
  ];
  const linear = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * ss,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * ss,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * ss,
  ];
  return `#${linear
    .map((v) => {
      const s = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
      return Math.round(Math.min(1, Math.max(0, s)) * 255)
        .toString(16)
        .padStart(2, '0');
    })
    .join('')}`;
};

const loadPalette = async (appCss) => {
  const themePath = join(process.cwd(), 'node_modules', 'tailwindcss', 'theme.css');
  let theme = '';
  try {
    theme = await readFile(themePath, 'utf8');
  } catch {
    throw new Error(`cannot read ${themePath}; Tailwind moved its palette and this check is blind`);
  }
  const palette = { white: '#ffffff', black: '#000000' };
  for (const [, name, value] of `${theme}\n${appCss}`.matchAll(/--color-([a-z0-9-]+):\s*([^;]+);/g)) {
    const ok = value.match(/oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)/);
    if (ok) palette[name] = oklchToHex(Number(ok[1]) / 100, Number(ok[2]), Number(ok[3]));
    else {
      const hex = value.match(/#[0-9a-fA-F]{6}/);
      if (hex) palette[name] = hex[0];
    }
  }
  if (!palette['slate-300'] || !palette['ink-900']) throw new Error('palette did not load');
  return (token) => palette[token];
};

// A self-closing div/span holds no text, so being seen is the only job it has.
const MARK = /<(?:div|span|hr|i)\b((?:[^<>]|=\{`[^`]*`\}|=\{[^{}]*\})*?)\/>/gs;
const WHITE = '#ffffff';
const INK_900 = 'ink-900';
// 3:1 is the floor a graphical object has to clear; above it a theme difference does not matter.
const MARK_FLOOR = 3;
const PARITY = 0.5;

const washed = (hex, alpha, base) => {
  const a = Number(String(alpha).replace(/[[\]/]/g, ''));
  const share = a > 1 ? a / 100 : a;
  return [1, 3, 5].map((i) => {
    const top = parseInt(hex.slice(i, i + 2), 16);
    const under = parseInt(base.slice(i, i + 2), 16);
    return Math.round(top * share + under * (1 - share));
  });
};

const checkMarks = (source, where, tokens) => {
  const found = [];
  for (const tag of source.matchAll(MARK)) {
    const attrs = tag[1];
    if (!/className/.test(attrs) || !/(?:bg|border)-/.test(attrs)) continue;
    const line = source.slice(0, tag.index).split('\n').length;
    for (const chunk of attrs.split(/['"`]/)) {
      for (const kind of ['bg', 'border']) {
        const lit = [...chunk.matchAll(new RegExp(`(?<![a-z0-9:-])!?${kind}-([a-z]+-\\d+|white|black)(/\\[?[\\d.]+\\]?)?\\b`, 'g'))];
        const dim = [...chunk.matchAll(new RegExp(`dark:!?${kind}-([a-z]+-\\d+|white|black)(/\\[?[\\d.]+\\]?)?\\b`, 'g'))];
        // Only an unambiguous one-to-one pair can be compared; a branch set cannot.
        if (lit.length !== 1 || dim.length !== 1) continue;
        const lightHex = tokens(lit[0][1]);
        const darkHex = tokens(dim[0][1]);
        if (!lightHex || !darkHex) continue;
        const onLight = lit[0][2] ? washed(lightHex, lit[0][2], WHITE) : lightHex;
        const base = tokens(INK_900);
        const onDark = dim[0][2] ? washed(darkHex, dim[0][2], base) : darkHex;
        const light = contrast(onLight, WHITE);
        const dark = contrast(onDark, base);
        if (dark < MARK_FLOOR && dark < light - PARITY) {
          found.push(`${where}:${line}: '${dim[0][0]}' reads ${dark.toFixed(2)}:1 in dark, under ${MARK_FLOOR}:1, against ${light.toFixed(2)}:1 for '${lit[0][0]}' in light`);
        }
      }
    }
  }
  return found;
};

const files = await walk(SRC);
const problems = [];
if (files.length === 0) problems.push('no source files found; the glob is wrong');
const appCss = await readFile(join(SRC, 'index.css'), 'utf8');
problems.push(...checkTokens(appCss));
const tokens = await loadPalette(appCss);
let marks = 0;

for (const file of files) {
  const source = await readFile(file, 'utf8');
  const where = file.replace(`${process.cwd()}/`, '');
  if (file.endsWith('.tsx')) {
    const found = checkMarks(source, where, tokens);
    marks += found.length;
    problems.push(...found);
  }
  source.split('\n').forEach((line, index) => {
    // Two class strings on one line are unrelated, so a pair in one cannot answer the other.
    for (const chunk of line.split(/['"`]/)) {
      for (const state of STATES) {
        const utility = new RegExp(
          `(?<![a-z0-9:-])${state}:(!?)(bg|text)-([a-z]+(?:-\\d+)?)(?:/\\[?[\\d.]+\\]?)?`,
          'g'
        );
        for (const found of chunk.matchAll(utility)) {
          const [, , property, token] = found;
          if (property === 'bg' ? !TINT.test(token) : !INK.test(token)) continue;
          if (new RegExp(`dark:${state}:!?${property}-`).test(chunk)) continue;
          problems.push(`${where}:${index + 1}: '${found[0]}' has no dark:${state}:${property}- answer`);
        }
      }
    }
  });
}

if (problems.length) {
  console.error(`\nDark pair check failed:\n${problems.map((p) => `  ${p}`).join('\n')}\n`);
  process.exit(1);
}
console.log(
  `dark pairs: ${files.length} files, every light hover and focus answers dark; ${TEXT_TIERS.length} ink text tiers clear AA; textless marks keep their visibility in dark`
);

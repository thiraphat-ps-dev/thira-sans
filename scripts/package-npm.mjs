// Assembles the npm package in npm/ from the gftools build output in fonts/.
// Usage: node scripts/package-npm.mjs [fontsDir]
// Needs npm/fallback.css first: python scripts/fallback-metrics.py css fonts/ttf
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const fontsDir = process.argv[2] ?? 'fonts';
const webfonts = join(fontsDir, 'webfonts');
const out = 'npm';
const filesDir = join(out, 'files');

const weights = {
  100: 'Thin',
  200: 'ExtraLight',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'SemiBold',
  700: 'Bold',
};

rmSync(filesDir, { recursive: true, force: true });
mkdirSync(filesDir, { recursive: true });

const available = new Set(readdirSync(webfonts));
const need = ['ThiraSans[wght].woff2', ...Object.values(weights).map((n) => `ThiraSans-${n}.woff2`)];
for (const file of need) {
  if (!available.has(file)) throw new Error(`Missing ${join(webfonts, file)}`);
}

copyFileSync(join(webfonts, 'ThiraSans[wght].woff2'), join(filesDir, 'thira-sans-variable.woff2'));
for (const [w, name] of Object.entries(weights)) {
  copyFileSync(join(webfonts, `ThiraSans-${name}.woff2`), join(filesDir, `thira-sans-${w}.woff2`));
}

const face = (src, weight) => `@font-face {
  font-family: 'Thira Sans';
  font-style: normal;
  font-display: swap;
  font-weight: ${weight};
  src: url('./files/${src}') format('woff2');
}
`;

// Metric-matched local fallback ('Thira Sans Fallback'), shipped with every entry point so
// `font-family: 'Thira Sans', 'Thira Sans Fallback', sans-serif` works whichever file is imported.
const fallbackPath = join(out, 'fallback.css');
if (!existsSync(fallbackPath)) throw new Error(`Missing ${fallbackPath}: run scripts/fallback-metrics.py css first`);
const fallback = readFileSync(fallbackPath, 'utf8');

const header = '/* Thira Sans, SIL Open Font License 1.1. https://github.com/thiraphat-ps-dev/thira-sans */\n';
writeFileSync(join(out, 'index.css'), header + face('thira-sans-variable.woff2', '100 700') + '\n' + fallback);
for (const w of Object.keys(weights)) {
  writeFileSync(join(out, `${w}.css`), header + face(`thira-sans-${w}.woff2`, w) + '\n' + fallback);
}
copyFileSync('OFL.txt', join(out, 'OFL.txt'));
console.log(`npm/ ready: variable + ${Object.keys(weights).length} static weights`);

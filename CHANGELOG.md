# Changelog

Versions are the npm package versions. The font's own version (name table and `head`) is X.(100·Y+Z) for npm X.Y.Z, so npm 0.5.0 is font version 0.500. CI checks that they agree (`scripts/check-version.py`).

## Unreleased

- Thai spacing, tuned for 14–16px text. Sidebearings changed per master: ะ has less space after it (ประเทศ, และ, ตะกร้า no longer break apart). โ ใ ไ sit closer to the letter before them. ษ ฉ get more space after them, ฎ ฏ ภ ฦ more space before them (เภ, ไฏ no longer touch), and ฬ more after its tail. The shift for โ ใ ไ stops short of where it would push tone marks on the letter before into the vowel's tail (ที่ไหน, ก็ไม่).
- Tabular Thai digits ๒ ๓ ๗ ๘ ๙: redrawn instead of squeezed, so their vertical stems stay close to the regular digits' weight (๗ at Bold: 112 units, was 91; the default ๗ is 129).

## 0.5.0 (unreleased)

- `tnum`: tabular Thai digits. `font-variant-numeric: tabular-nums` makes ๐–๙ 600 units wide at every weight, the same as the Latin figures, so Thai and Latin numbers line up in tables. The wide digits ๒ ๓ ๗ ๘ ๙ are condensed horizontally to fit; default (proportional) Thai digits are unchanged.
- U+25CC DOTTED CIRCLE, with `top` and `bottom` anchors so Thai above and below marks sit on it (◌ิ ◌ุ ◌ี่).
- Zero-width characters: U+200B ZERO WIDTH SPACE, U+200C ZWNJ, U+200D ZWJ, U+2060 WORD JOINER. Apps that look these up in the font now find them instead of falling back to another font or showing .notdef.
- The font version is now 0.500. 0.4.0 shipped with font version 0.300.
- CI fails when the built fonts' version and `npm/package.json` disagree.

## 0.4.0 (2026-11-17)

- `Thira Sans Fallback`: Arial (Latin) and Tahoma (Thai) resized with `size-adjust` and given Thira Sans' ascent and descent, so text shown before the webfont loads has the same line length and line height. Included in every CSS entry point and exported as `thira-sans/fallback.css`.

## 0.3.0 (2026-11-16)

- `line-height: normal` is 1.5 (typo/hhea ascender 1125, descender -375).
- Windows metrics raised to 1180/430 so stacked Thai marks and below vowels are not clipped in GDI apps. CI (`scripts/check-metrics.py`) shapes the worst-case stacks at every weight and checks them.
- README documents the smallest line-height that never clips (1.5, or 1.55 at 700).

## 0.2.0 (2026-11-16)

- Every sharp corner is rounded: radius 7/22/38 units at weight 100/400/700, half that on inner corners.
- `ss03` single-storey a and g, `ss04` dotted zero, `zero` slashed zero.
- Proof page: feature toggles and a stylistic sets section.

## 0.1.1 (2026-11-15)

- npm: type declarations for the CSS entry points, so `import 'thira-sans'` type-checks under TypeScript 6.

## 0.1.0 (2026-11-15)

- First release: Thira Sans 0.100, a fork of Anuphan by Cadson Demak (OFL), renamed. Variable weight 100–700 plus static 100–700, as the `thira-sans` npm package with woff2 files and CSS entry points.
- Proof page on GitHub Pages; CI builds the fonts, and pushing a version tag publishes to npm.

# Thira Sans

A Thai + Latin sans-serif, variable weight 100–700. Thira Sans is a fork of [Anuphan](https://github.com/cadsondemak/Anuphan) by Cadson Demak, released under the [SIL Open Font License 1.1](OFL.txt).

**Proof page:** https://thiraphat-ps-dev.github.io/thira-sans/

**Status: 0.200, soft corners.** Every sharp corner of the Anuphan outlines is rounded (radius grows with weight), which gives Thira Sans a friendlier, softer tone that matches [thira-ui](https://github.com/thiraphat-ps-dev/thira-ui). Letter shapes are otherwise still Anuphan's; see [Roadmap](#roadmap).

## Use it on the web

```sh
npm install thira-sans
```

```js
import 'thira-sans'; // variable font, weights 100–700
```

```css
body { font-family: 'Thira Sans', 'Thira Sans Fallback', sans-serif; }
```

`Thira Sans Fallback` is Arial (Latin) and Tahoma (Thai), installed on Windows and macOS, resized with `size-adjust` and given Thira Sans' ascent and descent. Text shown before the webfont loads has the same line length and line height, so the page doesn't jump when the font swaps in. It ships in every CSS entry point. See [npm/README.md](npm/README.md) for static weights.

### OpenType features

| Feature | What it does |
| ------- | ------------ |
| `ss01`  | Thai alternates: ข ฃ ฅ ฉ ช ซ ญ ฑ ใ with different heads/tails |
| `ss02`  | Alternate ญ |
| `ss03`  | Single-storey **a** and **g** (and their accented forms) |
| `ss04`  | Dotted zero |
| `zero`  | Slashed zero |
| `tnum`  | Tabular Thai digits ๐–๙: 600 units wide, the same as the Latin figures (which are always tabular). The wide ๒ ๓ ๗ ๘ ๙ are condensed to fit. Use `font-variant-numeric: tabular-nums` |

```css
body { font-feature-settings: 'ss03'; }
```

### Line height

`line-height: normal` is 1.5. Thai tone marks stack above vowels (ปี๊บ) and some vowels hang below the letter (ฎุ), so a clipping box (`overflow: hidden`, `line-clamp`) needs room for them:

| Weight | Smallest line-height that never clips |
| --- | --- |
| 100–600 | 1.5 |
| 700 | 1.55 |

Below that, the tallest stacks can be cut at the top of the first line and the bottom of the last. CI checks every weight (`scripts/check-metrics.py`), and [proof/metrics.html](proof/metrics.html) shows the same numbers in the browser.

## Repository layout

| Path                       | What it is                                                                      |
| -------------------------- | ------------------------------------------------------------------------------- |
| `sources/ThiraSans.glyphs` | The source (Glyphs 3 format): 3 masters (100, 400, 700), 7 named instances      |
| `sources/config.yaml`      | [gftools builder](https://github.com/googlefonts/gftools) config                |
| `proof/index.html`         | Proof page: display text, Thai mark stacking, `line-clamp` clipping, weights    |
| `npm/`, `scripts/`         | The npm package (`thira-sans`): CSS + woff2, assembled from the build by `scripts/package-npm.mjs` |
| `scripts/round-corners.mjs` | One-off transform that rounded the corners of every master (already applied; don't run it twice) |
| `scripts/fallback-metrics.py` | Generates `npm/fallback.css`. `measure` reads Arial/Tahoma locally into `scripts/fallback-fonts.json` (rerun only if you change the sample text); `css` runs in CI against the built fonts |
| `scripts/check-metrics.py` | CI check: win metrics cover shaped Thai/Latin stacks; prints the smallest safe line-height |
| `scripts/preview-glyphs.mjs` | Renders glyphs from a `.glyphs` file to HTML/SVG, for checking shapes without building |
| `.github/workflows/`       | CI builds TTF/OTF/variable/webfonts, uploads them as an artifact and deploys the proof to Pages |

## Building

CI builds on every push. Download the `thira-sans` artifact from the Actions run.

To build locally (Python 3.10–3.13):

```sh
python -m venv .venv
.venv/bin/pip install -r requirements.txt   # Windows: .venv\Scripts\pip
.venv/bin/gftools builder sources/config.yaml
```

Fonts land in `fonts/`. To use the proof page, put a variable font at `proof/fonts/ThiraSans-VF.woff2` (or `.ttf`) and open `proof/index.html`.

## Editing

The source is a `.glyphs` file. It opens in Glyphs (macOS) and in [Fontra](https://fontra.xyz). For FontLab or FontForge, convert it to UFO with `glyphs2ufo` (part of glyphsLib) and edit the `.designspace`.

Thai mark positioning comes from anchors (`top`, `bottom`, `_top`, …) plus the GSUB lookups in the font's features (`thai_decomb`, `thai_comb`, and the short/less forms of ญ ฐ ฎ ฏ ฤ ฦ under below-vowels). Check the "Marks" section of the proof page after any change to a consonant or a mark.

## Roadmap

1. ~~Pick the character~~: soft, rounded corners (0.200). Next: head shapes (loop, loopless or cut) and proportions.
2. Redraw the Thai consonants that carry that character, then propagate it through the rest of the set.
3. Tune for UI use.
   - ~~Vertical metrics~~ (0.3.0): `line-height: normal` is 1.5, `line-clamp` safe, stacked Thai marks not clipped on Windows.
   - ~~Metric-matched fallback~~ (`Thira Sans Fallback`) so the font swap doesn't shift layout.
   - Next: horizontal spacing, so text is comfortable at 14–16px.
4. ~~Use Thira Sans in thira-ui and the portfolio~~ (published to npm as `thira-sans` since 0.1.0).

## Credits

- Original design: [Anuphan](https://github.com/cadsondemak/Anuphan) by Cadson Demak (Mint Tantisuwanna), whose Thai is based on the [IBM Plex](https://github.com/IBM/plex) Latin.
- Thira Sans changes: Thiraphat Phutson.

## License

SIL Open Font License 1.1. See [OFL.txt](OFL.txt). Anuphan declares no Reserved Font Name; the family is still renamed so it is never confused with the original, and it does not use IBM's reserved name "Plex".

# Thira Sans

A Thai + Latin sans-serif, variable weight 100–700. Thira Sans is a fork of [Anuphan](https://github.com/cadsondemak/Anuphan) by Cadson Demak, released under the [SIL Open Font License 1.1](OFL.txt).

**Proof page:** https://thiraphat-ps-dev.github.io/thira-sans/

**Status: 0.100, a straight fork.** The outlines are still Anuphan's. The fork exists so the design can change from here; see [Roadmap](#roadmap).

## Use it on the web

```sh
npm install thira-sans
```

```js
import 'thira-sans'; // variable font, weights 100–700
```

See [npm/README.md](npm/README.md) for static weights.

## Repository layout

| Path                       | What it is                                                                      |
| -------------------------- | ------------------------------------------------------------------------------- |
| `sources/ThiraSans.glyphs` | The source (Glyphs 3 format): 3 masters (100, 400, 700), 7 named instances      |
| `sources/config.yaml`      | [gftools builder](https://github.com/googlefonts/gftools) config                |
| `proof/index.html`         | Proof page: display text, Thai mark stacking, `line-clamp` clipping, weights    |
| `npm/`, `scripts/`         | The npm package (`thira-sans`): CSS + woff2, assembled from the build by `scripts/package-npm.mjs` |
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

1. Pick the character of Thira Sans: head shapes (loop, loopless or cut), terminals, proportions.
2. Redraw the Thai consonants that carry that character, then propagate it through the rest of the set.
3. Retune spacing and vertical metrics for UI use (`line-clamp` safe, comfortable at 14–16px).
4. Use Thira Sans in thira-ui and the portfolio. (Published to npm as `thira-sans` since 0.1.0.)

## Credits

- Original design: [Anuphan](https://github.com/cadsondemak/Anuphan) by Cadson Demak (Mint Tantisuwanna), whose Thai is based on the [IBM Plex](https://github.com/IBM/plex) Latin.
- Thira Sans changes: Thiraphat Phutson.

## License

SIL Open Font License 1.1. See [OFL.txt](OFL.txt). Anuphan declares no Reserved Font Name; the family is still renamed so it is never confused with the original, and it does not use IBM's reserved name "Plex".

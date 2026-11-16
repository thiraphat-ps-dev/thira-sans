"""Check vertical metrics against real, shaped Thai and Latin stacks.

For every built static weight, shapes worst-case strings with HarfBuzz (so marks sit where the
font's GPOS puts them) and reports:

  - the highest and lowest ink,
  - whether winAscent / winDescent cover it (Windows GDI apps clip glyphs outside them),
  - the smallest CSS line-height at which `overflow: hidden` / `line-clamp` won't cut ink.

Exits 1 if the win metrics don't cover the ink, so CI catches a regression.

    python scripts/check-metrics.py fonts/ttf/*.ttf
"""

import sys

import uharfbuzz as hb
from fontTools.ttLib import TTFont

SAMPLES = {
    "Thai above": ["ปิ่น", "ปี๊บ", "ฝื้น", "ปั้น", "ป่ำ", "น้ำ", "ปั๋ว", "ฟื้น", "ฬี่", "ปิ๋ว", "ศิลป์", "ฝั่ง", "ปื้น", "ปั๊ม"],
    "Thai below": ["ฎุ", "ฏู", "ญู", "ฐุ", "ฤ", "ฦ", "ปู่", "ฎู", "ฏุ", "ฤๅ", "กู้", "ญุ", "ฐู"],
    "Latin above": ["ÅÉÎ", "Ǻ", "Ẫ", "Ở", "Ặ", "Ằ", "ẫ", "Ẵ", "Ĳ"],
    "Latin below": ["gjpqy", "Ç", "Ą", "ẹ", "ặ", "ỵ", "ţ", "ș", "()[]{}|", "Q"],
}


def ink(font: hb.Font, text: str) -> tuple[int, int]:
    """Highest and lowest ink of `text` after shaping, in font units (y up)."""
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf)
    top, bottom = -10**9, 10**9
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        ext = font.get_glyph_extents(info.codepoint)
        if ext is None or ext.height == 0:
            continue
        y_top = pos.y_offset + ext.y_bearing
        y_bottom = y_top + ext.height  # height is negative
        top = max(top, y_top)
        bottom = min(bottom, y_bottom)
    return top, bottom


def main(paths: list[str]) -> int:
    failed = False
    worst_lh = 0.0
    for path in sorted(paths):
        tt = TTFont(path)
        upm = tt["head"].unitsPerEm
        os2 = tt["OS/2"]
        asc, desc = os2.sTypoAscender, -os2.sTypoDescender
        face = hb.Face(open(path, "rb").read())
        font = hb.Font(face)
        top, bottom, top_s, bottom_s = -10**9, 10**9, "", ""
        for group, texts in SAMPLES.items():
            for t in texts:
                a, b = ink(font, t)
                if a > top:
                    top, top_s = a, t
                if b < bottom:
                    bottom, bottom_s = b, t
        # smallest line-height (in em) whose half-leading covers the ink overshoot on both sides
        min_lh = max(2 * top - asc + desc, 2 * -bottom - desc + asc) / upm
        worst_lh = max(worst_lh, min_lh)
        win_ok = os2.usWinAscent >= top and os2.usWinDescent >= -bottom
        failed |= not win_ok
        name = path.replace("\\", "/").rsplit("/", 1)[-1]
        print(
            f"{name:28} typo {asc}/{desc}  win {os2.usWinAscent}/{os2.usWinDescent}  "
            f"ink {top} ({top_s}) / {bottom} ({bottom_s})  min line-height {min_lh:.3f}  "
            f"{'ok' if win_ok else 'WIN METRICS CLIP INK'}"
        )
    print(f"\nline-clamp / overflow safe from line-height {worst_lh:.2f} at every weight")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

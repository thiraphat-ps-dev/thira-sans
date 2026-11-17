"""Metric-matched fallback faces for Thira Sans ("Thira Sans Fallback").

While the webfont loads (`font-display: swap`), text is drawn in a system font. If that font is
wider or has a different line box, the layout jumps when Thira Sans arrives (CLS). This script
resizes the system fonts with `size-adjust` and gives them Thira Sans' ascent/descent, so the
swap barely moves anything.

Two steps, because the system fonts aren't on the CI runner:

  1. measure (run locally, on a machine that has the fonts; commit the JSON):
       python scripts/fallback-metrics.py measure
     Reads Arial and Tahoma (regular + bold) and writes scripts/fallback-fonts.json.

  2. css (runs in CI, after the build):
       python scripts/fallback-metrics.py css fonts/ttf
     Reads the built Thira Sans Regular/Bold and the JSON, writes npm/fallback.css.

Widths are the average advance over a sample paragraph per script, so the fallback ends up with
about the same line length. Latin text falls back to Arial (Windows, macOS); Thai falls back to
Tahoma, which also ships on both. Elsewhere `local()` finds nothing and the browser's own
fallback is used, as before.
"""

import json
import sys
from pathlib import Path

from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
JSON_PATH = ROOT / "scripts" / "fallback-fonts.json"
CSS_PATH = ROOT / "npm" / "fallback.css"

# Ordinary running text, so letters are weighted roughly as they occur in real UI copy.
SAMPLES = {
    "latin": (
        "The quick settings panel lets you change the theme, language and font size. "
        "Your changes are saved automatically and apply to every page you open next. "
        "Invite people to your workspace, share a project with them, or export a report as a file."
    ),
    "thai": (
        "หน้าตั้งค่าช่วยให้คุณเปลี่ยนธีม ภาษา และขนาดตัวอักษรได้ตามต้องการ "
        "ระบบจะบันทึกการเปลี่ยนแปลงให้อัตโนมัติและใช้กับทุกหน้าที่เปิดต่อจากนี้ "
        "คุณสามารถเชิญเพื่อนร่วมงาน แชร์โปรเจกต์ หรือส่งออกรายงานเป็นไฟล์ได้"
    ),
}

# Thai block, and everything else for the Latin face (the ranges must not overlap).
THAI_RANGE = "U+0E00-0E7F"
OTHER_RANGE = "U+0000-0DFF, U+0E80-10FFFF"

# name -> where to find it locally, the names CSS `local()` should try, and which sample it covers.
SYSTEM_FONTS = {
    "Arial": {"file": "C:/Windows/Fonts/arial.ttf", "local": ["Arial", "ArialMT"], "sample": "latin"},
    "Arial Bold": {"file": "C:/Windows/Fonts/arialbd.ttf", "local": ["Arial Bold", "Arial-BoldMT"], "sample": "latin"},
    "Tahoma": {"file": "C:/Windows/Fonts/tahoma.ttf", "local": ["Tahoma"], "sample": "thai"},
    "Tahoma Bold": {"file": "C:/Windows/Fonts/tahomabd.ttf", "local": ["Tahoma Bold", "Tahoma-Bold"], "sample": "thai"},
}

# Which system font stands in for which Thira Sans weights.
FACES = [
    # (system font, Thira Sans file it is matched to, CSS weight range, unicode-range)
    ("Arial", "ThiraSans-Regular.ttf", "100 549", OTHER_RANGE),
    ("Arial Bold", "ThiraSans-Bold.ttf", "550 900", OTHER_RANGE),
    ("Tahoma", "ThiraSans-Regular.ttf", "100 549", THAI_RANGE),
    ("Tahoma Bold", "ThiraSans-Bold.ttf", "550 900", THAI_RANGE),
]


def avg_width(font: TTFont, text: str) -> float:
    """Average advance per character of `text`, in em (marks count as zero, as they render)."""
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    upm = font["head"].unitsPerEm
    missing = sorted({ch for ch in text if ord(ch) not in cmap})
    if missing:
        raise SystemExit(f"{font['name'].getBestFullName()} has no glyph for: {''.join(missing)}")
    total = sum(hmtx[cmap[ord(ch)]][0] for ch in text)
    return total / len(text) / upm


def measure() -> None:
    out = {}
    for name, info in SYSTEM_FONTS.items():
        font = TTFont(info["file"])
        out[name] = {
            "local": info["local"],
            "sample": info["sample"],
            "avgWidth": round(avg_width(font, SAMPLES[info["sample"]]), 5),
            "version": font["name"].getDebugName(5),
        }
        print(f"{name}: avg width {out[name]['avgWidth']} em ({out[name]['version']})")
    JSON_PATH.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    print(f"wrote {JSON_PATH.relative_to(ROOT)}")


def pct(x: float) -> str:
    return f"{x * 100:.2f}%"


def css(fonts_dir: Path) -> None:
    system = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    blocks = []
    for fallback, thira_file, weight, urange in FACES:
        sys_font = system[fallback]
        thira = TTFont(fonts_dir / thira_file)
        upm = thira["head"].unitsPerEm
        hhea = thira["hhea"]
        # USE_TYPO_METRICS is set and typo == hhea, so hhea is the line box every browser uses.
        size_adjust = avg_width(thira, SAMPLES[sys_font["sample"]]) / sys_font["avgWidth"]
        # Overrides are scaled by size-adjust too, so divide it back out.
        ascent = hhea.ascent / upm / size_adjust
        descent = -hhea.descent / upm / size_adjust
        line_gap = hhea.lineGap / upm / size_adjust
        src = ", ".join(f"local('{n}')" for n in sys_font["local"])
        blocks.append(
            f"""@font-face {{
  font-family: 'Thira Sans Fallback';
  font-style: normal;
  font-weight: {weight};
  src: {src};
  unicode-range: {urange};
  size-adjust: {pct(size_adjust)};
  ascent-override: {pct(ascent)};
  descent-override: {pct(descent)};
  line-gap-override: {pct(line_gap)};
}}
"""
        )
        print(f"{fallback:12} for {thira_file:22} size-adjust {pct(size_adjust)}")
    header = (
        "/* Thira Sans Fallback: Arial (Latin) and Tahoma (Thai) resized to Thira Sans' metrics,\n"
        " * so the swap to the webfont barely moves the layout. Put it right after 'Thira Sans':\n"
        " *   font-family: 'Thira Sans', 'Thira Sans Fallback', sans-serif;\n"
        " * Generated by scripts/fallback-metrics.py. */\n"
    )
    CSS_PATH.write_text(header + "\n".join(blocks), encoding="utf-8", newline="\n")
    print(f"wrote {CSS_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "measure":
        measure()
    elif len(sys.argv) == 3 and sys.argv[1] == "css":
        css(Path(sys.argv[2]))
    else:
        raise SystemExit(__doc__)

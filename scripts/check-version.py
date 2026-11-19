"""CI check: the built fonts carry the same version as the npm package.

    python scripts/check-version.py fonts/ttf/*.ttf fonts/variable/*.ttf

npm X.Y.Z maps to font version X.(100*Y + Z), written with three decimals:
0.4.0 -> 0.400, 0.4.1 -> 0.401, 0.5.0 -> 0.500, 1.0.0 -> 1.000.
The font version is set in sources/ThiraSans.glyphs (versionMajor / versionMinor).
"""

import json
import re
import sys
from pathlib import Path

from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent


def expected_font_version(npm_version):
    m = re.fullmatch(r"(\d+)\.(\d+)\.(\d+)", npm_version)
    if not m:
        sys.exit(f"npm/package.json version {npm_version!r} is not X.Y.Z")
    major, minor, patch = map(int, m.groups())
    if patch > 99:
        sys.exit(f"npm patch version {patch} does not fit the X.(100*Y + Z) font version scheme")
    return major, 100 * minor + patch


def main(paths):
    if not paths:
        sys.exit(__doc__)
    npm_version = json.loads((ROOT / "npm" / "package.json").read_text())["version"]
    major, minor = expected_font_version(npm_version)
    want = f"{major}.{minor:03d}"
    failed = False
    for path in paths:
        font = TTFont(path, lazy=True)
        name5 = font["name"].getDebugName(5) or ""
        m = re.match(r"Version (\d+\.\d+)", name5)
        got = m.group(1) if m else name5
        revision = f"{font['head'].fontRevision:.3f}"
        ok = got == want and revision == want
        failed |= not ok
        print(f"{Path(path).name:28} name {got:8} head {revision:8} {'ok' if ok else f'MISMATCH, want {want}'}")
    print(f"\nnpm/package.json {npm_version} -> font version {want}")
    if failed:
        sys.exit("Font and npm versions disagree: update versionMajor/versionMinor in "
                 "sources/ThiraSans.glyphs or the version in npm/package.json.")


if __name__ == "__main__":
    main(sys.argv[1:])

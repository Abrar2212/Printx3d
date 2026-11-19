"""Convert a .ttf/.otf font to a Three.js typeface JSON (what FontLoader reads).

Usage:
    python scripts/font-to-typeface.py path/to/Font.ttf public/fonts/<id>.typeface.json

Then add <id> to FONT_STYLE_OPTIONS in types/index.ts. The same file is used by the
3D preview and by the print STL, so what the customer sees is what gets printed.

Only Latin characters (U+0020-U+024F) are exported, which keeps files small.
Requires fontTools (pip install fonttools).
"""

import json
import sys
from pathlib import Path

from fontTools.pens.basePen import BasePen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont

CHARS = range(0x20, 0x250)


class TypefacePen(BasePen):
    """Writes Three.js outline commands. Note the argument order three expects:
    q = end, control; b = end, control1, control2."""

    def __init__(self, glyphset):
        super().__init__(glyphset)
        self.cmds = []

    def _add(self, op, *pts):
        self.cmds.append(op)
        for x, y in pts:
            self.cmds += [str(round(x)), str(round(y))]

    def _moveTo(self, p):
        self._add("m", p)

    def _lineTo(self, p):
        self._add("l", p)

    def _qCurveToOne(self, c, p):
        self._add("q", p, c)

    def _curveToOne(self, c1, c2, p):
        self._add("b", p, c1, c2)

    def _closePath(self):
        self.cmds.append("z")


def convert(src: str) -> dict:
    font = TTFont(src)
    glyphset = font.getGlyphSet()
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    glyphs = {}

    for cp in CHARS:
        name = cmap.get(cp)
        if name is None:
            continue
        pen = TypefacePen(glyphset)
        glyphset[name].draw(pen)
        bounds = BoundsPen(glyphset)
        glyphset[name].draw(bounds)
        x_min, _, x_max, _ = bounds.bounds or (0, 0, 0, 0)
        glyphs[chr(cp)] = {
            "ha": hmtx[name][0],
            "x_min": round(x_min),
            "x_max": round(x_max),
            "o": " ".join(pen.cmds),
        }

    head, hhea, post = font["head"], font["hhea"], font["post"]
    family = font["name"].getDebugName(1) or Path(src).stem
    return {
        "glyphs": glyphs,
        "familyName": family,
        "ascender": hhea.ascent,
        "descender": hhea.descent,
        "underlinePosition": post.underlinePosition,
        "underlineThickness": post.underlineThickness,
        "boundingBox": {"xMin": head.xMin, "yMin": head.yMin, "xMax": head.xMax, "yMax": head.yMax},
        "resolution": head.unitsPerEm,
        "original_font_information": {"source": Path(src).name},
        "cssFontWeight": "normal",
        "cssFontStyle": "normal",
    }


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    data = convert(sys.argv[1])
    missing = [c for c in "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" if c not in data["glyphs"]]
    Path(sys.argv[2]).write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    print(f"{data['familyName']}: {len(data['glyphs'])} glyphs -> {sys.argv[2]}")
    if missing:
        print(f"warning: font has no glyph for: {''.join(missing)} (those letters won't print)")

// Renders glyph outlines straight from a Glyphs source to an HTML page of SVGs, so shape
// changes can be checked without building the font (fontmake can't run on every machine).
//
//   node scripts/preview-glyphs.mjs out.html "Label=path/a.glyphs" "Label=path/b.glyphs" -- a g n ko-thai ...
//
// Components are resolved with their offset and scale; other transforms are ignored.

import { readFileSync, writeFileSync } from 'node:fs';
import { parse, plain } from './lib/glyphs-plist.mjs';

const args = process.argv.slice(2);
const dash = args.indexOf('--');
const [outFile, ...sources] = dash === -1 ? args : args.slice(0, dash);
const names = dash === -1 ? ['a', 'g', 'n', 'e', 's', 'R', 'period'] : args.slice(dash + 1);

function load(file) {
  const font = plain(parse(readFileSync(file, 'utf8')));
  const masters = font.fontMaster.map((m) => ({ id: m.id, name: m.name }));
  const glyphs = new Map(font.glyphs.map((g) => [g.glyphname, g]));
  return { masters, glyphs };
}

function pathData(font, name, masterId, dx = 0, dy = 0, sx = 1, sy = 1, depth = 0) {
  const g = font.glyphs.get(name);
  if (!g || depth > 5) return { d: '', width: 0 };
  const layer = g.layers.find((l) => l.layerId === masterId && !l.associatedMasterId);
  if (!layer) return { d: '', width: 0 };
  let d = '';
  for (const s of layer.shapes ?? []) {
    if (s.ref) {
      const [px, py] = (s.pos ?? ['0', '0']).map(Number);
      const [kx, ky] = (s.scale ?? ['1', '1']).map(Number);
      d += pathData(font, s.ref, masterId, dx + px * sx, dy + py * sy, sx * kx, sy * ky, depth + 1).d;
      continue;
    }
    const nodes = s.nodes.map(([x, y, t]) => ({ x: dx + Number(x) * sx, y: dy + Number(y) * sy, t }));
    if (!nodes.length) continue;
    // Rotate so the list starts right after the last on-curve (the path's start point).
    const lastOn = nodes.findLastIndex((n) => n.t !== 'o');
    const ordered = [...nodes.slice(lastOn + 1), ...nodes.slice(0, lastOn + 1)];
    const start = nodes[lastOn];
    d += `M${start.x} ${-start.y}`;
    let offs = [];
    for (const n of ordered) {
      if (n.t === 'o') { offs.push(n); continue; }
      if (offs.length === 2) d += `C${offs[0].x} ${-offs[0].y} ${offs[1].x} ${-offs[1].y} ${n.x} ${-n.y}`;
      else if (offs.length === 1) d += `Q${offs[0].x} ${-offs[0].y} ${n.x} ${-n.y}`;
      else d += `L${n.x} ${-n.y}`;
      offs = [];
    }
    if (s.closed !== '0') d += 'Z';
  }
  return { d, width: Number(layer.width ?? 600) };
}

const fonts = sources.map((s) => {
  const [label, file] = s.split('=');
  return { label, ...load(file) };
});

let html = `<!doctype html><meta charset="utf-8"><title>Glyph preview</title>
<style>body{font:13px system-ui;margin:16px;background:#fff;color:#111}
table{border-collapse:collapse}td,th{padding:4px 8px;vertical-align:bottom;text-align:left}
svg{display:block;background:#f6f6f6}</style><table>`;
for (const font of fonts) {
  for (const m of font.masters) {
    html += `<tr><th>${font.label}<br>${m.name}</th>`;
    for (const name of names) {
      const { d, width } = pathData(font, name, m.id);
      html += `<td><svg height="${process.env.SIZE ?? 150}" viewBox="-20 -1050 ${width + 40} 1350"><path d="${d}" fill="#111"/></svg><small>${name}</small></td>`;
    }
    html += '</tr>';
  }
}
html += '</table>';
writeFileSync(outFile, html);
console.log(`Wrote ${outFile}`);

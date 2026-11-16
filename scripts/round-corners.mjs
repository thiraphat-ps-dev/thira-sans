// Rounds the sharp corners of every outline in a Glyphs 3 source, in place.
//
//   node scripts/round-corners.mjs [sources/ThiraSans.glyphs] [--dry-run]
//
// This is what gives Thira Sans its soft, friendly look on top of the Anuphan / Plex shapes.
// The radius grows with the weight (see RADIUS), concave (inner) corners get a smaller one.
//
// Variable fonts need every master of a glyph to have the same node structure, so the
// decision "round this corner or not" is taken once per corner, looking at all masters,
// and only the coordinates differ between masters. Glyphs whose masters are not
// compatible to begin with are left untouched and listed in the report.
//
// Only master layers are changed; backup layers and backgrounds are left as they are.
// Run it once on the Anuphan-derived source: running it again would round the new,
// already-soft corners a second time.

import { readFileSync, writeFileSync } from 'node:fs';
import { parse, plain } from './lib/glyphs-plist.mjs';

/** Corner radius in font units at each weight axis value (UPM 1000), interpolated between. */
export const RADIUS = [
  [100, 7],
  [400, 22],
  [700, 38],
];
/** Inner corners (where ink turns inwards) get a fraction of the radius. */
export const CONCAVE_FACTOR = 0.5;
/** Corners that turn less than this (degrees) in any master are left alone. */
export const MIN_TURN = 25;
/** The two trims on one segment may use at most this share of its length. */
const MAX_SEGMENT_SHARE = 0.8;

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a, k) => ({ x: a.x * k, y: a.y * k });
const len = (a) => Math.hypot(a.x, a.y);
const norm = (a) => {
  const l = len(a);
  return l < 1e-9 ? { x: 0, y: 0 } : mul(a, 1 / l);
};
const lerp = (a, b, t) => add(a, mul(sub(b, a), t));
const cross = (a, b) => a.x * b.y - a.y * b.x;
const dot = (a, b) => a.x * b.x + a.y * b.y;
const angleBetween = (a, b) => (Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) * 180) / Math.PI;

export function radiusAt(axisValue) {
  const pts = RADIUS;
  if (axisValue <= pts[0][0]) return pts[0][1];
  for (let k = 1; k < pts.length; k++) {
    const [x1, r1] = pts[k];
    const [x0, r0] = pts[k - 1];
    if (axisValue <= x1) return r0 + ((r1 - r0) * (axisValue - x0)) / (x1 - x0);
  }
  return pts.at(-1)[1];
}

// ---- Bézier helpers --------------------------------------------------------------------

function cubicAt([p0, p1, p2, p3], t) {
  const a = lerp(p0, p1, t), b = lerp(p1, p2, t), c = lerp(p2, p3, t);
  const d = lerp(a, b, t), e = lerp(b, c, t);
  return lerp(d, e, t);
}

function splitCubic([p0, p1, p2, p3], t) {
  const a = lerp(p0, p1, t), b = lerp(p1, p2, t), c = lerp(p2, p3, t);
  const d = lerp(a, b, t), e = lerp(b, c, t);
  const m = lerp(d, e, t);
  return [[p0, a, d, m], [m, e, c, p3]];
}

/** Parameter t at which the curve is `dist` away (straight line) from its start or end. */
function tAtDistance(curve, dist, fromEnd) {
  const anchor = fromEnd ? curve[3] : curve[0];
  const at = (s) => len(sub(cubicAt(curve, fromEnd ? 1 - s : s), anchor));
  // Walk forward until we pass the distance, then bisect.
  let lo = 0, hi = 1;
  const steps = 64;
  for (let k = 1; k <= steps; k++) {
    if (at(k / steps) >= dist) { hi = k / steps; lo = (k - 1) / steps; break; }
  }
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    if (at(mid) < dist) lo = mid; else hi = mid;
  }
  const s = (lo + hi) / 2;
  return fromEnd ? 1 - s : s;
}

/** Tangent direction leaving the start / arriving at the end of a segment. */
function startDir(seg) {
  for (let k = 1; k < seg.length; k++) {
    const d = sub(seg[k], seg[0]);
    if (len(d) > 1e-6) return norm(d);
  }
  return { x: 0, y: 0 };
}
function endDir(seg) {
  const n = seg.length - 1;
  for (let k = n - 1; k >= 0; k--) {
    const d = sub(seg[n], seg[k]);
    if (len(d) > 1e-6) return norm(d);
  }
  return { x: 0, y: 0 };
}

// ---- Contours --------------------------------------------------------------------------

/** Parse a nodes array (plist node) into on-curve points, each carrying the off-curves that precede it. */
function readContour(nodesNode, text) {
  const raw = nodesNode.value.map((n) => {
    const [x, y, type, extra] = n.value;
    const t = type.value;
    return {
      x: Number(x.value),
      y: Number(y.value),
      off: t === 'o',
      type: t.replace(/s$/, ''),
      smooth: t.length > 1 && t.endsWith('s'),
      extra: extra ? text.slice(extra.start, extra.end) : null,
    };
  });
  const ons = [];
  let pendingOff = [];
  for (const n of raw) {
    if (n.off) pendingOff.push({ x: n.x, y: n.y });
    else {
      ons.push({ ...n, inOff: pendingOff });
      pendingOff = [];
    }
  }
  // Trailing off-curves belong to the first on-curve (the path wraps around).
  if (pendingOff.length && ons.length) ons[0].inOff = [...pendingOff, ...ons[0].inOff];
  return ons;
}

/** Signature used to check that masters are compatible. */
const signature = (ons) => ons.map((o) => `${o.type}${o.inOff.length}`).join(' ');

/** Segment k runs from on-curve k-1 to on-curve k. */
function segment(ons, k) {
  const prev = ons[(k - 1 + ons.length) % ons.length];
  const cur = ons[k];
  return [{ x: prev.x, y: prev.y }, ...cur.inOff, { x: cur.x, y: cur.y }];
}

/** Turning angle (degrees) and whether the corner is convex, at on-curve k. */
function cornerInfo(ons, k) {
  const inSeg = segment(ons, k);
  const outSeg = segment(ons, (k + 1) % ons.length);
  const dIn = endDir(inSeg);
  const dOut = startDir(outSeg);
  return { turn: angleBetween(dIn, dOut), convex: cross(dIn, dOut) > 0 };
}

/** Trim `a` units off the start and `b` units off the end of a segment. */
function trimSegment(seg, a, b) {
  if (seg.length === 2) {
    const u = norm(sub(seg[1], seg[0]));
    return [add(seg[0], mul(u, a)), sub(seg[1], mul(u, b))];
  }
  let curve = seg;
  if (a > 0) {
    const t0 = tAtDistance(curve, a, false);
    curve = splitCubic(curve, t0)[1];
  }
  if (b > 0) {
    const t1 = tAtDistance(curve, b, true);
    curve = splitCubic(curve, t1)[0];
  }
  return curve;
}

/** Cubic that rounds the corner between point A (heading dirA) and point B (leaving along dirB). */
function roundingCurve(A, dirA, B, dirB) {
  const chord = len(sub(B, A));
  const phi = (Math.max(5, Math.min(175, angleBetween(dirA, dirB))) * Math.PI) / 180;
  const radius = chord / (2 * Math.sin(phi / 2));
  const h = (4 / 3) * Math.tan(phi / 4) * radius;
  return [add(A, mul(dirA, h)), sub(B, mul(dirB, h))];
}

/**
 * Round the chosen corners of one contour.
 * @param ons      on-curve list from readContour
 * @param corners  boolean per on-curve: round it?
 * @param radius   base radius for this master
 * @returns serialised nodes array text
 */
function roundContour(ons, corners, radius) {
  const n = ons.length;
  const r = ons.map((_, k) => {
    if (!corners[k]) return 0;
    return cornerInfo(ons, k).convex ? radius : radius * CONCAVE_FACTOR;
  });
  // trims[k] = [cut at start, cut at end] of segment k.
  const trims = ons.map((_, k) => {
    const seg = segment(ons, k);
    const chord = len(sub(seg.at(-1), seg[0]));
    let a = r[(k - 1 + n) % n];
    let b = r[k];
    const limit = chord * MAX_SEGMENT_SHARE;
    if (a + b > limit && a + b > 0) {
      const f = limit / (a + b);
      a *= f;
      b *= f;
    }
    return [a, b];
  });
  const pieces = ons.map((_, k) => trimSegment(segment(ons, k), trims[k][0], trims[k][1]));

  const out = [];
  const fmt = (p, type, smooth, extra) =>
    `(${Math.round(p.x)},${Math.round(p.y)},${type}${smooth ? 's' : ''}${extra ? `,${extra}` : ''})`;
  for (let k = 0; k < n; k++) {
    const piece = pieces[k];
    const on = ons[k];
    for (const c of piece.slice(1, -1)) out.push(fmt(c, 'o'));
    const end = piece.at(-1);
    if (!corners[k]) {
      out.push(fmt(end, on.type, on.smooth, on.extra));
      continue;
    }
    const next = pieces[(k + 1) % n];
    const B = next[0];
    const [h1, h2] = roundingCurve(end, endDir(piece), B, startDir(next));
    out.push(fmt(end, on.type, true, on.extra));
    out.push(fmt(h1, 'o'), fmt(h2, 'o'), fmt(B, 'c', true));
  }
  // Glyphs lists a closed path ending with its start point; segment 0 starts at the last
  // on-curve we emitted, so the order is already right.
  return `(\n${out.join(',\n')}\n)`;
}

// ---- Font ------------------------------------------------------------------------------

export function roundFont(text) {
  const root = parse(text);
  const font = root.value;
  const masters = font.fontMaster.value.map((m) => ({
    id: m.value.id.value,
    axis: Number(m.value.axesValues.value[0].value),
  }));
  const masterIds = new Set(masters.map((m) => m.id));

  const edits = [];
  const report = { glyphs: 0, corners: 0, skipped: [] };

  for (const glyph of font.glyphs.value) {
    const g = glyph.value;
    const name = g.glyphname.value;
    const layers = g.layers.value.filter(
      (l) => masterIds.has(l.value.layerId?.value) && !l.value.associatedMasterId,
    );
    if (layers.length === 0) continue;
    const perMaster = layers.map((l) => ({
      axis: masters.find((m) => m.id === l.value.layerId.value).axis,
      paths: (l.value.shapes?.value ?? []).filter((s) => s.value.nodes),
    }));
    if (perMaster.every((m) => m.paths.length === 0)) continue;

    const contours = perMaster.map((m) =>
      m.paths.map((p) => ({
        closed: p.value.closed?.value !== '0',
        nodes: p.value.nodes,
        ons: readContour(p.value.nodes, text),
      })),
    );
    const ref = contours[0];
    const compatible =
      layers.length === masters.length &&
      contours.every(
        (cs) =>
          cs.length === ref.length &&
          cs.every((c, i) => c.closed === ref[i].closed && signature(c.ons) === signature(ref[i].ons)),
      );
    if (!compatible) {
      report.skipped.push(name);
      continue;
    }

    let changed = false;
    ref.forEach((c, pi) => {
      if (!c.closed || c.ons.length < 3) return;
      const corners = c.ons.map(
        (on, k) =>
          !on.smooth && contours.every((cs) => cornerInfo(cs[pi].ons, k).turn >= MIN_TURN),
      );
      const count = corners.filter(Boolean).length;
      if (!count) return;
      changed = true;
      report.corners += count * contours.length;
      contours.forEach((cs, mi) => {
        const { nodes, ons } = cs[pi];
        edits.push([nodes.start, nodes.end, roundContour(ons, corners, radiusAt(perMaster[mi].axis))]);
      });
    });
    if (changed) report.glyphs++;
  }

  edits.sort((a, b) => b[0] - a[0]);
  let result = text;
  for (const [start, end, replacement] of edits) {
    result = result.slice(0, start) + replacement + result.slice(end);
  }
  // Sanity check: the output must still parse.
  plain(parse(result));
  return { text: result, report };
}

if (import.meta.url === `file://${process.argv[1].replaceAll('\\', '/')}` || process.argv[1]?.endsWith('round-corners.mjs')) {
  const file = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'sources/ThiraSans.glyphs';
  const dry = process.argv.includes('--dry-run');
  const { text, report } = roundFont(readFileSync(file, 'utf8'));
  console.log(`Rounded ${report.corners} corners (all masters) in ${report.glyphs} glyphs.`);
  if (report.skipped.length) console.log(`Skipped (incompatible masters): ${report.skipped.join(', ')}`);
  if (!dry) writeFileSync(file, text);
}

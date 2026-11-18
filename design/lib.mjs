// Drawing kit for the README illustrations.
// Every word is converted to outlines, so the SVGs look the same everywhere and
// need no web fonts (GitHub shows README images without them). Same approach,
// palette and type as the artwork on github.com/Rayhanson-Git.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import opentype from 'opentype.js';

const require = createRequire(import.meta.url);
export const HERE = path.dirname(new URL(import.meta.url).pathname);
export const ROOT = path.resolve(HERE, '..');

// Rayhanson palette (rayhanson.tech tokens).
export const C = {
  night: '#05080C', paper: '#0A0F14', paper2: '#091B1F', deep: '#0F3D3E', haze: '#2E6F73',
  ice: '#7FB3B8', ink: '#EADCC8', ink2: '#CEC2AF', ivory: '#F2EDE4', accent: '#DB2B33',
  accent2: '#ED4A49', crimson: '#A31C1B', rule: '#1C3236', muted: '#5E8A8E',
};

const fontFile = (pkg, file) => require.resolve(`@fontsource/${pkg}/files/${file}`);
const load = (p) => opentype.parse(fs.readFileSync(p).buffer.slice(0));
export const F = {
  display: load(fontFile('space-grotesk', 'space-grotesk-latin-600-normal.woff')),
  displayMedium: load(fontFile('space-grotesk', 'space-grotesk-latin-500-normal.woff')),
  body: load(fontFile('inter', 'inter-latin-400-normal.woff')),
  bodyMedium: load(fontFile('inter', 'inter-latin-500-normal.woff')),
  mono: load(fontFile('jetbrains-mono', 'jetbrains-mono-latin-500-normal.woff')),
};

export const r2 = (n) => Math.round(n * 100) / 100;
export const measure = (str, font, size, tracking = 0) => font.getAdvanceWidth(str, size, { letterSpacing: tracking, kerning: true });

// Outlined text. anchor: start | middle | end. tracking is in em.
export function text(str, { font = F.body, size = 16, x = 0, y = 0, fill = C.ink, anchor = 'start', tracking = 0, opacity } = {}) {
  const w = measure(str, font, size, tracking);
  const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  const d = font.getPath(str, x0, y, size, { letterSpacing: tracking, kerning: true }).toPathData(2);
  return `<path d="${d}" fill="${fill}"${opacity != null ? ` opacity="${opacity}"` : ''}/>`;
}

export function wrap(str, font, size, maxWidth) {
  const lines = []; let line = '';
  for (const w of str.split(/\s+/)) {
    const t = line ? `${line} ${w}` : w;
    if (measure(t, font, size) > maxWidth && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

export function paragraph(str, { font = F.body, size = 16, x = 0, y = 0, width = 300, lineHeight = 1.5, fill = C.ink2, maxLines = 99, anchor = 'start' } = {}) {
  const lines = wrap(str, font, size, width);
  if (lines.length > maxLines) throw new Error(`Too long for ${maxLines} lines: ${str}`);
  return { svg: lines.map((l, i) => text(l, { font, size, x, y: y + i * size * lineHeight, fill, anchor })).join(''), height: lines.length * size * lineHeight };
}

// Small mono label in capitals, as used across the profile.
export const label = (str, o = {}) => text(str.toUpperCase(), { font: F.mono, size: 12, fill: C.ice, tracking: 0.08, ...o });

export const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function svg(w, h, body, { title = '', desc = '', defs = '', style = '' } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="t d" fill="none">` +
    `<title id="t">${esc(title)}</title><desc id="d">${esc(desc)}</desc>` +
    (style || defs ? `<defs>${style ? `<style>${style}</style>` : ''}${defs}</defs>` : '') + body + `</svg>\n`;
}

// Motion stays polite: it stops for people who ask for less.
export const REDUCED = '@media (prefers-reduced-motion: reduce){*{animation:none!important}}';

export const frame = (w, h, { fill = C.paper, stroke = C.rule, rx = 24 } = {}) =>
  `<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="${rx}" fill="${fill}" stroke="${stroke}"/>`;

// Arrow from (x1,y1) to (x2,y2) with an open head.
export function arrow(x1, y1, x2, y2, { stroke = C.haze, width = 1.5, head = 7, dash = '' } = {}) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const hx1 = x2 - head * Math.cos(a - 0.45), hy1 = y2 - head * Math.sin(a - 0.45);
  const hx2 = x2 - head * Math.cos(a + 0.45), hy2 = y2 - head * Math.sin(a + 0.45);
  return `<path d="M${r2(x1)} ${r2(y1)}L${r2(x2)} ${r2(y2)}" stroke="${stroke}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ''} stroke-linecap="round"/>` +
    `<path d="M${r2(hx1)} ${r2(hy1)}L${r2(x2)} ${r2(y2)}L${r2(hx2)} ${r2(hy2)}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

// A keycap: rounded outline with the key's name inside.
export function key(name, x, y, { h = 30, pad = 10, fill = C.paper2, stroke = C.haze, ink = C.ink, size = 13 } = {}) {
  const w = Math.max(h, measure(name, F.mono, size) + pad * 2);
  return { w, svg: `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${h}" rx="7" fill="${fill}" stroke="${stroke}"/>` +
    `<path d="M${r2(x + 3)} ${r2(y + h - 1.5)}h${r2(w - 6)}" stroke="${stroke}" stroke-width="2" opacity=".6"/>` +
    text(name, { font: F.mono, size, x: x + w / 2, y: y + h / 2 + size * 0.36, fill: ink, anchor: 'middle' }) };
}

export function write(rel, content) {
  const p = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
  console.log('wrote', rel, `${(content.length / 1024).toFixed(1)} kB`);
}

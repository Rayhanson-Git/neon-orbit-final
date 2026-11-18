// Draws the README artwork for Neon Orbit Arcade into ../assets.
// Run from design/: npm install && npm run build
import { C, F, text, paragraph, label, svg, frame, arrow, key, write, r2, REDUCED } from './lib.mjs';

// Colours from sketch.js
const NEON = 'rgb(90,200,255)', NEON_IN = 'rgb(180,235,255)', ORB = 'rgb(80,170,255)', CORE = 'rgb(180,230,255)', PART = 'rgb(105,200,235)';

let seed = 21;
const rand = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + ((seed - 1) / 2147483646) * (b - a); };

// A portal with particles spiralling in. Animated with CSS rotation.
function portal(cx, cy, R, n, { dur = 14, dir = 1 } = {}) {
  let s = `<circle cx="${cx}" cy="${cy}" r="${R}" stroke="${NEON}" stroke-width="2" class="pulse" style="transform-origin:${cx}px ${cy}px"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r2(R * 0.6)}" stroke="${NEON_IN}" stroke-width="1.5" opacity=".6"/>`;
  let g = '';
  for (let i = 0; i < n; i++) {
    const t = rand(0, Math.PI * 2), rr = rand(R * 0.15, R * 1.05), len = rand(0.25, 0.6) * dir;
    const x1 = cx + rr * Math.cos(t), y1 = cy + rr * Math.sin(t);
    const rr2 = rr * 0.86, x2 = cx + rr2 * Math.cos(t + len), y2 = cy + rr2 * Math.sin(t + len);
    g += `<path d="M${r2(x1)} ${r2(y1)}Q${r2(cx + rr * 1.02 * Math.cos(t + len / 2))} ${r2(cy + rr * 1.02 * Math.sin(t + len / 2))} ${r2(x2)} ${r2(y2)}" stroke="${PART}" stroke-width="${r2(rand(1.5, 3.5))}" stroke-linecap="round" opacity="${r2(rand(0.25, 0.7))}"/>`;
    g += `<circle cx="${r2(x2)}" cy="${r2(y2)}" r="${r2(rand(1.2, 2.6))}" fill="${NEON_IN}" opacity=".9"/>`;
  }
  return s + `<g class="spin" style="transform-origin:${cx}px ${cy}px;animation-duration:${dur}s${dir < 0 ? ';animation-direction:reverse' : ''}">${g}</g>`;
}

const STYLE = `.spin{animation:spin linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.pulse{animation:pulse 3.4s ease-in-out infinite}@keyframes pulse{0%,100%{opacity:.65}50%{opacity:1}}
.ring{animation:ring 2.6s ease-out infinite}@keyframes ring{from{r:12px;opacity:.7}to{r:120px;opacity:0}}${REDUCED}`;

function stars(W, H, n) {
  let s = '';
  for (let i = 0; i < n; i++) s += `<circle cx="${r2(rand(10, W - 10))}" cy="${r2(rand(10, H - 10))}" r="${r2(rand(0.5, 1.5))}" fill="rgb(200,230,255)" opacity="${r2(rand(0.15, 0.5))}"/>`;
  return s;
}

function hero(H = 440, file = 'assets/hero.svg') {
  const W = 1280, dy = (H - 440) / 2;
  seed = 21;
  const ox = 1095, oy = 300 + dy;
  const body = frame(W, H) + `<g clip-path="url(#clip)">` + stars(W, H, 110) +
    portal(820, 205 + dy, 95, 46, { dur: 16 }) + portal(1010, 150 + dy, 62, 26, { dur: 11, dir: -1 }) +
    `<circle cx="${ox}" cy="${oy}" r="12" stroke="${NEON}" stroke-width="2" class="ring"/>` +
    `<circle cx="${ox}" cy="${oy}" r="12" stroke="${NEON}" stroke-width="2" class="ring" style="animation-delay:-1.3s"/>` +
    `<circle cx="${ox}" cy="${oy}" r="21" fill="${ORB}" opacity=".3"/><circle cx="${ox}" cy="${oy}" r="7" fill="${CORE}"/>` +
    `<circle cx="920" cy="${340 + dy}" r="46" stroke="rgb(255,170,90)" stroke-width="2" opacity=".85"/><circle cx="920" cy="${340 + dy}" r="28" stroke="rgb(255,220,170)" stroke-width="1.4" stroke-dasharray="5 6" opacity=".6"/>` + `</g>` +
    label('Creative code · p5.js · 2025', { x: 64, y: 118 + dy }) +
    text('Neon Orbit Arcade', { font: F.display, size: 62, x: 62, y: 190 + dy, fill: C.ink }) +
    paragraph('Your cursor becomes an orb. Holding the mouse leaves a trail of particles; clicks open portals that pull, push and swirl them. One key turns calm into chaos.', { x: 64, y: 240 + dy, width: 540, size: 19 }).svg +
    label('Move · Hold · Click · 1 Calm · 2 Chaos · 3 Nebula', { x: 64, y: 360 + dy, fill: C.accent2 });
  write(file, svg(W, H, body, {
    title: 'Neon Orbit Arcade',
    desc: 'Creative code in p5.js. A glowing orb sends out rings, and blue particles spiral into two portals over a field of stars.',
    style: STYLE, defs: `<clipPath id="clip"><rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="23"/></clipPath>`,
  }));
}

// How a portal moves a particle: pull toward the centre, turned by the swirl angle.
function portalAnatomy() {
  const W = 1280, H = 640;
  const cx = 330, cy = 350, R = 190;
  let b = frame(W, H);
  b += label('Anatomy of a portal', { x: 56, y: 64 }) + text('Pull, then turn', { font: F.display, size: 30, x: 56, y: 104, fill: C.ink });
  b += `<circle cx="${cx}" cy="${cy}" r="${R}" stroke="${NEON}" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="${R * 0.6}" stroke="${NEON_IN}" stroke-width="1.5" opacity=".6"/>`;
  b += `<circle cx="${cx}" cy="${cy}" r="4" fill="${C.ink}"/>`;
  b += text('radius 70–110 px', { font: F.mono, size: 13, x: cx + 8, y: cy + R + 26, fill: NEON, anchor: 'middle' });
  // particle
  const px = cx + 120, py = cy - 90;
  b += `<circle cx="${px}" cy="${py}" r="12" fill="${PART}" opacity=".25"/><circle cx="${px}" cy="${py}" r="5" fill="${NEON_IN}"/>`;
  // pull vector toward centre
  const dx = cx - px, dy = cy - py, m = Math.hypot(dx, dy);
  const L = 92, ux = dx / m, uy = dy / m;
  b += arrow(px, py, px + ux * L, py + uy * L, { stroke: C.ink2, width: 2, dash: '5 5' });
  b += text('pull', { font: F.mono, size: 13, x: px + ux * L * 0.5 + 12, y: py + uy * L * 0.5 + 22, fill: C.ink2 });
  // rotated pull
  const ang = 0.9, rx = ux * Math.cos(ang) - uy * Math.sin(ang), ry = ux * Math.sin(ang) + uy * Math.cos(ang);
  b += arrow(px, py, px + rx * L, py + ry * L, { stroke: C.accent2, width: 2.5 });
  b += text('turned by the swirl', { font: F.mono, size: 13, x: px + rx * L - 6, y: py + ry * L - 14, fill: C.accent2, anchor: 'end' });
  b += `<path d="M${r2(px + ux * 40)} ${r2(py + uy * 40)}A40 40 0 0 1 ${r2(px + rx * 40)} ${r2(py + ry * 40)}" stroke="${C.accent2}" stroke-width="1.5" opacity=".7"/>`;
  // spiral path suggestion
  let d = '';
  for (let i = 0; i <= 60; i++) { const t = i / 60, r = 170 - t * 150, a = -0.6 + t * 5.2; d += `${i ? 'L' : 'M'}${r2(cx + r * Math.cos(a))} ${r2(cy + r * Math.sin(a))}`; }
  b += `<path d="${d}" stroke="${PART}" stroke-width="1.5" opacity=".35" stroke-dasharray="2 5"/>`;

  const rows = [
    ['Inside the ring', 'Only particles closer than the portal’s radius feel it. Each portal draws its radius once, 70 to 110 px.', NEON],
    ['Pull', 'A nudge toward the centre that adds 0.22 to 0.38 px a frame to the particle’s speed, picked once per portal.', C.ink2],
    ['Swirl', 'Before it is added, the pull is turned by the portal’s phase plus frame × spin. Spin is up to ±0.018 a frame, so every portal circles its own way and speed.', C.accent2],
    ['Push portals', 'Amber, with a dashed inner ring. They push straight out from the centre, turned 0.5 rad to the side, and leave an empty eye.', 'rgb(255,170,90)'],
    ['Speed limit', 'After every force the particle’s speed is capped: 3.2 px a frame in Calm, 6.5 in Chaos, 4.5 in Nebula.', C.ice],
  ];
  let y = 150;
  for (const [k, v, col] of rows) {
    b += `<circle cx="672" cy="${y - 5}" r="4" fill="${col}"/>` + text(k, { font: F.mono, size: 14, x: 690, y, fill: col });
    const p = paragraph(v, { x: 690, y: y + 24, width: 530, size: 15 }); b += p.svg; y += 40 + p.height;
  }
  b += label('Up to six · drag to move · double-click to close', { x: 690, y: y + 6, fill: C.accent2, size: 11 });
  write('assets/portal.svg', svg(W, H, b, {
    title: 'Anatomy of a portal',
    desc: 'A portal pulls nearby particles toward its centre and turns that pull by a swirl angle, so they spiral in. Radius 70 to 110 pixels, pull 0.22 to 0.38, spin up to 0.018 a frame, speed capped at 3.2 in Calm and 6.5 in Chaos. Up to six portals.',
  }));
}

// Calm and Chaos side by side.
function modes() {
  const W = 1280, H = 360;
  let b = frame(W, H);
  const cols = [
    ['1', 'Calm', 'The default. Slow drift, long soft trails.', C.ice, C.rule, [['Particles per frame', '3'], ['Most particles', '900'], ['Particle speed', '0.6–1.8'], ['Particle life', '140–220 frames'], ['Ring every', '22 frames'], ['Trail wash', 'alpha 45']]],
    ['2', 'Chaos', 'Faster, denser, longer trails.', C.accent2, C.accent, [['Particles per frame', '8'], ['Most particles', '1,400'], ['Particle speed', '1.4–3.8'], ['Particle life', '90–160 frames'], ['Ring every', '10 frames'], ['Trail wash', 'alpha 25']]],
    ['3', 'Nebula', 'Rainbow bursts that glow where they overlap.', 'rgb(200,140,255)', 'rgb(170,120,255)', [['Particles per frame', '5'], ['Most particles', '1,200'], ['Particle speed', '0.9–2.6'], ['Particle life', '120–200 frames'], ['Ring every', '16 frames'], ['Trail wash', 'alpha 35']]],
  ];
  const gap = 20, cw = (W - 112 - 2 * gap) / 3;
  cols.forEach(([k, name, sub, ink, edge, rows], i) => {
    const x = 56 + i * (cw + gap);
    b += `<rect x="${r2(x)}" y="40" width="${r2(cw)}" height="${H - 80}" rx="16" fill="${C.paper2}" stroke="${edge}" stroke-opacity="${i ? 0.55 : 1}"/>`;
    b += key(k, x + 24, 66).svg + text(name, { font: F.display, size: 26, x: x + 70, y: 90, fill: C.ink });
    b += text(sub, { font: F.body, size: 13.5, x: x + 24, y: 128, fill: C.ink2 });
    rows.forEach(([a, v], j) => {
      const y = 170 + j * 25;
      b += text(a, { font: F.body, size: 13.5, x: x + 24, y, fill: C.muted });
      b += text(v, { font: F.mono, size: 13.5, x: x + cw - 24, y, fill: ink, anchor: 'end' });
    });
  });
  write('assets/modes.svg', svg(W, H, b, {
    title: 'Calm, Chaos and Nebula',
    desc: 'Calm, key 1: 3 particles per frame, up to 900, speed 0.6 to 1.8, life 140 to 220 frames, a ring every 22 frames, trail wash alpha 45. Chaos, key 2: 8 per frame, up to 1,400, speed 1.4 to 3.8, life 90 to 160 frames, a ring every 10 frames, wash alpha 25. Nebula, key 3: 5 per frame, up to 1,200, speed 0.9 to 2.6, life 120 to 200 frames, a ring every 16 frames, wash alpha 35, rainbow colours that add up where they overlap.',
  }));
}

hero(); hero(640, 'design/social.svg'); portalAnatomy(); modes();

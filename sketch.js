// Neon Orbit Arcade
// A glowing particle playground: the cursor becomes an orb, clicks open portals,
// and one key shifts the scene from calm to chaos.
// © Harvey Rayhanson (Harvey Chowdhury), rayhanson.tech. MTEC 1201 final project.
//
// Controls (keyboard, or the dock at the bottom of the screen)
//   Move the mouse        the orb follows and sends out soft rings
//   Hold the mouse        emit particles from the orb
//   Click / tap           open a portal (up to six)
//   Shift + click         open a push portal, whatever P is set to
//   Drag a portal         move it
//   Double-click a portal close it
//   1 / 2 / 3             Calm, Chaos or Nebula
//   P                     next portals pull (in) or push (out)
//   G                     orb gravity: the orb pulls particles along behind it
//   C                     clear particles and rings (portals stay)
//   R                     reset everything, portals included
//   Space                 pause or resume
//   H                     hide or show the guide
//   S                     save the canvas as a PNG
//
// Course concepts: loops, arrays and classes (Particle, Ring, Portal, Star).

// ---------------------------------------------------------------- settings

const MODES = {
  CALM: { name: 'Calm', emitRate: 3, ringInterval: 22, maxParticles: 900, trail: 45, speedLimit: 3.2 },
  CHAOS: { name: 'Chaos', emitRate: 8, ringInterval: 10, maxParticles: 1400, trail: 25, speedLimit: 6.5 },
  NEBULA: { name: 'Nebula', emitRate: 5, ringInterval: 16, maxParticles: 1200, trail: 35, speedLimit: 4.5 },
};
const MAX_PORTALS = 6;
const STAR_COUNT = 140;
const BACKGROUND = [5, 6, 10];
const GRAVITY_RADIUS = 260; // px: how far the orb's pull reaches
const GRAVITY_STRENGTH = 0.12;
const PUSH_SWIRL = 0.5; // radians a push portal's force is turned sideways
const GRAB_RADIUS = 0.6; // share of a portal's radius that grabs it for dragging
const STORAGE_KEY = 'neon-orbit-arcade:settings';

// ------------------------------------------------------------------- state

let particles = [];
let rings = [];
let portals = [];
let stars = [];

let mode = 'CALM';
let settings = MODES.CALM;
let portalKind = 'pull'; // what the next click opens: 'pull' or 'push'
let gravity = false;
let lastRingFrame = 0;
let paused = false;
let showGuide = true;
let reduceMotion = false;
let canvasEl;

// The orb only appears once the pointer has been over the canvas, so nothing
// is drawn in the top-left corner before the first move.
let pointerSeen = false;
let orbX = 0;
let orbY = 0;
let pressOnCanvas = false; // a press that began on the canvas (not on the dock)
let dragging = null; // the portal being moved, if any

// ------------------------------------------------------------------- p5 hooks

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvasEl = canvas.elt;
  canvasEl.setAttribute('role', 'img');
  canvasEl.setAttribute(
    'aria-label',
    'Neon Orbit Arcade: a glowing orb follows the pointer over a field of stars, leaving particles that swirl into portals.'
  );
  pixelDensity(min(2, displayDensity()));
  noCursor();
  noStroke();
  reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  makeStars();
  loadSettings();
  wireDock();
  syncDock();
  background(...BACKGROUND);
}

function draw() {
  // translucent wash: the lower the alpha, the longer the trails
  blendMode(BLEND);
  background(...BACKGROUND, settings.trail);

  trackPointer();

  // (loop) stars
  for (let i = 0; i < stars.length; i++) {
    if (!paused) stars[i].update();
    stars[i].display();
  }

  if (!paused && pointerSeen) {
    // soft rings on a timer (left out for people who ask for less motion)
    if (!reduceMotion && frameCount - lastRingFrame > settings.ringInterval) {
      rings.push(new Ring(orbX, orbY));
      lastRingFrame = frameCount;
    }

    // holding the mouse emits particles from the orb (not while moving a portal)
    if (mouseIsPressed && pressOnCanvas && !dragging) {
      for (let k = 0; k < settings.emitRate && particles.length < settings.maxParticles; k++) {
        particles.push(new Particle(orbX, orbY, mode));
      }
    }
  }

  for (let p = 0; p < portals.length; p++) portals[p].display();

  // Nebula's colours add up where particles overlap, so dense swirls glow
  if (mode === 'NEBULA') blendMode(ADD);

  // (loop) particles: pulled by every portal and by the orb, removed when they fade out
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    if (!paused) {
      for (let p = 0; p < portals.length; p++) portals[p].affect(pt);
      if (gravity && pointerSeen) orbPull(pt);
      pt.update();
    }
    pt.display();
    if (pt.isDead()) particles.splice(i, 1);
  }
  blendMode(BLEND);

  // (loop) rings
  for (let i = rings.length - 1; i >= 0; i--) {
    if (!paused) rings[i].update();
    rings[i].display();
    if (rings[i].isDead()) rings.splice(i, 1);
  }

  if (pointerSeen) drawOrb(orbX, orbY);
  updateGuide();
}

function mousePressed(event) {
  // presses on the dock or the guide are not part of the scene
  if (event && event.target !== canvasEl) return;
  if (!insideCanvas(mouseX, mouseY)) return;
  pressOnCanvas = true;
  pointerSeen = true;
  orbX = mouseX;
  orbY = mouseY;

  // pressing on an open portal grabs it instead of opening a new one
  const hit = portalAt(mouseX, mouseY);
  if (hit) {
    dragging = hit;
    return false;
  }

  const kind = keyIsDown(SHIFT) ? 'push' : portalKind;
  if (portals.length < MAX_PORTALS) {
    portals.push(new Portal(mouseX, mouseY, kind));
    rings.push(new Ring(mouseX, mouseY, true)); // a bigger ring marks the new portal
  } else {
    rings.push(new Ring(mouseX, mouseY, true, true)); // all six are open: a red ring says so
  }
  return false; // no scrolling or zooming on touch screens
}

function mouseReleased() {
  pressOnCanvas = false;
  dragging = null;
}

function mouseMoved() {
  pointerSeen = true;
}

function mouseDragged() {
  pointerSeen = true;
  if (dragging) {
    dragging.pos.set(constrain(mouseX, 0, width), constrain(mouseY, 0, height));
  }
  return pressOnCanvas ? false : undefined;
}

function doubleClicked(event) {
  if (event && event.target !== canvasEl) return;
  const hit = portalAt(mouseX, mouseY);
  if (hit) {
    portals.splice(portals.indexOf(hit), 1);
    rings.push(new Ring(hit.pos.x, hit.pos.y, true, true));
  }
  return false;
}

function keyPressed() {
  if (key === '1') setMode('CALM');
  else if (key === '2') setMode('CHAOS');
  else if (key === '3') setMode('NEBULA');
  else if (key === 'c' || key === 'C') clearParticles();
  else if (key === 'r' || key === 'R') fullReset();
  else if (key === 'p' || key === 'P') togglePortalKind();
  else if (key === 'g' || key === 'G') toggleGravity();
  else if (key === ' ') paused = !paused;
  else if (key === 'h' || key === 'H') setGuideVisible(!showGuide);
  else if (key === 's' || key === 'S') saveCanvas('neon-orbit-arcade', 'png');

  syncDock();
  if (key === ' ') return false; // keep Space from scrolling the page
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(...BACKGROUND);
  makeStars();
  for (const p of portals) p.pos.set(constrain(p.pos.x, 0, width), constrain(p.pos.y, 0, height));
}

// ------------------------------------------------------------------ actions

function setMode(name) {
  mode = name;
  settings = MODES[name];
  saveSettings();
}

function togglePortalKind() {
  portalKind = portalKind === 'pull' ? 'push' : 'pull';
  saveSettings();
}

function toggleGravity() {
  gravity = !gravity;
  saveSettings();
}

function clearParticles() {
  particles = [];
  rings = [];
}

function fullReset() {
  particles = [];
  rings = [];
  portals = [];
  paused = false;
  gravity = false;
  portalKind = 'pull';
  makeStars();
  setMode('CALM');
  background(...BACKGROUND);
}

// Mode, portal kind and orb gravity are kept between visits. Storage can be
// unavailable (private windows): then the sketch starts from the defaults.
function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, portalKind, gravity }));
  } catch (e) {
    /* storage unavailable */
  }
}

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!s) return;
    if (MODES[s.mode]) {
      mode = s.mode;
      settings = MODES[s.mode];
    }
    if (s.portalKind === 'push' || s.portalKind === 'pull') portalKind = s.portalKind;
    gravity = s.gravity === true;
  } catch (e) {
    /* storage unavailable or unreadable */
  }
}

// ------------------------------------------------------------------ helpers

function trackPointer() {
  // p5 reports touches through mouseX/mouseY too
  if (pointerSeen && insideCanvas(mouseX, mouseY)) {
    orbX = mouseX;
    orbY = mouseY;
  }
}

function insideCanvas(x, y) {
  return x >= 0 && y >= 0 && x <= width && y <= height;
}

// the portal whose inner ring contains (x, y), nearest first
function portalAt(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const p of portals) {
    const d = dist(x, y, p.pos.x, p.pos.y);
    if (d < p.radius * GRAB_RADIUS && d < bestD) {
      best = p;
      bestD = d;
    }
  }
  return best;
}

// Orb gravity: particles near the orb are drawn towards it, so they follow it around.
const orbForce = { x: 0, y: 0 };
function orbPull(pt) {
  const dx = orbX - pt.pos.x;
  const dy = orbY - pt.pos.y;
  const d2 = dx * dx + dy * dy;
  if (d2 > GRAVITY_RADIUS * GRAVITY_RADIUS || d2 < 1) return;
  const d = Math.sqrt(d2);
  const f = GRAVITY_STRENGTH * (1 - d / GRAVITY_RADIUS);
  orbForce.x = (dx / d) * f;
  orbForce.y = (dy / d) * f;
  pt.vel.x += orbForce.x;
  pt.vel.y += orbForce.y;
  pt.vel.limit(settings.speedLimit);
}

function drawOrb(x, y) {
  // outer glow; a ring around it while orb gravity is on
  fill(80, 170, 255, 55);
  circle(x, y, 42);
  if (gravity) {
    noFill();
    stroke(180, 230, 255, 70 + 40 * sin(frameCount * 0.08));
    strokeWeight(1.5);
    circle(x, y, 64);
    noStroke();
  }
  fill(180, 230, 255, 190); // core
  circle(x, y, 14);
}

function makeStars() {
  stars = [];
  for (let i = 0; i < STAR_COUNT; i++) stars.push(new Star(random(width), random(height)));
}

// Hue (0 to 360) to RGB, for Nebula.
function hueToRgb(h, s = 0.7, v = 1) {
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return 255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1)));
  };
  return [f(5), f(3), f(1)];
}

// ------------------------------------------------------------------- the dock

function wireDock() {
  const on = (id, fn) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', () => {
        fn();
        syncDock();
      });
    }
  };
  on('dock-calm', () => setMode('CALM'));
  on('dock-chaos', () => setMode('CHAOS'));
  on('dock-nebula', () => setMode('NEBULA'));
  on('dock-kind', togglePortalKind);
  on('dock-gravity', toggleGravity);
  on('dock-pause', () => {
    paused = !paused;
  });
  on('dock-clear', clearParticles);
  on('dock-reset', fullReset);
  on('dock-save', () => saveCanvas('neon-orbit-arcade', 'png'));
  on('dock-guide', () => setGuideVisible(!showGuide));
}

function syncDock() {
  const set = (id, text, pressed) => {
    const el = document.getElementById(id);
    if (!el) return;
    const span = el.querySelector('span');
    if (text != null && span && span.textContent !== text) span.textContent = text;
    if (pressed != null) el.setAttribute('aria-pressed', String(pressed));
  };
  set('dock-calm', null, mode === 'CALM');
  set('dock-chaos', null, mode === 'CHAOS');
  set('dock-nebula', null, mode === 'NEBULA');
  set('dock-kind', portalKind === 'pull' ? 'Pull portals' : 'Push portals', portalKind === 'push');
  set('dock-gravity', null, gravity);
  set('dock-pause', paused ? 'Play' : 'Pause', paused);
  set('dock-guide', null, showGuide);
}

// The guide is page text (see index.html), so it stays crisp and readable.
let statusEl;
function updateGuide() {
  statusEl = statusEl || document.getElementById('status');
  if (!statusEl || frameCount % 10 !== 0) return;
  statusEl.textContent =
    `${settings.name} · ${portals.length} / ${MAX_PORTALS} portals · ` +
    `${particles.length} / ${settings.maxParticles} particles · next portal ${portalKind}s` +
    (gravity ? ' · orb gravity' : '') +
    (paused ? ' · paused' : '');
  syncDock();
}

function setGuideVisible(visible) {
  showGuide = visible;
  const el = document.getElementById('guide');
  if (el) el.hidden = !visible;
}

// ------------------------------------------------------------------- classes

class Particle {
  constructor(x, y, modeName) {
    const calm = modeName === 'CALM';
    const chaos = modeName === 'CHAOS';
    this.pos = createVector(x, y);

    // Calm drifts gently; Chaos moves faster; Nebula sits between
    const spd = calm ? random(0.6, 1.8) : chaos ? random(1.4, 3.8) : random(0.9, 2.6);
    this.vel = p5.Vector.fromAngle(random(TWO_PI)).mult(spd);

    this.size = calm ? random(2, 5) : chaos ? random(2, 7) : random(2, 6);
    this.life = calm ? random(140, 220) : chaos ? random(90, 160) : random(120, 200);

    if (modeName === 'NEBULA') {
      // hues sweep slowly with time, so each burst has its own colour
      [this.r, this.g, this.b] = hueToRgb((frameCount * 1.5 + random(-60, 60) + 360) % 360);
      this.glow = [this.r, this.g, this.b];
    } else {
      // soft neon colour, kept as plain numbers (cheaper than a p5.Color each frame)
      this.r = random(80, 130);
      this.g = random(170, 235);
      this.b = random(210, 255);
      this.glow = [120, 200, 255];
    }

    // organic wiggle from Perlin noise
    this.wiggle = random(0.004, 0.02);
    this.seed = random(1000);
  }

  update() {
    const n = noise(this.seed + frameCount * this.wiggle);
    this.vel.rotate(map(n, 0, 1, -0.06, 0.06));
    this.pos.add(this.vel);
    this.life -= 1.3;

    // wrap around the edges to keep the canvas alive
    if (this.pos.x < -20) this.pos.x = width + 20;
    if (this.pos.x > width + 20) this.pos.x = -20;
    if (this.pos.y < -20) this.pos.y = height + 20;
    if (this.pos.y > height + 20) this.pos.y = -20;
  }

  display() {
    const a = map(this.life, 0, 220, 0, 170);
    fill(this.r, this.g, this.b, a);
    circle(this.pos.x, this.pos.y, this.size);
    fill(this.glow[0], this.glow[1], this.glow[2], a * 0.25); // faint glow
    circle(this.pos.x, this.pos.y, this.size * 2.2);
  }

  isDead() {
    return this.life <= 0;
  }
}

class Ring {
  constructor(x, y, big = false, warning = false) {
    this.x = x;
    this.y = y;
    this.r = big ? 18 : 10;
    this.grow = big ? 3.2 : 2.0;
    this.life = big ? 120 : 90;
    this.warning = warning;
  }

  update() {
    this.r += this.grow;
    this.life -= 2;
  }

  display() {
    const a = map(this.life, 0, 120, 0, 140);
    noFill();
    strokeWeight(2);
    if (this.warning) stroke(237, 74, 73, a);
    else stroke(120, 210, 255, a);
    circle(this.x, this.y, this.r);
    noStroke();
  }

  isDead() {
    return this.life <= 0;
  }
}

class Portal {
  constructor(x, y, kind = 'pull') {
    this.pos = createVector(x, y);
    this.kind = kind; // 'pull' swirls particles in; 'push' sends them out
    this.radius = random(70, 110);
    this.radiusSq = this.radius * this.radius;
    this.strength = random(0.22, 0.38);
    this.spin = random(-0.018, 0.018);
    this.phase = random(TWO_PI);
    this.pull = createVector(0, 0);
  }

  affect(particle) {
    // pull (or push) and swirl any particle inside the portal
    const dx = this.pos.x - particle.pos.x;
    const dy = this.pos.y - particle.pos.y;
    if (dx * dx + dy * dy < this.radiusSq) {
      if (this.kind === 'push') {
        // straight out from the centre, with a gentle sideways swirl
        this.pull.set(-dx, -dy).setMag(this.strength).rotate(this.spin > 0 ? PUSH_SWIRL : -PUSH_SWIRL);
      } else {
        // the original portal: a pull turned by the portal's phase and spin
        this.pull.set(dx, dy).setMag(this.strength);
        this.pull.rotate(this.phase + frameCount * this.spin); // the swirl
      }
      particle.vel.add(this.pull);
      particle.vel.limit(settings.speedLimit);
    }
  }

  display() {
    const pulse = 0.6 + 0.4 * sin(frameCount * 0.03 + this.phase);
    const a = 110 + 50 * pulse;
    const grabbed = dragging === this;
    noFill();
    strokeWeight(grabbed ? 3 : 2);
    if (this.kind === 'push') {
      // a warm "white hole": outer ring in amber, a dashed inner ring
      stroke(255, 170, 90, a);
      circle(this.pos.x, this.pos.y, this.radius * 2);
      stroke(255, 220, 170, a * 0.6);
      drawingContext.setLineDash([6, 8]);
      circle(this.pos.x, this.pos.y, this.radius * 1.2);
      drawingContext.setLineDash([]);
    } else {
      stroke(90, 200, 255, a);
      circle(this.pos.x, this.pos.y, this.radius * 2); // outer ring
      stroke(180, 235, 255, a * 0.6);
      circle(this.pos.x, this.pos.y, this.radius * 1.2); // inner ring
    }
    noStroke();
  }
}

class Star {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.base = random(0.6, 2.2);
    this.tw = random(0.01, 0.04);
    this.off = random(TWO_PI);
    this.speed = reduceMotion ? 0 : random(0.08, 0.35);
  }

  update() {
    // a slow fall, wrapping back to the top
    this.y += this.speed;
    if (this.y > height + 10) {
      this.y = -10;
      this.x = random(width);
    }
  }

  display() {
    const flicker = this.base + sin(frameCount * this.tw + this.off) * 0.8;
    fill(200, 230, 255, map(flicker, 0, 3, 40, 140));
    circle(this.x, this.y, max(0.4, flicker));
  }
}

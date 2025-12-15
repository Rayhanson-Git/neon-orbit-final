// MTEC 1201 Final Project
// Title: Neon Orbit Arcade
// By: Harvey Chowdhury

// Controls:
// - Move mouse: your orb follows
// - Hold mouse: emit calm particles
// - 1: Calm mode (default)
// - 2: Chaos modw
// - C: Clear all
// - R: Full reset (including portals)



let particles = [];  // ARRAY requirement
let rings = [];      
let portals = [];    
let stars = [];      

let mode = "CALM";   // "CALM" or "CHAOS"
let emitRate = 3;    // particles per frame
let maxParticles = 900;

let lastRingFrame = 0;
let ringInterval = 22;

function setup() {
  createCanvas(windowWidth, windowHeight);
  noCursor();

  // Calm background stars
  for (let i = 0; i < 140; i++) {
    stars.push(new Star(random(width), random(height)));
  }

  setCalmMode();
}

function draw() {
  // Calm trails
  background(5, 6, 10, mode === "CALM" ? 45 : 25);

  // LOOPS requirement (loops over arrays)
  for (let i = 0; i < stars.length; i++) {
    stars[i].update();
    stars[i].display();
  }

  // Soft ring on a timer
  if (frameCount - lastRingFrame > ringInterval) {
    rings.push(new Ring(mouseX, mouseY));
    lastRingFrame = frameCount;
  }

  // Emit particles mouse hold
  if (mouseIsPressed) {
    for (let k = 0; k < emitRate; k++) {
      if (particles.length < maxParticles) {
        particles.push(new Particle(mouseX, mouseY, mode));
      }
    }
  }

  // Portal forces to particles
  for (let p = 0; p < portals.length; p++) {
    portals[p].display();
  }

  // Refresh particles (loop)
  for (let i = particles.length - 1; i >= 0; i--) {
    
    for (let p = 0; p < portals.length; p++) {
      portals[p].affect(particles[i]);
    }

    particles[i].update();
    particles[i].display();

    if (particles[i].isDead()) {
      particles.splice(i, 1);
    }
  }

  // Update rings
  for (let i = rings.length - 1; i >= 0; i--) {
    rings[i].update();
    rings[i].display();

    if (rings[i].isDead()) {
      rings.splice(i, 1);
    }
  }

  // cursor
  drawOrb(mouseX, mouseY);

  // HUD text
  drawHUD();
}

function drawOrb(x, y) {
  push();
  noStroke();

  // outer ring glow
  fill(80, 170, 255, 55);
  circle(x, y, 42);

  // core
  fill(180, 230, 255, 190);
  circle(x, y, 14);

  pop();
}

function drawHUD() {
  push();
  noStroke();
  fill(190, 220, 255, 160);
  textSize(14);
  textAlign(LEFT, TOP);

  let line1 = "Neon Orbit Arcade  |  Mode: " + mode;
  let line2 = "Hold mouse: emit  |  Click: portal (max 6)  |  1 Calm  2 Chaos  C Clear  R Reset";
  text(line1, 16, 14);
  text(line2, 16, 34);

  pop();
}

function mousePressed() {
  // Place a portal on click
  if (portals.length < 6) {
    portals.push(new Portal(mouseX, mouseY));
    rings.push(new Ring(mouseX, mouseY, true)); // bigger ring on portal placement
  } else {
    // If max portals reached
    rings.push(new Ring(mouseX, mouseY, true));
  }
}

function keyPressed() {
  if (key === "1") {
    setCalmMode();
  } else if (key === "2") {
    setChaosMode();
  } else if (key === "c" || key === "C") {
    particles = [];
    rings = [];
  } else if (key === "r" || key === "R") {
    fullReset();
  }
}

function fullReset() {
  particles = [];
  rings = [];
  portals = [];
  stars = [];
  for (let i = 0; i < 140; i++) {
    stars.push(new Star(random(width), random(height)));
  }
  setCalmMode();
}

function setCalmMode() {
  mode = "CALM";
  emitRate = 3;
  ringInterval = 22;
  maxParticles = 900;
}

function setChaosMode() {
  mode = "CHAOS";
  emitRate = 8;
  ringInterval = 10;
  maxParticles = 1400;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}



class Particle {
  constructor(x, y, modeName) {
    this.pos = createVector(x, y);

    // calm: gentle drift movement, chaos: faster movement
    let spd = (modeName === "CALM") ? random(0.6, 1.8) : random(1.4, 3.8);
    let ang = random(TWO_PI);
    this.vel = p5.Vector.fromAngle(ang).mult(spd);

    this.size = (modeName === "CALM") ? random(2, 5) : random(2, 7);
    this.life = (modeName === "CALM") ? random(140, 220) : random(90, 160);

    // soft neon color
    this.col = color(
      random(80, 130),
      random(170, 235),
      random(210, 255),
      180
    );

    // tiny drift variation
    this.wiggle = random(0.004, 0.02);
    this.seed = random(1000);
  }

  update() {
    // noise-based wiggle, keeping motion organic smooth
    let n = noise(this.seed + frameCount * this.wiggle);
    let turn = map(n, 0, 1, -0.06, 0.06);

    this.vel.rotate(turn);
    this.pos.add(this.vel);

    // fade out
    this.life -= 1.3;

    // wrap edges to keep the canvas alive
    if (this.pos.x < -20) this.pos.x = width + 20;
    if (this.pos.x > width + 20) this.pos.x = -20;
    if (this.pos.y < -20) this.pos.y = height + 20;
    if (this.pos.y > height + 20) this.pos.y = -20;
  }

  display() {
    push();
    noStroke();

    let a = map(this.life, 0, 220, 0, 170);
    fill(red(this.col), green(this.col), blue(this.col), a);

    circle(this.pos.x, this.pos.y, this.size);

    // faint glow layer
    fill(120, 200, 255, a * 0.25);
    circle(this.pos.x, this.pos.y, this.size * 2.2);

    pop();
  }

  isDead() {
    return this.life <= 0;
  }
}

class Ring {
  constructor(x, y, big = false) {
    this.pos = createVector(x, y);
    this.r = big ? 18 : 10;
    this.grow = big ? 3.2 : 2.0;
    this.life = big ? 120 : 90;
  }

  update() {
    this.r += this.grow;
    this.life -= 2;
  }

  display() {
    push();
    noFill();
    strokeWeight(2);

    let a = map(this.life, 0, 120, 0, 140);
    stroke(120, 210, 255, a);
    circle(this.pos.x, this.pos.y, this.r);

    pop();
  }

  isDead() {
    return this.life <= 0;
  }
}

class Portal {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.radius = random(70, 110);
    this.strength = random(0.22, 0.38); // calm pull
    this.spin = random(-0.018, 0.018);
    this.phase = random(TWO_PI);
  }

  affect(particle) {
    // Pull + swirl any particle near the portal
    let d = dist(particle.pos.x, particle.pos.y, this.pos.x, this.pos.y);

    if (d < this.radius) {
      // pull toward center
      let dir = p5.Vector.sub(this.pos, particle.pos);
      dir.setMag(this.strength);

      // rotate the pull
      dir.rotate(this.phase + frameCount * this.spin);

      particle.vel.add(dir);

      // lock speed
      particle.vel.limit(mode === "CALM" ? 3.2 : 6.5);
    }
  }

  display() {
    push();
    noFill();

    // soft animated stroke
    let pulse = 0.6 + 0.4 * sin(frameCount * 0.03 + this.phase);
    let a = 110 + 50 * pulse;

    stroke(90, 200, 255, a);
    strokeWeight(2);

    // outer ring
    circle(this.pos.x, this.pos.y, this.radius * 2);

    // inner ring
    stroke(180, 235, 255, a * 0.6);
    circle(this.pos.x, this.pos.y, this.radius * 1.2);

    pop();
  }
}

class Star {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.base = random(0.6, 2.2);
    this.tw = random(0.01, 0.04);
    this.off = random(TWO_PI);
    this.speed = random(0.08, 0.35);
  }

  update() {
    // slight drift downward
    this.pos.y += this.speed;
    if (this.pos.y > height + 10) {
      this.pos.y = -10;
      this.pos.x = random(width);
    }
  }

  display() {
    push();
    noStroke();

    let flicker = this.base + sin(frameCount * this.tw + this.off) * 0.8;
    let a = map(flicker, 0, 3, 40, 140);

    fill(200, 230, 255, a);
    circle(this.pos.x, this.pos.y, max(0.4, flicker));

    pop();
  }
}

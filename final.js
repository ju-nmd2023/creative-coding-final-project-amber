/* Quantum Wave–Particle 
  Inspired by:
  - Sol LeWitt: conceptual rules, system, serial permutations (grid & instructions)
  - Marius Watz: complex generative noise-fields, dense particle ecosystems
  - Zach Lieberman: playful, direct interactivity & expressive visual feedback


  Interactions:
  - Mouse move: local field influence (like measurement)
  - Mouse drag: stronger attract/repel effect
  - Click: cycle current particle *shape* (circle, square, triangle, star)
  - Space: toggle mode Wave <-> Particle
  - Keys 1..4: preset visual parameter sets (nod to LeWitt-series)
  - S: save canvas
*/

let particles = [];
const N = 900; // particle count
let mode = "wave"; // 'wave' or 'particle' from https://www.youtube.com/watch?v=8rBsaJcpItI
let shapeIndex = 0;
let shapes = ["circle", "square", "triangle", "star"];
let t = 0;
let presets = [];
let curPreset = 0;

// Systematic grid hints (Sol LeWitt inspiration)
let gridCols = 60;
let gridRows = 40;

// (Tone.js) added for the grade 4
let synth;
let reverb;
let volume;
let audioEnabled = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 1);
  noStroke();

  // presets: each is a config (nod to LeWitt's serial systems)
  presets = [
    {
      hue: 42,
      sat: 85,
      bright: 70,
      speed: 0.8,
      noiseScale: 0.0014,
      particleSize: 3.0,
    },
    {
      hue: 200,
      sat: 70,
      bright: 85,
      speed: 1.2,
      noiseScale: 0.002,
      particleSize: 2.2,
    },
    {
      hue: 280,
      sat: 65,
      bright: 90,
      speed: 0.6,
      noiseScale: 0.001,
      particleSize: 3.8,
    },
    {
      hue: 30,
      sat: 90,
      bright: 95,
      speed: 1.5,
      noiseScale: 0.0026,
      particleSize: 1.8,
    },
  ];

  applyPreset(0);

  // Marius Watz style: dense particle cloud seeded by noise / distribution
  for (let i = 0; i < N; i++) {
    particles.push(new Particle());
  }
}

function setupSound() {
  // Create a simple synth with reverb effect
  reverb = new Tone.Reverb({
    decay: 3,
    wet: 0.4,
  }).toDestination();

  volume = new Tone.Volume(-12).connect(reverb);

  synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sine" },
    envelope: {
      attack: 0.05,
      decay: 0.2,
      sustain: 0.1,
      release: 0.8,
    },
  }).connect(volume);

  audioEnabled = true;
}

function draw() {
  // Futuristic dark backdrop, slight vignette using gradient rects
  background(230, 40, 6);
  push();
  for (let i = 0; i < 6; i++) {
    fill(
      (preset.hue + i * 6) % 360,
      preset.sat * 0.45,
      preset.bright * (0.95 - i * 0.08),
      0.03
    );
    rect(-100 - i * 60, -100 - i * 60, width + i * 120, height + i * 120);
  }
  pop();

  // grid of subtle energy nodes - nod to LeWitt's system grids
  drawSystemGrid();

  // Behavior: update particles using a perlin-noise flow field (Watz)
  for (let p of particles) {
    p.update();
    p.display();
  }

  // time + subtle motion (like quantum fluctuations)
  t += 0.005 * preset.speed;
  // small HUD pulse from https://editor.p5js.org/zekewattles/sketches/jWhGkTnIg
  drawHUD();
}

//  Particle
class Particle {
  constructor() {
    // position seeded across the canvas but biased by a subtle grid
    let gx = floor(random(gridCols));
    let gy = floor(random(gridRows));
    this.pos = createVector(
      map(gx + random(), 0, gridCols, 0, width),
      map(gy + random(), 0, gridRows, 0, height)
    );
    this.prev = this.pos.copy();
    // velocity tiny initially
    this.vel = p5.Vector.random2D().mult(0.2);
    this.size = preset.particleSize * random(0.7, 1.6);
    // personal phase for small unique motion (Zach Lieberman inspiration)
    this.phase = random(TWO_PI);
    this.life = random(100, 10000);
    this.seed = random(1000);
  }

  update() {
    // Flow from Perlin noise -> wave-like behavior
    let ns = preset.noiseScale;
    let angle =
      noise(this.pos.x * ns, this.pos.y * ns, t + this.seed) * TWO_PI * 2;
    let nvec = p5.Vector.fromAngle(angle); //https://p5js.org/reference/p5.Vector/fromAngle/

    // Mouse influence (measurement collapses wave-function locally)
    let m = createVector(mouseX, mouseY);
    let d = p5.Vector.dist(this.pos, m);
    let influence = 0;
    if (mouseIsPressed) {
      // drag -> stronger force (user measurements strongly change particle)https://editor.p5js.org/ogt/sketches/LySSseI5c
      influence = map(d, 0, width * 0.7, 1.0, 0);
      this.vel.add(p5.Vector.sub(m, this.pos).setMag(influence * 0.8));
    } else {
      // subtle attract/repel depending on mode
      influence = map(d, 0, width * 0.7, 1.0, 0);
      if (mode === "wave") {
        // wave mode: follow noise vector + slight oscillation
        let osc = p5.Vector.fromAngle(this.phase + t * 2).mult(0.4);
        this.vel.lerp(nvec.mult(preset.speed * 0.6).add(osc), 0.05);
      } else {
        // particle mode: more ballistic but subject to random jitter
        let jitter = p5.Vector.random2D().mult(0.5);
        this.vel.lerp(nvec.mult(preset.speed * 1.4).add(jitter), 0.06);
      }
    }

    // integrate
    this.prev.set(this.pos);
    this.pos.add(this.vel);

    // subtle boundary wrap with soft friction (keeps field continuous) used chatGPT to fix the numbers
    if (this.pos.x < -50) this.pos.x = width + 50;
    if (this.pos.x > width + 50) this.pos.x = -50;
    if (this.pos.y < -50) this.pos.y = height + 50;
    if (this.pos.y > height + 50) this.pos.y = -50;

    // evolve personal parameters
    this.phase += 0.01 * preset.speed;
    this.life -= 0.01;
  }

  display() {
    // color varies by local noise and preset hue warm golden tones by default
    let localHue =
      (preset.hue + noise(this.pos.x * 0.002, this.pos.y * 0.002, t) * 40) %
      360;
    let localSat = preset.sat;
    let localB = preset.bright;

    // alpha depends on mode and distance to mouse (Zach Lieberman-like expressive feedback)
    let d = dist(this.pos.x, this.pos.y, mouseX, mouseY);
    let alpha = map(d, 0, width * 0.7, 1.0, 0.12); //https://p5js.org/reference/p5.Color/setAlpha/
    alpha = constrain(alpha, 0.06, 1);

    fill(localHue, localSat, localB, alpha);

    // Draw either as a little streak (wave) or discrete shaped particle (particle)
    if (mode === "wave") {
      // draw a soft curved trail — not straight lines (user requested no straight lines)
      push();
      stroke(localHue, localSat, localB, alpha * 0.8);
      strokeWeight(this.size * 0.8);
      noFill();
      beginShape();
      // curved path using last position and current, with control influenced by noise https://www.youtube.com/watch?v=k49-ETawIMk
      curveVertex(
        this.prev.x + sin(t + this.seed) * 3,
        this.prev.y + cos(t + this.seed) * 3
      );
      curveVertex(this.prev.x, this.prev.y);
      curveVertex(this.pos.x, this.pos.y);
      curveVertex(
        this.pos.x + sin(-t + this.seed) * 3,
        this.pos.y + cos(-t + this.seed) * 3
      );
      endShape();
      pop();
    } else {
      // particle mode: morphing shapes (circle, square, triangle, star)
      push();
      translate(this.pos.x, this.pos.y);
      rotate(t + this.seed); // small rotation
      let s = this.size * 1.5;
      // shape morphing
      switch (shapes[shapeIndex]) {
        case "circle":
          noStroke();
          ellipse(0, 0, s, s);
          break;
        case "square":
          // rounded and slightly distorted square (no straight strictness) used chatGPT
          beginShape();
          for (let a = 0; a < TWO_PI; a += HALF_PI) {
            let rx = cos(a) * s * (1 + sin(t + this.seed + a) * 0.12);
            let ry = sin(a) * s * (1 + cos(t + this.seed + a) * 0.12);
            vertex(rx, ry);
          }
          endShape(CLOSE);
          break;
        case "triangle":
          beginShape();
          for (let a = -PI / 2; a < TWO_PI - PI / 2; a += TWO_PI / 3) {
            let rx = cos(a) * s * (1 + noise(a + this.seed) * 0.25);
            let ry = sin(a) * s * (1 + noise(a - this.seed) * 0.25);
            vertex(rx, ry);
          }
          endShape(CLOSE);
          break;
        case "star":
          beginShape();
          for (let a = 0; a < TWO_PI; a += PI / 5) {
            let r = a % ((PI * 2) / 10) === 0 ? s * 1.15 : s * 0.45;
            let rx = cos(a) * r * (1 + sin(t * 2 + this.seed + a) * 0.12);
            let ry = sin(a) * r * (1 + cos(t * 2 + this.seed + a) * 0.12);
            vertex(rx, ry);
          }
          endShape(CLOSE);
          break;
      }
      pop();
    }
  }
}

//System grid (LeWitt)
function drawSystemGrid() {
  // LeWitt: visible system of rules. This grid is subtle, made of soft arcs.
  push();
  let c = color((preset.hue + 60) % 360, preset.sat * 0.2, 12, 0.06);
  // a network of curved nodes rather than rigid straight lines
  strokeWeight(1);
  for (let gx = 0; gx <= gridCols; gx += 1) {
    for (let gy = 0; gy <= gridRows; gy += 1) {
      let x = map(gx, 0, gridCols, 50, width - 50);
      let y = map(gy, 0, gridRows, 50, height - 50);
      let offset = noise(gx * 0.06, gy * 0.06, t * 0.2) * 18 - 9;
      // soft radial arcs
      noFill();
      stroke((preset.hue + 10) % 360, preset.sat * 0.2, 55, 0.035);
      push();
      translate(x + sin(t * 0.2 + gx) * 6, y + cos(t * 0.2 + gy) * 6); // Used chatGPT
      // curved stroke instead of straight cross
      beginShape();
      for (let a = 0; a <= PI; a += PI / 16) {
        let r = 8 + sin(a * 3 + gx * 0.2 + gy * 0.2 + t) * 4;
        vertex(cos(a) * r + offset, sin(a) * r + offset);
      }
      endShape();
      pop();
    }
  }
  pop();
}

// inputs
function mousePressed() {
  // Initialize sound on first interaction
  if (!audioEnabled) {
    setupSound();
  }

  // cycle shapes on click (Zach Lieberman playful manipulation)
  shapeIndex = (shapeIndex + 1) % shapes.length;

  // Play a note when clicking (different notes for different shapes)
  if (audioEnabled && synth) {
    const notes = ["C4", "E4", "G4", "B4"];
    synth.triggerAttackRelease(notes[shapeIndex], "8n");
  }

  // small burst of local particle velocity
  for (let p of particles) {
    let d = dist(mouseX, mouseY, p.pos.x, p.pos.y);
    if (d < 140) {
      let pushVec = p5.Vector.sub(p.pos, createVector(mouseX, mouseY)).setMag(
        random(0.6, 2.2)
      );
      p.vel.add(pushVec);
    }
  }
}

function keyPressed() {
  if (key === " ") {
    // toggle wave/particle (conceptual duality)
    mode = mode === "wave" ? "particle" : "wave";

    // Play different note for mode switch
    if (audioEnabled && synth) {
      synth.triggerAttackRelease(mode === "wave" ? "A3" : "A4", "16n");
    }
  } else if (key === "s" || key === "S") {
    saveCanvas("quantum_duality", "png"); // gives people chance to save the art
  } else if (key >= "1" && key <= "4") {
    applyPreset(int(key) - 1);

    // Play chord for preset change
    if (audioEnabled && synth) {
      const chords = [
        ["C4", "E4", "G4"],
        ["D4", "F#4", "A4"],
        ["E4", "G#4", "B4"],
        ["F4", "A4", "C5"],
      ];
      synth.triggerAttackRelease(chords[int(key) - 1], "8n");
    }
  } else if (key === "r" || key === "R") {
    // reseed completely (autonomous evolution -- Nees)
    randomSeed(millis());
    noiseSeed(millis());
    for (let p of particles) {
      p.pos = createVector(random(width), random(height));
      p.vel = p5.Vector.random2D().mult(0.2);
    }

    // Play glissando effect for reseed
    if (audioEnabled && synth) {
      synth.triggerAttackRelease("C5", "16n");
    }
  }
}

function applyPreset(i) {
  curPreset = i;
  preset = Object.assign({}, presets[i]); //https://www.youtube.com/watch?v=JmGJUzNsGFs
  // subtle change to global parameters based on preset
  for (let p of particles) {
    p.size = preset.particleSize * random(0.7, 1.5);
  }
}

// HUD / label
function drawHUD() {
  push();
  fill(0, 0, 0, 0.35);
  noStroke();
  rect(10, height - 60, 320, 50, 8);
  fill((preset.hue + 10) % 360, preset.sat, preset.bright, 0.9);
  textSize(12);
  textAlign(LEFT, TOP);
  text(
    `Mode: ${mode.toUpperCase()}  •  Shape: ${shapes[shapeIndex]}  •  Preset: ${
      curPreset + 1
    }`,
    18,
    height - 50
  );
  fill(255, 255, 255, 0.85);
  textSize(11);
  text(
    "Controls: Click=cycle shape • Space=toggle • 1-4=preset • S=save • R=reseed",
    18,
    height - 34
  );
  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

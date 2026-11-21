// level.js — level layouts: cover, organelles, guard spawns, fragments, exit.
// One level is a single screen of cytoplasm, 1280 x 800. Cover blocks sight:
// membrane folds are rectangles, large organelles are circles, drifting
// organelles are moving circles the player can bind to for moving cover.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function nextRandom() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A drifting organelle: a rounded blob that slides across the cytoplasm and
// bounces softly off the arena bounds. Binding to one hides the player.
export function makeDrifter(def, rng) {
  return {
    x: def.x, y: def.y, r: def.r, kind: def.kind,
    vx: (rng() - 0.5) * def.speed, vy: (rng() - 0.5) * def.speed,
    phase: rng() * Math.PI * 2, wobble: 0.25 + rng() * 0.35,
  };
}

export function updateDrifter(d, dt) {
  d.phase += dt;
  d.x += d.vx * dt + Math.sin(d.phase * d.wobble) * 6 * dt;
  d.y += d.vy * dt + Math.cos(d.phase * d.wobble * 0.8) * 6 * dt;
  if (d.x < d.r + 24) { d.x = d.r + 24; d.vx = Math.abs(d.vx); }
  if (d.x > 1280 - d.r - 24) { d.x = 1280 - d.r - 24; d.vx = -Math.abs(d.vx); }
  if (d.y < d.r + 70) { d.y = d.r + 70; d.vy = Math.abs(d.vy); }
  if (d.y > 800 - d.r - 24) { d.y = 800 - d.r - 24; d.vy = -Math.abs(d.vy); }
}

// Cover rectangles: {x, y, w, h} membrane folds. Static organelles: circles.
// Guards: {x, y, waypoints: [[x,y],...], phase} patrol loops.
// Fragments: [x, y] plasmid shards, optional collectibles.
// Exit: {x, y} the nuclear pore. Spawn: [x, y]. Route: safe waypoints
// the self-test autopilot follows from spawn to exit.
export const LEVELS = [
  {
    name: "LEVEL 1 — FIRST INFILTRATION",
    hint: "Slip past the patrols. Cones breathe: strong, then weak. Dash in the weak beat.",
    spawn: [90, 700],
    exit: { x: 1180, y: 110 },
    cover: [
      { x: 210, y: 470, w: 150, h: 34 },
      { x: 430, y: 560, w: 34, h: 150 },
      { x: 560, y: 300, w: 170, h: 34 },
      { x: 830, y: 470, w: 34, h: 170 },
      { x: 950, y: 210, w: 170, h: 34 },
      { x: 300, y: 130, w: 34, h: 150 },
    ],
    staticOrganelles: [
      { x: 640, y: 620, r: 62, kind: "nucleus-bit" },
      { x: 1010, y: 620, r: 52, kind: "golgi" },
      { x: 220, y: 300, r: 48, kind: "vacuole" },
    ],
    drifters: [
      { x: 420, y: 380, r: 46, kind: "mitochondrion", speed: 26 },
      { x: 900, y: 330, r: 42, kind: "mitochondrion", speed: 22 },
    ],
    guards: [
      { x: 480, y: 240, waypoints: [[480, 240], [760, 240], [760, 430], [480, 430]], phase: 0.0 },
      { x: 900, y: 560, waypoints: [[900, 560], [1080, 560], [1080, 330], [900, 330]], phase: 1.2 },
    ],
    fragments: [[350, 640], [700, 150], [1150, 420]],
    // Safe route: every point sits in a cone shadow or behind cover, so a
    // patient player (and the self-test autopilot) can walk it without
    // ever being forced through a strong cone. Points steer around the
    // membrane folds with room to spare — none sits inside cover or in a
    // corner trap the slide movement cannot escape.
    route: [[90, 700], [150, 520], [180, 430], [330, 440], [470, 380], [640, 380], [780, 360], [900, 280], [900, 160], [1180, 110]],
  },
  {
    name: "LEVEL 2 — THE CROWDED CYTOPLASM",
    hint: "Three patrols now. Bind to a drifting mitochondrion (SPACE) and ride it through the cones.",
    spawn: [80, 110],
    exit: { x: 1190, y: 700 },
    cover: [
      { x: 220, y: 200, w: 34, h: 170 },
      { x: 420, y: 90, w: 170, h: 34 },
      { x: 560, y: 330, w: 34, h: 170 },
      { x: 760, y: 130, w: 150, h: 34 },
      { x: 900, y: 380, w: 34, h: 170 },
      { x: 180, y: 560, w: 170, h: 34 },
      { x: 620, y: 620, w: 170, h: 34 },
      { x: 1040, y: 130, w: 34, h: 150 },
    ],
    staticOrganelles: [
      { x: 460, y: 470, r: 58, kind: "golgi" },
      { x: 1080, y: 480, r: 54, kind: "vacuole" },
      { x: 300, y: 700, r: 50, kind: "nucleus-bit" },
    ],
    drifters: [
      { x: 300, y: 330, r: 44, kind: "mitochondrion", speed: 30 },
      { x: 700, y: 250, r: 48, kind: "mitochondrion", speed: 26 },
      { x: 950, y: 620, r: 40, kind: "mitochondrion", speed: 34 },
    ],
    guards: [
      { x: 350, y: 180, waypoints: [[350, 180], [640, 180], [640, 380], [350, 380]], phase: 0.4 },
      { x: 820, y: 300, waypoints: [[820, 300], [1020, 300], [1020, 540], [820, 540]], phase: 1.6 },
      { x: 500, y: 650, waypoints: [[500, 650], [820, 650], [820, 480], [500, 480]], phase: 0.9 },
    ],
    fragments: [[620, 90], [150, 420], [1150, 250]],
    route: [[80, 110], [150, 300], [300, 460], [470, 560], [700, 560], [900, 620], [1080, 700], [1190, 700]],
  },
  {
    name: "LEVEL 3 — NUCLEAR APPROACH",
    hint: "The pore is ringed by patrols. Watch the pulse, spend ATP only when it counts.",
    spawn: [640, 720],
    exit: { x: 640, y: 90 },
    cover: [
      { x: 180, y: 520, w: 170, h: 34 },
      { x: 930, y: 520, w: 170, h: 34 },
      { x: 300, y: 300, w: 34, h: 150 },
      { x: 946, y: 300, w: 34, h: 150 },
      { x: 560, y: 420, w: 160, h: 34 },
      { x: 180, y: 130, w: 150, h: 34 },
      { x: 950, y: 130, w: 150, h: 34 },
    ],
    staticOrganelles: [
      { x: 640, y: 280, r: 56, kind: "golgi" },
      { x: 200, y: 380, r: 50, kind: "vacuole" },
      { x: 1080, y: 380, r: 50, kind: "nucleus-bit" },
    ],
    drifters: [
      { x: 420, y: 580, r: 46, kind: "mitochondrion", speed: 28 },
      { x: 860, y: 580, r: 46, kind: "mitochondrion", speed: 28 },
      { x: 640, y: 470, r: 40, kind: "mitochondrion", speed: 24 },
    ],
    guards: [
      { x: 380, y: 220, waypoints: [[380, 220], [560, 220], [560, 380], [380, 380]], phase: 0.0 },
      { x: 900, y: 220, waypoints: [[900, 220], [720, 220], [720, 380], [900, 380]], phase: 1.3 },
      { x: 300, y: 620, waypoints: [[300, 620], [640, 620], [640, 480], [300, 480]], phase: 0.7 },
      { x: 980, y: 620, waypoints: [[980, 620], [640, 620], [640, 480], [980, 480]], phase: 1.9 },
    ],
    fragments: [[150, 250], [1130, 250], [640, 540]],
    route: [[640, 720], [420, 640], [250, 520], [250, 380], [420, 300], [560, 240], [640, 160], [640, 90]],
  },
];

// Build a live level instance from a definition: fresh guard state,
// drifting organelles with seeded motion, uncollected fragments.
export function buildLevel(index, seed) {
  const def = LEVELS[index];
  const rng = mulberry32(seed + index * 101);
  return {
    index,
    def,
    drifters: def.drifters.map((d) => makeDrifter(d, rng)),
    guards: def.guards.map((g) => ({
      x: g.x, y: g.y, waypoints: g.waypoints, wp: 0, phase: g.phase,
      angle: 0, speed: 62, state: "patrol",
      lastSeen: null, investigateTimer: 0, unseenTimer: 0,
      flash: 0, turnTimer: 0,
    })),
    fragments: def.fragments.map(([x, y]) => ({ x, y, taken: false })),
    speckles: Array.from({ length: 260 }, () => ({
      x: rng() * 1280, y: 70 + rng() * 720, r: 1 + rng() * 2.6, a: 0.05 + rng() * 0.16,
    })),
  };
}

// player.js — the plasmid packet: movement, sprint, ATP, binding to organelles.
// The player is a small glowing capsule sneaking through the cytoplasm.

export const PLAYER_R = 13;
export const WALK_SPEED = 175;
export const SPRINT_SPEED = 285;
export const ATP_MAX = 100;
export const SPRINT_DRAIN = 22;
export const BIND_DRAIN = 7;
export const ATP_REGEN_IDLE = 15;
export const ATP_REGEN_WALK = 7;

export function createPlayer(spawn) {
  return {
    x: spawn[0], y: spawn[1],
    vx: 0, vy: 0,
    angle: -Math.PI / 2,
    atp: ATP_MAX,
    bound: null,          // drifter object we are riding, or null
    moving: false,
    sprinting: false,
    stepPhase: 0,         // footstep cycle for ripples + sound
    rippleTimer: 0,
    ripples: [],          // {x, y, age} footstep rings
    clickTarget: null,    // [x, y] mouse destination, or null
  };
}

function clampToArena(p) {
  p.x = Math.max(20, Math.min(1260, p.x));
  p.y = Math.max(76, Math.min(780, p.y));
}

function hitsCover(x, y, level) {
  for (const c of level.def.cover) {
    if (x > c.x - PLAYER_R * 0.6 && x < c.x + c.w + PLAYER_R * 0.6 &&
        y > c.y - PLAYER_R * 0.6 && y < c.y + c.h + PLAYER_R * 0.6) return true;
  }
  for (const o of level.def.staticOrganelles) {
    const dx = x - o.x, dy = y - o.y;
    if (dx * dx + dy * dy < (o.r + PLAYER_R * 0.5) * (o.r + PLAYER_R * 0.5)) return true;
  }
  return false;
}

// Try to move by (dx, dy); slide along cover instead of sticking to it.
export function tryMove(p, dx, dy, level) {
  if (!hitsCover(p.x + dx, p.y, level)) p.x += dx;
  if (!hitsCover(p.x, p.y + dy, level)) p.y += dy;
  clampToArena(p);
}

export function nearestDrifter(p, level, maxDist) {
  let best = null, bestD = maxDist;
  for (const d of level.drifters) {
    const dx = d.x - p.x, dy = d.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy) - d.r;
    if (dist < bestD) { bestD = dist; best = d; }
  }
  return best;
}

// SPACE: bind to a nearby drifting organelle (molecular camouflage) or unbind.
export function toggleBind(p, level, audio) {
  if (p.bound) {
    p.bound = null;
    if (audio) audio.blip(520, 0.09, "sine", 0.12);
    return "unbound";
  }
  const d = nearestDrifter(p, level, 34);
  if (d && p.atp > 12) {
    p.bound = d;
    if (audio) audio.blip(340, 0.12, "sine", 0.14);
    return "bound";
  }
  if (audio) audio.blip(160, 0.07, "square", 0.06);
  return "none";
}

export function updatePlayer(p, input, level, dt, audio) {
  // Riding a drifter: we are carried along, hidden, draining ATP.
  if (p.bound) {
    const d = p.bound;
    p.x = d.x; p.y = d.y;
    p.atp -= BIND_DRAIN * dt;
    if (p.atp <= 0) { p.atp = 0; p.bound = null; if (audio) audio.blip(180, 0.1, "square", 0.08); }
    p.moving = true;
    p.stepPhase += dt * 2;
    return;
  }

  let mx = 0, my = 0;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  // Click-to-move: steer toward the clicked point when no keys are held.
  if (mx === 0 && my === 0 && p.clickTarget) {
    const dx = p.clickTarget[0] - p.x, dy = p.clickTarget[1] - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 10) { p.clickTarget = null; }
    else { mx = dx / dist; my = dy / dist; }
  }
  const mag = Math.sqrt(mx * mx + my * my);
  if (mag > 0) { mx /= mag; my /= mag; }

  const wantSprint = input.sprint && p.atp > 0.5 && mag > 0;
  const speed = wantSprint ? SPRINT_SPEED : WALK_SPEED;
  p.sprinting = wantSprint;
  // Asking to sprint on an empty tank gets a soft "no" blip, once per press.
  if (input.sprint && p.atp <= 0.5 && mag > 0 && !p._exhaustedPing) {
    p._exhaustedPing = true;
    if (audio) audio.blip(140, 0.08, "square", 0.05);
  }
  if (p.atp > 20) p._exhaustedPing = false;
  p.moving = mag > 0;
  if (p.moving) {
    p.angle = Math.atan2(my, mx);
    tryMove(p, mx * speed * dt, my * speed * dt, level);
    p.stepPhase += dt * (wantSprint ? 11 : 7);
    p.rippleTimer -= dt;
    if (p.rippleTimer <= 0) {
      p.rippleTimer = wantSprint ? 0.22 : 0.34;
      p.ripples.push({ x: p.x, y: p.y, age: 0 });
      if (p.ripples.length > 14) p.ripples.shift();
      if (audio) audio.footstep(wantSprint);
    }
  }
  for (const r of p.ripples) r.age += dt;
  p.ripples = p.ripples.filter((r) => r.age < 0.9);

  // ATP: sprint drains, standing still regenerates fastest.
  if (wantSprint) p.atp -= SPRINT_DRAIN * dt;
  else if (!p.moving) p.atp += ATP_REGEN_IDLE * dt;
  else p.atp += ATP_REGEN_WALK * dt;
  if (p.atp > ATP_MAX) p.atp = ATP_MAX;
  if (p.atp < 0) p.atp = 0;
}

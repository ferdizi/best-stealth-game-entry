// guards.js — macrophage patrol cells: waypoint patrols, pulse-cycle vision
// cones, line-of-sight blocked by cover, guard memory, and a detection meter
// with grace so the player can always recover from a near-miss.

export const CONE_HALF_ANGLE = 0.62;   // radians either side of facing
export const CONE_RANGE_STRONG = 235;
export const CONE_RANGE_WEAK = 128;
export const PULSE_CYCLE = 2.5;        // seconds: 1.5 strong, 1.0 weak
export const PULSE_STRONG = 1.5;
export const DETECT_RISE_STRONG = 58;  // meter per second while seen, strong
export const DETECT_RISE_WEAK = 26;
export const DETECT_DECAY = 30;
export const ALERT_CHASE_SPEED = 152;
export const CATCH_DIST = 30;

// Where in the pulse cycle is this guard right now? Returns "strong" or "weak".
export function pulseState(guard, time) {
  const phase = (time + guard.phase) % PULSE_CYCLE;
  return phase < PULSE_STRONG ? "strong" : "weak";
}

export function coneRange(guard, time) {
  return pulseState(guard, time) === "strong" ? CONE_RANGE_STRONG : CONE_RANGE_WEAK;
}

function segmentHitsRect(x1, y1, x2, y2, r) {
  // Slab test: does segment (x1,y1)-(x2,y2) cross rectangle r?
  const dx = x2 - x1, dy = y2 - y1;
  let tmin = 0, tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx, t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy, t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

function segmentHitsCircle(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((cx - x1) * dx + (cy - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = x1 + t * dx - cx, py = y1 + t * dy - cy;
  return px * px + py * py < r * r;
}

// True when cover stands between the guard and the target point.
export function lineBlocked(gx, gy, tx, ty, level) {
  for (const c of level.def.cover) {
    if (segmentHitsRect(gx, gy, tx, ty, c)) return true;
  }
  for (const o of level.def.staticOrganelles) {
    if (segmentHitsCircle(gx, gy, tx, ty, o.x, o.y, o.r * 0.92)) return true;
  }
  for (const d of level.drifters) {
    if (segmentHitsCircle(gx, gy, tx, ty, d.x, d.y, d.r * 0.92)) return true;
  }
  return false;
}

// Is the player inside this guard's vision cone right now (range, angle, LOS)?
// A bound player is camouflaged: never visible inside an organelle.
export function guardSeesPlayer(guard, player, level, time) {
  if (player.bound) return false;
  const dx = player.x - guard.x, dy = player.y - guard.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > coneRange(guard, time)) return false;
  let diff = Math.atan2(dy, dx) - guard.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > CONE_HALF_ANGLE) return false;
  if (lineBlocked(guard.x, guard.y, player.x, player.y, level)) return false;
  return true;
}

// Move a guard toward (tx, ty) at speed, facing the direction of travel.
function stepToward(guard, tx, ty, speed, dt) {
  const dx = tx - guard.x, dy = ty - guard.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  guard.angle = Math.atan2(dy, dx);
  return dist - step < 4;
}

// One guard tick. Returns "spotted" on the frame the meter first hits 100,
// "caught" when an alerted guard touches the player, else null.
// game is the shared state: { detection, time, audio, ... } for meter + sound.
export function updateGuard(guard, player, level, game, dt) {
  const time = game.time;
  const seen = guardSeesPlayer(guard, player, level, time);
  guard.flash = Math.max(0, guard.flash - dt * 2.2);

  if (seen) {
    guard.lastSeen = { x: player.x, y: player.y };
    guard.unseenTimer = 0;
    const rise = pulseState(guard, time) === "strong" ? DETECT_RISE_STRONG : DETECT_RISE_WEAK;
    const before = game.detection;
    game.detection = Math.min(100, game.detection + rise * dt);
    // Near-miss: crossing 70 makes the guard snap toward the player and flash.
    if (before < 70 && game.detection >= 70) {
      guard.flash = 1;
      guard.angle = Math.atan2(player.y - guard.y, player.x - guard.x);
      if (game.audio) game.audio.alarmBlip();
    }
    if (game.detection >= 100 && guard.state !== "alert") {
      guard.state = "alert";
      guard.alertTimer = 0;
      if (game.audio) game.audio.alarm();
      return "spotted";
    }
  } else {
    guard.unseenTimer += dt;
    game.detection = Math.max(0, game.detection - DETECT_DECAY * dt);
  }

  if (guard.state === "alert") {
    // Chase the last-seen position; give up after 5 s without a sighting.
    guard.alertTimer = (guard.alertTimer || 0) + dt;
    const target = guard.lastSeen || { x: guard.x, y: guard.y };
    stepToward(guard, target.x, target.y, ALERT_CHASE_SPEED, dt);
    const dx = player.x - guard.x, dy = player.y - guard.y;
    if (!player.bound && Math.sqrt(dx * dx + dy * dy) < CATCH_DIST) return "caught";
    if (guard.unseenTimer > 5) {
      guard.state = "patrol";
      guard.alertTimer = 0;
      game.detection = 0;
    }
    return null;
  }

  if (guard.state === "investigate") {
    guard.investigateTimer -= dt;
    const arrived = stepToward(guard, guard.lastSeen.x, guard.lastSeen.y, 118, dt);
    if (arrived || guard.investigateTimer <= 0) {
      guard.turnTimer = 1.1; // look around before resuming the patrol
      guard.state = "patrol";
    }
    return null;
  }

  // Patrol: walk the waypoint loop, pausing to look around at each corner.
  if (guard.turnTimer > 0) {
    guard.turnTimer -= dt;
    guard.angle += dt * 1.4;
    return null;
  }
  const wp = guard.waypoints[guard.wp];
  const arrived = stepToward(guard, wp[0], wp[1], guard.speed, dt);
  if (arrived) {
    guard.wp = (guard.wp + 1) % guard.waypoints.length;
    guard.turnTimer = 0.7;
  }
  return null;
}

// A guard that just lost the player at high meter walks over to double-check
// the last-seen spot instead of instantly forgetting.
export function maybeInvestigate(guard, game) {
  if (guard.state === "patrol" && game.detection >= 55 && guard.lastSeen) {
    guard.state = "investigate";
    guard.investigateTimer = 4;
    guard.flash = 0.5; // the guard visibly perks up as it walks over to check
  }
}

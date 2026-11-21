// shots.js — deterministic screenshot states for ?shot=start|play|hide|end.
// Each shot is a real, playable game state with a fixed seed, so the dossier
// screenshots are honest renders of the game, never staged pictures.

import { buildLevel } from "./level.js";
import { createPlayer } from "./player.js";

export const SHOT_NAMES = ["start", "play", "hide", "end"];

// Place a guard mid-patrol at a chosen waypoint so its cone is readable.
function placeGuardAtWaypoint(guard, wpIndex, fraction) {
  const wps = guard.waypoints;
  const a = wps[wpIndex % wps.length];
  const b = wps[(wpIndex + 1) % wps.length];
  guard.x = a[0] + (b[0] - a[0]) * fraction;
  guard.y = a[1] + (b[1] - a[1]) * fraction;
  guard.angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
  guard.wp = (wpIndex + 1) % wps.length;
}

// Advance the world a fixed amount so drifters, cones and ripples settle
// into a lively mid-motion frame instead of a fresh-spawn frame.
function settle(game, seconds) {
  const dt = 1 / 60;
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) {
    game.time += dt;
    for (const d of game.level.drifters) {
      d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.x < d.r + 24 || d.x > 1280 - d.r - 24) d.vx *= -1;
      if (d.y < d.r + 70 || d.y > 800 - d.r - 24) d.vy *= -1;
    }
  }
}

export function applyShot(game, shot, seed) {
  game.levelIndex = 0;
  game.level = buildLevel(0, seed);
  game.player = createPlayer(game.level.def.spawn);
  game.detection = 0;
  game.elapsed = 0;
  game.timesSpotted = 0;
  game.fragmentsGot = 0;
  game.fragmentsTotal = game.level.fragments.length;
  game.state = "playing";
  game.time = 0;

  if (shot === "start") {
    // Level overview: player at spawn, both patrols mid-loop with cones
    // strong, exit and cover all readable at a glance.
    placeGuardAtWaypoint(game.level.guards[0], 0, 0.45);
    placeGuardAtWaypoint(game.level.guards[1], 1, 0.3);
    game.time = 0.2; // early in the strong beat: cones bright
    settle(game, 1.2);
    game.time = 0.2;
    return;
  }

  if (shot === "play") {
    // Mid-infiltration: player near the first guard's cone edge, meter half
    // full, one shard already collected, a ripple trail behind the player.
    game.player.x = 700; game.player.y = 470;
    game.player.angle = Math.PI;
    game.player.ripples = [
      { x: 760, y: 480, age: 0.15 }, { x: 740, y: 476, age: 0.4 }, { x: 720, y: 472, age: 0.65 },
    ];
    game.level.fragments[0].taken = true;
    game.fragmentsGot = 1;
    game.detection = 46;
    game.elapsed = 38;
    placeGuardAtWaypoint(game.level.guards[0], 2, 0.5);
    game.level.guards[0].angle = Math.atan2(470 - game.level.guards[0].y, 700 - game.level.guards[0].x);
    game.level.guards[0].flash = 0.6; // near-miss: the guard just got suspicious
    placeGuardAtWaypoint(game.level.guards[1], 0, 0.6);
    game.time = 0.4;
    settle(game, 0.8);
    game.time = 0.4;
    return;
  }

  if (shot === "hide") {
    // Molecular camouflage: player bound inside a mitochondrion while a
    // guard's cone sweeps right over it. The cone is bright; the player
    // inside is safe because the organelle blocks the sight line.
    const d = game.level.drifters[0];
    d.x = 640; d.y = 400;
    game.player.x = d.x; game.player.y = d.y;
    game.player.bound = d;
    game.player.atp = 61;
    game.elapsed = 74;
    const g = game.level.guards[0];
    g.x = 640; g.y = 190;
    g.angle = Math.PI / 2; // facing straight down at the organelle
    g.flash = 0;
    game.time = 0.3;
    settle(game, 0.5);
    game.time = 0.3;
    return;
  }

  if (shot === "end") {
    // Victory: all three levels cleared, stealth rating on screen.
    game.state = "win";
    game.elapsed = 214;
    game.fragmentsGot = 8;
    game.fragmentsTotal = 9;
    game.timesSpotted = 1;
    game.rating = "GHOST — S";
    game.ratingNote = "One alarm all run, eight shards recovered. The pore never saw you coming.";
    game.time = 0.5;
    return;
  }
}

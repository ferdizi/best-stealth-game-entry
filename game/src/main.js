// main.js — bootstrap, game loop, state machine (title / playing /
// levelclear / win / lose), and the ?selftest=1 headless play-test that
// proves the game is winnable with real mechanics, not a scripted cutscene.

import { LEVELS, buildLevel, updateDrifter } from "./level.js";
import { createPlayer, updatePlayer, toggleBind, tryMove, WALK_SPEED } from "./player.js";
import { updateGuard, maybeInvestigate, guardSeesPlayer } from "./guards.js";
import { render } from "./render.js";
import { createAudio } from "./audio.js";
import { createInput } from "./input.js";
import { applyShot } from "./shots.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const params = new URLSearchParams(window.location.search);
const seed = parseInt(params.get("seed") || "20261122", 10) || 20261122;

const audio = createAudio();

const game = {
  state: "title",       // title | playing | levelclear | win | lose | paused
  levelIndex: 0,
  level: buildLevel(0, seed),
  player: null,
  time: 0,
  elapsed: 0,
  detection: 0,
  timesSpotted: 0,
  fragmentsGot: 0,
  fragmentsTotal: 0,
  rating: "",
  ratingNote: "",
  audio,
};
game.player = createPlayer(game.level.def.spawn);
game.fragmentsTotal = game.level.fragments.length;
window.__game = game;

const input = createInput(canvas, (code) => {
  audio.ensure();
  if (code === "click" && game.state === "title") startRun();
  if (code === "click" && game.state === "levelclear") {
    loadLevel(game.levelIndex + 1);
    game.state = "playing";
  }
});

function startRun() {
  game.levelIndex = 0;
  game.timesSpotted = 0;
  game.fragmentsGot = 0;
  game.elapsed = 0;
  loadLevel(0);
  game.state = "playing";
}

function loadLevel(index) {
  game.levelIndex = index;
  game.level = buildLevel(index, seed);
  game.player = createPlayer(game.level.def.spawn);
  game.detection = 0;
  game.fragmentsTotal = game.level.fragments.length;
}

function computeRating() {
  const frag = game.fragmentsGot;
  if (game.timesSpotted === 0 && frag >= 7) return ["GHOST — S", "Never spotted once. The cell never knew you were there."];
  if (game.timesSpotted <= 1 && frag >= 5) return ["SHADOW — A", "One alarm at most, and a fat haul of plasmid shards."];
  if (game.timesSpotted <= 3) return ["SNEAK — B", "Seen a few times, but you always slipped away."];
  return ["LOUD — C", "You got in — but the macrophages will remember your face."];
}

function checkExit() {
  const exit = game.level.def.exit;
  const dx = game.player.x - exit.x, dy = game.player.y - exit.y;
  if (Math.sqrt(dx * dx + dy * dy) > 36) return false;
  if (game.levelIndex >= LEVELS.length - 1) {
    const [rating, note] = computeRating();
    game.rating = rating; game.ratingNote = note;
    game.state = "win";
    audio.win();
  } else {
    game.state = "levelclear";
    audio.levelClear();
  }
  return true;
}

function update(dt) {
  game.time += dt;
  for (const d of game.level.drifters) updateDrifter(d, dt);

  if (game.state === "title") return;
  if (game.state !== "playing") return;

  game.elapsed += dt;

  // Input actions, consumed once per press.
  if (input.pressed.has("bind")) {
    toggleBind(game.player, game.level, audio);
    input.pressed.delete("bind");
  }
  if (input.pressed.has("mute")) {
    audio.muted = !audio.muted;
    input.pressed.delete("mute");
  }
  if (input.pressed.has("restart")) {
    startRun();
    input.pressed.delete("restart");
    return;
  }
  if (input.pressed.has("pause")) {
    game.state = "paused";
    input.pressed.delete("pause");
    return;
  }
  if (input.clicked) {
    game.player.clickTarget = [input.clickX, input.clickY];
    input.clicked = false;
  }

  updatePlayer(game.player, input, game.level, dt, audio);

  // Bind-ready chime: a drifter in reach plays once until the player moves on.
  if (!game.player.bound && game.player.atp > 12) {
    const near = game.level.drifters.some((d) => {
      const dx = d.x - game.player.x, dy = d.y - game.player.y;
      return Math.sqrt(dx * dx + dy * dy) - d.r < 34;
    });
    if (near && !game._bindChimed) { game._bindChimed = true; audio.bindReady(); }
    if (!near) game._bindChimed = false;
  }

  let caught = false;
  for (const guard of game.level.guards) {
    const result = updateGuard(guard, game.player, game.level, game, dt);
    if (result === "spotted") game.timesSpotted++;
    if (result === "caught") caught = true;
    // A guard that lost the player at high meter walks over to double-check.
    if (guard.state === "patrol" && game.detection >= 55 && guard.unseenTimer > 0.5) {
      maybeInvestigate(guard, game);
    }
  }
  if (caught) {
    game.state = "lose";
    audio.lose();
    return;
  }

  // Guard proximity sound: footsteps in the dark tell you where they are.
  let nearest = Infinity;
  for (const g of game.level.guards) {
    const dx = g.x - game.player.x, dy = g.y - game.player.y;
    nearest = Math.min(nearest, Math.sqrt(dx * dx + dy * dy));
  }
  audio.guardProximity(nearest, dt);

  // Plasmid shards: optional collectibles.
  for (const f of game.level.fragments) {
    if (f.taken) continue;
    const dx = f.x - game.player.x, dy = f.y - game.player.y;
    if (Math.sqrt(dx * dx + dy * dy) < 28) {
      f.taken = true;
      game.fragmentsGot++;
      audio.collect();
    }
  }

  checkExit();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (game.state === "paused" && input.pressed.has("pause")) {
    game.state = "playing";
    input.pressed.delete("pause");
  }
  if ((game.state === "title" || game.state === "levelclear") && input.pressed.has("start")) {
    input.pressed.delete("start");
    if (game.state === "title") startRun();
    else { loadLevel(game.levelIndex + 1); game.state = "playing"; }
  }
  if ((game.state === "win" || game.state === "lose") && input.pressed.has("restart")) {
    input.pressed.delete("restart");
    startRun();
  }

  update(dt);
  render(ctx, game);
  requestAnimationFrame(frame);
}

// Deterministic screenshot states: ?shot=start|play|hide|end&seed=1
const shot = params.get("shot");
if (shot) {
  applyShot(game, shot, seed);
  // No update() here on purpose: applyShot places every guard, cone and
  // the player exactly where the shot needs them, and a patrol tick would
  // swing the guards toward their next waypoint and spoil the framing.
  // The frame loop below only advances time so cones breathe as rendered.
  requestAnimationFrame(function shotFrame() {
    game.time += 1 / 60;
    render(ctx, game);
    requestAnimationFrame(shotFrame);
  });
} else {
  requestAnimationFrame(frame);
}

// ---- Headless self-test: ?selftest=1 ----
// Plays level 1 for real through the same update functions the player uses:
// bind camouflage, detection rise + 5-second recovery, and an autopilot
// that walks the route to the nuclear pore. Results go to the console,
// document.title, and the #selftest box (readable by --dump-dom).
if (params.get("selftest") === "1") {
  runSelfTest();
}

function logTest(lines, text) {
  lines.push(text);
  console.log("[selftest] " + text);
}

function runSelfTest() {
  const lines = [];
  const box = document.getElementById("selftest");
  box.style.display = "block";
  const dt = 1 / 60;
  let pass = true;

  function stepWorld(steps) {
    for (let i = 0; i < steps; i++) {
      game.time += dt;
      for (const d of game.level.drifters) updateDrifter(d, dt);
      for (const guard of game.level.guards) {
        updateGuard(guard, game.player, game.level, game, dt);
      }
    }
  }

  try {
    // Test 1 — Molecular camouflage: bind next to a drifter, stay hidden.
    loadLevel(0);
    game.state = "playing";
    game.audio = null;
    const drifter = game.level.drifters[0];
    game.player.x = drifter.x + drifter.r + 8;
    game.player.y = drifter.y;
    const bindResult = toggleBind(game.player, game.level, null);
    const boundOk = bindResult === "bound" && game.player.bound === drifter;
    logTest(lines, `bind: result=${bindResult} bound=${boundOk ? "YES" : "NO"}`);
    if (!boundOk) pass = false;
    // A bound player is invisible even standing in a cone.
    const guard0 = game.level.guards[0];
    guard0.x = game.player.x; guard0.y = game.player.y - 100;
    guard0.angle = Math.PI / 2;
    game.time = 0;
    stepWorld(60);
    const hiddenOk = game.detection < 1;
    logTest(lines, `bind-hidden: detection=${game.detection.toFixed(1)} (must stay < 1) ${hiddenOk ? "OK" : "FAIL"}`);
    if (!hiddenOk) pass = false;

    // Test 2 — Detection rises in a strong cone, then recovers after 5 s out.
    // The test guard holds still facing the player: pin its position and
    // angle every step, since patrol corners make guards look around.
    loadLevel(0);
    game.state = "playing";
    game.time = 0;
    const g = game.level.guards[0];
    g.x = 400; g.y = 200; g.angle = 0; g.state = "patrol"; g.wp = 0;
    g.waypoints = [[400, 200], [401, 200]]; // hold position for the test
    game.player.x = 520; game.player.y = 200; // dead ahead, 120 px, in range
    game.player.bound = null;
    for (let i = 0; i < 84; i++) { // 1.4 s of strong cone
      game.time += dt;
      g.x = 400; g.y = 200; g.angle = 0;
      updateGuard(g, game.player, game.level, game, dt);
    }
    const rose = game.detection > 50;
    logTest(lines, `detection-rise: meter=${game.detection.toFixed(1)} (must be > 50) ${rose ? "OK" : "FAIL"}`);
    if (!rose) pass = false;
    // Break line of sight behind the membrane fold at (560,300).
    game.player.x = 640; game.player.y = 340;
    stepWorld(360); // 6 s unseen
    const recovered = game.detection < 10 && g.state === "patrol";
    logTest(lines, `detection-recovery: meter=${game.detection.toFixed(1)} guard=${g.state} ${recovered ? "OK" : "FAIL"}`);
    if (!recovered) pass = false;

    // Test 3 — Autopilot walks the safe route to the pore and wins level 1.
    loadLevel(0);
    game.state = "playing";
    game.time = 0;
    game.detection = 0;
    const route = game.level.def.route;
    let target = 1;
    let won = false;
    let caught = false;
    const maxSteps = 60 * 240; // 240 s of simulated time
    for (let i = 0; i < maxSteps; i++) {
      game.time += dt;
      for (const d of game.level.drifters) updateDrifter(d, dt);
      const seen = game.level.guards.some((gd) => guardSeesPlayer(gd, game.player, game.level, game.time));
      const alerted = game.level.guards.some((gd) => gd.state === "alert");
      const danger = seen || game.detection > 25 || alerted;
      if (!danger) {
        const [tx, ty] = route[target];
        const dx = tx - game.player.x, dy = ty - game.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 18) {
          if (target >= route.length - 1) { won = true; break; }
          target++;
        } else {
          tryMove(game.player, (dx / dist) * WALK_SPEED * dt, (dy / dist) * WALK_SPEED * dt, game.level);
        }
      } else if (target > 1) {
        // Retreat one route point back toward safe ground while the meter cools.
        const [tx, ty] = route[target - 1];
        const dx = tx - game.player.x, dy = ty - game.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 14) {
          tryMove(game.player, (dx / dist) * WALK_SPEED * dt, (dy / dist) * WALK_SPEED * dt, game.level);
        }
      }
      for (const guard of game.level.guards) {
        const result = updateGuard(guard, game.player, game.level, game, dt);
        if (result === "caught") { caught = true; break; }
      }
      if (caught) break;
      const exit = game.level.def.exit;
      const edx = game.player.x - exit.x, edy = game.player.y - exit.y;
      if (Math.sqrt(edx * edx + edy * edy) < 36) { won = true; break; }
    }
    logTest(lines, `autopilot-win-level-1: won=${won} caught=${caught} simTime=${(game.time).toFixed(0)}s ${won && !caught ? "OK" : "FAIL"}`);
    if (!won || caught) pass = false;

    logTest(lines, pass ? "SELFTEST:PASS" : "SELFTEST:FAIL");
  } catch (err) {
    logTest(lines, "SELFTEST:ERROR " + err.message);
    pass = false;
  }
  document.title = pass ? "SELFTEST:PASS" : "SELFTEST:FAIL";
  box.textContent = lines.join("\n");
}

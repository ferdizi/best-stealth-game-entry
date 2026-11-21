// render.js — canvas drawing: cytoplasm floor, lighting, vision cones,
// guards, organelles, player, exit, fragments, HUD, and title/win/lose screens.
// Lit ground is dangerous ground: bright cones mean "seen", dark means safe.

import { pulseState, coneRange, CONE_HALF_ANGLE } from "./guards.js";

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCone(ctx, guard, time, detection) {
  const strong = pulseState(guard, time) === "strong";
  const range = coneRange(guard, time);
  const hot = guard.state === "alert";
  const alpha = hot ? 0.55 : strong ? 0.42 : 0.20;
  const color = hot ? "255,64,64" : strong ? "255,176,66" : "255,196,110";
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.arc(guard.x, guard.y, range, guard.angle - CONE_HALF_ANGLE, guard.angle + CONE_HALF_ANGLE);
  ctx.closePath();
  ctx.fillStyle = `rgba(${color},${alpha})`;
  ctx.fill();
  // Hard bright edge so the cone reads as a cone, never as decoration.
  ctx.strokeStyle = `rgba(${color},${strong || hot ? 0.85 : 0.45})`;
  ctx.lineWidth = 2;
  ctx.stroke();
  if (guard.flash > 0) {
    ctx.fillStyle = `rgba(255,80,80,${guard.flash * 0.35})`;
    ctx.fill();
  }
  ctx.restore();
}

function drawOrganelle(ctx, x, y, r, kind, time, phase) {
  const wob = 1 + Math.sin(time * 0.7 + phase) * 0.03;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(wob, 1 / wob);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  if (kind === "mitochondrion") {
    g.addColorStop(0, "#7a4a8f"); g.addColorStop(0.7, "#4a2560"); g.addColorStop(1, "#2c1540");
  } else if (kind === "golgi") {
    g.addColorStop(0, "#3f6d8f"); g.addColorStop(0.7, "#274a66"); g.addColorStop(1, "#162c40");
  } else if (kind === "vacuole") {
    g.addColorStop(0, "#4a7d6e"); g.addColorStop(0.7, "#2c5348"); g.addColorStop(1, "#17302a");
  } else {
    g.addColorStop(0, "#5a5a9e"); g.addColorStop(0.7, "#38386a"); g.addColorStop(1, "#20204a");
  }
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(190,170,255,0.5)"; ctx.lineWidth = 2.5; ctx.stroke();
  // Inner folds give each blob a readable organelle texture.
  ctx.strokeStyle = "rgba(220,200,255,0.28)"; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55, 0.4, 2.4);
  ctx.arc(0, 0, r * 0.3, 3.4, 5.4);
  ctx.stroke();
  ctx.restore();
}

function drawGuard(ctx, guard, time) {
  const alert = guard.state === "alert";
  const inv = guard.state === "investigate";
  // Pale body with a dark rim: guards stay visible against the floor.
  ctx.save();
  const g = ctx.createRadialGradient(guard.x - 6, guard.y - 8, 4, guard.x, guard.y, 26);
  g.addColorStop(0, alert ? "#ffd9d9" : "#f2ecff");
  g.addColorStop(1, alert ? "#d98a8a" : "#b9a8e8");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(guard.x, guard.y, 22, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alert ? "#ff4444" : "#5a4a8a"; ctx.lineWidth = 3; ctx.stroke();
  // Facing tick + eyes so the patrol direction is obvious.
  const fx = Math.cos(guard.angle), fy = Math.sin(guard.angle);
  ctx.strokeStyle = alert ? "#c02020" : "#3a2a6a"; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(guard.x + fx * 14, guard.y + fy * 14);
  ctx.lineTo(guard.x + fx * 30, guard.y + fy * 30);
  ctx.stroke();
  const px = -fy, py = fx;
  ctx.fillStyle = "#241a44";
  ctx.beginPath(); ctx.arc(guard.x + fx * 8 + px * 7, guard.y + fy * 8 + py * 7, 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(guard.x + fx * 8 - px * 7, guard.y + fy * 8 - py * 7, 3.4, 0, Math.PI * 2); ctx.fill();
  if (inv || alert) {
    ctx.fillStyle = alert ? "#ff3333" : "#ffb020";
    ctx.font = "bold 20px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(alert ? "!" : "?", guard.x, guard.y - 32);
  }
  ctx.restore();
}

function drawPlayer(ctx, player, time) {
  if (player.bound) {
    // Bound: tucked inside the organelle, a small cyan glint + ring.
    ctx.save();
    ctx.strokeStyle = "rgba(90,240,255,0.9)"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(player.x, player.y, 12, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#aefcff";
    ctx.beginPath(); ctx.arc(player.x, player.y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(174,252,255,0.95)";
    ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("HIDDEN", player.x, player.y - player.bound.r - 8);
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.shadowColor = "#37e6ff"; ctx.shadowBlur = 18;
  const g = ctx.createLinearGradient(player.x - 12, player.y - 12, player.x + 12, player.y + 12);
  g.addColorStop(0, "#b8fbff"); g.addColorStop(0.5, "#37d5f5"); g.addColorStop(1, "#0e7ea8");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(player.x, player.y, 13, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#e8fdff"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(player.x, player.y, 13, 0, Math.PI * 2); ctx.stroke();
  // Direction nose.
  ctx.fillStyle = "#e8fdff";
  ctx.beginPath();
  ctx.arc(player.x + Math.cos(player.angle) * 10, player.y + Math.sin(player.angle) * 10, 3.5, 0, Math.PI * 2);
  ctx.fill();
  // Footstep ripples.
  for (const r of player.ripples) {
    ctx.strokeStyle = `rgba(90,230,255,${0.5 * (1 - r.age / 0.9)})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(r.x, r.y, 8 + r.age * 26, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawExit(ctx, exit, time) {
  const pulse = 1 + Math.sin(time * 2.4) * 0.08;
  ctx.save();
  ctx.shadowColor = "#ffd76a"; ctx.shadowBlur = 26;
  ctx.strokeStyle = "#ffe9a8"; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(exit.x, exit.y, 34 * pulse, 0, Math.PI * 2); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,190,80,0.75)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(exit.x, exit.y, 24 * pulse, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#fff3cf";
  ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center";
  ctx.fillText("NUCLEAR PORE", exit.x, exit.y - 46);
  ctx.restore();
}

function drawHUD(ctx, game) {
  const { player, level } = game;
  ctx.save();
  ctx.fillStyle = "rgba(8,5,26,0.82)";
  ctx.fillRect(0, 0, 1280, 56);
  ctx.strokeStyle = "rgba(150,130,255,0.35)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 56); ctx.lineTo(1280, 56); ctx.stroke();

  ctx.fillStyle = "#cfc4ff"; ctx.font = "bold 17px sans-serif"; ctx.textAlign = "left";
  ctx.fillText(level.def.name, 18, 24);
  ctx.fillStyle = "#8f83c9"; ctx.font = "13px sans-serif";
  ctx.fillText(level.def.hint, 18, 44);

  // ATP bar.
  ctx.fillStyle = "#8f83c9"; ctx.font = "bold 13px sans-serif";
  ctx.fillText("ATP", 560, 24);
  ctx.fillStyle = "#1c1440"; roundRect(ctx, 600, 12, 170, 16, 8); ctx.fill();
  const atpW = 170 * (player.atp / 100);
  ctx.fillStyle = player.atp < 25 ? "#ff7a5c" : "#37d5f5";
  if (atpW > 0) { roundRect(ctx, 600, 12, atpW, 16, 8); ctx.fill(); }

  // Detection meter.
  ctx.fillStyle = game.detection >= 70 ? "#ff6a5e" : "#8f83c9";
  ctx.fillText("SEEN", 790, 24);
  ctx.fillStyle = "#1c1440"; roundRect(ctx, 840, 12, 170, 16, 8); ctx.fill();
  const detW = 170 * (game.detection / 100);
  ctx.fillStyle = game.detection >= 70 ? "#ff4444" : game.detection > 0 ? "#ffb020" : "#3a2a6a";
  if (detW > 0) { roundRect(ctx, 840, 12, detW, 16, 8); ctx.fill(); }

  // Fragments, timer, level pips.
  const got = level.fragments.filter((f) => f.taken).length;
  ctx.fillStyle = "#ff9ad5"; ctx.font = "bold 15px sans-serif"; ctx.textAlign = "left";
  ctx.fillText(`◆ ${got}/${level.fragments.length}`, 1030, 26);
  ctx.fillStyle = "#cfc4ff";
  ctx.fillText(`⏱ ${Math.floor(game.elapsed)}s`, 1100, 26);
  ctx.fillStyle = "#8f83c9"; ctx.font = "13px sans-serif";
  ctx.fillText(`LEVEL ${game.levelIndex + 1}/3`, 1180, 26);

  // Context hint line at the bottom.
  ctx.fillStyle = "rgba(207,196,255,0.75)"; ctx.font = "13px sans-serif"; ctx.textAlign = "center";
  let hint = "WASD / arrows move · SHIFT sprint · SPACE bind to an organelle · R restart · M mute";
  if (player.bound) hint = "CAMOUFLAGED — riding the organelle. Guards cannot see you. SPACE to unbind.";
  else if (game.detection >= 70) hint = "SPOTTED! Break line of sight — stay unseen for 5s and the patrol calms down.";
  else if (game.detection > 0) hint = "A guard is getting suspicious — slip behind cover.";
  ctx.fillText(hint, 640, 786);
  ctx.restore();
}

function drawOverlay(ctx, title, lines, accent) {
  ctx.save();
  ctx.fillStyle = "rgba(5,3,18,0.72)";
  ctx.fillRect(0, 0, 1280, 800);
  ctx.fillStyle = accent; ctx.font = "bold 54px sans-serif"; ctx.textAlign = "center";
  ctx.fillText(title, 640, 300);
  ctx.fillStyle = "#ddd5ff"; ctx.font = "20px sans-serif";
  lines.forEach((line, i) => ctx.fillText(line, 640, 360 + i * 34));
  ctx.restore();
}

export function render(ctx, game) {
  const { level, player, time } = game;
  // Cytoplasm floor: deep blue-violet gradient + speckles for depth.
  const floor = ctx.createRadialGradient(640, 400, 80, 640, 400, 900);
  floor.addColorStop(0, "#171036"); floor.addColorStop(0.6, "#0e0a28"); floor.addColorStop(1, "#070512");
  ctx.fillStyle = floor;
  ctx.fillRect(0, 0, 1280, 800);
  for (const s of level.speckles) {
    ctx.fillStyle = `rgba(140,120,255,${s.a})`;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
  }

  // Membrane folds: static cover, readable at a glance.
  for (const c of level.def.cover) {
    ctx.fillStyle = "#241a52";
    roundRect(ctx, c.x, c.y, c.w, c.h, 14); ctx.fill();
    ctx.strokeStyle = "rgba(190,170,255,0.55)"; ctx.lineWidth = 2.5;
    roundRect(ctx, c.x, c.y, c.w, c.h, 14); ctx.stroke();
    ctx.fillStyle = "rgba(190,170,255,0.25)";
    ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
    if (c.w > c.h) ctx.fillText("MEMBRANE FOLD", c.x + c.w / 2, c.y + c.h / 2 + 4);
  }

  // Static organelles (cover) then drifting organelles (moving cover).
  for (const o of level.def.staticOrganelles) drawOrganelle(ctx, o.x, o.y, o.r, o.kind, time, 0);
  for (const d of level.drifters) {
    drawOrganelle(ctx, d.x, d.y, d.r, d.kind, time, d.phase);
    ctx.fillStyle = "rgba(220,200,255,0.7)"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("MITOCHONDRION", d.x, d.y + d.r + 16);
  }

  // Fragments: optional plasmid shards.
  for (const f of level.fragments) {
    if (f.taken) continue;
    const bob = Math.sin(time * 3 + f.x) * 3;
    ctx.save();
    ctx.translate(f.x, f.y + bob);
    ctx.rotate(Math.PI / 4);
    ctx.shadowColor = "#ff5fc8"; ctx.shadowBlur = 12;
    ctx.fillStyle = "#ff8ad8";
    ctx.fillRect(-7, -7, 14, 14);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#ffd7f2"; ctx.lineWidth = 2; ctx.strokeRect(-7, -7, 14, 14);
    ctx.restore();
  }

  drawExit(ctx, level.def.exit, time);

  // Vision cones first (lighting), then the guards standing in them.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const g of level.guards) drawCone(ctx, g, time, game.detection);
  ctx.restore();
  for (const g of level.guards) drawGuard(ctx, g, time);

  drawPlayer(ctx, player, time);

  // Darkness vignette: the edges stay dark so lit cones read as danger.
  const vig = ctx.createRadialGradient(640, 400, 300, 640, 400, 780);
  vig.addColorStop(0, "rgba(0,0,0,0)"); vig.addColorStop(1, "rgba(0,0,0,0.42)");
  ctx.fillStyle = vig; ctx.fillRect(0, 0, 1280, 800);

  if (game.state === "playing" || game.state === "paused") drawHUD(ctx, game);

  if (game.state === "title") {
    drawOverlay(ctx, "NEUROSPLICE", [
      "A cell-level heist. You are a plasmid packet sneaking to the nuclear pore.",
      "Vision cones breathe: strong, then weak. Dash through in the weak beat.",
      "SPACE binds you to a drifting organelle — moving cover. SHIFT sprints on ATP.",
      "Reach the glowing pore unseen. Collect plasmid shards for a better rating.",
      "Press ENTER or click to begin",
    ], "#5ff0ff");
  } else if (game.state === "win") {
    drawOverlay(ctx, "INFILTRATION COMPLETE", [
      `Stealth rating: ${game.rating}   ·   Time: ${Math.floor(game.elapsed)}s`,
      `Plasmid shards: ${game.fragmentsGot}/${game.fragmentsTotal}   ·   Times spotted: ${game.timesSpotted}`,
      game.ratingNote,
      "Press R to run it again",
    ], "#7dff9a");
  } else if (game.state === "lose") {
    drawOverlay(ctx, "CAUGHT", [
      "A macrophage closed in while the alarm was up.",
      "Break line of sight sooner — and remember, a 5-second breather calms the patrol.",
      "Press R to try again",
    ], "#ff6a5e");
  } else if (game.state === "levelclear") {
    drawOverlay(ctx, "PORE REACHED — UNSEEN", [
      "The packet slips through. One membrane down.",
      "Press ENTER for the next level",
    ], "#7dff9a");
  }
}

# NeuroSplice — Cell-Level Heist

[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/c/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/ferdizi/best-stealth-game-entry/rank.svg)](https://make.fun/c/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/ferdizi/best-stealth-game-entry/reward.svg)](https://make.fun/c/best-stealth-game-20261121-1759)

A top-down 2D stealth game set inside a living cell. You are a small glowing
plasmid packet sneaking through the cytoplasm to the nuclear pore, past
macrophage patrol cells with breathing vision cones.

## How to play

- **Move:** WASD / arrow keys, or click anywhere to walk there.
- **Sprint:** hold Shift. Sprinting drains ATP fast.
- **Bind (molecular camouflage):** press Space near a drifting mitochondrion
  to bind to it — you are hidden and carried along as moving cover. Press
  Space again to unbind. Binding drains ATP.
- **ATP:** standing still regenerates it fastest. At 0 ATP you can only walk.
- **Vision cones breathe:** each guard's cone is strong for ~1.5 s, then weak
  for ~1 s. Dash through in the weak beat. Cones stop at cover — membrane
  folds and large organelles block line of sight.
- **Detection is a meter, not a switch:** being seen fills it; breaking line
  of sight drains it. If it fills, the guard remembers where it saw you,
  fast-marches over, and re-checks. Stay unseen for 5 s and the patrol
  calms down — you always get a chance to recover.
- **Objective:** reach the glowing nuclear pore unseen. Collect the 3 plasmid
  shards per level for a better stealth rating. 3 levels, then a rating
  screen (Ghost / Shadow / Sneak / Loud).
- **Restart:** R. **Mute:** M. **Pause:** Esc.

## Run it

Serve `game/` with any static server (for example `node serve.ts`, then open
`http://localhost:8080`) and play in desktop Chrome. No network needed: all
art is code-drawn canvas, all sound is synthesized WebAudio.

## Files

- `game/index.html` — page shell, 1280×800 canvas
- `game/src/main.js` — bootstrap, game loop, state machine, self-test
- `game/src/level.js` — level layouts, cover, organelles, guard spawns
- `game/src/player.js` — movement, sprint, ATP, bind/unbind
- `game/src/guards.js` — patrols, pulse-cycle cones, line of sight, detection
- `game/src/render.js` — canvas drawing, lighting, cones, HUD, screens
- `game/src/audio.js` — synthesized WebAudio footsteps and alarms
- `game/src/input.js` — keyboard + mouse
- `game/src/shots.js` — deterministic screenshot states (`?shot=`)
- `main.ts` — entry program that builds `/output` with `dossier.json`

// input.js — keyboard (WASD / arrows + Shift sprint + Space bind) and mouse
// (click-to-move). Edge-triggered actions (bind, restart, mute, start) fire
// once per key press through the `pressed` set the main loop consumes.

export function createInput(canvas, onAction) {
  const input = {
    left: false, right: false, up: false, down: false,
    sprint: false,
    pressed: new Set(),   // action names pressed since last consume
    clickX: 0, clickY: 0, clicked: false,
  };

  const keyMap = {
    KeyW: "up", ArrowUp: "up",
    KeyS: "down", ArrowDown: "down",
    KeyA: "left", ArrowLeft: "left",
    KeyD: "right", ArrowRight: "right",
    ShiftLeft: "sprint", ShiftRight: "sprint",
  };

  window.addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
      e.preventDefault();
    }
    const dir = keyMap[e.code];
    if (dir) input[dir] = true;
    if (e.repeat) return;
    if (e.code === "Space") input.pressed.add("bind");
    if (e.code === "KeyR") input.pressed.add("restart");
    if (e.code === "KeyM") input.pressed.add("mute");
    if (e.code === "Enter") input.pressed.add("start");
    if (e.code === "Escape") input.pressed.add("pause");
    if (onAction) onAction(e.code);
  });

  window.addEventListener("keyup", (e) => {
    const dir = keyMap[e.code];
    if (dir) input[dir] = false;
  });

  canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    input.clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
    input.clickY = (e.clientY - rect.top) * (canvas.height / rect.height);
    input.clicked = true;
    if (onAction) onAction("click");
  });

  // Touch taps work like clicks: tap a spot to walk there.
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const t = e.touches[0];
    input.clickX = (t.clientX - rect.left) * (canvas.width / rect.width);
    input.clickY = (t.clientY - rect.top) * (canvas.height / rect.height);
    input.clicked = true;
    if (onAction) onAction("click");
  }, { passive: false });

  window.addEventListener("blur", () => {
    input.left = input.right = input.up = input.down = input.sprint = false;
  });

  return input;
}

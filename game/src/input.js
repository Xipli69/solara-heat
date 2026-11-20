// Solara Heat — keyboard and mouse state. Held keys and the mouse are polled every
// frame; one-shot presses (enter car, pause, confirm, mute) queue as flags so a tap
// between frames is never lost.

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false };

  window.addEventListener('keydown', (e) => {
    if (!e.repeat) pressed.add(e.code);
    keys.add(e.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); mouse.down = false; });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', (e) => { if (e.button === 0) { mouse.down = true; mouse.clicked = true; } });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) mouse.down = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    keys, mouse,
    down(...codes) { return codes.some((c) => keys.has(c)); },
    /** True once per physical press; consumes the flag. */
    tap(code) { if (pressed.has(code)) { pressed.delete(code); return true; } return false; },
    takeClick() { const c = mouse.clicked; mouse.clicked = false; return c; },
    endFrame() { pressed.clear(); mouse.clicked = false; },
  };
}

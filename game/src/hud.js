// Solara Heat — the HUD: health, cash, wanted stars, weapon, objective, dialogue,
// banners, speedometer, and the minimap that mirrors the real city layout.

import { WORLD, ROADS_V, ROADS_H, ROAD_W, SAND_X, WATER_X, PARK } from './config.js';

const FONT = 'system-ui, "Segoe UI", sans-serif';

function bar(ctx, x, y, w, h, frac, color, back) {
  ctx.fillStyle = back; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color; ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.strokeRect(x + 0.5, y + 0.5, w, h);
}

export function drawMinimap(ctx, G, x, y, size) {
  const s = size / WORLD.w;
  ctx.save();
  ctx.fillStyle = '#8fbf6f'; ctx.fillRect(x, y, WORLD.w * s, WORLD.h * s);
  ctx.fillStyle = '#f2d492'; ctx.fillRect(x + SAND_X * s, y, (WATER_X - SAND_X) * s, WORLD.h * s);
  ctx.fillStyle = '#2e86c9'; ctx.fillRect(x + WATER_X * s, y, (WORLD.w - WATER_X) * s, WORLD.h * s);
  ctx.fillStyle = '#6aa84f'; ctx.fillRect(x + PARK.x * s, y + PARK.y * s, PARK.w * s, PARK.h * s);
  ctx.fillStyle = '#cbb9a0';
  for (const b of G.city.buildings) ctx.fillRect(x + b.x * s, y + b.y * s, Math.max(1.5, b.w * s), Math.max(1.5, b.h * s));
  ctx.fillStyle = '#4a4a52';
  for (const rx of ROADS_V) ctx.fillRect(x + (rx - ROAD_W / 2) * s, y, ROAD_W * s, WORLD.h * s);
  for (const ry of ROADS_H) ctx.fillRect(x, y + (ry - ROAD_W / 2) * s, WORLD.w * s, ROAD_W * s);
  // Blips: traffic grey, police flashing blue/red, packages gold.
  for (const c of G.cars) {
    if (c.dead) continue;
    ctx.fillStyle = c.kind === 'police' ? (Math.floor(G.time * 4) % 2 ? '#3fa9ff' : '#ff5252') : c.kind === 'sport' ? '#ff2d55' : '#e8e8e8';
    ctx.fillRect(x + c.x * s - 1.5, y + c.y * s - 1.5, 3, 3);
  }
  ctx.fillStyle = '#ffd166';
  for (const pk of G.missions.state.packages) if (!pk.taken) ctx.fillRect(x + pk.x * s - 1.5, y + pk.y * s - 1.5, 3, 3);
  // Mission marker: pulsing gold diamond.
  const tp = G.missions.targetPos() || G.missions.freeRoamTarget();
  if (tp) {
    const pulse = 3 + Math.sin(G.time * 5) * 1.2;
    ctx.fillStyle = '#ffd60a';
    ctx.beginPath();
    ctx.moveTo(x + tp.x * s, y + tp.y * s - pulse - 2);
    ctx.lineTo(x + tp.x * s + pulse + 2, y + tp.y * s);
    ctx.lineTo(x + tp.x * s, y + tp.y * s + pulse + 2);
    ctx.lineTo(x + tp.x * s - pulse - 2, y + tp.y * s);
    ctx.fill();
  }
  // Player arrow.
  const px = x + G.player.x * s, py = y + G.player.y * s;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(px + Math.cos(G.player.angle) * 6, py + Math.sin(G.player.angle) * 6);
  ctx.lineTo(px + Math.cos(G.player.angle + 2.5) * 4.5, py + Math.sin(G.player.angle + 2.5) * 4.5);
  ctx.lineTo(px + Math.cos(G.player.angle - 2.5) * 4.5, py + Math.sin(G.player.angle - 2.5) * 4.5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.strokeRect(x + 0.5, y + 0.5, WORLD.w * s, WORLD.h * s);
  ctx.restore();
}

export function drawHUD(ctx, G, vw, vh) {
  const P = G.player;
  ctx.textBaseline = 'alphabetic';
  // Top-left panel: health, armour of cash, weapon.
  ctx.fillStyle = 'rgba(12,20,28,0.55)';
  ctx.fillRect(12, 12, 232, 86);
  ctx.font = `700 15px ${FONT}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
  ctx.fillText('NICO REYES', 22, 34);
  bar(ctx, 22, 42, 180, 12, P.hp / 100, P.hp > 30 ? '#43d17c' : '#ef476f', '#3a2027');
  ctx.font = `600 14px ${FONT}`; ctx.fillStyle = '#ffd166';
  ctx.fillText(`$${G.cash}`, 22, 78);
  ctx.fillStyle = '#dfe9f2';
  const debtLeft = Math.max(0, 5000 - G.earned);
  ctx.fillText(debtLeft > 0 ? `Debt left $${debtLeft}` : 'DEBT CLEARED', 90, 78);
  ctx.font = `600 13px ${FONT}`; ctx.fillStyle = '#cfe3ee';
  ctx.fillText(P.car ? 'DRIVING' : `PISTOL  ${P.reloading ? 'RELOADING…' : `${P.ammo}/${P.reserve}`}`, 150, 34);
  if (G.audio.isMuted()) { ctx.fillStyle = '#ffb3b3'; ctx.fillText('MUTED (M)', 150, 92 - 40); }

  // Wanted stars, top centre-right.
  ctx.font = '22px sans-serif'; ctx.textAlign = 'right';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < G.wanted ? '#ffd60a' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', vw - 20 - (4 - i) * 26, 38);
  }
  if (G.bust > 0.05) {
    // Bust meter: its own dark panel directly under the stars, with a clear
    // gap below the star row, so the label is fully legible while a bust is
    // in progress instead of crowding the stars.
    ctx.fillStyle = 'rgba(12,20,28,0.55)';
    ctx.fillRect(vw - 212, 50, 200, 38);
    ctx.font = `700 13px ${FONT}`; ctx.fillStyle = '#ff6b6b'; ctx.textAlign = 'left';
    ctx.fillText('BUSTED METER', vw - 200, 67);
    bar(ctx, vw - 200, 73, 176, 8, G.bust, '#ff5252', '#3a2027');
  }

  // Objective + timer, top centre.
  const obj = G.missions.objectiveText();
  ctx.font = `600 16px ${FONT}`;
  const w = ctx.measureText(obj).width + 28;
  ctx.fillStyle = 'rgba(12,20,28,0.55)'; ctx.fillRect((vw - w) / 2, 12, w, 30);
  ctx.fillStyle = '#ffe9a8'; ctx.textAlign = 'center';
  ctx.fillText(obj, vw / 2, 33);
  const timer = G.missions.timerText();
  if (timer) {
    ctx.font = `800 22px ${FONT}`; ctx.fillStyle = '#ff8fa3';
    ctx.fillText(timer, vw / 2, 66);
  }

  // Dialogue box, bottom centre.
  const MS = G.missions.state;
  if (MS.dialogueT > 0 && MS.dialogue.length) {
    ctx.fillStyle = 'rgba(10,16,22,0.78)';
    const lines = MS.dialogue;
    ctx.fillRect(vw / 2 - 330, vh - 108, 660, 34 + lines.length * 22);
    ctx.font = `15px ${FONT}`; ctx.fillStyle = '#ffe9a8'; ctx.textAlign = 'center';
    lines.forEach((ln, i) => ctx.fillText(ln, vw / 2, vh - 78 + i * 22));
  }
  // Mission banner.
  if (MS.bannerT > 0 && MS.banner) {
    const a = Math.min(1, MS.bannerT);
    ctx.globalAlpha = a;
    ctx.font = `800 40px ${FONT}`; ctx.fillStyle = '#ffd60a'; ctx.textAlign = 'center';
    ctx.fillText(MS.banner, vw / 2, vh * 0.3);
    ctx.font = `600 19px ${FONT}`; ctx.fillStyle = '#fff';
    ctx.fillText(MS.bannerSub || '', vw / 2, vh * 0.3 + 34);
    ctx.globalAlpha = 1;
  }
  // Floating texts (cash popups live in world space; HUD shows the hint line).
  if (G.hintT > 0 && G.hint) {
    ctx.font = `600 15px ${FONT}`; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(12,20,28,0.55)';
    const hw = ctx.measureText(G.hint).width + 24;
    ctx.fillRect((vw - hw) / 2, vh - 150, hw, 26);
    ctx.fillStyle = '#fff';
    ctx.fillText(G.hint, vw / 2, vh - 132);
  }
  // Speedometer while driving: a panel in the right column directly above
  // the minimap, well clear of the dialogue box at bottom centre, so the
  // speed number, the km/h unit and the car-damage bar are always fully
  // visible while dialogue is on screen.
  if (P.car) {
    const kmh = Math.round(Math.abs(P.car.speed) * 0.55);
    const sx = vw - 216, sy = vh - 230;
    ctx.fillStyle = 'rgba(12,20,28,0.55)';
    ctx.fillRect(sx, sy, 204, 50);
    ctx.font = `800 30px ${FONT}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'right';
    ctx.fillText(`${kmh}`, sx + 118, sy + 34);
    ctx.font = `600 12px ${FONT}`; ctx.fillStyle = '#cfe3ee'; ctx.textAlign = 'left';
    ctx.fillText('km/h', sx + 124, sy + 34);
    bar(ctx, sx + 12, sy + 40, 180, 6, P.car.health / 100, '#ffa94d', '#333');
  }
  // Minimap bottom-right.
  drawMinimap(ctx, G, vw - 216, vh - 172, 204);
}

// Solara Heat — world rendering: the sun-soaked city from above. Warm ground,
// long building shadows, striped roads, a bright beach and sea, then every car,
// person, particle and effect, and finally the full-screen menus.

import { WORLD, ROADS_V, ROADS_H, ROAD_W, SAND_X, WATER_X, PARK, RACE_POINTS } from './config.js';

const FONT = 'system-ui, "Segoe UI", sans-serif';

export function drawWorld(ctx, G, vw, vh) {
  const cam = G.camera;
  const x0 = Math.max(0, cam.x - 60), y0 = Math.max(0, cam.y - 60);
  const x1 = Math.min(WORLD.w, cam.x + vw + 60), y1 = Math.min(WORLD.h, cam.y + vh + 60);
  ctx.save();
  ctx.translate(-cam.x + (G.shake ? (G.rnd() - 0.5) * G.shake : 0), -cam.y + (G.shake ? (G.rnd() - 0.5) * G.shake : 0));

  // Ground: warm city blocks, then park, sand and sea.
  ctx.fillStyle = '#c9cf9a';
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.fillStyle = '#79b657';
  ctx.fillRect(PARK.x, PARK.y, PARK.w, PARK.h);
  ctx.fillStyle = '#f6dc9e';
  ctx.fillRect(SAND_X, 0, WATER_X - SAND_X, WORLD.h);
  const grad = ctx.createLinearGradient(WATER_X, 0, WORLD.w, 0);
  grad.addColorStop(0, '#35a7d9'); grad.addColorStop(1, '#1668a8');
  ctx.fillStyle = grad;
  ctx.fillRect(WATER_X, 0, WORLD.w - WATER_X, WORLD.h);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3;
  ctx.beginPath();
  for (let y = 40; y < WORLD.h; y += 90) { ctx.moveTo(WATER_X + 6, y); ctx.lineTo(WATER_X + 26, y + 14); }
  ctx.stroke();

  // Sidewalks then asphalt with dashed lane lines.
  ctx.fillStyle = '#ddd3bd';
  for (const rx of ROADS_V) ctx.fillRect(rx - ROAD_W / 2 - 12, 0, ROAD_W + 24, WORLD.h);
  for (const ry of ROADS_H) ctx.fillRect(0, ry - ROAD_W / 2 - 12, SAND_X, ROAD_W + 24);
  ctx.fillStyle = '#45454e';
  for (const rx of ROADS_V) ctx.fillRect(rx - ROAD_W / 2, 0, ROAD_W, WORLD.h);
  for (const ry of ROADS_H) ctx.fillRect(0, ry - ROAD_W / 2, SAND_X, ROAD_W);
  ctx.fillStyle = '#f7e08a';
  for (const rx of ROADS_V) for (let y = 10; y < WORLD.h; y += 46) ctx.fillRect(rx - 2, y, 4, 26);
  for (const ry of ROADS_H) for (let x = 10; x < SAND_X; x += 46) ctx.fillRect(x, ry - 2, 26, 4);
  // Crosswalks at junctions.
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (const rx of ROADS_V) for (const ry of ROADS_H) {
    for (let i = -2; i <= 2; i++) ctx.fillRect(rx + i * 22 - 6, ry - ROAD_W / 2 - 8, 12, 6);
  }

  // Skid marks under everything that moves.
  ctx.fillStyle = 'rgba(30,30,30,0.4)';
  for (const sk of G.skids) ctx.fillRect(sk.x - 3, sk.y - 3, 6, 6);

  // Buildings with long warm shadows, roofs and signs.
  for (const b of G.city.buildings) {
    if (b.x + b.w < x0 || b.x > x1 || b.y + b.h < y0 || b.y > y1) continue;
    ctx.fillStyle = 'rgba(90,50,20,0.28)';
    ctx.fillRect(b.x + 14, b.y + 16, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 13, b.y + 13, b.w - 26, b.h - 26);
    ctx.strokeStyle = 'rgba(90,50,20,0.35)'; ctx.lineWidth = 3;
    ctx.strokeRect(b.x + 13, b.y + 13, b.w - 26, b.h - 26);
    // Rooftop clutter: a water tank / AC block breaks up the flat roof.
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(b.x + b.w * 0.6, b.y + b.h * 0.55, 16, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    const cols = Math.max(1, Math.floor(b.w / 34)), rows = Math.max(1, Math.floor(b.h / 34));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) ctx.fillRect(b.x + 20 + i * 34, b.y + 20 + j * 34, 7, 7);
    // A striped awning along the street edge gives each block a shopfront feel.
    ctx.fillStyle = 'rgba(178,44,44,0.75)';
    ctx.fillRect(b.x + 8, b.y + b.h - 12, b.w - 16, 5);
    if (b.w > 92) {
      ctx.font = '700 11px ' + FONT; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(20,20,30,0.85)';
      const label = b.name.toUpperCase();
      const tw = ctx.measureText(label).width + 10;
      ctx.fillRect(b.x + b.w / 2 - tw / 2, b.y + b.h - 20, tw, 15);
      ctx.fillStyle = '#ffe9a8';
      ctx.fillText(label, b.x + b.w / 2, b.y + b.h - 8);
    }
  }

  // Park paths, palms, lamps, crates.
  ctx.strokeStyle = '#e8dcc0'; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(PARK.x, PARK.y + PARK.h / 2); ctx.lineTo(PARK.x + PARK.w, PARK.y + PARK.h / 2);
  ctx.moveTo(PARK.x + PARK.w / 2, PARK.y); ctx.lineTo(PARK.x + PARK.w / 2, PARK.y + PARK.h); ctx.stroke();
  for (const p of G.city.palms) {
    if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
    ctx.fillStyle = '#8a5a33'; ctx.fillRect(p.x - 2, p.y - 2, 5, 5);
    ctx.fillStyle = '#3f9e4d';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4;
      ctx.beginPath(); ctx.ellipse(p.x + Math.cos(a) * 8, p.y + Math.sin(a) * 8, 9, 3.4, a, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.fillStyle = '#5a4632';
  for (const c of G.city.crates) ctx.fillRect(c.x - c.s / 2, c.y - c.s / 2, c.s, c.s);
  ctx.fillStyle = '#ffd76a';
  for (const l of G.city.lamps) { ctx.beginPath(); ctx.arc(l.x, l.y, 3, 0, Math.PI * 2); ctx.fill(); }

  // Mission target ring + guide beacon, race checkpoints, packages.
  const tp = G.missions.targetPos() || G.missions.freeRoamTarget();
  if (tp) {
    const pulse = 1 + Math.sin(G.time * 4) * 0.12;
    ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(tp.x, tp.y, 46 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,214,10,0.15)';
    ctx.beginPath(); ctx.arc(tp.x, tp.y, 46 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.font = '800 20px ' + FONT; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd60a';
    ctx.fillText('M', tp.x, tp.y - 58);
  }
  if (G.missions.state.active && G.missions.state.active.def.kind === 'race') {
    const cp = RACE_POINTS[G.missions.state.raceIdx];
    if (cp) {
      ctx.strokeStyle = '#7CFC98'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(cp.x, cp.y, 52, 0, Math.PI * 2); ctx.stroke();
    }
  }
  for (const pk of G.missions.state.packages) {
    if (pk.taken) continue;
    ctx.save(); ctx.translate(pk.x, pk.y); ctx.rotate(G.time * 2);
    ctx.fillStyle = '#ffd166'; ctx.fillRect(-8, -8, 16, 16);
    ctx.fillStyle = '#8a6d1f'; ctx.font = '800 12px ' + FONT; ctx.textAlign = 'center'; ctx.fillText('$', 0, 4);
    ctx.restore();
  }

  // Cars.
  for (const car of G.cars) {
    if (car.x < x0 - 60 || car.x > x1 + 60 || car.y < y0 - 60 || car.y > y1 + 60) continue;
    drawCar(ctx, car, G);
  }
  // People.
  for (const p of G.peds) {
    if (p.dead) continue;
    if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
    drawPerson(ctx, p, p.role === 'cop' ? '#33507e' : p.color, p.role);
    if (p.hp < 100 && p.role !== 'ped') healthPip(ctx, p);
  }
  // Player (on foot) with aim line and muzzle flash.
  const P = G.player;
  if (!P.car) {
    drawPerson(ctx, P, '#ffcf3f', 'player');
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(P.x + Math.cos(P.angle) * 26, P.y + Math.sin(P.angle) * 26); ctx.stroke();
    if (P.muzzle > 0) {
      ctx.fillStyle = '#ffe066';
      ctx.beginPath(); ctx.arc(P.x + Math.cos(P.angle) * 30, P.y + Math.sin(P.angle) * 30, 6 + G.rnd() * 4, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Bullets, particles, floating texts.
  ctx.fillStyle = '#fff3b0';
  for (const b of G.bullets) ctx.fillRect(b.x - 2, b.y - 2, 4, 4);
  for (const pt of G.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;
  ctx.font = '700 15px ' + FONT; ctx.textAlign = 'center';
  for (const ft of G.floaters) {
    ctx.globalAlpha = Math.max(0, ft.life);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Warm sun wash over the whole frame.
  const sun = ctx.createLinearGradient(0, 0, vw, vh);
  sun.addColorStop(0, 'rgba(255,180,80,0.10)');
  sun.addColorStop(1, 'rgba(255,120,60,0.05)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, vw, vh);
}

function healthPip(ctx, p) {
  ctx.fillStyle = '#333'; ctx.fillRect(p.x - 12, p.y - 20, 24, 4);
  ctx.fillStyle = '#ef476f'; ctx.fillRect(p.x - 12, p.y - 20, 24 * Math.max(0, p.hp) / 100, 4);
}

export function drawCar(ctx, car, G) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(60,30,10,0.3)';
  ctx.fillRect(-car.w / 2 + 4, -car.h / 2 + 5, car.w, car.h);
  const body = car.kind === 'police' ? '#eef2f7' : car.color;
  ctx.fillStyle = car.dead ? '#3a3a3a' : body;
  roundRect(ctx, -car.w / 2, -car.h / 2, car.w, car.h, 6); ctx.fill();
  if (car.kind === 'police' && !car.dead) {
    ctx.fillStyle = '#2b4d8f';
    ctx.fillRect(-car.w / 2 + 3, -4, car.w - 6, 8);
  }
  ctx.fillStyle = 'rgba(20,30,45,0.85)';
  roundRect(ctx, -car.w / 5, -car.h / 2 + 3, car.w / 2.4, car.h - 6, 4); ctx.fill();
  ctx.fillStyle = '#22252c';
  for (const [wx, wy] of [[-car.w / 2 + 8, -car.h / 2 - 1], [car.w / 2 - 8, -car.h / 2 - 1], [-car.w / 2 + 8, car.h / 2 - 3], [car.w / 2 - 8, car.h / 2 - 3]]) {
    ctx.fillRect(wx - 4, wy, 8, 4);
  }
  if (car.kind === 'police') {
    ctx.fillStyle = Math.floor(G.time * 5) % 2 ? '#ff4040' : '#3fa9ff';
    ctx.fillRect(-6, -4, 12, 8);
    ctx.fillStyle = '#1d2f52'; ctx.font = '800 8px ' + FONT; ctx.textAlign = 'center';
    ctx.fillText('POLICIA', 0, car.h / 2 + 1);
  }
  if (car.kind === 'sport') {
    ctx.fillStyle = '#ffd60a'; ctx.fillRect(-car.w / 2, -2, car.w, 4);
    ctx.fillStyle = '#22252c'; ctx.fillRect(-car.w / 2 + 1, -car.h / 2 - 2, 5, car.h + 4);
  }
  ctx.restore();
  // Damage smoke.
  if (!car.dead && car.health < 45) {
    ctx.fillStyle = `rgba(80,80,80,${0.25 + (45 - car.health) / 120})`;
    ctx.beginPath(); ctx.arc(car.x + (G.rnd() - 0.5) * 10, car.y - 14 - G.rnd() * 8, 5 + G.rnd() * 6, 0, Math.PI * 2); ctx.fill();
  }
  if (car.dead) {
    ctx.fillStyle = 'rgba(40,40,40,0.5)';
    ctx.beginPath(); ctx.arc(car.x, car.y - 12, 12 + G.rnd() * 6, 0, Math.PI * 2); ctx.fill();
  }
}

function drawPerson(ctx, p, color, role) {
  ctx.fillStyle = 'rgba(60,30,10,0.3)';
  ctx.beginPath(); ctx.ellipse(p.x + 3, p.y + 4, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f2c79b';
  ctx.beginPath(); ctx.arc(p.x, p.y, 4.6, 0, Math.PI * 2); ctx.fill();
  if (role === 'cop') { ctx.fillStyle = '#20365c'; ctx.fillRect(p.x - 5, p.y - 9, 10, 4); }
  if (role === 'guard') { ctx.fillStyle = '#222'; ctx.fillRect(p.x - 5, p.y - 9, 10, 4); }
  if (p.isCousin) {
    ctx.font = '800 11px ' + FONT; ctx.textAlign = 'center'; ctx.fillStyle = '#ff7043';
    ctx.fillText('!', p.x, p.y - 14);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawPanel(ctx, vw, vh, title, lines, prompt, accent) {
  ctx.fillStyle = 'rgba(10,18,26,0.72)';
  ctx.fillRect(0, 0, vw, vh);
  const w = Math.min(680, vw - 60), h = 190 + lines.length * 27;
  const x = (vw - w) / 2, y = (vh - h) / 2;
  ctx.fillStyle = 'rgba(16,28,40,0.95)';
  roundRect(ctx, x, y, w, h, 14); ctx.fill();
  ctx.strokeStyle = accent || '#ffd60a'; ctx.lineWidth = 2; ctx.stroke();
  ctx.textAlign = 'center';
  ctx.font = '800 44px ' + FONT; ctx.fillStyle = accent || '#ffd60a';
  ctx.fillText(title, vw / 2, y + 66);
  ctx.font = '16px ' + FONT; ctx.fillStyle = '#e8f1f8';
  lines.forEach((ln, i) => ctx.fillText(ln, vw / 2, y + 108 + i * 27));
  if (prompt) {
    ctx.font = '700 18px ' + FONT; ctx.fillStyle = '#ffe9a8';
    ctx.fillText(prompt, vw / 2, y + h - 26);
  }
}

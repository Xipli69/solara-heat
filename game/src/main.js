// Solara Heat — boot, game state, the main loop, combat, the wanted system and
// saving. Port Solara is a sun-soaked coastal city; Nico Reyes works off a $5,000
// debt for fixer Marisol Vega across six jobs, then roams free.

import { WORLD, PLACES, SAVE_KEY, MISSIONS } from './config.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { buildCity, createRandom, collideCircle, isRoad } from './world.js';
import { spawnParked, spawnTraffic, updateTraffic, drivePlayerCar, spawnSparks } from './vehicles.js';
import { spawnPeds, updatePed, updatePolice } from './people.js';
import { createMissions } from './missions.js';
import { drawWorld, drawPanel } from './render.js';
import { drawHUD } from './hud.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261120;
const rnd = createRandom(seed);

let vw = 1280, vh = 800;
function resize() {
  vw = window.innerWidth; vh = window.innerHeight;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
  canvas.style.width = vw + 'px'; canvas.style.height = vh + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

const G = {
  time: 0, screen: 'title', frozen: false,
  city: buildCity(seed), rnd,
  cars: [], peds: [], bullets: [], particles: [], skids: [], floaters: [],
  player: {
    x: PLACES.start.x, y: PLACES.start.y, angle: 0, hp: 100, car: null,
    ammo: 12, reserve: 60, reloading: 0, muzzle: 0, fireCd: 0, speed: 0,
  },
  camera: { x: 0, y: 0 },
  cash: 0, earned: 0, wanted: 0, bust: 0, shake: 0,
  wantedDecay: 0, policeSpawn: 0, recentShots: 0, seenCrime: 0,
  hint: '', hintT: 0, audio: createAudio(), input: null,
  addCash(n) {
    this.cash += n; if (n > 0) this.earned += n;
    this.floatText(this.player.x, this.player.y - 26, `+$${n}`, '#ffd166');
  },
  floatText(x, y, text, color) { this.floaters.push({ x, y, text, color, life: 1.4 }); },
  setWanted(n, force) {
    const next = Math.max(0, Math.min(5, n));
    if (force || next !== this.wanted) this.wanted = next;
  },
  crime(points, witnessRange) {
    // A crime only counts when someone is close enough to see it.
    const seen = this.peds.some((p) => !p.dead && Math.hypot(p.x - this.player.x, p.y - this.player.y) < (witnessRange || 320))
      || this.cars.some((c) => c.kind === 'police' && Math.hypot(c.x - this.player.x, c.y - this.player.y) < 420);
    if (seen || points >= 2) {
      this.setWanted(this.wanted + points);
      this.wantedDecay = 0;
    }
  },
  dangerAt(x, y) {
    if (this.recentShots > 0 && Math.hypot(x - this.player.x, y - this.player.y) < 240) return true;
    return this.bullets.some((b) => Math.hypot(b.x - x, b.y - y) < 90);
  },
  enemyShoot(p) {
    const a = Math.atan2(this.player.y - p.y, this.player.x - p.x) + (rnd() - 0.5) * 0.16;
    this.bullets.push({ x: p.x, y: p.y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, life: 0.7, from: 'enemy' });
    this.audio.shot();
  },
  missionEvent(name) { if (this.missions) this.missions.event(name); },
  syncCamera(snap) {
    const tx = Math.max(0, Math.min(WORLD.w - vw, this.player.x - vw / 2));
    const ty = Math.max(0, Math.min(WORLD.h - vh, this.player.y - vh / 2));
    if (snap) { this.camera.x = tx; this.camera.y = ty; }
    else {
      this.camera.x += (tx - this.camera.x) * 0.12;
      this.camera.y += (ty - this.camera.y) * 0.12;
    }
  },
  save() {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify({
        mission: this.missions ? this.missions.state.index : 0,
        cash: this.cash, earned: this.earned,
        packages: this.missions ? this.missions.state.packages.map((p) => p.taken) : [],
      }));
    } catch { /* private mode: progress lasts the session */ }
  },
  loadSave() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
};

G.input = createInput(canvas);
G.missions = createMissions(G);

function resetWorld(keepProgress) {
  G.cars = [...spawnParked(rnd), ...spawnTraffic(rnd)];
  G.peds = spawnPeds(rnd, 34);
  G.bullets = []; G.particles = []; G.floaters = [];
  G.player.x = PLACES.start.x; G.player.y = PLACES.start.y;
  G.player.hp = 100; G.player.car = null; G.player.ammo = 12; G.player.reserve = 60;
  G.wanted = 0; G.bust = 0;
  if (!keepProgress) { G.cash = 0; G.earned = 0; G.missions.state.index = 0; G.missions.state.packages.forEach((p) => { p.taken = false; }); G.missions.state.packagesFound = 0; }
  G.missions.state.active = null;
  G.syncCamera(true);
}

function applySave(data) {
  if (!data) return;
  G.cash = data.cash || 0; G.earned = data.earned || 0;
  G.missions.state.index = Math.min(data.mission || 0, MISSIONS.length);
  (data.packages || []).forEach((taken, i) => { if (G.missions.state.packages[i]) G.missions.state.packages[i].taken = !!taken; });
  G.missions.state.packagesFound = G.missions.state.packages.filter((p) => p.taken).length;
}

function startPlay(continuing) {
  resetWorld(continuing);
  if (continuing) applySave(G.loadSave());
  G.screen = 'play';
  if (G.missions.state.index < MISSIONS.length) G.missions.startMission(G.missions.state.index);
  else G.missions.say(['Marisol: Debt is history. Port Solara is yours, Nico.']);
  G.audio.click();
}

function respawn(kind) {
  const fine = kind === 'busted' ? 200 : 250;
  G.cash = Math.max(0, G.cash - fine);
  G.player.hp = 100; G.wanted = 0; G.bust = 0;
  G.player.car = null;
  G.player.x = PLACES.cantina.x + 40; G.player.y = PLACES.cantina.y + 60;
  G.cars = G.cars.filter((c) => c.kind !== 'police');
  G.peds = G.peds.filter((p) => p.role !== 'cop');
  G.screen = 'play';
  G.missions.say([kind === 'busted' ? `Police: Booked. The fine was $${fine}.` : `Clinic: Patched up. The bill was $${fine}.`]);
  G.syncCamera(true);
  G.save();
}

// ---------- combat ----------
function playerShoot() {
  const P = G.player;
  if (P.car || P.reloading > 0 || P.fireCd > 0) return;
  if (P.ammo <= 0) { G.audio.click(); startReload(); return; }
  P.ammo -= 1; P.fireCd = 0.22; P.muzzle = 0.06; G.recentShots = 1.2;
  const a = P.angle;
  G.bullets.push({ x: P.x + Math.cos(a) * 16, y: P.y + Math.sin(a) * 16, vx: Math.cos(a) * 640, vy: Math.sin(a) * 640, life: 0.55, from: 'player' });
  G.audio.shot();
  G.crime(1, 300);
  G.shake = Math.min(4, G.shake + 0.7);
}

function startReload() {
  const P = G.player;
  if (P.reloading > 0 || P.ammo >= 12 || P.reserve <= 0) return;
  P.reloading = 0.9;
  G.audio.reload();
}

function hitParticles(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, s = 30 + rnd() * 120;
    G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35, max: 0.35, color, size: 2 + rnd() * 2 });
  }
}

function updateBullets(dt) {
  for (const b of G.bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life <= 0) continue;
    if (b.from === 'player') {
      for (const p of G.peds) {
        if (p.dead || p.riding) continue;
        if (Math.hypot(p.x - b.x, p.y - b.y) < 11) {
          b.life = 0; p.hp -= 55; hitParticles(b.x, b.y, '#ef476f', 6); G.audio.hit();
          if (p.role === 'ped') G.crime(2, 340);
          if (p.role === 'cop') G.crime(1, 500);
          if (p.hp <= 0) { p.dead = true; if (p.role === 'cop') G.crime(1, 600); }
          break;
        }
      }
      if (b.life > 0) for (const c of G.cars) {
        if (c.dead) continue;
        if (Math.abs(c.x - b.x) < 24 && Math.abs(c.y - b.y) < 14) {
          b.life = 0; c.health -= 14; hitParticles(b.x, b.y, '#ffd166', 5); G.audio.hit();
          if (c.kind === 'police') G.crime(1, 500);
          if (c.health <= 0) c.dead = true;
          break;
        }
      }
    } else {
      const P = G.player;
      const target = P.car || P;
      const rr = P.car ? 24 : 10;
      if (Math.hypot(target.x - b.x, target.y - b.y) < rr) {
        b.life = 0;
        if (P.car) { P.car.health -= 5; if (P.car.health <= 0) P.car.dead = true; }
        else { P.hp -= 9; G.audio.hurt(); G.shake = Math.min(8, G.shake + 2); }
        hitParticles(b.x, b.y, '#ef476f', 5);
      }
    }
  }
  G.bullets = G.bullets.filter((b) => b.life > 0);
}

// ---------- player ----------
function updatePlayer(dt) {
  const P = G.player, inp = G.input;
  if (P.fireCd > 0) P.fireCd -= dt;
  if (P.muzzle > 0) P.muzzle -= dt;
  if (P.reloading > 0) {
    P.reloading -= dt;
    if (P.reloading <= 0) {
      const take = Math.min(12 - P.ammo, P.reserve);
      P.ammo += take; P.reserve -= take;
    }
  }
  if (P.car) {
    const car = P.car;
    if (car.dead) { exitCar(true); return; }
    const speed = drivePlayerCar(car, dt, {
      up: inp.down('KeyW', 'ArrowUp'), down: inp.down('KeyS', 'ArrowDown'),
      left: inp.down('KeyA', 'ArrowLeft'), right: inp.down('KeyD', 'ArrowRight'),
      hand: inp.down('Space'),
    }, G);
    P.x = car.x; P.y = car.y; P.angle = car.angle; P.speed = speed;
    G.audio.engine(Math.abs(car.speed) / 330, true);
    if (inp.tap('KeyE')) exitCar(false);
    // Running someone down is a serious crime.
    for (const p of G.peds) {
      if (p.dead || p.riding) continue;
      if (Math.abs(car.speed) > 60 && Math.hypot(p.x - car.x, p.y - car.y) < 24) {
        p.hp -= Math.abs(car.speed) * 0.5;
        hitParticles(p.x, p.y, '#ef476f', 8);
        if (p.hp <= 0) p.dead = true;
        G.crime(2, 380); G.audio.hit();
      }
    }
  } else {
    G.audio.engine(0, false);
    const sprint = inp.down('ShiftLeft', 'ShiftRight');
    const sp = sprint ? 235 : 150;
    let mx = 0, my = 0;
    if (inp.down('KeyW', 'ArrowUp')) my -= 1;
    if (inp.down('KeyS', 'ArrowDown')) my += 1;
    if (inp.down('KeyA', 'ArrowLeft')) mx -= 1;
    if (inp.down('KeyD', 'ArrowRight')) mx += 1;
    const len = Math.hypot(mx, my) || 1;
    const fixed = collideCircle(G.city, P.x + (mx / len) * sp * dt, P.y + (my / len) * sp * dt, 10);
    P.x = fixed.x; P.y = fixed.y;
    // Aim at the mouse (screen space -> world space).
    P.angle = Math.atan2((inp.mouse.y + G.camera.y) - P.y, (inp.mouse.x + G.camera.x) - P.x);
    if (inp.mouse.down || inp.down('Space')) playerShoot();
    if (inp.tap('KeyR')) startReload();
    if (inp.tap('KeyE')) tryEnterCar();
    if (sprint && (mx || my) && rnd() < 0.12) {
      G.particles.push({ x: P.x, y: P.y + 6, vx: (rnd() - 0.5) * 20, vy: -14, life: 0.4, max: 0.4, color: '#d9c9a3', size: 3 });
    }
  }
}

function nearestCar(range) {
  let best = null, bd = range;
  for (const c of G.cars) {
    if (c.dead) continue;
    const d = Math.hypot(c.x - G.player.x, c.y - G.player.y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

function tryEnterCar() {
  const car = nearestCar(46);
  if (!car) return;
  const wasParked = car.kind === 'parked' || car.kind === 'sport' || car.kind === 'traffic';
  G.player.car = car; G.player.x = car.x; G.player.y = car.y;
  car.kind = car.kind === 'sport' ? 'sport' : 'driven';
  G.audio.door();
  if (wasParked) {
    G.hint = car.model ? `Stole the ${car.model}!` : 'Car stolen — drive!';
    G.hintT = 2;
    G.crime(1, 260);
  }
}

function exitCar(wrecked) {
  const P = G.player, car = P.car;
  P.car = null;
  G.audio.engine(0, false);
  if (car) {
    const side = collideCircle(G.city, car.x + Math.cos(car.angle + Math.PI / 2) * 30, car.y + Math.sin(car.angle + Math.PI / 2) * 30, 10);
    P.x = side.x; P.y = side.y;
    if (car.kind === 'driven') car.kind = 'parked';
    if (wrecked) { P.hp -= 12; G.missions.say(['Nico: Car is done. On foot, then.']); }
  }
  G.audio.door();
}

// ---------- wanted ----------
function updateWanted(dt) {
  if (G.recentShots > 0) G.recentShots -= dt;
  if (G.wanted > 0) {
    const policeNear = G.cars.some((c) => c.kind === 'police' && !c.dead && Math.hypot(c.x - G.player.x, c.y - G.player.y) < 430)
      || G.peds.some((p) => p.role === 'cop' && !p.dead && Math.hypot(p.x - G.player.x, p.y - G.player.y) < 300);
    if (!policeNear && !isRoad(G.player.x, G.player.y)) {
      G.wantedDecay += dt;
      if (G.wantedDecay > 7) { G.wantedDecay = 0; G.setWanted(G.wanted - 1, true); if (G.wanted === 0) G.bust = 0; }
    } else G.wantedDecay = 0;
    G.audio.siren(dt, policeNear);
  }
  if (G.bust > 0 && G.screen === 'play') {
    const copClose = G.peds.some((p) => p.role === 'cop' && !p.dead && Math.hypot(p.x - G.player.x, p.y - G.player.y) < 60)
      || G.cars.some((c) => c.kind === 'police' && !c.dead && Math.hypot(c.x - G.player.x, c.y - G.player.y) < 60);
    if (!copClose) G.bust = Math.max(0, G.bust - dt * 0.5);
    if (G.bust >= 1) { G.screen = 'busted'; G.audio.fail(); }
  }
  if (G.player.hp <= 0 && G.screen === 'play') { G.screen = 'wasted'; G.audio.fail(); }
}

// ---------- taxis: optional fares between missions ----------
function updateTaxi(dt) {
  if (G.missions.state.active || !G.player.car) { G.taxi = null; return; }
  if (!G.taxi && rnd() < dt * 0.05) {
    const ped = G.peds.find((p) => p.role === 'ped' && !p.dead && Math.hypot(p.x - G.player.x, p.y - G.player.y) < 200);
    if (ped) {
      G.taxi = { ped, dest: { x: 300 + rnd() * 2300, y: 200 + rnd() * 2000 }, t: 60 };
      G.hint = 'A fare waves you down — stop close to pick up ($120)';
      G.hintT = 3;
    }
  }
  if (G.taxi) {
    const t = G.taxi;
    t.t -= dt;
    if (!t.riding) {
      if (Math.hypot(t.ped.x - G.player.x, t.ped.y - G.player.y) < 40 && Math.abs(G.player.car.speed) < 20) {
        t.riding = true; t.ped.riding = true;
        G.hint = 'Fare aboard — follow the gold ring on the minimap edge: drive to the drop-off';
        G.hintT = 3;
      }
    } else {
      t.ped.x = G.player.x; t.ped.y = G.player.y;
      if (Math.hypot(t.dest.x - G.player.x, t.dest.y - G.player.y) < 70) {
        t.ped.riding = false; t.ped.x += 30;
        G.addCash(120); G.audio.cash();
        G.floatText(G.player.x, G.player.y - 30, 'FARE +$120', '#7CFC98');
        G.taxi = null; G.save();
        return;
      }
    }
    if (t.t <= 0 || t.ped.dead) { if (t.ped.riding) { t.ped.riding = false; } G.taxi = null; }
  }
}

// ---------- main update ----------
function update(dt) {
  G.time += dt;
  if (G.hintT > 0) G.hintT -= dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 26);
  updatePlayer(dt);
  for (const c of G.cars) if (c.kind === 'traffic') updateTraffic(c, dt, G);
  updatePolice(G, dt);
  for (const p of G.peds) updatePed(p, dt, G);
  G.peds = G.peds.filter((p) => !p.dead || rnd() < 0.995);
  updateBullets(dt);
  updateWanted(dt);
  G.missions.update(dt);
  updateTaxi(dt);
  for (const pt of G.particles) { pt.life -= dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vx *= 0.94; pt.vy *= 0.94; }
  G.particles = G.particles.filter((p) => p.life > 0);
  for (const f of G.floaters) { f.life -= dt * 0.7; f.y -= dt * 34; }
  G.floaters = G.floaters.filter((f) => f.life > 0);
  for (const sk of G.skids) sk.life -= dt;
  G.skids = G.skids.filter((s) => s.life > 0);
  // Guide hint for entering cars.
  if (!G.player.car && nearestCar(46)) { G.hint = 'Press E to enter the car'; G.hintT = Math.max(G.hintT, 0.2); }
  G.syncCamera(false);
}

// ---------- drawing screens ----------
function draw() {
  ctx.clearRect(0, 0, vw, vh);
  drawWorld(ctx, G, vw, vh);
  const hasSave = !!G.loadSave();
  if (G.screen === 'play' || G.screen === 'paused') drawHUD(ctx, G, vw, vh);
  // Off-screen mission arrow.
  if (G.screen === 'play') {
    const tp = G.missions.targetPos() || G.missions.freeRoamTarget();
    if (tp) {
      const sx = tp.x - G.camera.x, sy = tp.y - G.camera.y;
      if (sx < -20 || sy < -20 || sx > vw + 20 || sy > vh + 20) {
        const cx = vw / 2, cy = vh / 2;
        const a = Math.atan2(sy - cy, sx - cx);
        const ex = cx + Math.cos(a) * (Math.min(vw, vh) / 2 - 60);
        const ey = cy + Math.sin(a) * (Math.min(vw, vh) / 2 - 60);
        ctx.save(); ctx.translate(ex, ey); ctx.rotate(a);
        ctx.fillStyle = '#ffd60a';
        ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-10, -9); ctx.lineTo(-10, 9); ctx.fill();
        ctx.restore();
        ctx.font = '700 13px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd60a';
        ctx.fillText(`${Math.round(Math.hypot(tp.x - G.player.x, tp.y - G.player.y) / 10)}m`, ex, ey + 26);
      }
    }
  }
  if (G.screen === 'title') {
    drawPanel(ctx, vw, vh, 'SOLARA HEAT', [
      'Port Solara. Sun, sea — and a $5,000 debt.',
      'Nico Reyes, wheelman, works for fixer Marisol Vega.',
      'Six jobs stand between Nico and freedom.',
      '',
      'WASD / Arrows — move & drive    Mouse — aim, Click / Space — shoot',
      'E — enter / exit car    R — reload    Shift — sprint    Space (car) — handbrake',
      'Esc / P — pause    M — mute',
    ], hasSave ? 'ENTER — Continue      N — New game' : 'ENTER — Start the story', '#ffd60a');
  } else if (G.screen === 'paused') {
    drawPanel(ctx, vw, vh, 'PAUSED', [`Mission ${Math.min(G.missions.state.index + 1, 6)} of 6`, `Cash $${G.cash} — packages ${G.missions.state.packagesFound}/10`], 'Esc / P — resume', '#7CFC98');
  } else if (G.screen === 'busted') {
    drawPanel(ctx, vw, vh, 'BUSTED', ['The Policia Solara got their hands on you.', 'Fine: $200. Wanted level cleared.'], 'ENTER — back on the street', '#ff6b6b');
  } else if (G.screen === 'wasted') {
    drawPanel(ctx, vw, vh, 'WASTED', ['You wake up outside the Clinica Vida.', 'Medical bill: $250. Wanted level cleared.'], 'ENTER — back on the street', '#ff6b6b');
  } else if (G.screen === 'complete') {
    drawPanel(ctx, vw, vh, 'DEBT CLEARED', [
      'The ledger burned on the marina dock.',
      `Nico Reyes earned $${G.earned} and owes nothing.`,
      `Hidden packages found: ${G.missions.state.packagesFound}/10`,
      'Port Solara is yours — free roam, fares and packages remain.',
    ], 'ENTER — free roam', '#7CFC98');
  }
}

// ---------- loop ----------
resetWorld(false);
const shotName = params.get('shot');
if (shotName) {
  stageShot(G, shotName);
  draw(); draw();
  window.__shotReady = true;
} else {
  let last = performance.now(), acc = 0;
  const STEP = 1 / 60;
  function frame(now) {
    requestAnimationFrame(frame);
    acc += Math.min(0.25, (now - last) / 1000); last = now;
    const inp = G.input;
    if (inp.tap('KeyM')) G.audio.toggleMute();
    if (G.screen === 'title') {
      if (inp.tap('Enter')) { G.audio.unlock(); startPlay(!!G.loadSave() && !inp.down('KeyN')); }
      if (inp.tap('KeyN')) { G.audio.unlock(); try { window.localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ } startPlay(false); }
    } else if (G.screen === 'busted') {
      if (inp.tap('Enter')) respawn('busted');
    } else if (G.screen === 'wasted') {
      if (inp.tap('Enter')) respawn('wasted');
    } else if (G.screen === 'complete') {
      if (inp.tap('Enter')) { G.screen = 'play'; G.missions.say(['Marisol: Free man. The city still pays, if you drive.']); }
    } else if (G.screen === 'play' || G.screen === 'paused') {
      if (inp.tap('Escape') || inp.tap('KeyP')) { G.screen = G.screen === 'play' ? 'paused' : 'play'; G.audio.click(); }
    }
    if (G.screen === 'play') {
      while (acc >= STEP) { update(STEP); acc -= STEP; }
    } else acc = 0;
    draw();
    inp.endFrame();
  }
  requestAnimationFrame(frame);
}

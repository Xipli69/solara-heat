// Solara Heat — people: pedestrians strolling the sidewalks who flee from trouble,
// police officers on foot, mission guards, and the police cars that hunt the player.

import { ROADS_V, ROADS_H, ROAD_W, PED_COLORS, WORLD } from './config.js';
import { collideCircle } from './world.js';

export function makePed(x, y, color, role) {
  return {
    x, y, angle: Math.random() * Math.PI * 2, speed: 0, hp: 100,
    color, role: role || 'ped', state: 'walk', timer: 1 + Math.random() * 3,
    target: null, dead: false, shootCd: 0, isCousin: false,
  };
}

export function spawnPeds(rnd, n) {
  const peds = [];
  for (let i = 0; i < n; i++) {
    // Walkers live on sidewalk edges: beside a random road, somewhere along it.
    const vertical = rnd() < 0.5;
    let x, y;
    if (vertical) {
      const rx = ROADS_V[Math.floor(rnd() * ROADS_V.length)];
      x = rx + (rnd() < 0.5 ? -1 : 1) * (ROAD_W / 2 + 12);
      y = 80 + rnd() * (WORLD.h - 160);
    } else {
      const ry = ROADS_H[Math.floor(rnd() * ROADS_H.length)];
      x = 80 + rnd() * 2500;
      y = ry + (rnd() < 0.5 ? -1 : 1) * (ROAD_W / 2 + 12);
    }
    peds.push(makePed(x, y, PED_COLORS[i % PED_COLORS.length], 'ped'));
  }
  return peds;
}

export function updatePed(p, dt, G) {
  if (p.dead) return;
  const player = G.player;
  const distP = Math.hypot(player.x - p.x, player.y - p.y);
  const danger = G.dangerAt(p.x, p.y);
  p.timer -= dt;

  if (p.role === 'ped') {
    if (danger || (G.recentShots > 0 && distP < 260) || (player.car && distP < 90)) {
      p.state = 'flee';
    } else if (p.state === 'flee' && !danger && distP > 200) p.state = 'walk';
    if (p.state === 'flee') {
      const away = Math.atan2(p.y - player.y, p.x - player.x);
      p.angle = away; p.speed = 150;
    } else {
      if (p.timer <= 0) { p.timer = 2 + G.rnd() * 3; p.angle = G.rnd() * Math.PI * 2; p.speed = G.rnd() < 0.25 ? 0 : 55; }
    }
  } else if (p.role === 'cousin') {
    // The pickup walks to the player's car once it is close, then rides along.
    if (!p.riding) {
      if (player.car && distP < 130) {
        p.angle = Math.atan2(player.y - p.y, player.x - p.x); p.speed = 130;
        if (distP < 30) { p.riding = true; G.missionEvent('cousin-in'); }
      } else p.speed = 0;
    } else { p.x = player.x; p.y = player.y; return; }
  } else if (p.role === 'cop' || p.role === 'guard') {
    const hostile = p.role === 'guard' ? distP < 420 : (G.wanted > 0 && distP < 700);
    if (hostile) {
      if (distP > 170) { p.angle = Math.atan2(player.y - p.y, player.x - p.x); p.speed = p.role === 'cop' ? 128 : 95; }
      else p.speed = 0;
      p.shootCd -= dt;
      if (distP < 300 && p.shootCd <= 0) {
        p.shootCd = 0.9 + G.rnd() * 0.7;
        G.enemyShoot(p);
      }
      // A cop standing close to a slow or on-foot player builds the bust meter.
      if (p.role === 'cop' && distP < 46 && (!player.car || Math.abs(player.car.speed) < 25)) {
        G.bust += dt * 0.55;
      }
    } else p.speed = 0;
  }

  const nx = p.x + Math.cos(p.angle) * p.speed * dt;
  const ny = p.y + Math.sin(p.angle) * p.speed * dt;
  const fixed = collideCircle(G.city, nx, ny, 9);
  if (Math.abs(fixed.x - nx) > 1 || Math.abs(fixed.y - ny) > 1) p.angle += 1.7; // slide-turn off walls
  p.x = fixed.x; p.y = fixed.y;
}

/** Police cars: spawn at the map edge of the player's view, chase, ram, and shoot via their crews. */
export function updatePolice(G, dt) {
  const want = G.wanted;
  const desired = want === 0 ? 0 : Math.min(2 + want, 6);
  const cops = G.cars.filter((c) => c.kind === 'police' && !c.dead);
  G.policeSpawn -= dt;
  if (cops.length < desired && G.policeSpawn <= 0) {
    G.policeSpawn = 2.2;
    const a = G.rnd() * Math.PI * 2, d = 620;
    let x = Math.max(60, Math.min(2620, G.player.x + Math.cos(a) * d));
    let y = Math.max(60, Math.min(WORLD.h - 60, G.player.y + Math.sin(a) * d));
    const f = collideCircle(G.city, x, y, 20); x = f.x; y = f.y;
    const car = { id: 9000 + Math.floor(G.rnd() * 800), x, y, angle: a + Math.PI, speed: 0, steer: 0, w: 46, h: 23, color: '#2b3a55', kind: 'police', health: 130, ai: null, dead: false, skid: 0 };
    G.cars.push(car);
    // Two officers ride with each car; they step out when it stops near the player.
    for (let i = 0; i < 2; i++) {
      const cop = makePed(x + (G.rnd() - 0.5) * 30, y + (G.rnd() - 0.5) * 30, '#33507e', 'cop');
      cop.carRef = car;
      G.peds.push(cop);
    }
  }
  for (const car of cops) {
    const dx = G.player.x - car.x, dy = G.player.y - car.y;
    const dist = Math.hypot(dx, dy);
    const targetAngle = Math.atan2(dy, dx);
    let diff = targetAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.steer = Math.max(-1, Math.min(1, diff * 2.2));
    car.angle += car.steer * dt * 1.9;
    const top = G.player.car ? 345 : 285;
    if (dist > 46) car.speed = Math.min(top, car.speed + 240 * dt);
    else { car.speed = Math.max(0, car.speed - 300 * dt); if (!G.player.car || Math.abs(G.player.car.speed) < 25) G.bust += dt * 0.4; }
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    const fixed = collideCircle(G.city, nx, ny, 20);
    if (Math.hypot(fixed.x - nx, fixed.y - ny) > 2 && Math.abs(car.speed) > 130) { car.health -= 6; car.speed *= 0.4; G.audio.crash(); }
    car.x = fixed.x; car.y = fixed.y;
    // Crew follows its car until the car is wrecked or the chase goes on foot.
    for (const p of G.peds) {
      if (p.carRef === car && !p.dead) {
        const pd = Math.hypot(p.x - car.x, p.y - car.y);
        if (car.dead || dist < 240 || pd > 320) { /* officer on foot: updatePed handles them */ }
        else { p.x = car.x + (p === G.peds[0] ? 8 : -8); p.y = car.y + 14; }
      }
    }
    if (car.health <= 0) car.dead = true;
  }
  // Despawn far-away police when the heat is off.
  if (want === 0) {
    G.cars = G.cars.filter((c) => c.kind !== 'police');
    G.peds = G.peds.filter((p) => p.role !== 'cop');
  }
}

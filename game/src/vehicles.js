// Solara Heat — cars: parked cars waiting to be stolen, traffic that drives the
// road grid on its own, and the arcade driving model for whatever the player drives.

import { ROADS_V, ROADS_H, ROAD_W, CAR_COLORS, WORLD } from './config.js';
import { collideCircle, isWater } from './world.js';

let nextId = 1;

export function makeCar(x, y, angle, color, kind) {
  return {
    id: nextId++, x, y, angle, speed: 0, steer: 0,
    w: 44, h: 22, color, kind: kind || 'civilian',
    health: 100, driver: null, ai: null, dead: false, skid: 0,
  };
}

/** Parked cars sprinkled along the avenues, plus the mission sports car handled elsewhere. */
export function spawnParked(rnd) {
  const cars = [];
  for (let i = 0; i < 26; i++) {
    const vertical = rnd() < 0.6;
    if (vertical) {
      const rx = ROADS_V[Math.floor(rnd() * ROADS_V.length)];
      const side = rnd() < 0.5 ? -1 : 1;
      cars.push(makeCar(rx + side * (ROAD_W / 2 - 18), 100 + rnd() * (WORLD.h - 200), side > 0 ? Math.PI / 2 : -Math.PI / 2, CAR_COLORS[i % CAR_COLORS.length], 'parked'));
    } else {
      const ry = ROADS_H[Math.floor(rnd() * ROADS_H.length)];
      const side = rnd() < 0.5 ? -1 : 1;
      cars.push(makeCar(100 + rnd() * 2400, ry + side * (ROAD_W / 2 - 18), side > 0 ? 0 : Math.PI, CAR_COLORS[(i + 3) % CAR_COLORS.length], 'parked'));
    }
  }
  return cars;
}

/** Traffic cars each follow one road line and pick a new direction at junctions. */
export function spawnTraffic(rnd) {
  const cars = [];
  for (let i = 0; i < 14; i++) {
    const vertical = rnd() < 0.5;
    const car = makeCar(0, 0, 0, CAR_COLORS[(i + 5) % CAR_COLORS.length], 'traffic');
    if (vertical) {
      const rx = ROADS_V[Math.floor(rnd() * ROADS_V.length)];
      const dir = rnd() < 0.5 ? 1 : -1;
      car.x = rx + dir * (ROAD_W / 4); car.y = 120 + rnd() * (WORLD.h - 240);
      car.angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      car.ai = { axis: 'v', line: rx, dir, speed: 120 + rnd() * 60 };
    } else {
      const ry = ROADS_H[Math.floor(rnd() * ROADS_H.length)];
      const dir = rnd() < 0.5 ? 1 : -1;
      car.x = 120 + rnd() * 2400; car.y = ry + dir * (ROAD_W / 4);
      car.angle = dir > 0 ? 0 : Math.PI;
      car.ai = { axis: 'h', line: ry, dir, speed: 120 + rnd() * 60 };
    }
    car.speed = car.ai.speed;
    cars.push(car);
  }
  return cars;
}

function nearestOther(car, cars, range) {
  let best = null, bd = range;
  for (const o of cars) {
    if (o === car || o.dead) continue;
    const d = Math.hypot(o.x - car.x, o.y - car.y);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}

export function updateTraffic(car, dt, G) {
  const ai = car.ai;
  if (!ai || car.dead) return;
  // Slow down when something is right ahead; stop fully when very close.
  const fx = car.x + Math.cos(car.angle) * 52, fy = car.y + Math.sin(car.angle) * 52;
  const ahead = nearestOther({ x: fx, y: fy }, G.cars, 30) || (G.player.car !== car && Math.hypot(G.player.x - fx, G.player.y - fy) < 30 ? G.player : null);
  let target = ai.speed;
  if (ahead) target = 0;
  car.speed += (target - car.speed) * Math.min(1, dt * 3);

  if (ai.axis === 'v') {
    car.y += ai.dir * car.speed * dt;
    car.x += (ai.line + ai.dir * (ROAD_W / 4) - car.x) * Math.min(1, dt * 2);
    car.angle = ai.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    for (const ry of ROADS_H) {
      if (Math.abs(car.y - ry) < 8 && car.speed > 20 && G.rnd() < 0.012) {
        ai.axis = 'h'; ai.line = ry; ai.dir = G.rnd() < 0.5 ? 1 : -1; car.y = ry;
      }
    }
    if (car.y < 60 || car.y > WORLD.h - 60) ai.dir *= -1;
  } else {
    car.x += ai.dir * car.speed * dt;
    car.y += (ai.line + ai.dir * (ROAD_W / 4) - car.y) * Math.min(1, dt * 2);
    car.angle = ai.dir > 0 ? 0 : Math.PI;
    for (const rx of ROADS_V) {
      if (Math.abs(car.x - rx) < 8 && car.speed > 20 && G.rnd() < 0.012) {
        ai.axis = 'v'; ai.line = rx; ai.dir = G.rnd() < 0.5 ? 1 : -1; car.x = rx;
      }
    }
    if (car.x < 60 || car.x > 2620) ai.dir *= -1;
  }
}

/** Arcade driving for the player's car. `inp` = {up, down, left, right, hand}. */
export function drivePlayerCar(car, dt, inp, G) {
  const accel = 260, maxF = 330, maxR = -120;
  if (inp.up) car.speed += accel * dt;
  else if (inp.down) car.speed -= (car.speed > 10 ? 340 : 170) * dt;
  else car.speed -= car.speed * 0.7 * dt;
  if (inp.hand) car.speed -= car.speed * 2.2 * dt;
  car.speed = Math.max(maxR, Math.min(maxF, car.speed));
  const steerTarget = (inp.left ? -1 : 0) + (inp.right ? 1 : 0);
  car.steer += (steerTarget - car.steer) * Math.min(1, dt * 10);
  if (Math.abs(car.speed) > 4) {
    car.angle += car.steer * (car.speed / 130) * dt * (car.speed < 0 ? -1 : 1);
  }
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const fixed = collideCircle(G.city, nx, ny, 20);
  // A hard stop against the world means a crash: damage, shake, noise.
  if (Math.hypot(fixed.x - nx, fixed.y - ny) > 2 && Math.abs(car.speed) > 120) {
    car.health -= Math.abs(car.speed) * 0.06;
    G.shake = Math.min(14, Math.abs(car.speed) * 0.05);
    G.audio.crash();
    spawnSparks(G, car.x, car.y, 10);
    car.speed *= -0.25;
  }
  car.x = fixed.x; car.y = fixed.y;
  car.skid = (Math.abs(car.steer) > 0.7 && Math.abs(car.speed) > 170) || (inp.hand && Math.abs(car.speed) > 60) ? 1 : 0;
  if (car.skid && Math.abs(car.speed) > 40) {
    G.skids.push({ x: car.x - Math.cos(car.angle) * 14, y: car.y - Math.sin(car.angle) * 14, life: 6 });
    if (G.skids.length > 240) G.skids.shift();
  }
  // Hitting other cars: both take damage, speeds trade a little.
  for (const o of G.cars) {
    if (o === car || o.dead) continue;
    const d = Math.hypot(o.x - car.x, o.y - car.y);
    if (d < 40 && d > 0.01) {
      const rel = Math.abs(car.speed - (o.speed || 0));
      if (rel > 60) {
        o.health -= rel * 0.08; car.health -= rel * 0.04;
        G.shake = Math.min(12, rel * 0.05); G.audio.crash();
        spawnSparks(G, (o.x + car.x) / 2, (o.y + car.y) / 2, 8);
      }
      const push = (40 - d) / 2;
      o.x += ((o.x - car.x) / d) * push; o.y += ((o.y - car.y) / d) * push;
      const f = collideCircle(G.city, o.x, o.y, 18); o.x = f.x; o.y = f.y;
    }
  }
  if (isWater(car.x, car.y)) { car.health = 0; }
  if (car.health <= 0 && !car.dead) { car.dead = true; spawnSparks(G, car.x, car.y, 24); }
  return Math.abs(car.speed);
}

export function spawnSparks(G, x, y, n) {
  for (let i = 0; i < n; i++) {
    const a = G.rnd() * Math.PI * 2, s = 40 + G.rnd() * 140;
    G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + G.rnd() * 0.4, max: 0.8, color: '#ffd166', size: 2 + G.rnd() * 2 });
  }
}

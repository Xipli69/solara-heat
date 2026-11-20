// Solara Heat — Port Solara itself: deterministic city generation (seeded, so the
// screenshot scenes and every visit see the same streets) plus collision helpers.

import { WORLD, ROADS_V, ROADS_H, ROAD_W, SAND_X, WATER_X, PARK, BUILDING_NAMES } from './config.js';

/** mulberry32: tiny seeded RNG so the city layout is repeatable. */
export function createRandom(seed) {
  let a = (seed | 0) || 1;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function isRoad(x, y) {
  for (const rx of ROADS_V) if (Math.abs(x - rx) < ROAD_W / 2) return true;
  for (const ry of ROADS_H) if (Math.abs(y - ry) < ROAD_W / 2) return true;
  return false;
}
export function isWater(x, y) { return x >= WATER_X; }
export function isSand(x, y) { return x >= SAND_X && x < WATER_X; }
export function inPark(x, y) { return x > PARK.x && x < PARK.x + PARK.w && y > PARK.y && y < PARK.y + PARK.h; }

const PALM_SPOTS = [];
const BUILDING_TINTS = ['#f6d8a8', '#f2b8a0', '#eec9d2', '#fdf3d8', '#cfe8d8', '#f9e2ae', '#d9e6f2', '#f5c6a5'];

export function buildCity(seed) {
  const rnd = createRandom(seed);
  const buildings = [];
  const palms = [];
  const lamps = [];
  const crates = [];
  let nameIdx = 0;

  // Blocks sit between neighbouring roads; each block holds 1-4 buildings.
  const xEdges = [60, ...ROADS_V.map((v) => v + ROAD_W / 2 + 26)];
  const xEnds = [...ROADS_V.map((v) => v - ROAD_W / 2 - 26), SAND_X - 40];
  const yEdges = [60, ...ROADS_H.map((v) => v + ROAD_W / 2 + 26)];
  const yEnds = [...ROADS_H.map((v) => v - ROAD_W / 2 - 26), WORLD.h - 80];

  for (let bi = 0; bi < xEdges.length; bi++) {
    for (let bj = 0; bj < yEdges.length; bj++) {
      const bx = xEdges[bi], by = yEdges[bj];
      const bw = xEnds[bi] - bx, bh = yEnds[bj] - by;
      if (bw < 120 || bh < 120) continue;
      if (bx < PARK.x + PARK.w && bx + bw > PARK.x && by < PARK.y + PARK.h && by + bh > PARK.y) continue; // keep the park clear
      const cols = bw > 340 ? 2 : 1;
      const rows = bh > 340 ? 2 : 1;
      for (let cx = 0; cx < cols; cx++) {
        for (let cy = 0; cy < rows; cy++) {
          const w = (bw / cols) - 22 - rnd() * 20;
          const h = (bh / rows) - 22 - rnd() * 20;
          const x = bx + cx * (bw / cols) + 10 + rnd() * 8;
          const y = by + cy * (bh / rows) + 10 + rnd() * 8;
          buildings.push({
            x, y, w, h,
            color: BUILDING_TINTS[Math.floor(rnd() * BUILDING_TINTS.length)],
            roof: ['#c96f4a', '#a85751', '#8d6e63', '#b08968'][Math.floor(rnd() * 4)],
            name: BUILDING_NAMES[nameIdx++ % BUILDING_NAMES.length],
            floors: 2 + Math.floor(rnd() * 5),
          });
        }
      }
    }
  }

  // Palm trees: along the beach, around the park and sprinkled on sidewalks.
  for (let y = 120; y < WORLD.h - 80; y += 130 + rnd() * 60) palms.push({ x: SAND_X + 40 + rnd() * 120, y });
  for (let i = 0; i < 26; i++) palms.push({ x: PARK.x + rnd() * PARK.w, y: PARK.y + rnd() * PARK.h });
  for (let i = 0; i < 40; i++) {
    const onV = rnd() < 0.5;
    const x = onV ? ROADS_V[Math.floor(rnd() * ROADS_V.length)] + (rnd() < 0.5 ? -1 : 1) * (ROAD_W / 2 + 14) : 120 + rnd() * (SAND_X - 240);
    const y = onV ? 120 + rnd() * (WORLD.h - 240) : ROADS_H[Math.floor(rnd() * ROADS_H.length)] + (rnd() < 0.5 ? -1 : 1) * (ROAD_W / 2 + 14);
    if (!isRoad(x, y)) palms.push({ x, y });
  }
  PALM_SPOTS.length = 0; PALM_SPOTS.push(...palms);

  // Street lamps at junctions and crates near the depot and alleys.
  for (const rx of ROADS_V) for (const ry of ROADS_H) lamps.push({ x: rx + ROAD_W / 2 + 10, y: ry + ROAD_W / 2 + 10 });
  for (let i = 0; i < 22; i++) {
    const x = 100 + rnd() * (SAND_X - 200), y = 100 + rnd() * (WORLD.h - 200);
    if (!isRoad(x, y) && !inPark(x, y)) crates.push({ x, y, s: 16 + rnd() * 10 });
  }

  return { buildings, palms, lamps, crates };
}

/** Circle vs. every solid: buildings, crates and the water line. Returns a push-out or null. */
export function collideCircle(city, x, y, r) {
  if (x < r) x = r; if (y < r) y = r;
  if (y > WORLD.h - r) y = WORLD.h - r;
  if (x > WATER_X - r) x = WATER_X - r; // the sea is a wall for people and cars alike
  for (const b of city.buildings) {
    if (x > b.x - r && x < b.x + b.w + r && y > b.y - r && y < b.y + b.h + r) {
      const left = x - (b.x - r), right = (b.x + b.w + r) - x;
      const top = y - (b.y - r), bottom = (b.y + b.h + r) - y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) x = b.x - r; else if (m === right) x = b.x + b.w + r;
      else if (m === top) y = b.y - r; else y = b.y + b.h + r;
    }
  }
  for (const c of city.crates) {
    const dx = x - c.x, dy = y - c.y;
    const d = Math.hypot(dx, dy), min = r + c.s * 0.6;
    if (d > 0.01 && d < min) { x = c.x + (dx / d) * min; y = c.y + (dy / d) * min; }
  }
  return { x, y };
}

export function pointInBuilding(city, x, y) {
  for (const b of city.buildings) if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return b;
  return null;
}

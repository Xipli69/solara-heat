// Solara Heat — screenshot staging. A ?shot=NAME URL freezes a deterministic,
// rich frame of the real game (same state the loop plays), so the maker's
// screenshots are honest renders: title, a police chase, a city-centre walk,
// and a fast coastal drive.

import { PLACES } from './config.js';
import { makeCar } from './vehicles.js';
import { makePed } from './people.js';

export function stageShot(G, name) {
  const P = G.player;
  G.frozen = true;
  if (name === 'title') {
    G.screen = 'title';
    P.x = 880; P.y = 900;
    G.camera.x = P.x - 640; G.camera.y = P.y - 400;
    return;
  }
  G.screen = 'play';
  if (name === 'chase') {
    // Cover: mid-chase on a downtown avenue, mission 4 heat.
    G.missions.state.index = 3;
    G.missions.startMission(3);
    G.missions.state.stage = 'lose';
    G.missions.say(['Cousin: Drive, primo, DRIVE!', 'Marisol: Lose the heat, then the safehouse.']);
    const car = makeCar(1400, 900, 0, '#f39c12', 'civilian');
    car.speed = 210; car.health = 62;
    G.cars.push(car);
    P.car = car; P.x = car.x; P.y = car.y; P.angle = 0;
    G.setWanted(3, true);
    for (let i = 0; i < 3; i++) {
      const cop = makeCar(1400 - 150 - i * 95, 900 + (i % 2 ? 34 : -30), 0, '#2b3a55', 'police');
      cop.speed = 200; cop.health = 130;
      G.cars.push(cop);
      G.peds.push(Object.assign(makePed(cop.x, cop.y + 20, '#33507e', 'cop'), { carRef: cop }));
    }
    const traffic = makeCar(1620, 934, 0, '#3498db', 'traffic');
    traffic.speed = 110; G.cars.push(traffic);
    for (let i = 0; i < 30; i++) G.skids.push({ x: 1400 - 40 - i * 13, y: 918 + Math.sin(i) * 3, life: 6 });
    G.skids.push({ x: 1355, y: 922, life: 6 });
    G.floaters.push({ x: 1330, y: 830, text: 'WANTED', color: '#ff6b6b', life: 1 });
    P.muzzle = 0.2;
    G.bust = 0.25;
  } else if (name === 'foot') {
    // On foot in the centre: pedestrians, signs, palms, first mission marker.
    G.missions.startMission(0);
    P.x = 700; P.y = 950; P.angle = -0.5;
    P.car = null;
    const spots = [[700, 782], [800, 940], [600, 940], [950, 782], [520, 782], [1010, 940], [806, 700]];
    spots.forEach(([x, y], i) => {
      const ped = makePed(x, y, ['#e91e63', '#00bcd4', '#8bc34a', '#ff9800', '#ba68c8', '#fff176'][i], 'ped');
      ped.angle = i * 1.1;
      G.peds.push(ped);
    });
    const parked = makeCar(790, 800, Math.PI / 2, '#2ecc71', 'parked');
    G.cars.push(parked);
  } else if (name === 'drive') {
    // Coastal run: fast on the beach road with traffic and the sea beside.
    G.missions.state.index = 5;
    G.missions.startMission(5);
    G.missions.state.stage = 'run';
    G.missions.say(['Nico: Ledger is mine. Time to fly.']);
    const car = makeCar(2440, 1500, Math.PI / 2, '#e74c3c', 'civilian');
    car.speed = 300; car.health = 88;
    G.cars.push(car);
    P.car = car; P.x = car.x; P.y = car.y; P.angle = Math.PI / 2;
    const t1 = makeCar(2440 + 34, 1180, Math.PI / 2, '#ecf0f1', 'traffic'); t1.speed = 130; G.cars.push(t1);
    const t2 = makeCar(2440 - 34, 1900, -Math.PI / 2, '#9b59b6', 'traffic'); t2.speed = 120; G.cars.push(t2);
    for (let i = 0; i < 22; i++) G.skids.push({ x: 2432, y: 1500 - 30 - i * 12, life: 6 });
    G.setWanted(2, true);
    const cop = makeCar(2440, 1300, Math.PI / 2, '#2b3a55', 'police');
    cop.speed = 260; cop.health = 130; G.cars.push(cop);
    G.floaters.push({ x: 2380, y: 1400, text: 'ESCAPE!', color: '#ffd166', life: 1 });
  } else {
    // Fallback: a quiet start-of-game frame at the spawn corner.
    P.x = PLACES.start.x; P.y = PLACES.start.y;
    G.missions.startMission(0);
  }
  G.syncCamera(true);
  // Settle one rendered frame's worth of particles for texture.
  for (let i = 0; i < 14; i++) {
    G.particles.push({
      x: P.x + (G.rnd() - 0.5) * 200, y: P.y + (G.rnd() - 0.5) * 140,
      vx: 0, vy: -12, life: 0.8, max: 0.8, color: '#fff3b0', size: 2,
    });
  }
}

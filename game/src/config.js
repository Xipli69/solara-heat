// Solara Heat — static data: the shape of Port Solara and the story chain.
// Everything in this file is declarative; behaviour lives in the other modules.

export const WORLD = { w: 3200, h: 2400 };
export const ROAD_W = 132;
// Vertical avenues (x centres) and horizontal streets (y centres).
export const ROADS_V = [360, 880, 1400, 1920, 2440];
export const ROADS_H = [340, 860, 1380, 1900];
export const SAND_X = 2680;   // beach sand starts here
export const WATER_X = 2920;  // open water starts here
export const PARK = { x: 470, y: 450, w: 300, h: 300 }; // Solara Green, inside one block

export const BUILDING_NAMES = [
  'Hotel Brisa', 'Cantina Sol', 'Banco del Mar', 'Taller Ruiz', 'Farmacia Luz',
  'Cafe Palma', 'Gym Ola', 'Mercado Solara', 'Torre Coral', 'Pizzeria Nino',
  'Lavanderia Azul', 'Joyeria Mar', 'Bar La Ola', 'Clinica Vida', 'Torre Brisa',
  'Supermar 24h', 'Peluqueria Ana', 'Oficinas Puerto', 'Cine Solara', 'Taller Norte',
  'Panaderia Sol', 'Hotel Miramar', 'Tienda Coco', 'Banco Coral', 'Restaurante Faro',
  'Galeria Arte', 'Torre Palma', 'Deposito Sur', 'Club Nautico', 'Escuela Mar',
];

export const CAR_COLORS = ['#e74c3c', '#f39c12', '#2ecc71', '#3498db', '#ecf0f1', '#9b59b6', '#e67e22', '#1abc9c', '#fd79a8', '#95a5a6'];
export const PED_COLORS = ['#f1c40f', '#e91e63', '#00bcd4', '#8bc34a', '#ff9800', '#ba68c8', '#4db6ac', '#fff176'];

// Key places used by the story and the map.
export const PLACES = {
  cantina:  { x: 470,  y: 940,  name: "Marisol's Cantina" },
  depot:    { x: 2480, y: 420,  name: 'North Depot' },
  showroom: { x: 1450, y: 1420, name: 'Aurelio Motors' },
  chopshop: { x: 420,  y: 1980, name: 'South Chop Shop' },
  safehouse:{ x: 1980, y: 940,  name: 'Safehouse' },
  marina:   { x: 2720, y: 1980, name: 'Marina Gate' },
  start:    { x: 620,  y: 980,  name: 'Old Town' },
};

export const PLAYER_NAME = 'Nico Reyes';
export const FIXER_NAME = 'Marisol Vega';
export const DEBT = 5000;

// The six-mission story chain. `kind` selects the logic in missions.js.
export const MISSIONS = [
  {
    id: 'meet', name: '1. First Call', reward: 150, kind: 'goto', target: 'cantina',
    intro: ['Marisol: Nico. You owe the house five grand.', 'Marisol: Work it off. Come see me at the cantina.'],
    objective: "Drive to Marisol's Cantina",
    done: 'Marisol: Good. You still know how to find me.',
  },
  {
    id: 'package', name: '2. Hot Package', reward: 350, kind: 'timed', target: 'depot', time: 75,
    intro: ['Marisol: A package. North Depot. Clock is ticking, wheelman.'],
    objective: 'Deliver the package to the North Depot',
    done: 'Marisol: On time. The house notices that.',
  },
  {
    id: 'steal', name: '3. Borrowed Wheels', reward: 500, kind: 'steal', target: 'chopshop',
    intro: ['Marisol: Aurelio Motors has a red Vantara GT.', 'Marisol: It wants to live at the South Chop Shop.'],
    objective: 'Steal the red Vantara GT and deliver it',
    done: 'Marisol: Beautiful car. Shame about the owner.',
  },
  {
    id: 'escape', name: '4. Loud Pickup', reward: 650, kind: 'escape', target: 'safehouse', stars: 3,
    intro: ['Marisol: Pick up my cousin at the depot.', 'Marisol: The police will object. Lose them, then the safehouse.'],
    objective: 'Pick up the cousin, lose the heat, reach the Safehouse',
    done: 'Marisol: Cousin safe, cops lost. Professional.',
  },
  {
    id: 'race', name: '5. Solara Circuit', reward: 800, kind: 'race', time: 110,
    intro: ['Marisol: Street race. Hit every checkpoint, prove you are the fastest in Port Solara.'],
    objective: 'Win the Solara Circuit checkpoint race',
    done: 'Marisol: Fastest in Solara. The house is impressed.',
  },
  {
    id: 'finale', name: '6. The Ledger', reward: 1200, kind: 'finale', target: 'marina', stars: 4,
    intro: ['Marisol: Last job. Grab the debt ledger from the depot vault crew.', 'Marisol: Then run for the Marina Gate. Burn the debt, Nico.'],
    objective: 'Grab the ledger at the depot, escape to the Marina Gate',
    done: 'Marisol: Ledger burned. Debt cleared. You are free, Nico Reyes.',
  },
];

// Race checkpoints (world coordinates on road junctions).
export const RACE_POINTS = [
  { x: 880, y: 340 }, { x: 1920, y: 340 }, { x: 2440, y: 860 },
  { x: 1920, y: 1380 }, { x: 880, y: 1900 }, { x: 360, y: 860 },
];

// Ten hidden cash packages scattered over the city.
export const PACKAGE_SPOTS = [
  { x: 620, y: 560 }, { x: 1560, y: 500 }, { x: 2600, y: 620 }, { x: 1050, y: 1050 },
  { x: 2150, y: 1080 }, { x: 620, y: 1560 }, { x: 1600, y: 1620 }, { x: 2520, y: 1560 },
  { x: 1080, y: 2080 }, { x: 2780, y: 1150 },
];

export const SAVE_KEY = 'solara-heat-save-v1';

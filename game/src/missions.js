// Solara Heat — the six-mission story chain for fixer Marisol Vega, plus free-roam
// cash packages. A mission is a small state machine: intro dialogue, one active
// objective with a marker, then a payout banner and the next job.

import { MISSIONS, PLACES, RACE_POINTS, PACKAGE_SPOTS } from './config.js';
import { makeCar } from './vehicles.js';
import { makePed } from './people.js';

export function createMissions(G) {
  const S = {
    index: 0,          // next mission to run
    active: null,      // live mission state
    dialogue: [],      // lines still on screen
    dialogueT: 0,
    banner: '', bannerT: 0,
    packages: PACKAGE_SPOTS.map((p) => ({ ...p, taken: false })),
    packagesFound: 0,
    raceIdx: 0, stage: '',
  };

  function say(lines) { S.dialogue = [...lines]; S.dialogueT = 5.5; }
  function banner(text, sub) { S.banner = text; S.bannerSub = sub || ''; S.bannerT = 3.4; G.audio.jingle(); }

  function targetPos() {
    if (!S.active) return null;
    const m = S.active.def;
    if (m.kind === 'race') return RACE_POINTS[S.raceIdx] || null;
    if (m.kind === 'finale' && S.stage === 'grab') return PLACES.depot;
    if (m.kind === 'escape' && S.stage === 'pickup') return PLACES.depot;
    return PLACES[m.target] || null;
  }

  function startMission(i) {
    const def = MISSIONS[i];
    if (!def) return;
    S.active = { def, t: def.time || 0, failed: '' };
    S.stage = def.kind === 'escape' ? 'pickup' : def.kind === 'finale' ? 'grab' : 'main';
    S.raceIdx = 0;
    say(def.intro);
    if (def.stars) G.setWanted(Math.max(G.wanted, def.stars), true);
    if (def.kind === 'steal') {
      // The red Vantara GT waits outside Aurelio Motors, keys in.
      const spot = PLACES.showroom;
      const car = makeCar(spot.x + 60, spot.y + 70, 0, '#d21f3c', 'sport');
      car.model = 'Vantara GT'; car.health = 120;
      G.cars.push(car);
      S.active.targetCar = car;
    }
    if (def.kind === 'escape') {
      const cousin = makePed(PLACES.depot.x + 30, PLACES.depot.y + 30, '#ff7043', 'cousin');
      cousin.isCousin = true;
      G.peds.push(cousin);
    }
    if (def.kind === 'finale') {
      // The vault crew guards the ledger at the depot.
      for (let k = 0; k < 3; k++) {
        const g = makePed(PLACES.depot.x - 40 + k * 40, PLACES.depot.y + 60, '#5d4037', 'guard');
        g.hp = 80;
        G.peds.push(g);
      }
    }
    G.save();
  }

  function complete() {
    const def = S.active.def;
    G.addCash(def.reward);
    say([def.done]);
    banner('MISSION COMPLETE', `${def.name}  +$${def.reward}`);
    S.index += 1;
    S.active = null;
    G.peds = G.peds.filter((p) => p.role !== 'guard' && p.role !== 'cousin');
    G.save();
    if (S.index >= MISSIONS.length) { G.screen = 'complete'; G.audio.jingle(); }
  }

  function fail(reason) {
    if (!S.active) return;
    S.active = null;
    G.audio.fail();
    banner('MISSION FAILED', reason + ' — the job restarts');
    G.peds = G.peds.filter((p) => p.role !== 'guard' && p.role !== 'cousin');
    setTimeout(() => { if (G.screen === 'play') startMission(S.index); }, 3600);
  }

  function near(pos, r) { return pos && Math.hypot(G.player.x - pos.x, G.player.y - pos.y) < r; }

  function update(dt) {
    if (S.dialogueT > 0) S.dialogueT -= dt;
    if (S.bannerT > 0) S.bannerT -= dt;
    // Hidden packages are free-roam money, on foot or by car.
    for (const pk of S.packages) {
      if (!pk.taken && Math.hypot(G.player.x - pk.x, G.player.y - pk.y) < 30) {
        pk.taken = true; S.packagesFound += 1;
        G.addCash(100); G.audio.pickup();
        G.floatText(pk.x, pk.y - 20, '+$100 package', '#ffd166');
        G.save();
      }
    }
    if (!S.active || G.screen !== 'play') return;
    const m = S.active;
    const def = m.def;
    if (def.time && def.kind !== 'race') { m.t -= dt; if (m.t <= 0) return fail('Out of time'); }
    if (def.kind === 'race') { m.t -= dt; if (m.t <= 0) return fail('Too slow'); }

    switch (def.kind) {
      case 'goto': if (near(targetPos(), 70)) complete(); break;
      case 'timed': if (near(targetPos(), 70)) complete(); break;
      case 'steal': {
        if (!m.gotCar) {
          if (G.player.car === m.targetCar) { m.gotCar = true; say(['Marisol: That is the car. Chop shop. Now.']); G.setWanted(Math.max(G.wanted, 2)); }
          else if (m.targetCar.dead) return fail('The Vantara GT was wrecked');
        } else if (near(targetPos(), 80) && G.player.car === m.targetCar) complete();
        break;
      }
      case 'escape': {
        if (S.stage === 'pickup') { /* cousin boards via missionEvent */ }
        else if (S.stage === 'lose') {
          if (G.wanted === 0) { S.stage = 'deliver'; say(['Marisol: Heat is gone. Bring him home.']); }
        } else if (S.stage === 'deliver' && near(targetPos(), 80)) complete();
        break;
      }
      case 'race': {
        const cp = RACE_POINTS[S.raceIdx];
        if (cp && near(cp, 85)) {
          S.raceIdx += 1; G.audio.pickup();
          G.floatText(cp.x, cp.y - 30, `Checkpoint ${S.raceIdx}/${RACE_POINTS.length}`, '#7CFC98');
          if (S.raceIdx >= RACE_POINTS.length) complete();
        }
        break;
      }
      case 'finale': {
        if (S.stage === 'grab') {
          if (near(PLACES.depot, 75)) {
            S.stage = 'run';
            G.setWanted(5, true);
            say(['Nico: Ledger is mine. Time to fly.']);
            G.floatText(G.player.x, G.player.y - 30, 'LEDGER TAKEN', '#ffd166');
          }
        } else if (near(PLACES.marina, 90)) complete();
        break;
      }
      default: break;
    }
  }

  return {
    state: S, say, banner, startMission, complete, fail, update, targetPos,
    objectiveText() {
      if (!S.active) return S.index >= MISSIONS.length ? 'Free roam — debt cleared. Find the hidden packages!' : 'Free roam — head to the M marker for the next job';
      const def = S.active.def;
      if (def.kind === 'steal' && !S.active.gotCar) return 'Steal the red Vantara GT at Aurelio Motors';
      if (def.kind === 'escape') {
        if (S.stage === 'pickup') return 'Pick up the cousin at the North Depot';
        if (S.stage === 'lose') return 'Lose the police heat!';
        return 'Reach the Safehouse';
      }
      if (def.kind === 'race') return `Solara Circuit — checkpoint ${Math.min(S.raceIdx + 1, RACE_POINTS.length)}/${RACE_POINTS.length}`;
      if (def.kind === 'finale' && S.stage === 'grab') return 'Grab the debt ledger at the North Depot';
      if (def.kind === 'finale') return 'Escape to the Marina Gate!';
      return def.objective;
    },
    timerText() {
      if (!S.active || !S.active.def.time) return '';
      return `${Math.max(0, Math.ceil(S.active.t))}s`;
    },
    event(name) {
      if (name === 'cousin-in' && S.active && S.active.def.kind === 'escape' && S.stage === 'pickup') {
        S.stage = 'lose';
        G.setWanted(Math.max(G.wanted, 3), true);
        say(['Cousin: Drive, primo, DRIVE!']);
      }
    },
    freeRoamTarget() {
      // Between missions the M marker points at the cantina, where work begins.
      if (S.active || S.index >= MISSIONS.length) return null;
      return PLACES.cantina;
    },
  };
}

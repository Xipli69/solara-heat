// Solara Heat — hand-in program for the gta6-01 bounty (Node 22, stdlib only).
// The game itself is the static site in game/ next to this file: plain HTML and ES
// modules, no build step, nothing fetched from the network. This program's whole
// job is delivery: copy game/ and screenshots/ into the output folder and write
// dossier.json there with the vendored make.fun library, so the judge receives
// exactly the bytes that were built and screenshotted locally.
// Run it with:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Play it with: node serve.ts   (then open the local address it prints)

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// Caps mirror the scorer's gate: the dossier text is capped at 160 KiB, at most 4
// screenshots of at most 256 KiB each, and game/ holds at most 993 entries, 48 MiB
// in total, with no single path longer than 1000 bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
console.log('Solara Heat handed in to', out);

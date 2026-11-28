/**
 * Lance une commande et note sa durée pour `pnpm durees` (scripts/durees/noter.sh).
 *
 *   node chrono.mjs <phase> <commande…> -- [arguments de l'appelant]
 *
 * Dans package.json, la ligne finit par « -- » : ce que l'appelant ajoute
 * (`pnpm test:server <fichier>`) arrive après. Avec le moindre argument, la
 * commande n'a pas tout joué (un fichier, un filtre) ou pas comme d'habitude (une
 * option) : elle est lancée telle quelle, sans être notée. Seule la commande
 * entière et verte est une mesure, comme pour la CI. Rien n'est noté en CI ni
 * sur Vercel.
 *
 * Ce processus reste le parent de la commande : il lui transmet SIGTERM et
 * SIGHUP (un `kill` de ce seul processus ne doit pas laisser vitest orphelin) et
 * attend sa fin sur SIGINT (Ctrl-C atteint déjà tout le groupe). Le code de
 * sortie est toujours celui de la commande ; tuée par un signal, 128 + son numéro.
 *
 * En Node et pas en bash : bash n'exécute un `trap` qu'après la fin de la
 * commande au premier plan, et une commande en arrière-plan y ignore Ctrl-C.
 * Tests : scripts/__tests__/durees-noter.test.ts.
 */

import { spawn, spawnSync } from 'node:child_process';
import { constants } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [phase, ...reste] = process.argv.slice(2);
const coupure = reste.indexOf('--');
const commande = coupure === -1 ? reste : reste.slice(0, coupure);
const ajoutes = coupure === -1 ? [] : reste.slice(coupure + 1);

if (!phase || commande.length === 0) {
	console.error('usage : node chrono.mjs <phase> <commande…> -- [arguments]');
	process.exit(1);
}

const horsPoste = Boolean(process.env.CI || process.env.GITHUB_ACTIONS || process.env.VERCEL);
const aNoter = ajoutes.length === 0 && !horsPoste;
const debut = Math.floor(Date.now() / 1000);

const enfant = spawn(commande[0], [...commande.slice(1), ...ajoutes], { stdio: 'inherit' });

for (const signal of ['SIGTERM', 'SIGHUP']) process.on(signal, () => enfant.kill(signal));
process.on('SIGINT', () => {});

enfant.on('error', (erreur) => {
	console.error(`⛔ ${commande[0]} : ${erreur.message}`);
	process.exit(127);
});

enfant.on('exit', (code, signal) => {
	if (signal !== null) process.exit(128 + (constants.signals[signal] ?? 0));
	if (code === 0 && aNoter) {
		const noteur = join(dirname(fileURLToPath(import.meta.url)), 'noter.sh');
		spawnSync('bash', [noteur, phase, String(debut)], { stdio: 'ignore' });
	}
	process.exit(code ?? 1);
});

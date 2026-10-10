/**
 * Cliquet des types des tests.
 *
 * `pnpm check` (la barrière de la CI) exclut les tests : vitest les exécute sans
 * regarder les types. Le 2026-10-10, avec les tests inclus, on comptait 1 819
 * erreurs dans 216 fichiers — un test peut ainsi rester vert en fabriquant une
 * forme que l'app ne produit jamais (`multiply(a, b)` sans style d'affichage).
 *
 * Plutôt que de tout corriger d'un coup, un cliquet PAR FICHIER, enregistré dans
 * tests/cliquet-types-tests.json :
 *   - un fichier qui gagne une erreur, ou un fichier absent qui en a → échec :
 *     les nouveaux tests naissent typés ;
 *   - un fichier qui en perd → échec aussi, avec la commande qui abaisse le
 *     cliquet : sans ça, une erreur corrigée laisserait une place libre à une
 *     nouvelle, et le cliquet ne descendrait jamais.
 * Par fichier et non au total : corriger 5 erreurs ici ne doit pas en autoriser
 * 5 ailleurs.
 *
 * Moteur : svelte-check --tsgo (TypeScript 7). Le moteur classique, tests inclus,
 * monte à 7,1 Go sur un tas plafonné à 8 Go (mesuré le 2026-10-10) ; tsgo, 26 s
 * et 5,5 Go. Les deux moteurs concordent sur ces erreurs à 2 près sur 1 812.
 *
 * Usage : pnpm types:cliquet          (vérifie)
 *         pnpm types:cliquet --maj    (réécrit le cliquet après des corrections)
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

export type ErrorCounts = Record<string, number>;

export interface CountChange {
	file: string;
	before: number;
	after: number;
}

const RATCHET_FILE = 'tests/cliquet-types-tests.json';
const ERROR_LINE = /^\d+ ERROR "([^"]+)" /;

/** Erreurs par fichier, d'après la sortie `--output machine`. extern/ est
 *  ignoré : présent en local, absent en CI (cf. scripts/check-incremental.sh). */
export function countErrors(output: string): ErrorCounts {
	const counts: ErrorCounts = {};
	for (const line of output.split('\n')) {
		const m = ERROR_LINE.exec(line);
		if (!m || m[1].startsWith('extern/')) continue;
		counts[m[1]] = (counts[m[1]] ?? 0) + 1;
	}
	return counts;
}

export function compareCounts(
	ratchet: ErrorCounts,
	current: ErrorCounts
): { increases: CountChange[]; decreases: CountChange[] } {
	const increases: CountChange[] = [];
	const decreases: CountChange[] = [];
	const files = new Set([...Object.keys(ratchet), ...Object.keys(current)]);
	for (const file of [...files].sort()) {
		const before = ratchet[file] ?? 0;
		const after = current[file] ?? 0;
		if (after > before) increases.push({ file, before, after });
		else if (after < before) decreases.push({ file, before, after });
	}
	return { increases, decreases };
}

function total(counts: ErrorCounts): number {
	return Object.values(counts).reduce((a, b) => a + b, 0);
}

function writeRatchet(counts: ErrorCounts): void {
	const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
	writeFileSync(RATCHET_FILE, JSON.stringify(sorted, null, '\t') + '\n');
}

function runCheck(): string {
	const r = spawnSync(
		'npx',
		['svelte-check', '--tsconfig', './tsconfig.json', '--tsgo', '--threshold', 'error', '--output', 'machine'],
		{
			encoding: 'utf-8',
			maxBuffer: 256 * 1024 * 1024,
			env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' }
		}
	);
	const output = `${r.stdout ?? ''}${r.stderr ?? ''}`;
	// Tué par un signal, ou sans ligne COMPLETED : la sortie est tronquée et
	// « peu d'erreurs » n'y voudrait rien dire. Aucun verdict, aucune écriture.
	if (r.signal || !/ COMPLETED /.test(output)) {
		console.error('⛔ La vérification n’a pas abouti : rien n’a été comparé.');
		console.error(output.split('\n').slice(-15).join('\n'));
		process.exit(2);
	}
	return output;
}

function main(): void {
	const output = runCheck();
	const current = countErrors(output);

	if (process.argv.includes('--maj')) {
		writeRatchet(current);
		console.log(`✓ Cliquet réécrit : ${total(current)} erreurs dans ${Object.keys(current).length} fichiers.`);
		return;
	}

	const ratchet = JSON.parse(readFileSync(RATCHET_FILE, 'utf-8')) as ErrorCounts;
	const { increases, decreases } = compareCounts(ratchet, current);

	if (increases.length > 0) {
		console.error('⛔ Erreurs de types en HAUSSE dans des tests (un test doit être typé) :');
		for (const c of increases) {
			console.error(`\n  ${c.file} : ${c.before} → ${c.after}`);
			for (const line of output.split('\n')) {
				if (ERROR_LINE.exec(line)?.[1] === c.file) console.error(`    ${line.replace(/^\d+ ERROR "[^"]+" /, '')}`);
			}
		}
	}
	if (decreases.length > 0) {
		console.error(
			increases.length > 0 ? '\nEn baisse :' : '⛔ Erreurs de types en BAISSE — il reste à abaisser le cliquet :'
		);
		for (const c of decreases) console.error(`  ${c.file} : ${c.before} → ${c.after}`);
		console.error('\nLancer `pnpm types:cliquet --maj` et commiter tests/cliquet-types-tests.json.');
	}
	if (increases.length > 0 || decreases.length > 0) process.exit(1);

	console.log(`✓ Cliquet tenu : ${total(current)} erreurs de types dans ${Object.keys(current).length} fichiers de tests.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();

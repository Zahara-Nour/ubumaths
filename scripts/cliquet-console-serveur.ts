/**
 * Cliquet des `console.*` du code serveur (écart L8 de docs/systeme/serveur.md).
 *
 * Le code serveur journalise en partie par `console.*` direct, sans le masquage
 * des données personnelles de `createServerLogger` (src/lib/utils/logger.ts).
 * Décision de David : tout passera par le logger, en lots. En attendant, un
 * cliquet PAR FICHIER, enregistré dans tests/fixtures/cliquet-console-serveur.json :
 *   - un fichier qui gagne un appel, ou un fichier absent qui en a → échec :
 *     le code neuf naît avec le logger ;
 *   - un fichier qui en perd → échec aussi, avec la commande qui abaisse le
 *     cliquet : sinon un appel migré laisserait la place à un nouveau.
 *
 * Périmètre : `src/lib/server/**` (tout `.ts`/`.js`) et, sous `src/routes/**`,
 * les fichiers serveur (`+server`, `*.server`, ou sous un dossier `server/`), plus
 * `src/hooks.server.ts`.
 * Hors tests (`__tests__/`, `*.test.*`, `*.spec.*`).
 *
 * Comptage sur l'arbre syntaxique (compilateur TypeScript) : un `console.error`
 * dans un commentaire ou une chaîne ne compte pas. Seule la forme
 * `console.<méthode>(…)` compte : `console['error'](…)`, un alias
 * (`const log = console.log`) ou une déstructuration passent sous le radar.
 *
 * La garde vitest : src/lib/__tests__/console-serveur-cliquet.test.ts.
 *
 * Usage : pnpm logs:cliquet          (vérifie)
 *         pnpm logs:cliquet --maj    (réécrit la référence après une migration ;
 *                                     refusé si un compte monte, sauf --accepter-hausse)
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import ts from 'typescript';

export type ConsoleCounts = Record<string, number>;

export interface CountChange {
	file: string;
	before: number;
	after: number;
}

export const RATCHET_FILE = 'tests/fixtures/cliquet-console-serveur.json';

const CONSOLE_METHODS = new Set(['log', 'info', 'warn', 'error', 'debug', 'trace']);
const SOURCE_FILE = /\.(ts|js)$/;
const TEST_FILE = /\.(test|spec)\.(ts|js)$/;
// Sous src/routes : `+server.ts`, `+page.server.ts`, `hooks.server.ts`, ou un dossier `server/`
const ROUTE_SERVER_FILE = /(^|\/)(\+server|[^/]*\.server)\.(ts|js)$|(^|\/)server\//;

/** Nombre d'appels `console.<méthode>(…)` dans un source, commentaires et chaînes exclus. */
export function countConsoleCalls(source: string, fileName = 'fichier.ts'): number {
	const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, false);
	let count = 0;
	const visit = (node: ts.Node): void => {
		if (
			ts.isCallExpression(node) &&
			ts.isPropertyAccessExpression(node.expression) &&
			ts.isIdentifier(node.expression.expression) &&
			node.expression.expression.text === 'console' &&
			CONSOLE_METHODS.has(node.expression.name.text)
		) {
			count++;
		}
		ts.forEachChild(node, visit);
	};
	visit(sourceFile);
	return count;
}

function walk(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return entry.name === '__tests__' ? [] : walk(path);
		return SOURCE_FILE.test(entry.name) && !TEST_FILE.test(entry.name) ? [path] : [];
	});
}

/** Fichiers serveur du périmètre, chemins relatifs à `root` en `/`. */
export function serverFiles(root: string): string[] {
	const toRelative = (path: string) => relative(root, path).split(sep).join('/');
	const lib = walk(join(root, 'src/lib/server')).map(toRelative);
	const routes = walk(join(root, 'src/routes'))
		.map(toRelative)
		.filter((file) => ROUTE_SERVER_FILE.test(file.slice('src/routes/'.length)));
	// Hors des deux dossiers : le hook, par lequel passe chaque requête
	const hooks = ['src/hooks.server.ts', 'src/hooks.server.js'].filter((file) =>
		existsSync(join(root, file))
	);
	return [...lib, ...routes, ...hooks].sort();
}

/** Comptes par fichier ; les fichiers sans appel n'y figurent pas. */
export function countServerConsoleCalls(root: string): ConsoleCounts {
	const counts: ConsoleCounts = {};
	for (const file of serverFiles(root)) {
		const n = countConsoleCalls(readFileSync(join(root, file), 'utf-8'), file);
		if (n > 0) counts[file] = n;
	}
	return counts;
}

export function compareCounts(
	ratchet: ConsoleCounts,
	current: ConsoleCounts
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

export function total(counts: ConsoleCounts): number {
	return Object.values(counts).reduce((a, b) => a + b, 0);
}

export function readRatchet(root: string): ConsoleCounts {
	return JSON.parse(readFileSync(join(root, RATCHET_FILE), 'utf-8')) as ConsoleCounts;
}

/** Message d'échec en français, ou null si le cliquet tient. */
export function ratchetReport(ratchet: ConsoleCounts, current: ConsoleCounts): string | null {
	const { increases, decreases } = compareCounts(ratchet, current);
	const lines: string[] = [];
	if (increases.length > 0) {
		lines.push(
			'⛔ Nouveaux console.* dans le code serveur : utilise createServerLogger',
			"   (import { createServerLogger } from '$lib/utils/logger'), qui masque les données personnelles."
		);
		for (const c of increases) lines.push(`   ${c.file} : ${c.before} → ${c.after}`);
	}
	if (decreases.length > 0) {
		lines.push(
			'✂️  Des console.* ont disparu : bravo. Abaisse le cliquet avec `pnpm logs:cliquet --maj`',
			'   (sinon la place libérée resterait ouverte à un nouvel appel).'
		);
		for (const c of decreases) lines.push(`   ${c.file} : ${c.before} → ${c.after}`);
	}
	return lines.length > 0 ? lines.join('\n') : null;
}

function writeRatchet(root: string, counts: ConsoleCounts): void {
	const sorted = Object.fromEntries(
		Object.entries(counts).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
	);
	writeFileSync(join(root, RATCHET_FILE), JSON.stringify(sorted, null, '\t') + '\n');
}

function main(): void {
	const root = process.cwd();
	const current = countServerConsoleCalls(root);

	if (process.argv.includes('--maj')) {
		// `--maj` abaisse le cliquet ; il n'entérine une hausse que si on le dit
		const { increases } = compareCounts(readRatchet(root), current);
		if (increases.length > 0 && !process.argv.includes('--accepter-hausse')) {
			console.error(ratchetReport(readRatchet(root), current));
			console.error(
				'⛔ --maj refusé : des comptes montent (ajoute --accepter-hausse si c’est voulu).'
			);
			process.exit(1);
		}
		writeRatchet(root, current);
		console.log(
			`✓ Cliquet réécrit : ${total(current)} appels console.* dans ${Object.keys(current).length} fichiers.`
		);
		return;
	}

	const report = ratchetReport(readRatchet(root), current);
	if (report) {
		console.error(report);
		process.exit(1);
	}
	console.log(
		`✓ Cliquet tenu : ${total(current)} appels console.* dans ${Object.keys(current).length} fichiers.`
	);
}

if (import.meta.url === `file://${process.argv[1]}`) main();

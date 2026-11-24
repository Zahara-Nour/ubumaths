/**
 * `pnpm ecarts` : le registre unique des écarts
 * =============================================
 *
 * Un écart = une ligne de docs/ecarts/registre.md, avec sa preuve rejouable.
 *
 *   pnpm ecarts                       les écarts ouverts, par type
 *   pnpm ecarts rejouer [<id>…]       rejoue la preuve des écarts ouverts (ou de
 *                                     ceux nommés) et affiche le bilan : preuves
 *                                     vertes, cassées, toujours ouverts, à la main
 *   pnpm ecarts rejouer --barrer      en plus, barre dans le registre les lignes à
 *                                     preuve verte (à commiter : doc, direct sur main)
 *   pnpm ecarts ajouter <lettre> --domaine <d> --constat <c> --preuve <p> [--etat <e>]
 *                                     ajoute un écart, donne son numéro
 *
 * Preuves : `à la main` (jamais rejouée) · `test tests/ecarts/<f>.test.ts [› nom]`
 * (test rouge tant que l'écart est vrai, joué par le projet vitest `ecarts`, hors
 * CI) · `commande \`…\`` (sortie 0 = l'écart n'est plus vrai).
 *
 * Sorties : 0 fait (même avec des preuves rouges ou cassées : c'est le bilan qui le
 * dit) · 1 registre absent ou mal formé, ajout refusé, identifiant inconnu ou déjà
 * clos · 2 usage.
 * Règles et tests : logique.ts, scripts/__tests__/ecarts.test.ts.
 * Doc : docs/pratiques/registre-des-ecarts.md.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	TYPES,
	addEntry,
	commandOutcome,
	formatEntry,
	formatReport,
	idsToStrike,
	isVitestReport,
	parseArgs,
	parseRegistry,
	strikeEntries,
	vitestOutcome,
	type Entry,
	type EntryInput,
	type Proof,
	type Registry,
	type ReplayResult,
	type VitestReport
} from './logique.ts';

// ============================================================================
// Constantes
// ============================================================================

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REGISTRY_FILE = process.env.ECARTS_REGISTRE ?? join(ROOT, 'docs/ecarts/registre.md');
const COMMAND_TIMEOUT_MS = 120_000;
const VITEST_TIMEOUT_MS = 600_000;
const USAGE = `Usage : pnpm ecarts
        pnpm ecarts rejouer [<id>…] [--barrer]
        pnpm ecarts ajouter <${Object.keys(TYPES).join('|')}> --domaine <d> --constat <c> --preuve <p> [--etat <e>]`;

// ============================================================================
// Fonctions
// ============================================================================

function stop(...lines: string[]): never {
	for (const line of lines) console.error(line);
	process.exit(1);
}

function readRegistry(): { text: string; registry: Registry } {
	if (!existsSync(REGISTRY_FILE)) stop(`⛔ Registre absent : ${REGISTRY_FILE}`);
	const text = readFileSync(REGISTRY_FILE, 'utf8');
	const registry = parseRegistry(text);
	if (registry.errors.length > 0) {
		stop(`⛔ Registre mal formé (${REGISTRY_FILE}) :`, ...registry.errors.map((e) => `   ${e}`));
	}
	return { text, registry };
}

function list(): void {
	const open = readRegistry().registry.entries.filter((e) => !e.closed);
	if (open.length === 0) {
		console.log('Aucun écart ouvert.');
		return;
	}
	for (const [letter, type] of Object.entries(TYPES)) {
		const group = open.filter((e) => e.letter === letter);
		if (group.length === 0) continue;
		console.log(`\n${type} (${group.length})`);
		for (const entry of group) console.log(`  ${formatEntry(entry)}`);
	}
	const manual = open.filter((e) => e.proof.kind === 'manual').length;
	console.log(`\n${open.length} écarts ouverts, dont ${manual} à preuve « à la main ».`);
}

/** Joue tous les tests de preuve en une fois ; `null` si vitest n'a rien rendu de lisible. */
function runProofTests(files: string[]): VitestReport | null {
	const dir = mkdtempSync(join(tmpdir(), 'ecarts-'));
	const output = join(dir, 'vitest.json');
	try {
		const run = spawnSync(
			'pnpm',
			[
				'exec',
				'vitest',
				'run',
				'--project=ecarts',
				'--reporter=json',
				`--outputFile=${output}`,
				...files
			],
			{
				cwd: ROOT,
				encoding: 'utf8',
				timeout: VITEST_TIMEOUT_MS,
				env: { ...process.env, ECARTS_PREUVES: '1' }
			}
		);
		// Vitest tué (délai dépassé) : un compte rendu partiel ne prouve rien.
		if (run.status === null || !existsSync(output)) return null;
		const report: unknown = JSON.parse(readFileSync(output, 'utf8'));
		return isVitestReport(report) ? report : null;
	} catch {
		return null;
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

function replayCommand(entry: Entry, proof: Extract<Proof, { kind: 'command' }>): ReplayResult {
	const run = spawnSync('sh', ['-c', proof.command], {
		cwd: ROOT,
		encoding: 'utf8',
		timeout: COMMAND_TIMEOUT_MS
	});
	const outcome = commandOutcome(run.status, run.signal);
	if (outcome !== 'broken') return { entry, outcome };
	const cause = run.signal ? `arrêtée (${run.signal})` : `sortie ${run.status ?? 'inconnue'}`;
	return { entry, outcome, detail: `la commande n'a pas pu tourner : ${cause}` };
}

function replay(ids: string[], strike: boolean): void {
	const { registry } = readRegistry();
	const unknown = ids.filter((id) => !registry.entries.some((e) => e.id === id && !e.closed));
	if (unknown.length > 0) stop(`⛔ Pas d'écart ouvert de ce nom : ${unknown.join(', ')}`);

	const open = registry.entries.filter(
		(e) => !e.closed && (ids.length === 0 || ids.includes(e.id))
	);

	// Un fichier absent est une preuve cassée : il n'est pas donné à vitest.
	const testFiles = new Set<string>();
	for (const entry of open) {
		if (entry.proof.kind === 'test' && existsSync(join(ROOT, entry.proof.file))) {
			testFiles.add(entry.proof.file);
		}
	}
	const report = testFiles.size > 0 ? runProofTests([...testFiles]) : null;

	const results = open.map((entry): ReplayResult => {
		const proof = entry.proof;
		if (proof.kind === 'manual') return { entry, outcome: 'manual' };
		if (proof.kind === 'command') return replayCommand(entry, proof);
		if (!existsSync(join(ROOT, proof.file))) {
			return { entry, outcome: 'broken', detail: `fichier absent : ${proof.file}` };
		}
		if (report === null) {
			return { entry, outcome: 'broken', detail: "vitest n'a pas rendu de compte rendu" };
		}
		const outcome = vitestOutcome(report, proof, ROOT);
		return outcome === 'broken'
			? {
					entry,
					outcome,
					detail: `aucun test joué pour ${proof.file}${proof.name ? ` › ${proof.name}` : ''}`
				}
			: { entry, outcome };
	});

	console.log(formatReport(results));

	if (!strike) return;
	// Le rejeu a pu durer : le registre est relu, une ligne ajoutée entre-temps n'est pas perdue.
	const fresh = readRegistry();
	const green = idsToStrike(results, fresh.registry);
	if (green.length === 0) return;
	const today = new Date().toLocaleDateString('sv-SE');
	writeFileSync(REGISTRY_FILE, strikeEntries(fresh.text, green, today, 'preuve verte'));
	console.log(`\nBarré dans le registre : ${green.join(', ')}. À commiter (doc, direct sur main).`);
}

function add(input: EntryInput): void {
	const { text } = readRegistry();
	const added = addEntry(text, input);
	if (!added.ok) stop(`⛔ Écart refusé : ${added.error}`);
	writeFileSync(REGISTRY_FILE, added.text);
	console.log(`${added.id} ajouté au registre. À commiter (doc, direct sur main).`);
}

function main(): void {
	const args = parseArgs(process.argv.slice(2));
	if (args === null) {
		console.error(USAGE);
		process.exit(2);
	}
	if (args.command === 'list') list();
	else if (args.command === 'replay') replay(args.ids, args.strike);
	else add(args.input);
}

main();

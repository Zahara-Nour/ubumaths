/**
 * Registre des écarts : ce qui se décide sans rien lancer
 * =======================================================
 *
 * Lecture de `docs/ecarts/registre.md`, numérotation, ajout d'une ligne, verdict
 * d'une preuve, barré des lignes closes, bilan. La commande est dans `index.ts`.
 * Tests : `scripts/__tests__/ecarts.test.ts`. Doc : docs/pratiques/registre-des-ecarts.md.
 */

import { resolve } from 'node:path';

// ============================================================================
// Types
// ============================================================================

export type Proof =
	| { kind: 'manual' }
	| { kind: 'test'; file: string; name?: string }
	| { kind: 'command'; command: string };

export interface Entry {
	/** `V35`, `L28 bis` */
	id: string;
	letter: string;
	number: number;
	type: string;
	domain: string;
	/** Ce que voit l'élève ou le prof. */
	finding: string;
	proof: Proof;
	state: string;
	closed: boolean;
	/** `clos le 2026-11-20 (corrigé, #3000)`, pour une ligne barrée. */
	closing?: string;
	/** Numéro de ligne dans le fichier, à partir de 1. */
	line: number;
}

export interface Registry {
	entries: Entry[];
	/** La ligne « Derniers numéros » : le plus grand numéro déjà donné, par lettre. */
	lastNumbers: Record<string, number>;
	errors: string[];
}

export interface EntryInput {
	letter: string;
	domain: string;
	finding: string;
	/** Le texte après « preuve : ». */
	proof: string;
	state?: string;
}

export type AddResult = { ok: true; id: string; text: string } | { ok: false; error: string };

/** `manual` : jamais rejouée. `broken` : la preuve n'a pas pu tourner. */
export type Outcome = 'green' | 'red' | 'broken' | 'manual';

export interface ReplayResult {
	entry: Entry;
	outcome: Outcome;
	detail?: string;
}

/** Ce qui est lu du compte rendu JSON de vitest. */
export interface VitestReport {
	testResults: Array<{
		/** Chemin absolu du fichier de test. */
		name: string;
		status: string;
		assertionResults: Array<{ fullName: string; status: string }>;
	}>;
}

/** Garde de type : un JSON valide mais tronqué n'est pas un compte rendu. */
export function isVitestReport(value: unknown): value is VitestReport {
	if (typeof value !== 'object' || value === null || !('testResults' in value)) return false;
	const { testResults } = value;
	return (
		Array.isArray(testResults) &&
		testResults.every(
			(r: unknown) =>
				typeof r === 'object' &&
				r !== null &&
				'name' in r &&
				typeof r.name === 'string' &&
				'assertionResults' in r &&
				Array.isArray(r.assertionResults)
		)
	);
}

/**
 * Les identifiants à barrer dans le registre RELU juste avant d'écrire : ceux dont la
 * preuve est verte, encore ouverts, et dont la preuve n'a pas changé pendant le rejeu.
 */
export function idsToStrike(results: ReplayResult[], fresh: Registry): string[] {
	return results
		.filter((r) => r.outcome === 'green')
		.filter((r) => {
			const now = fresh.entries.find((e) => e.id === r.entry.id);
			return (
				now !== undefined &&
				!now.closed &&
				JSON.stringify(now.proof) === JSON.stringify(r.entry.proof)
			);
		})
		.map((r) => r.entry.id);
}

export type Args =
	| { command: 'list' }
	| { command: 'replay'; ids: string[]; strike: boolean }
	| { command: 'add'; input: EntryInput };

// ============================================================================
// Constantes
// ============================================================================

/** Lettre de l'identifiant → type écrit dans la ligne. */
export const TYPES: Record<string, string> = {
	V: 'bug visible',
	L: 'bug latent',
	M: 'code mort',
	C: 'commentaire périmé',
	D: 'décision produit',
	T: 'RGPD',
	E: "vérification à l'écran"
};

/** Les tests de preuve vivent ici, hors de la CI (projet vitest `ecarts`). */
export const PROOF_TESTS_DIR = 'tests/ecarts/';

const SEPARATOR = ' · ';
const FIELD_COUNT = 6;
const ID_PATTERN = /^([A-Z])(\d+)( bis)?$/;
const CLOSED_LINE = /^- ~~(.+)~~ · (clos .+)$/;
const LAST_NUMBERS_PREFIX = 'Derniers numéros : ';
const PROOF_PREFIX = 'preuve : ';
const TEST_NAME_SEPARATOR = ' › ';
const DEFAULT_STATE = 'à faire';
const ENTRIES_HEADING = '## Écarts';

/** Sorties du shell pour « pas exécutable » et « introuvable ». */
const NOT_RUNNABLE = [126, 127];

// ============================================================================
// Fonctions
// ============================================================================

/** La preuve écrite après « preuve : », ou `null` si elle n'a pas une forme connue. */
export function parseProof(text: string): Proof | null {
	if (text === 'à la main') return { kind: 'manual' };

	const command = /^commande `([^`]+)`$/.exec(text);
	if (command) return { kind: 'command', command: command[1] };

	if (text.startsWith('test ')) {
		const [file, ...rest] = text.slice('test '.length).split(TEST_NAME_SEPARATOR);
		const name = rest.join(TEST_NAME_SEPARATOR);
		if (!file.startsWith(PROOF_TESTS_DIR) || !file.endsWith('.test.ts') || file.includes('..')) {
			return null;
		}
		if (rest.length > 0 && name.trim() === '') return null;
		return rest.length > 0 ? { kind: 'test', file, name } : { kind: 'test', file };
	}

	return null;
}

function parseFields(body: string): Omit<Entry, 'closed' | 'closing' | 'line'> | string {
	const fields = body.split(SEPARATOR).map((f) => f.trim());
	if (fields.length !== FIELD_COUNT) {
		return `${FIELD_COUNT} champs attendus (identifiant · type · domaine · constat · preuve · état), ${fields.length} lus`;
	}
	if (fields.some((f) => f === '')) return 'champ vide';

	const [id, type, domain, finding, proofField, state] = fields;
	const idMatch = ID_PATTERN.exec(id);
	if (!idMatch || !(idMatch[1] in TYPES)) return `identifiant inconnu : « ${id} »`;
	const letter = idMatch[1];
	if (type !== TYPES[letter]) {
		return `${id} : type « ${type} », attendu « ${TYPES[letter]} » pour la lettre ${letter}`;
	}
	if (!proofField.startsWith(PROOF_PREFIX)) return `${id} : le 5e champ commence par « preuve : »`;
	const proof = parseProof(proofField.slice(PROOF_PREFIX.length));
	if (proof === null) {
		return `${id} : preuve illisible (à la main | test ${PROOF_TESTS_DIR}<fichier>.test.ts [› nom] | commande \`…\`)`;
	}

	return { id, letter, number: Number(idMatch[2]), type, domain, finding, proof, state };
}

function parseLastNumbers(line: string): Record<string, number> {
	const numbers: Record<string, number> = {};
	for (const part of line.slice(LAST_NUMBERS_PREFIX.length).split(SEPARATOR)) {
		const match = /^([A-Z])(\d+)$/.exec(part.trim());
		if (match) numbers[match[1]] = Number(match[2]);
	}
	return numbers;
}

/** Lit le registre. Toute ligne de liste (`- …`) est un écart ; le reste est de la prose. */
export function parseRegistry(text: string): Registry {
	const entries: Entry[] = [];
	const errors: string[] = [];
	let lastNumbers: Record<string, number> = {};
	const seen = new Set<string>();
	let lastNumbersSeen = false;

	// Une ligne finie par `\r` ne serait ni lue ni barrée proprement.
	if (text.includes('\r')) {
		return { entries, lastNumbers, errors: ['fins de ligne Windows (\\r) : à retirer du fichier'] };
	}

	text.split('\n').forEach((raw, index) => {
		const line = index + 1;
		if (raw.startsWith(LAST_NUMBERS_PREFIX)) {
			if (lastNumbersSeen)
				errors.push(`ligne ${line} : « ${LAST_NUMBERS_PREFIX.trim()} » en double`);
			lastNumbersSeen = true;
			lastNumbers = parseLastNumbers(raw);
			return;
		}
		if (!raw.startsWith('- ')) return;

		const closedMatch = CLOSED_LINE.exec(raw);
		if (!closedMatch && raw.startsWith('- ~~')) {
			errors.push(`ligne ${line} : ligne barrée sans « ~~ · clos le … »`);
			return;
		}
		const parsed = parseFields(closedMatch ? closedMatch[1] : raw.slice(2));
		if (typeof parsed === 'string') {
			errors.push(`ligne ${line} : ${parsed}`);
			return;
		}
		if (seen.has(parsed.id)) {
			errors.push(`ligne ${line} : ${parsed.id} est déjà dans le registre`);
			return;
		}
		seen.add(parsed.id);
		entries.push({
			...parsed,
			closed: closedMatch !== null,
			...(closedMatch ? { closing: closedMatch[2] } : {}),
			line
		});
	});

	return { entries, lastNumbers, errors };
}

function highestNumber(registry: Registry, letter: string): number {
	const inEntries = registry.entries.filter((e) => e.letter === letter).map((e) => e.number);
	return Math.max(0, registry.lastNumbers[letter] ?? 0, ...inEntries);
}

/** Le prochain identifiant libre pour une lettre : jamais un numéro qui a déjà existé. */
export function nextId(registry: Registry, letter: string): string {
	return `${letter}${highestNumber(registry, letter) + 1}`;
}

/**
 * Ajoute un écart sous la dernière ligne de la liste (sous le titre « ## Écarts » si elle
 * est vide) et tient la ligne « Derniers numéros ». Le reste du fichier ne bouge pas.
 */
export function addEntry(text: string, input: EntryInput): AddResult {
	const registry = parseRegistry(text);
	if (registry.errors.length > 0) {
		return { ok: false, error: `registre mal formé : ${registry.errors[0]}` };
	}
	if (!(input.letter in TYPES)) return { ok: false, error: `lettre inconnue : ${input.letter}` };

	const fields = [input.domain, input.finding, input.proof, input.state ?? ''];
	if (fields.some((f) => /[\r\n]/.test(f))) {
		return { ok: false, error: 'retour à la ligne dans un champ' };
	}

	const lines = text.split('\n');
	const lastNumbersIndex = lines.findIndex((l) => l.startsWith(LAST_NUMBERS_PREFIX));
	if (lastNumbersIndex === -1) {
		return { ok: false, error: `ligne « ${LAST_NUMBERS_PREFIX.trim()} » absente du registre` };
	}

	const id = nextId(registry, input.letter);
	const number = Number(id.slice(1));
	const entryLine = [
		id,
		TYPES[input.letter],
		input.domain.trim(),
		input.finding.trim(),
		`${PROOF_PREFIX}${input.proof.trim()}`,
		(input.state ?? DEFAULT_STATE).trim()
	].join(SEPARATOR);

	// La ligne est relue telle qu'elle sera écrite : séparateur dans un champ, preuve illisible…
	const check = parseFields(entryLine);
	if (typeof check === 'string') return { ok: false, error: check };

	const lastNumbers = { ...registry.lastNumbers, [input.letter]: number };
	lines[lastNumbersIndex] =
		LAST_NUMBERS_PREFIX +
		Object.entries(lastNumbers)
			.map(([letter, n]) => `${letter}${n}`)
			.join(SEPARATOR);
	const lastEntryIndex = lines.findLastIndex((l) => l.startsWith('- '));
	const headingIndex = lines.indexOf(ENTRIES_HEADING);
	if (lastEntryIndex !== -1) {
		lines.splice(lastEntryIndex + 1, 0, `- ${entryLine}`);
	} else if (headingIndex !== -1) {
		lines.splice(headingIndex + 1, 0, '', `- ${entryLine}`);
	} else {
		return { ok: false, error: `titre « ${ENTRIES_HEADING} » absent du registre` };
	}

	return { ok: true, id, text: lines.join('\n') };
}

/** Verdict d'une preuve par test, lu dans le compte rendu de vitest. */
export function vitestOutcome(
	report: VitestReport,
	proof: Extract<Proof, { kind: 'test' }>,
	root: string
): Outcome {
	const file = report.testResults.find((r) => r.name === resolve(root, proof.file));
	if (!file) return 'broken';

	const name = proof.name;
	const tests =
		name === undefined
			? file.assertionResults
			: file.assertionResults.filter((t) => hasWord(t.fullName, name));

	if (tests.some((t) => t.status === 'failed')) return 'red';
	// Fichier en échec sans aucun test rouge : il ne se charge pas, ou un `afterAll` casse.
	// (Un autre écart du même fichier encore rouge met aussi le fichier en échec.)
	const anyFailedTest = file.assertionResults.some((t) => t.status === 'failed');
	if (file.status === 'failed' && !anyFailedTest) return 'broken';
	const passed = tests.filter((t) => t.status === 'passed');
	return passed.length > 0 && passed.length === tests.length ? 'green' : 'broken';
}

/** `V3` ne doit pas trouver « V35 » : le nom est cherché entre deux bords de mot. */
function hasWord(text: string, word: string): boolean {
	let from = 0;
	for (;;) {
		const at = text.indexOf(word, from);
		if (at === -1) return false;
		const before = text[at - 1];
		const after = text[at + word.length];
		if (!isWordChar(before) && !isWordChar(after)) return true;
		from = at + 1;
	}
}

function isWordChar(char: string | undefined): boolean {
	return char !== undefined && /[\p{L}\p{N}]/u.test(char);
}

/** Verdict d'une preuve par commande : 0 = l'écart n'est plus vrai. */
export function commandOutcome(status: number | null, signal: string | null): Outcome {
	if (signal !== null || status === null) return 'broken';
	if (status === 0) return 'green';
	return NOT_RUNNABLE.includes(status) ? 'broken' : 'red';
}

/** Barre les lignes ouvertes des identifiants donnés. Le reste du fichier ne bouge pas. */
export function strikeEntries(text: string, ids: string[], date: string, reason: string): string {
	const lines = text.split('\n');
	for (const entry of parseRegistry(text).entries) {
		if (entry.closed || !ids.includes(entry.id)) continue;
		const index = entry.line - 1;
		lines[index] = `- ~~${lines[index].slice(2)}~~ · clos le ${date} (${reason})`;
	}
	return lines.join('\n');
}

export function formatEntry(entry: Entry): string {
	return `${entry.id} · ${entry.domain} · ${entry.finding} · ${entry.state}`;
}

/** Le bilan d'un rejeu : clos, cassées, toujours ouverts, à la main. */
export function formatReport(results: ReplayResult[]): string {
	if (results.length === 0) return 'Aucun écart ouvert à rejouer.';

	const sections: Array<[string, Outcome]> = [
		['Preuves vertes', 'green'],
		['Preuves cassées', 'broken'],
		['Toujours ouverts', 'red'],
		['À la main, jamais rejoués', 'manual']
	];
	const blocks: string[] = [];
	for (const [title, outcome] of sections) {
		const group = results.filter((r) => r.outcome === outcome);
		if (group.length === 0) continue;
		const lines = group.map(
			(r) => `  ${formatEntry(r.entry)}${r.detail ? `\n      → ${r.detail}` : ''}`
		);
		blocks.push(`${title} (${group.length})\n${lines.join('\n')}`);
	}
	return blocks.join('\n\n');
}

function readOptions(args: string[], allowed: string[]): Record<string, string> | null {
	const options: Record<string, string> = {};
	for (let i = 0; i < args.length; i += 2) {
		const name = args[i];
		const value = args[i + 1];
		if (!allowed.includes(name) || value === undefined || value.startsWith('--')) return null;
		options[name] = value;
	}
	return options;
}

/** Les arguments de `pnpm ecarts`, ou `null` : on affiche l'usage. */
export function parseArgs(args: string[]): Args | null {
	if (args.length === 0) return { command: 'list' };
	const [command, ...rest] = args;

	if (command === 'rejouer') {
		const flags = rest.filter((a) => a.startsWith('--'));
		if (flags.some((f) => f !== '--barrer')) return null;
		const ids = rest.filter((a) => !a.startsWith('--'));
		if (ids.some((id) => !ID_PATTERN.test(id))) return null;
		return { command: 'replay', ids, strike: flags.length > 0 };
	}

	if (command === 'ajouter') {
		const [letter, ...optionArgs] = rest;
		if (letter === undefined || !(letter in TYPES)) return null;
		const options = readOptions(optionArgs, ['--domaine', '--constat', '--preuve', '--etat']);
		if (options === null) return null;
		const {
			'--domaine': domain,
			'--constat': finding,
			'--preuve': proof,
			'--etat': state
		} = options;
		if (domain === undefined || finding === undefined || proof === undefined) return null;
		return {
			command: 'add',
			input: { letter, domain, finding, proof, ...(state === undefined ? {} : { state }) }
		};
	}

	return null;
}

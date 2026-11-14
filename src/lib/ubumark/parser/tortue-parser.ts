/**
 * Bloc ```tortue — parseur
 * ========================
 *
 * ```tortue
 * attendu: répéter 4 [ avancer 3 ; tourner à droite 90 ]
 * montrer: oui
 * comparer: position
 * ```
 *
 * - `attendu:` (obligatoire) : le programme de référence, en notation texte
 *   (`$lib/shared/blockly/tortue/notation.ts`) ; il doit se lire, s'exécuter et tracer
 *   quelque chose, sinon l'élève serait toujours jugé faux.
 * - `montrer: oui | non` (défaut `non`) : la figure à reproduire, en gris.
 * - `comparer: position | forme` (défaut `position`) : même figure au même endroit, ou à
 *   une translation, un quart de tour ou un retournement près.
 * - `case: N` : posée par le générateur.
 * - `figure:` : réservée à l'énoncé d'une évaluation notée, où `attendu:` devient `?` ; elle
 *   porte la figure à reproduire (`x1 y1 x2 y2 ; …`).
 *
 * Tout bloc ```tortue est une question : il porte toujours sa case.
 *
 * @module ubumark/parser/tortue-parser
 */

import { unnestedLine } from './nested-line';
import { specialBlockEnd } from './unclosed-block';
import { isMaskedValue } from '../utils/masked-value';
import { lireProgrammeTortue, type ComparaisonTortue } from '$lib/shared/blockly/tortue/jugement';
import { normaliserSegments, type Segment } from '$lib/shared/blockly/tortue/segments';
import {
	TORTUE_FIGURE_MAX_SEGMENTS,
	type TortueBlockRange,
	type TortueIssue,
	type TortueNode
} from '../types/tortue';

// ============================================================================
// CONSTANTES
// ============================================================================

const TORTUE_BLOCK_START_REGEX = /^```tortue\s*$/;
const BLOCK_END_REGEX = /^```\s*$/;

/** `clé: valeur` */
const KEY_LINE_REGEX = /^([A-Za-zÀ-ÿ]+)\s*:\s*(.*)$/;

type Key = 'attendu' | 'montrer' | 'comparer' | 'case' | 'figure';

const KEY_NAMES: Key[] = ['attendu', 'montrer', 'comparer', 'case', 'figure'];

/** Les clés du bloc : une ligne qui commence par l'une d'elles n'est jamais du texte (Q66) */
const BLOCK_KEYS: readonly string[] = KEY_NAMES;

const COMPARAISONS: readonly ComparaisonTortue[] = ['position', 'forme'];

const EXEMPLE_ATTENDU = 'attendu: répéter 4 [ avancer 3 ; tourner à droite 90 ]';

/** Nombre d'une coordonnée de `figure:` (écrite par le masquage, point décimal) */
const COORDONNEE = /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i;

// ============================================================================
// DÉTECTION
// ============================================================================

export function isTortueBlockStart(line: string): boolean {
	return TORTUE_BLOCK_START_REGEX.test(line);
}

/**
 * Blocs ```tortue d'une liste de lignes (indices inclusifs, clôtures comprises). Fermé par un
 * ``` qui ne fait pas lire du texte comme contenu (Q66), sinon jusqu'à la première ligne vide.
 */
export function findTortueBlocks(lines: string[]): TortueBlockRange[] {
	const blocks: TortueBlockRange[] = [];
	let i = 0;
	while (i < lines.length) {
		if (isTortueBlockStart(lines[i])) {
			const { endIndex } = specialBlockEnd(
				lines,
				i,
				(line) => BLOCK_END_REGEX.test(line),
				BLOCK_KEYS
			);
			blocks.push({ startIndex: i, endIndex });
			i = endIndex;
		}
		i++;
	}
	return blocks;
}

/**
 * Les blocs ```tortue d'un énoncé (tous portent une case), délimités comme le parseur : corps
 * sans clôtures, fermeture, et `nested` pour un bloc en retrait ou cité (l'élève ne pourrait
 * pas y répondre : sa case n'est pas créée)
 */
export function findTortuesToProgram(markdown: string): {
	startIndex: number;
	body: string[];
	closed: boolean;
	nested: boolean;
}[] {
	const lines = markdown.split('\n');
	const plain = lines.map(unnestedLine);
	const found: { startIndex: number; body: string[]; closed: boolean; nested: boolean }[] = [];
	let i = 0;
	while (i < plain.length) {
		if (isTortueBlockStart(plain[i])) {
			const { endIndex, closed } = specialBlockEnd(
				plain,
				i,
				(line) => BLOCK_END_REGEX.test(line),
				BLOCK_KEYS
			);
			const body = plain.slice(i + 1, closed ? endIndex : endIndex + 1);
			found.push({ startIndex: i, body, closed, nested: lines[i] !== plain[i] });
			i = endIndex;
		}
		i++;
	}
	return found;
}

/** L'énoncé a-t-il un programme tortue à écrire ? */
export function hasTortueToProgram(markdown: string): boolean {
	return findTortuesToProgram(markdown).length > 0;
}

// ============================================================================
// FIGURE D'UN ÉNONCÉ MASQUÉ
// ============================================================================

/** Écrit une figure pour `figure:` : `x1 y1 x2 y2 ; …`, point décimal. */
export function figureText(segments: readonly Segment[]): string {
	return segments.map(({ de, a }) => `${de.x} ${de.y} ${a.x} ${a.y}`).join(' ; ');
}

function parseFigure(value: string): Segment[] {
	if (value.trim() === '') return [];
	const parts = value.split(';');
	if (parts.length > TORTUE_FIGURE_MAX_SEGMENTS) {
		throw new LineError(`figure: ${TORTUE_FIGURE_MAX_SEGMENTS} segments au plus`);
	}
	return parts.map((part) => {
		const nombres = part.trim().split(/\s+/);
		if (nombres.length !== 4 || !nombres.every((n) => COORDONNEE.test(n))) {
			throw new LineError(`figure: segment « ${part.trim()} » illisible (x1 y1 x2 y2)`);
		}
		const [x1, y1, x2, y2] = nombres.map(Number);
		return { de: { x: x1, y: y1 }, a: { x: x2, y: y2 } };
	});
}

// ============================================================================
// ANALYSE
// ============================================================================

/** Erreur d'une ligne, levée par les lecteurs de valeur */
class LineError extends Error {}

function normalizeKey(raw: string): Key | null {
	const lower = raw.toLowerCase();
	return KEY_NAMES.find((k) => k === lower) ?? null;
}

function oneOf<T extends string>(raw: string, allowed: readonly T[], key: string): T {
	const value = raw.trim().toLowerCase();
	const found = allowed.find((a) => a === value);
	if (found === undefined) {
		throw new LineError(`${key} « ${raw} » : choisis ${allowed.join(' ou ')}`);
	}
	return found;
}

/**
 * Analyser le texte d'un bloc (sans les clôtures).
 * Ligne 1 = première ligne après ```tortue.
 */
export function parseTortueContent(source: string): TortueNode {
	const lines = source.split('\n');
	const errors: TortueIssue[] = [];
	const fail = (line: number, message: string) =>
		errors.push({ message: `Ligne ${line} : ${message}`, line });

	let attendu: string | null = null;
	let attenduMasque = false;
	let segmentsAttendus: Segment[] | null = null;
	let montrer = false;
	let comparer: ComparaisonTortue = 'position';
	let figure: Segment[] | null = null;
	let caseIndex: number | undefined;
	const seen = new Map<Key, number>();

	lines.forEach((line, index) => {
		const text = line.trim();
		if (text === '') return;
		const lineNo = index + 1;
		const match = KEY_LINE_REGEX.exec(text);
		if (!match) {
			fail(
				lineNo,
				`ligne « ${text} » non comprise (attendu : clé: valeur, ex. ${EXEMPLE_ATTENDU})`
			);
			return;
		}
		const key = normalizeKey(match[1]);
		const value = match[2].trim();
		if (key === null) {
			fail(lineNo, `clé « ${match[1]} » inconnue (clés possibles : attendu, montrer, comparer)`);
			return;
		}
		const previous = seen.get(key);
		if (previous !== undefined) {
			fail(lineNo, `« ${key} » déjà donnée ligne ${previous}`);
			return;
		}
		seen.set(key, lineNo);

		try {
			switch (key) {
				case 'attendu': {
					// Énoncé d'une évaluation notée : le programme n'est pas envoyé
					if (isMaskedValue(value)) {
						attenduMasque = true;
						break;
					}
					if (value === '') throw new LineError(`attendu: vide (ex. ${EXEMPLE_ATTENDU})`);
					const lu = lireProgrammeTortue(value);
					if (!lu.ok) throw new LineError(`attendu: ${lu.message}`);
					if (lu.segments.length === 0) {
						throw new LineError('attendu: ce programme ne trace rien (stylo levé ?)');
					}
					attendu = value;
					segmentsAttendus = lu.segments;
					break;
				}
				case 'montrer':
					montrer = oneOf(value, ['oui', 'non'] as const, 'montrer') === 'oui';
					break;
				case 'comparer':
					comparer = oneOf(value, COMPARAISONS, 'comparer');
					break;
				case 'figure':
					figure = parseFigure(value);
					break;
				case 'case':
					if (!/^\d+$/.test(value))
						throw new LineError(`case « ${value} » : numéro de case entier`);
					caseIndex = Number(value);
					break;
			}
		} catch (e) {
			if (!(e instanceof LineError)) throw e;
			fail(lineNo, e.message);
		}
	});

	if (!seen.has('attendu')) {
		fail(1, `il manque la ligne attendu: (le programme de référence, ex. ${EXEMPLE_ATTENDU})`);
	}
	if (seen.has('figure') && !attenduMasque) {
		fail(
			seen.get('figure') ?? 1,
			'figure: est réservée à l’énoncé envoyé pendant une évaluation : la figure se lit dans attendu:'
		);
	}

	const withCase = caseIndex === undefined ? {} : { caseIndex };
	if (errors.length > 0) return { type: 'tortue', source, spec: null, errors, ...withCase };

	const traceModele = attenduMasque ? figure : segmentsAttendus;
	return {
		type: 'tortue',
		source,
		spec: {
			attendu: attenduMasque ? null : attendu,
			montrer,
			comparer,
			modele: montrer && traceModele ? normaliserSegments(traceModele) : null
		},
		errors,
		...withCase
	};
}

/**
 * Analyser un bloc repéré dans les lignes d'un document : `end` EXCLU, la fence de fin pour un
 * bloc fermé, la ligne qui suit le bloc sinon.
 */
export function parseTortue(
	lines: string[],
	startIndex: number,
	end: number
): { node: TortueNode } {
	const body = lines.slice(startIndex + 1, end);
	const node = parseTortueContent(body.join('\n'));
	const closed = end > startIndex && BLOCK_END_REGEX.test(lines[end] ?? '');
	if (closed) return { node };
	return {
		node: {
			...node,
			spec: null,
			errors: [
				...node.errors,
				{
					message: `Ligne ${body.length + 1} : bloc non fermé (\`\`\` manquant après la dernière ligne)`,
					line: body.length + 1
				}
			]
		}
	};
}

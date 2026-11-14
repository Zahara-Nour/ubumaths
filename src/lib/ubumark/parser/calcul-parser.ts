/**
 * Bloc ```calcul — parseur
 * ========================
 *
 * ```calcul
 * attendu: afficher (nombre + 2) × 4
 * essais: -3 ; 0 ; 2,5
 * départ: afficher nombre
 * ```
 *
 * - `attendu:` (obligatoire) : le programme de référence, en notation texte
 *   (`$lib/shared/blockly/calcul/notation.ts`) ; il doit se lire, s'exécuter et afficher
 *   quelque chose pour chaque essai, sinon l'élève serait toujours jugé faux.
 * - `essais:` (défaut −3 ; 0 ; 1 ; 2 ; 5 ; 10 ; 0,5) : les nombres sur lesquels les deux
 *   programmes sont rejoués.
 * - `départ:` : un programme posé d'avance dans l'espace de travail de l'élève, à modifier.
 * - `case: N` : posée par le générateur.
 *
 * Tout bloc ```calcul est une question : il porte toujours sa case.
 *
 * @module ubumark/parser/calcul-parser
 */

import { unnestedLine } from './nested-line';
import { specialBlockEnd } from './unclosed-block';
import { isMaskedValue } from '../utils/masked-value';
import {
	ESSAIS_PAR_DEFAUT,
	lireEssais,
	lireProgrammeCalcul
} from '$lib/shared/blockly/calcul/jugement';
import { ecrireNombreCalcul, texteVersEtatCalcul } from '$lib/shared/blockly/calcul/notation';
import type { CalculBlockRange, CalculIssue, CalculNode } from '../types/calcul';

// ============================================================================
// CONSTANTES
// ============================================================================

const CALCUL_BLOCK_START_REGEX = /^```calcul\s*$/;
const BLOCK_END_REGEX = /^```\s*$/;

/** `clé: valeur` */
const KEY_LINE_REGEX = /^([A-Za-zÀ-ÿ]+)\s*:\s*(.*)$/;

type Key = 'attendu' | 'essais' | 'départ' | 'case';

const KEY_NAMES: Key[] = ['attendu', 'essais', 'départ', 'case'];

/** Les clés du bloc, `depart` sans accent compris : une ligne qui commence par l'une d'elles
 * n'est jamais du texte (Q66) */
const BLOCK_KEYS: readonly string[] = [...KEY_NAMES, 'depart'];

const EXEMPLE_ATTENDU = 'attendu: afficher (nombre + 2) × 4';

// ============================================================================
// DÉTECTION
// ============================================================================

export function isCalculBlockStart(line: string): boolean {
	return CALCUL_BLOCK_START_REGEX.test(line);
}

/**
 * Blocs ```calcul d'une liste de lignes (indices inclusifs, clôtures comprises). Fermé par un
 * ``` qui ne fait pas lire du texte comme contenu (Q66), sinon jusqu'à la première ligne vide.
 */
export function findCalculBlocks(lines: string[]): CalculBlockRange[] {
	const blocks: CalculBlockRange[] = [];
	let i = 0;
	while (i < lines.length) {
		if (isCalculBlockStart(lines[i])) {
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
 * Les blocs ```calcul d'un énoncé (tous portent une case), délimités comme le parseur : corps
 * sans clôtures, fermeture, et `nested` pour un bloc en retrait ou cité (l'élève ne pourrait
 * pas y répondre : sa case n'est pas créée)
 */
export function findCalculsToProgram(markdown: string): {
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
		if (isCalculBlockStart(plain[i])) {
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

/** L'énoncé a-t-il un programme de calcul à écrire ? */
export function hasCalculToProgram(markdown: string): boolean {
	return findCalculsToProgram(markdown).length > 0;
}

// ============================================================================
// ANALYSE
// ============================================================================

/** Erreur d'une ligne, levée par les lecteurs de valeur */
class LineError extends Error {}

function normalizeKey(raw: string): Key | null {
	const lower = raw.toLowerCase();
	if (lower === 'depart') return 'départ';
	return KEY_NAMES.find((k) => k === lower) ?? null;
}

/**
 * Analyser le texte d'un bloc (sans les clôtures).
 * Ligne 1 = première ligne après ```calcul.
 */
export function parseCalculContent(source: string): CalculNode {
	const lines = source.split('\n');
	const errors: CalculIssue[] = [];
	const fail = (line: number, message: string) =>
		errors.push({ message: `Ligne ${line} : ${message}`, line });

	let attendu: string | null = null;
	let attenduMasque = false;
	let essais: number[] = [...ESSAIS_PAR_DEFAUT];
	let essaisLus = true;
	let depart: string | null = null;
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
			fail(lineNo, `clé « ${match[1]} » inconnue (clés possibles : attendu, essais, départ)`);
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
					const lu = texteVersEtatCalcul(value);
					if (!lu.ok) throw new LineError(`attendu: ${lu.message}`);
					attendu = value;
					break;
				}
				case 'essais': {
					const lus = lireEssais(value);
					if (!lus.ok) {
						essaisLus = false;
						throw new LineError(`essais: ${lus.message}`);
					}
					essais = lus.essais;
					break;
				}
				case 'départ': {
					const lu = texteVersEtatCalcul(value);
					if (!lu.ok) throw new LineError(`départ: ${lu.message}`);
					depart = value === '' ? null : value;
					break;
				}
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
	// La référence doit marcher et afficher quelque chose pour chaque essai : sinon aucun
	// programme d'élève ne serait jugé juste
	if (attendu !== null && essaisLus) {
		const ligne = seen.get('attendu') ?? 1;
		const reference = lireProgrammeCalcul(attendu, essais);
		if (!reference.ok) {
			fail(ligne, `attendu: ${reference.message}`);
		} else {
			const muet = reference.sorties.findIndex((s) => s.length === 0);
			if (muet >= 0) {
				fail(
					ligne,
					`attendu: ce programme n’affiche rien avec le nombre ${ecrireNombreCalcul(essais[muet])}`
				);
			}
		}
	}

	const withCase = caseIndex === undefined ? {} : { caseIndex };
	if (errors.length > 0) return { type: 'calcul', source, spec: null, errors, ...withCase };

	return {
		type: 'calcul',
		source,
		spec: { attendu: attenduMasque ? null : attendu, essais, depart },
		errors,
		...withCase
	};
}

/**
 * Analyser un bloc repéré dans les lignes d'un document : `end` EXCLU, la fence de fin pour un
 * bloc fermé, la ligne qui suit le bloc sinon.
 */
export function parseCalcul(
	lines: string[],
	startIndex: number,
	end: number
): { node: CalculNode } {
	const body = lines.slice(startIndex + 1, end);
	const node = parseCalculContent(body.join('\n'));
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

/**
 * Bloc ```labyrinthe — parseur
 * ============================
 *
 * ```labyrinthe
 * grille: 6 x 4
 * règle: premier
 * parcourir: oui
 * ```
 *
 * - `grille: C x L` (obligatoire) : 3 à 7 colonnes, 2 à 7 lignes ; au plus 5 colonnes de nombres
 *   de 4 à 6 caractères, 4 de 7 caractères (`colonnesSurTelephone`).
 * - `règle:` (obligatoire) : `premier`, `multiple de n` (2 à 99), `chiffre des <rang> = c`
 *   (rangs des dix-millièmes aux dizaines de mille).
 * - `parcourir: oui | non` (défaut `non`) : une question, l'élève trace le chemin.
 * - `solution: oui | non` (défaut `non`) : le chemin montré (corrigé imprimé, cours) ; pas avec
 *   `parcourir: oui`.
 * - `graine: N` : posée par le générateur dans une question (`avecGraines`) ; sans elle, la
 *   graine est tirée du texte du bloc (même texte, même labyrinthe).
 * - `case: N` : posée par le générateur (question seulement).
 *
 * @module ubumark/parser/labyrinthe-parser
 */

import { unnestedLine } from './nested-line';
import { specialBlockEnd } from './unclosed-block';
import {
	colonnesSurTelephone,
	lireRegle,
	nombreLePlusLong,
	tirerLabyrinthe
} from '../utils/labyrinthe-moteur';
import { randomInt, type RandomSource } from '#lib/utils/random.ts';
import {
	LABYRINTHE_MAX_COLONNES,
	LABYRINTHE_MAX_LIGNES,
	LABYRINTHE_MIN_COLONNES,
	LABYRINTHE_MIN_LIGNES,
	type LabyrintheBlockRange,
	type LabyrintheIssue,
	type LabyrintheNode,
	type Regle
} from '../types/labyrinthe';

// ============================================================================
// CONSTANTES
// ============================================================================

const LABYRINTHE_BLOCK_START_REGEX = /^```labyrinthe\s*$/;
const BLOCK_END_REGEX = /^```\s*$/;

/** `clé: valeur` */
const KEY_LINE_REGEX = /^([A-Za-zÀ-ÿ]+)\s*:\s*(.*)$/;

/** `parcourir: oui`, la ligne qui fait d'un bloc une question */
const PARCOURIR_OUI = /^parcourir\s*:\s*oui\s*$/i;

/** `graine:`, déjà posée */
const GRAINE_LINE = /^\s*graine\s*:/i;

/** Lignes qui ne changent pas le labyrinthe (graine tirée du texte sans elles) */
const CASE_LINE = /^\s*case\s*:/i;

/** Graine posée par le générateur : 1 à 999 999 */
const GRAINE_MAX = 999_999;

type Key = 'grille' | 'règle' | 'parcourir' | 'solution' | 'graine' | 'case';

const KEY_NAMES: Key[] = ['grille', 'règle', 'parcourir', 'solution', 'graine', 'case'];

/** Les clés du bloc, sans accent comprises : une ligne qui commence par l'une d'elles n'est
 * jamais du texte (Q66) */
const BLOCK_KEYS: readonly string[] = [...KEY_NAMES, 'regle'];

const ENTIER = /^\d+$/;

// ============================================================================
// DÉTECTION
// ============================================================================

export function isLabyrintheBlockStart(line: string): boolean {
	return LABYRINTHE_BLOCK_START_REGEX.test(line);
}

/**
 * Blocs ```labyrinthe d'une liste de lignes (indices inclusifs, clôtures comprises). Fermé
 * par un ``` qui ne fait pas lire du texte comme contenu (Q66), sinon jusqu'à la première
 * ligne vide.
 */
export function findLabyrintheBlocks(lines: string[]): LabyrintheBlockRange[] {
	const blocks: LabyrintheBlockRange[] = [];
	let i = 0;
	while (i < lines.length) {
		if (isLabyrintheBlockStart(lines[i])) {
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
 * Les blocs ```labyrinthe à parcourir d'un énoncé (`parcourir: oui`, une case chacun),
 * délimités comme le parseur : corps sans clôtures, fermeture, et `nested` pour un bloc en
 * retrait ou cité (l'élève ne pourrait pas y répondre : sa case n'est pas créée)
 */
export function findLabyrinthesAParcourir(markdown: string): {
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
		if (isLabyrintheBlockStart(plain[i])) {
			const { endIndex, closed } = specialBlockEnd(
				plain,
				i,
				(line) => BLOCK_END_REGEX.test(line),
				BLOCK_KEYS
			);
			const body = plain.slice(i + 1, closed ? endIndex : endIndex + 1);
			if (body.some((line) => PARCOURIR_OUI.test(line.trim()))) {
				found.push({ startIndex: i, body, closed, nested: lines[i] !== plain[i] });
			}
			i = endIndex;
		}
		i++;
	}
	return found;
}

/** L'énoncé a-t-il un labyrinthe à parcourir ? */
export function hasLabyrintheAParcourir(markdown: string): boolean {
	return findLabyrinthesAParcourir(markdown).length > 0;
}

/**
 * Pose une graine (`graine: N`, tirée de `random`) dans chaque labyrinthe à parcourir qui
 * n'en a pas, juste après son ouverture : chaque instance de la question a son labyrinthe,
 * et l'écran, le corrigé et le juge lisent le même. Un bloc en retrait ou cité n'est pas
 * touché (le générateur le refuse).
 */
export function avecGraines(markdown: string, random: RandomSource): string {
	const blocs = findLabyrinthesAParcourir(markdown).filter(
		(b) => !b.nested && !b.body.some((line) => GRAINE_LINE.test(line))
	);
	if (blocs.length === 0) return markdown;
	const lines = markdown.split('\n');
	// Du dernier au premier : les rangs des blocs précédents restent justes
	for (const bloc of [...blocs].reverse()) {
		lines.splice(bloc.startIndex + 1, 0, `graine: ${randomInt(1, GRAINE_MAX, random)}`);
	}
	return lines.join('\n');
}

// ============================================================================
// ANALYSE
// ============================================================================

/** Erreur d'une ligne, levée par les lecteurs de valeur */
class LineError extends Error {}

function normalizeKey(raw: string): Key | null {
	const lower = raw.toLowerCase();
	if (lower === 'regle') return 'règle';
	return KEY_NAMES.find((k) => k === lower) ?? null;
}

function lireOuiNon(value: string, key: string): boolean {
	const v = value.toLowerCase();
	if (v !== 'oui' && v !== 'non') throw new LineError(`${key} « ${value} » : choisis oui ou non`);
	return v === 'oui';
}

/** Graine d'un bloc sans `graine:` : tirée de son texte (hors `case:`), toujours la même */
function graineDuTexte(source: string): number {
	const texte = source
		.split('\n')
		.filter((line) => !CASE_LINE.test(line))
		.map((line) => line.trim())
		.join('\n');
	let h = 5381;
	for (let i = 0; i < texte.length; i++) h = (Math.imul(h, 33) + texte.charCodeAt(i)) >>> 0;
	return h;
}

/**
 * Analyser le texte d'un bloc (sans les clôtures).
 * Ligne 1 = première ligne après ```labyrinthe.
 */
export function parseLabyrintheContent(source: string): LabyrintheNode {
	const lines = source.split('\n');
	const errors: LabyrintheIssue[] = [];
	const fail = (line: number, message: string) =>
		errors.push({ message: `Ligne ${line} : ${message}`, line });

	let colonnes = 0;
	let lignes = 0;
	let regle = null as Regle | null;
	let parcourir = false as boolean;
	let solution = false as boolean;
	let graine: number | undefined;
	let caseIndex: number | undefined;
	const seen = new Map<Key, number>();

	lines.forEach((line, index) => {
		const text = line.trim();
		if (text === '') return;
		const lineNo = index + 1;
		const match = KEY_LINE_REGEX.exec(text);
		if (!match) {
			fail(lineNo, `ligne « ${text} » non comprise (attendu : clé: valeur, ex. grille: 6 x 4)`);
			return;
		}
		const key = normalizeKey(match[1]);
		const value = match[2].trim();
		if (key === null) {
			fail(
				lineNo,
				`clé « ${match[1]} » inconnue (clés possibles : grille, règle, parcourir, solution)`
			);
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
				case 'grille': {
					const m = /^(\d+)\s*[x×]\s*(\d+)$/i.exec(value);
					if (!m) throw new LineError(`grille « ${value} » : écris colonnes x lignes (ex. 6 x 4)`);
					colonnes = Number(m[1]);
					lignes = Number(m[2]);
					if (
						colonnes < LABYRINTHE_MIN_COLONNES ||
						colonnes > LABYRINTHE_MAX_COLONNES ||
						lignes < LABYRINTHE_MIN_LIGNES ||
						lignes > LABYRINTHE_MAX_LIGNES
					) {
						throw new LineError(
							`grille « ${value} » : de ${LABYRINTHE_MIN_COLONNES} à ${LABYRINTHE_MAX_COLONNES} colonnes et de ${LABYRINTHE_MIN_LIGNES} à ${LABYRINTHE_MAX_LIGNES} lignes`
						);
					}
					break;
				}
				case 'règle': {
					const lue = lireRegle(value);
					if (!lue.ok) throw new LineError(lue.message);
					regle = lue.regle;
					break;
				}
				case 'parcourir':
					parcourir = lireOuiNon(value, 'parcourir');
					break;
				case 'solution':
					solution = lireOuiNon(value, 'solution');
					break;
				case 'graine':
					if (!ENTIER.test(value)) throw new LineError(`graine « ${value} » : un nombre entier`);
					graine = Number(value);
					break;
				case 'case':
					if (!ENTIER.test(value)) throw new LineError(`case « ${value} » : numéro de case entier`);
					caseIndex = Number(value);
					break;
			}
		} catch (e) {
			if (!(e instanceof LineError)) throw e;
			fail(lineNo, e.message);
		}
	});

	if (!seen.has('grille')) fail(1, 'il manque la ligne grille: (ex. grille: 6 x 4)');
	if (!seen.has('règle')) fail(1, 'il manque la ligne règle: (ex. règle: premier)');
	if (parcourir && solution) {
		fail(seen.get('solution') ?? 1, 'solution: oui ne va pas avec parcourir: oui');
	}
	if (!parcourir && caseIndex !== undefined) {
		fail(seen.get('case') ?? 1, 'case: seulement avec parcourir: oui');
	}

	// Une grille qui ne tient pas sur un téléphone défilerait : sorties cachées à l'élève
	if (
		regle !== null &&
		colonnes <= LABYRINTHE_MAX_COLONNES &&
		lignes >= LABYRINTHE_MIN_LIGNES &&
		lignes <= LABYRINTHE_MAX_LIGNES &&
		colonnes > colonnesSurTelephone(regle)
	) {
		fail(
			seen.get('grille') ?? 1,
			`grille trop large pour un téléphone : au plus ${colonnesSurTelephone(regle)} colonnes avec des nombres comme ${nombreLePlusLong(regle).replace(/\u202f/g, ' ')}`
		);
	}

	const withCase = caseIndex === undefined ? {} : { caseIndex };
	if (errors.length > 0 || regle === null) {
		return { type: 'labyrinthe', source, spec: null, errors, ...withCase };
	}

	const labyrinthe = tirerLabyrinthe(colonnes, lignes, regle, graine ?? graineDuTexte(source));
	return {
		type: 'labyrinthe',
		source,
		spec: { colonnes, lignes, regle, parcourir, solution, ...labyrinthe },
		errors,
		...withCase
	};
}

/**
 * Analyser un bloc repéré dans les lignes d'un document : `end` EXCLU, la fence de fin pour un
 * bloc fermé, la ligne qui suit le bloc sinon.
 */
export function parseLabyrinthe(
	lines: string[],
	startIndex: number,
	end: number
): { node: LabyrintheNode } {
	const body = lines.slice(startIndex + 1, end);
	const node = parseLabyrintheContent(body.join('\n'));
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

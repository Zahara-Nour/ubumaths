/**
 * Atelier — « Ouvrir dans l'atelier » depuis Python : ce que le menu propose
 *
 * Le sens inverse du pont (phase 0 `docs/wip/python-vers-atelier-phase0.md`,
 * validée par David le 2026-10-25) : une liste laissée par un programme de
 * `/python` devient une COPIE dans un atelier éphémère. Pas d'état partagé.
 *
 * Le worker rapporte chaque liste (`PythonListReport`) ; ce module applique les
 * règles de l'atelier — 200 valeurs, ou ses effectifs s'il y a au plus 20
 * valeurs différentes (Q3) — et rend, par liste, une offre ou un refus nommé.
 * Les valeurs passent telles que Python les écrit : jamais d'arrondi caché.
 *
 * ⚠️ Léger à dessein : importé par la page `/python`, il ne tire pas l'atelier.
 *
 * @module atelier/from-python
 */

import {
	MAX_CATEGORIES,
	MAX_CATEGORY_LENGTH,
	MAX_DEFINITION_LENGTH,
	MAX_LIST_VALUES
} from './types';
import { MAX_TITLE_LENGTH } from './grid';
import { validateName } from './names';
import { groupNumberText } from '$lib/mathAST/digit-grouping';
import { readListValue } from '$lib/statistics/read-value';

// =============================================================================
// Types
// =============================================================================

/** Un élément de liste qui traverse : un nombre fini ou un texte. */
export type PythonEntry = number | string;

/** Ce qui empêche une liste de passer, vu par le worker (le JSON ne le porterait pas). */
export type PythonListProblem =
	| { readonly kind: 'bool' }
	| { readonly kind: 'big-int' }
	| { readonly kind: 'not-finite' }
	| { readonly kind: 'other'; readonly type: string }
	/** Un texte de plus de `MAX_CATEGORY_LENGTH` caractères : jamais une modalité. */
	| { readonly kind: 'long-text' }
	/** Plus de `MAX_PYTHON_LIST_LENGTH` éléments : le worker ne les parcourt pas. */
	| { readonly kind: 'too-long' };

/**
 * Une liste affectée par le programme, telle que le worker la rapporte : ses
 * valeurs si elle en a au plus `MAX_LIST_VALUES`, sinon ses effectifs s'il y a
 * au plus `MAX_CATEGORIES` valeurs différentes, sinon ni l'un ni l'autre.
 */
export interface PythonListReport {
	readonly name: string;
	readonly length: number;
	/** Le nombre de valeurs différentes (0 quand `problem` est posé). */
	readonly distinct: number;
	readonly problem?: PythonListProblem;
	readonly items?: readonly PythonEntry[];
	/** Valeur et effectif, dans l'ordre de première apparition. */
	readonly counts?: readonly (readonly [PythonEntry, number])[];
}

/** Une liste à créer dans l'atelier reçu : son nom d'atelier, ou le titre de sa colonne (Q6). */
export interface MailboxList {
	readonly name?: string;
	readonly title?: string;
	readonly definition: string;
}

export type AtelierOffer =
	| {
			readonly kind: 'list' | 'counts';
			readonly name: string;
			/** Le libellé du menu. */
			readonly label: string;
			readonly lists: readonly MailboxList[];
	  }
	| { readonly kind: 'refused'; readonly name: string; readonly message: string };

// =============================================================================
// Constantes
// =============================================================================

/** Ce qui ne passe pas : l'atelier ne lit que des nombres et des mots. */
const NUMBERS_AND_WORDS = 'l’atelier ne lit que des nombres et des mots.';

/** Ce que l'atelier lit comme séparateur de valeurs, ou de lignes de la grille. */
const SEPARATOR = /[;\n\r]/;

/** Un mot, comme l'atelier le lit (`parse.ts`, Q84) : au moins une lettre. */
const WORD = /\p{L}/u;

/** Au-delà, le worker ne parcourt pas la liste (une exécution ne doit pas attendre). */
export const MAX_PYTHON_LIST_LENGTH = 1_000_000;

/** Un nom de variable plus long n'est pas proposé (le message du worker est borné). */
export const MAX_PYTHON_NAME_LENGTH = 200;

// =============================================================================
// Fonctions
// =============================================================================

/** Ce que le menu propose pour une liste du programme. */
export function offerOf(report: PythonListReport): AtelierOffer {
	const { name } = report;
	const refused = (message: string): AtelierOffer => ({
		kind: 'refused',
		name,
		message: `« ${name} » ${message}`
	});

	if (report.problem !== undefined) return refused(problemMessage(report.problem));
	if (report.length === 0) return refused('est vide.');

	if (report.items !== undefined) {
		const definition = definitionOf(report.items);
		if (typeof definition !== 'string') return refused(definition.message);
		// Un seul mot rend toute la liste qualitative (Q84) : ses modalités se
		// comptent alors comme l'atelier les compte, sans la casse ni les espaces
		const modalities = report.items.some((entry) => typeof entry === 'string')
			? new Set(report.items.map((entry) => categoryKey(String(entry)))).size
			: 0;
		if (modalities > MAX_CATEGORIES) {
			return refused(
				`a ${modalities} modalités : une liste de mots en a au plus ${MAX_CATEGORIES} dans l’atelier.`
			);
		}
		const plural = report.length > 1 ? 'valeurs' : 'valeur';
		return {
			kind: 'list',
			name,
			label: `${name} (${grouped(report.length)} ${plural})`,
			lists: [{ ...namedAs(name, ''), definition }]
		};
	}

	if (report.counts !== undefined) {
		// Des nombres en ordre croissant (un tableau d'effectifs se lit ainsi) ;
		// des mots dans l'ordre où le programme les a rencontrés
		const merged = mergedCounts(report.counts);
		const counts = merged.every(([value]) => typeof value === 'number')
			? [...merged].sort(([a], [b]) => (a as number) - (b as number))
			: merged;
		const values = definitionOf(counts.map(([value]) => value));
		if (typeof values !== 'string') return refused(values.message);
		return {
			kind: 'counts',
			name,
			label: `${name} : ses effectifs (${grouped(report.length)} valeurs, ${grouped(report.distinct)} différentes)`,
			lists: [
				{ title: titled(name, ' (valeurs)'), definition: values },
				{ title: titled(name, ' (effectifs)'), definition: join(counts.map(([, n]) => n)) }
			]
		};
	}

	return refused(
		`a ${grouped(report.length)} valeurs : l’atelier en lit au plus ${MAX_LIST_VALUES}, ou ses effectifs s’il y a au plus ${MAX_CATEGORIES} valeurs différentes (elle en a ${grouped(report.distinct)}).`
	);
}

function problemMessage(problem: PythonListProblem): string {
	switch (problem.kind) {
		case 'bool':
			return `contient des booléens (True, False) : ${NUMBERS_AND_WORDS}`;
		case 'big-int':
			return 'contient un entier trop grand (au-delà de 2⁵³) : l’atelier ne le garderait pas exact.';
		case 'not-finite':
			return 'contient nan ou inf : ce ne sont pas des nombres pour l’atelier.';
		case 'other':
			return `contient un élément de type ${problem.type} : ${NUMBERS_AND_WORDS}`;
		case 'long-text':
			return LONG_WORD;
		case 'too-long':
			return 'a plus d’un million de valeurs : trop pour l’atelier.';
	}
}

const LONG_WORD = `contient un mot de plus de ${MAX_CATEGORY_LENGTH} caractères : l’atelier ne le garde pas comme modalité.`;

/** Ce qu'un texte deviendrait dans l'atelier, s'il n'y reste pas un mot (revue) ; `null` s'il en est un. */
function textProblem(text: string): string | null {
	if (SEPARATOR.test(text)) {
		return 'contient un texte avec « ; » ou un retour à la ligne : l’atelier y verrait deux valeurs.';
	}
	if (text.trim() === '') return 'contient un texte vide : l’atelier y verrait une case vide.';
	if (text.includes(',')) {
		return 'contient un texte avec une virgule : l’atelier la lirait comme un séparateur.';
	}
	// Q92 : ce qui se lit comme un nombre n'est jamais un mot (`'12'`, `'0x10'`, `'1e3'`)
	if (readListValue(text) !== null) {
		return `contient le texte « ${text} », que l’atelier lirait comme un nombre : écris-le sans guillemets.`;
	}
	if (!WORD.test(text)) return `contient le texte « ${text} », qui n’est ni un nombre ni un mot.`;
	if (text.trim().length > MAX_CATEGORY_LENGTH) return LONG_WORD;
	return null;
}

/** La clé d'une modalité, comme l'atelier la compte (`parse.ts`, Q85). */
function categoryKey(entry: string): string {
	return entry.trim().toLocaleLowerCase('fr');
}

/**
 * Les effectifs réunis par modalité, comme l'atelier les lira : `P` et `p ` sont
 * une même modalité, écrite comme sa première occurrence (revue — sinon les
 * valeurs se confondent à l'arrivée et les effectifs ne s'alignent plus).
 */
function mergedCounts(
	counts: readonly (readonly [PythonEntry, number])[]
): (readonly [PythonEntry, number])[] {
	const merged = new Map<string, [PythonEntry, number]>();
	for (const [value, count] of counts) {
		const key = typeof value === 'string' ? categoryKey(value) : `#${value}`;
		const seen = merged.get(key);
		if (seen === undefined) merged.set(key, [value, count]);
		else seen[1] += count;
	}
	return [...merged.values()];
}

/** La définition d'atelier d'une liste (`3 ; 5 ; 1`), ou ce qui l'empêche. */
function definitionOf(entries: readonly PythonEntry[]): string | { message: string } {
	for (const entry of entries) {
		const problem = typeof entry === 'string' ? textProblem(entry) : null;
		if (problem !== null) return { message: problem };
	}
	const definition = join(entries);
	if (definition.length > MAX_DEFINITION_LENGTH) {
		return {
			message: `s’écrit en plus de ${grouped(MAX_DEFINITION_LENGTH)} caractères (ses nombres ont beaucoup de décimales) : arrondis-les en Python, par exemple round(x, 3).`
		};
	}
	return definition;
}

/**
 * ⚠️ `String(x)` et le `repr` de Python écrivent tous deux le plus court
 * décimal qui redonne le même flottant : `0.30000000000000004` revient exact.
 */
function join(entries: readonly PythonEntry[]): string {
	return entries.map((entry) => String(entry)).join(' ; ');
}

/** Un nom Python qui est déjà un nom d'atelier (`L`) est gardé ; sinon il titre la colonne. */
function namedAs(name: string, suffix: string): { name: string } | { title: string } {
	return validateName(name, []) === null ? { name } : { title: titled(name, suffix) };
}

/** Le titre d'une colonne, borné comme ceux de la grille : le nom raccourci, jamais le suffixe. */
function titled(name: string, suffix: string): string {
	const room = MAX_TITLE_LENGTH - suffix.length;
	return (name.length <= room ? name : `${name.slice(0, room - 1)}…`) + suffix;
}

/** 1000 → « 1000 », 10000 → « 10 000 » (BIPM), comme les messages du moteur. */
function grouped(value: number): string {
	return groupNumberText(String(value), ' ');
}

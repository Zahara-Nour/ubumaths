/**
 * Atelier — les objets de la figure : points et courbes (géométrie v2, lot 1)
 *
 * Ce module ne lit rien avec un parseur : il découpe et repère dans le TEXTE
 * ce que la grammaire de l'atelier ne sait pas porter seule (le couple d'un
 * point, le nombre de « = » d'une équation), et il porte les messages. La
 * lecture mathématique vit dans `parse.ts`, qui l'importe (pas l'inverse).
 *
 * Spécification : `docs/wip/atelier-geometrie-phase0.md` (G0, G3, C1-C15, P1-P9).
 *
 * @module atelier/geometry
 */

import type { AtelierObject } from './types';

// =============================================================================
// Messages (phase 0, mot pour mot quand elle les donne)
// =============================================================================

/** C8 */
export const CURVE_NEEDS_XY = 'Une équation de courbe contient x ou y.';
/** C9 */
export const CURVE_REGION =
	'Une courbe s’écrit avec « = ». Les régions ne sont pas encore prises en charge.';
/** C10 */
export const CURVE_ONE_EQUAL = 'Une équation de courbe n’a qu’un seul « = ».';
/** Une courbe sans « = » (dans la carte : `y + 2x`) */
export const CURVE_NO_EQUAL = 'Une courbe s’écrit avec « = » : par exemple y = 3x − 2.';
/** C11 (D4 : une grandeur à unité n'est pas traçable) */
export const CURVE_UNIT =
	'Une équation de courbe s’écrit sans unité : une grandeur ne se trace pas.';
/** P6 */
export const POINT_SEMICOLON = 'Sépare les coordonnées avec « ; ».';
/** P7 */
export const POINT_TWO = 'Un point du plan a deux coordonnées.';
/** P8 (D4) */
export const POINT_UNIT = 'Les coordonnées d’un point sont des nombres sans unité.';
/** Un point écrit sans ses parenthèses, dans la carte (`1 ; 2`) */
export const POINT_SHAPE =
	'Un point s’écrit avec ses deux coordonnées entre parenthèses : (1 ; 2).';
/** x ou y dans une coordonnée : ce sont les variables des équations */
export const POINT_NO_XY =
	'Les coordonnées d’un point ne contiennent ni x ni y : ce sont les variables des équations.';
/** P9 */
export const POINT_IN_CALCULATION = 'On ne calcule pas encore avec des points.';
/** Une courbe citée dans un calcul ou une définition (`d + 1`) */
export const CURVE_IN_CALCULATION = 'On ne calcule pas avec une courbe.';

/** `y` dans la définition d'un objet qui n'est pas une courbe (G5). */
export function reservedYMessage(kind: AtelierObject['kind']): string {
	const who =
		kind === 'function' ? 'une fonction' : kind === 'sequence' ? 'une suite' : 'une valeur';
	return `« y » est réservé aux équations de courbe : ${who} ne peut pas s’en servir.`;
}

/** Q2 (a) : ce qu'on dit à l'ouverture d'un atelier dont un objet s'appelait `y`. */
export function reservedYRenamedMessage(to: string): string {
	return `« y » est désormais réservé aux équations : ton objet s’appelle maintenant ${to}.`;
}

/**
 * Ce qu'on dit d'un objet renommé à la relecture (`migrateReservedNames`) :
 * l'objet `y` (G5), ou une valeur `u_3` rangée à côté d'une suite ou d'une
 * fonction `u`, où `u_3` désigne désormais u(3) (2026-10-19).
 */
export function renamedOnReadMessage(renamed: {
	readonly from: string;
	readonly to: string;
}): string {
	const indexed = /^([A-Za-z])_(\d+)$/.exec(renamed.from);
	if (indexed === null) return reservedYRenamedMessage(renamed.to);
	const [, base, index] = indexed;
	return `« ${renamed.from} » se lit désormais ${base}(${index}) : ton objet s’appelle maintenant ${renamed.to}.`;
}

/** M2 (Q3) */
export function figureFullMessage(max: number): string {
	return `Un atelier ne peut pas contenir plus de ${max} points et courbes.`;
}

// =============================================================================
// Équations
// =============================================================================

/**
 * Un signe d'inégalité (C9) : texte (`<`, `>=`, `≤`) ou LaTeX (`\le`, `\geq`…).
 * ⚠️ `\left` commence par `\le` : la commande doit finir là (`(?![A-Za-z])`).
 */
const INEQUALITY = /[<>≤≥⩽⩾≠]|\\(?:leqslant|geqslant|leq|geq|neq|le|ge|lt|gt|ne)(?![A-Za-z])/;

/** Une relation, quelle qu'elle soit : ce qui distingue `d : y = x` de la division `a : b`. */
export function hasRelation(text: string): boolean {
	return text.includes('=') || INEQUALITY.test(text);
}

/** Le refus d'une équation de courbe d'après sa FORME (C9, C10), ou `null`. */
export function equationShapeRefusal(text: string): string | null {
	if (INEQUALITY.test(text)) return CURVE_REGION;
	const equals = (text.match(/=/g) ?? []).length;
	if (equals === 0) return CURVE_NO_EQUAL;
	if (equals > 1) return CURVE_ONE_EQUAL;
	return null;
}

/**
 * Le texte cite-t-il x ou y comme une lettre seule ? Pour TRIER une saisie
 * (`d : y = x` est une courbe, `a : b = 2` une comparaison) ; le contrôle d'une
 * équation, lui, se fait sur l'arbre (`parse.ts`). `max`, `exp(x)` : le x de
 * `max` est collé à une lettre, celui de `exp(x)` non.
 */
export function citesXOrY(text: string): boolean {
	// `xy` (x·y) compte : une suite de x et de y, collée à aucune autre lettre
	return /(?<![A-Za-z\\])[xy]+(?![A-Za-z])/.test(text);
}

// =============================================================================
// Points
// =============================================================================

/** Une virgule qui n'est pas décimale (`1, 2`, `a,b`) : la règle de #983. */
const SEPARATING_COMMA = /,(?!\d)|(?<!\d),/;

/**
 * Le contenu entre les parenthèses EXTÉRIEURES, si tout le texte est entre
 * elles (`(1 ; 2)`, `\left(1;2\right)`), sinon `null`. `(1)+(2)` n'en est pas un.
 */
export function insideParentheses(text: string): string | null {
	const trimmed = text.trim();
	const latex = /^\\left\s*\(([\s\S]*)\\right\s*\)$/.exec(trimmed);
	const inner = latex?.[1] ?? /^\(([\s\S]*)\)$/.exec(trimmed)?.[1] ?? null;
	if (inner === null) return null;
	// Les parenthèses extérieures se répondent : la profondeur ne retombe jamais à zéro
	let depth = 0;
	for (const char of inner) {
		if (char === '(') depth++;
		else if (char === ')' && --depth < 0) return null;
	}
	return depth === 0 ? inner : null;
}

/** Couper au « ; » de premier niveau (hors parenthèses, crochets, accolades). */
function firstLevelParts(text: string): string[] {
	const parts: string[] = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if ('([{'.includes(char)) depth++;
		else if (')]}'.includes(char)) depth--;
		else if (char === ';' && depth === 0) {
			parts.push(text.slice(start, i));
			start = i + 1;
		}
	}
	parts.push(text.slice(start));
	return parts.map((part) => part.trim());
}

/**
 * Le texte a-t-il la FORME d'un point (pour trier une saisie de Calcul) : entre
 * parenthèses, avec un « ; » de premier niveau ou une virgule qui sépare
 * (`(1, 2)`, refusé par P6). `(1,2)` reste le décimal 1,2 (règle #983).
 */
export function looksLikePoint(text: string): boolean {
	const inner = insideParentheses(text);
	if (inner === null) return false;
	return firstLevelParts(inner).length > 1 || SEPARATING_COMMA.test(inner.replace(/\{,\}/g, ','));
}

/** Les deux coordonnées telles qu'écrites, ou le refus de la forme (P6, P7). */
export function splitCoordinates(
	definition: string
):
	| { readonly ok: true; readonly coordinates: readonly [string, string] }
	| { readonly ok: false; readonly message: string; readonly count?: number } {
	const inner = insideParentheses(definition);
	if (inner === null) return { ok: false, message: POINT_SHAPE };
	const parts = firstLevelParts(inner);
	if (parts.length === 1) {
		// La virgule de MathLive (`1{,}5`) est décimale
		const separated = SEPARATING_COMMA.test(inner.replace(/\{,\}/g, ','));
		return { ok: false, message: separated ? POINT_SEMICOLON : POINT_TWO, count: 1 };
	}
	if (parts.length !== 2 || parts.some((part) => part === '')) {
		return { ok: false, message: POINT_TWO, count: parts.length };
	}
	return { ok: true, coordinates: [parts[0], parts[1]] };
}

// =============================================================================
// Cités ailleurs
// =============================================================================

/**
 * Le refus à dire quand un des noms cités est un point ou une courbe (P9), sinon
 * `null` — la même règle dans Calcul et sur les cartes, comme `listCitedMessage`.
 */
export function figureCitedMessage(
	objects: readonly AtelierObject[],
	cited: Iterable<string>
): string | null {
	const names = new Set(cited);
	const found = objects.find(
		(o) => (o.kind === 'point' || o.kind === 'curve') && names.has(o.name)
	);
	if (found === undefined) return null;
	return found.kind === 'point' ? POINT_IN_CALCULATION : CURVE_IN_CALCULATION;
}

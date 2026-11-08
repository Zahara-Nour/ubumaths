/**
 * Vecteurs donnés et combinaison à tracer dans un repère
 * ======================================================
 *
 * Bloc ```courbe (chantier `docs/wip/somme-vecteurs-progress.md`, phase 0 validée le
 * 2026-11-08) :
 *
 * - `vecteurs: u = AB, AC` : flèches données, entre points de `points:` ;
 * - `tracer: vecteur 2u - AC depuis A` : combinaison de vecteurs nommés ou de
 *   couples de points, coefficients entiers de −3 à 3 (SV2) ; ses coordonnées
 *   sont calculées ici, le juge du vecteur à tracer (`courbe-vecteur.ts`) reste
 *   le même.
 *
 * Phrases de la correction nommées pour deux termes (SV3) ; pointillés de la
 * construction (SV4) : parallélogramme quand les deux représentants donnés
 * partent de l'origine de la flèche juste, sinon le second terme mis au bout du
 * premier (Chasles).
 *
 * Calcul pur, sans Svelte.
 *
 * @module ubumark/utils/courbe-combinaison
 */

import { COURBE_LIMITS } from '../types/courbe';
import type { CourbeGivenVector, CourbePoint, CourbeSpec, CourbeVectorTerm } from '../types/courbe';
import { clean, isInWindow, pointText, type CourbePlacedPoint } from './courbe-placer';

// Types

/** Un trait en pointillés de la correction ; `arrow` : avec sa pointe */
export interface ConstructionTrace {
	from: CourbePlacedPoint;
	to: CourbePlacedPoint;
	arrow: boolean;
}

// Constantes

const VECTOR_NAME_REGEX = /^[a-z]$/;
/** Un vecteur donné : `u = AB` ou `AB` */
const GIVEN_REGEX = /^(?:([a-z])\s*=\s*)?([A-Za-z][A-Za-z0-9']*)$/;
/** Un terme : signe, coefficient (nombre quelconque, vérifié après), nom */
const TERM_REGEX = /\s*([+-])?\s*(\d+(?:[.,/]\d+)?)?\s*([A-Za-z][A-Za-z0-9']*)\s*/y;

const COEFFICIENT_RULE = `coefficients entiers de -${COURBE_LIMITS.coefficient} à ${COURBE_LIMITS.coefficient}, sauf 0 (ex. 2u - v)`;

/** Écart relatif toléré (calculs en virgule flottante) */
const RELATIVE_TOLERANCE = 1e-9;

// Functions

function sameNumber(a: number, b: number): boolean {
	return Math.abs(a - b) <= RELATIVE_TOLERANCE * Math.max(1, Math.abs(a), Math.abs(b));
}

function samePoint(p: CourbePlacedPoint, q: CourbePlacedPoint): boolean {
	return sameNumber(p.x, q.x) && sameNumber(p.y, q.y);
}

function add(p: CourbePlacedPoint, q: CourbePlacedPoint, k = 1): CourbePlacedPoint {
	return { x: clean(p.x + k * q.x), y: clean(p.y + k * q.y) };
}

/** `AB` → les deux points, s'il n'y a qu'une façon de couper le nom ; null sinon */
function pointPair(text: string, points: CourbePoint[]): [CourbePoint, CourbePoint] | null {
	const found: [CourbePoint, CourbePoint][] = [];
	for (let i = 1; i < text.length; i++) {
		const from = points.find((p) => p.name === text.slice(0, i));
		const to = points.find((p) => p.name === text.slice(i));
		if (from && to) found.push([from, to]);
	}
	return found.length === 1 ? found[0] : null;
}

/**
 * `vecteurs: u = AB, AC` : les vecteurs donnés ; message d'erreur (sans
 * « vecteurs : ») levé en `Error`
 */
export function readGivenVectors(
	value: string,
	line: number,
	points: CourbePoint[]
): CourbeGivenVector[] {
	const items = value
		.split(',')
		.map((item) => item.trim())
		.filter((item) => item !== '');
	if (items.length === 0) throw new Error('vecteurs : au moins un vecteur (ex. vecteurs: u = AB)');
	if (items.length > COURBE_LIMITS.vectors) {
		throw new Error(`vecteurs : au plus ${COURBE_LIMITS.vectors} vecteurs par figure`);
	}
	const vectors: CourbeGivenVector[] = [];
	for (const item of items) {
		const match = GIVEN_REGEX.exec(item);
		if (!match) {
			throw new Error(
				`vecteurs : « ${item} » illisible (ex. vecteurs: u = AB, v = AC ; points pris dans points:)`
			);
		}
		const [, name = '', pair] = match;
		const ends = pointPair(pair, points);
		if (ends === null) {
			throw new Error(
				`vecteurs : ${item} : ${pair} doit être formé de deux points de points: (ex. points: A(0;0), B(2;1))`
			);
		}
		const [from, to] = ends;
		if (samePoint(from, to)) throw new Error(`vecteurs : ${item} : vecteur nul`);
		if (name !== '') {
			if (vectors.some((v) => v.name === name)) {
				throw new Error(`vecteurs : le nom ${name} est donné deux fois`);
			}
			if (points.some((p) => p.name === name)) {
				throw new Error(`vecteurs : ${name} est déjà le nom d’un point`);
			}
		}
		vectors.push({ name, from: from.name, to: to.name, line });
	}
	return vectors;
}

/** Le texte est-il une combinaison (et non des coordonnées `(3 ; -2)` ou `?`) ? */
export function isCombinationText(text: string): boolean {
	return !/^(?:[a-z]\s*=\s*)?[(?]/.test(text.trim());
}

/**
 * `2u - AC` : les termes de la combinaison ; message d'erreur (sans « tracer : »)
 * levé en `Error`
 */
export function readCombination(
	text: string,
	given: CourbeGivenVector[],
	points: CourbePoint[]
): CourbeVectorTerm[] {
	const source = text.trim();
	if (/^[a-z]\s*=/.test(source)) {
		throw new Error(
			'un nom ne s’écrit qu’avec des coordonnées (tracer: vecteur u = (3 ; -2)) ; une combinaison se dit par ses vecteurs (tracer: vecteur u + v)'
		);
	}
	const terms: CourbeVectorTerm[] = [];
	TERM_REGEX.lastIndex = 0;
	while (TERM_REGEX.lastIndex < source.length) {
		const start = TERM_REGEX.lastIndex;
		const match = TERM_REGEX.exec(source);
		if (!match || (terms.length > 0 && match[1] === undefined)) {
			throw new Error(
				`vecteur « ${source} » illisible à partir de « ${source.slice(start).trim()} » (ex. tracer: vecteur u + v depuis A, tracer: vecteur 2u - AC)`
			);
		}
		const [, sign = '+', written, word] = match;
		if (written !== undefined && !/^\d+$/.test(written)) throw new Error(COEFFICIENT_RULE);
		const size = written === undefined ? 1 : Number(written);
		if (size === 0 || size > COURBE_LIMITS.coefficient) throw new Error(COEFFICIENT_RULE);
		const coef = sign === '-' ? -size : size;
		const named = given.find((v) => v.name !== '' && v.name === word);
		const ends = named
			? ([
					points.find((p) => p.name === named.from)!,
					points.find((p) => p.name === named.to)!
				] as const)
			: VECTOR_NAME_REGEX.test(word)
				? null
				: pointPair(word, points);
		if (ends === null) {
			throw new Error(
				VECTOR_NAME_REGEX.test(word)
					? `${word} : aucun vecteur de ce nom dans vecteurs:`
					: `${word} : ni un vecteur de vecteurs:, ni deux points de points:`
			);
		}
		const [from, to] = ends;
		terms.push({
			coef,
			name: named ? named.name : '',
			from: from.name,
			to: to.name,
			at: { x: from.x, y: from.y },
			u: { x: clean(to.x - from.x), y: clean(to.y - from.y) }
		});
		if (terms.length > COURBE_LIMITS.terms) {
			throw new Error(`au plus ${COURBE_LIMITS.terms} termes dans une combinaison`);
		}
	}
	if (terms.length === 0) throw new Error('vecteur : combinaison vide (ex. tracer: vecteur u + v)');
	return terms;
}

/** Les coordonnées de la combinaison */
export function combinationCoords(terms: CourbeVectorTerm[]): CourbePlacedPoint {
	return terms.reduce((sum, t) => add(sum, t.u, t.coef), { x: 0, y: 0 });
}

/** Un vecteur en LaTeX : `\vec{u}`, `\overrightarrow{AC}` */
function vectorLatex(t: CourbeVectorTerm): string {
	return t.name !== '' ? `\\vec{${t.name}}` : `\\overrightarrow{${t.from}${t.to}}`;
}

/** La combinaison en LaTeX, coefficients `coefs` (ceux des termes par défaut) */
export function combinationLatex(terms: CourbeVectorTerm[], coefs = terms.map((t) => t.coef)) {
	return terms
		.map((t, i) => {
			const c = coefs[i];
			const size = Math.abs(c) === 1 ? '' : String(Math.abs(c));
			const sign = c < 0 ? '-' : i === 0 ? '' : '+';
			return `${sign}${size}${vectorLatex(t)}`;
		})
		.join('');
}

/**
 * La phrase de la correction (inline markdown, formules `$…$`) pour une flèche
 * `drawn` non nulle qui ne représente pas la combinaison
 */
export function combinationMistake(drawn: CourbePlacedPoint, terms: CourbeVectorTerm[]): string {
	const expected = combinationLatex(terms);
	const coefs = terms.map((t) => t.coef);
	const opposite = coefs.map((c) => -c);
	if (samePoint(drawn, combinationCoords(terms.map((t, i) => ({ ...t, coef: opposite[i] }))))) {
		const latex = terms.length === 1 ? combinationLatex(terms, opposite) : `-(${expected})`;
		return `Ta flèche va dans le mauvais sens : elle représente $${latex}$.`;
	}
	if (terms.length === 2) {
		const variants: { coefs: number[]; alone?: number }[] = [
			{ coefs: [coefs[0], 0], alone: 0 },
			{ coefs: [0, coefs[1]], alone: 1 },
			{ coefs: [coefs[0], -coefs[1]] },
			{ coefs: [-coefs[0], coefs[1]] }
		];
		for (const variant of variants) {
			const coords = combinationCoords(terms.map((t, i) => ({ ...t, coef: variant.coefs[i] })));
			if (!samePoint(drawn, coords)) continue;
			const latex =
				variant.alone === undefined
					? combinationLatex(terms, variant.coefs)
					: combinationLatex([terms[variant.alone]], [coefs[variant.alone]]);
			const alone = variant.alone === undefined ? '' : ' seul';
			return `Ta flèche représente $${latex}$${alone}, pas $${expected}$.`;
		}
	}
	return `Ta flèche représente le vecteur ${pointText(drawn.x, drawn.y)}, pas $${expected}$.`;
}

/**
 * Les pointillés de la correction, pour la flèche juste partie de `from` (deux
 * termes seulement) : les côtés du parallélogramme qui manquent quand les deux
 * représentants donnés partent de `from` (avec le côté `k·u` quand k ≠ 1, la
 * flèche donnée ne le montrant pas) ; sinon le premier terme depuis `from`, puis
 * le second à son bout. Un trait dont un bout sort de la fenêtre est laissé.
 */
export function constructionTraces(
	spec: Pick<CourbeSpec, 'window' | 'grid' | 'size'>,
	terms: CourbeVectorTerm[],
	from: CourbePlacedPoint
): ConstructionTrace[] {
	if (terms.length !== 2) return [];
	const [first, second] = terms.map((t) => add(from, t.u, t.coef));
	const end = add(first, terms[1].u, terms[1].coef);
	const sameOrigin = terms.every((t) => samePoint(t.at, from));
	const traces: ConstructionTrace[] = sameOrigin
		? [
				...terms.flatMap((t, i) =>
					t.coef === 1 ? [] : [{ from, to: i === 0 ? first : second, arrow: true }]
				),
				{ from: first, to: end, arrow: false },
				{ from: second, to: end, arrow: false }
			]
		: [
				{ from, to: first, arrow: true },
				{ from: first, to: end, arrow: true }
			];
	return traces.filter(
		(t) => isInWindow(spec, t.from.x, t.from.y) && isInWindow(spec, t.to.x, t.to.y)
	);
}

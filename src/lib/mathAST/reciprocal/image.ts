/**
 * L'image f(I) d'une fonction, par deux chemins indépendants
 *
 * - **Par les variations** (`imageByVariations`) : `computeVariations` sur I
 *   découpe I en morceaux de stricte monotonie (un point critique isolé ne
 *   coupe pas un morceau qui garde son sens : x³) ; l'image d'un morceau va
 *   de la valeur (ou limite) à une borne à celle de l'autre. f est injective
 *   sur I exactement quand les images des morceaux sont deux à deux
 *   disjointes (homographique : ]−∞ ; 2[ et ]2 ; +∞[).
 * - **Par le solveur** (`imageBySolver`) : y a un antécédent dans I quand la
 *   solution x = s(y) existe (sa condition, le domaine de s) et tombe dans I.
 *
 * `computeRange` ne sert pas ici : il rend `null` pour (2x+1)/(x−3) et
 * ln(x − 1) (mesuré le 2026-10-13).
 *
 * @module mathAST/reciprocal/image
 */

import type { MathNode, RelationType } from '../types';
import type { Domain, Endpoint, Interval } from '../domain/types';
import { relation } from '../factory';
import { isInfinity, isLogical, isRelation } from '../guards';
import { flattenRelationChain } from '../flatten';
import { substitute } from '../eval/substitute';
import { computeNumericValueOrInfinity } from '../eval/numeric-value';
import { tidy } from '../tidy';
import { computeVariations } from '../variations/compute';
import type { LimitValue, VariationResult } from '../variations/types';
import { computeDomain } from '../domain/compute';
import { intersect, union } from '../domain/algebra';
import { emptyDomain, interval, intervalSet, universalDomain } from '../domain/factory';
import { negativeInfinity, positiveInfinity } from '../factory';
import { solveInequality } from '../solve/inequality';

// =============================================================================
// Types
// =============================================================================

/** Un morceau de I où f est strictement monotone, avec son image. */
export interface MonotonePiece {
	readonly piece: Interval;
	readonly image: Interval;
}

/** Les morceaux de stricte monotonie ; `null` : variations inconnues. */
export type Pieces = readonly MonotonePiece[] | null;

// =============================================================================
// Outils numériques
// =============================================================================

export function approx(node: MathNode): number | null {
	return computeNumericValueOrInfinity(node);
}

function limitNode(limit: LimitValue): MathNode | null {
	if (limit === 'infinity') return positiveInfinity();
	if (limit === 'negative_infinity') return negativeInfinity();
	if (limit === 'indeterminate') return null;
	return limit;
}

// =============================================================================
// Par les variations
// =============================================================================

/** f à une borne d'un morceau : limite de bord si connue, sinon valeur exacte. */
function valueAtEnd(
	f: MathNode,
	variable: string,
	variations: VariationResult,
	end: Endpoint,
	side: 'left' | 'right'
): MathNode | null {
	const at = approx(end.value);
	if (at === null) return null;
	const limit = (variations.boundaryLimits ?? []).find(
		(b) => approx(b.point) === at && (b.direction === side || b.direction === 'both')
	);
	if (limit) return limitNode(limit.limit);
	if (isInfinity(end.value)) return null;
	const value = tidy(substitute(f, { [variable]: end.value }));
	return approx(value) === null ? null : value;
}

function imageOfPiece(
	f: MathNode,
	variable: string,
	variations: VariationResult,
	piece: Interval,
	increasing: boolean
): Interval | null {
	const atLower = valueAtEnd(f, variable, variations, piece.lower, 'right');
	const atUpper = valueAtEnd(f, variable, variations, piece.upper, 'left');
	if (atLower === null || atUpper === null) return null;
	const end = (value: MathNode, from: Endpoint): Endpoint => ({
		value,
		type:
			from.type === 'closed' && !isInfinity(from.value) && !isInfinity(value) ? 'closed' : 'open'
	});
	const low = end(atLower, piece.lower);
	const high = end(atUpper, piece.upper);
	return increasing ? interval(low, high) : interval(high, low);
}

/**
 * Les morceaux de stricte monotonie de f sur `domain`, et leurs images.
 * Un point critique isolé est rattaché aux deux morceaux voisins ; deux
 * morceaux voisins de même sens, séparés par un point de `domain`, n'en font
 * qu'un (x³ croît sur ℝ).
 */
export function monotonePieces(f: MathNode, variable: string, domain: Domain): Pieces {
	let variations: VariationResult;
	try {
		variations = computeVariations(f, { variable, domain });
	} catch {
		return null;
	}
	if (variations.derivativeZerosUnresolved) return null;
	type Raw = { lower: Endpoint; upper: Endpoint; increasing: boolean };
	const raws: Raw[] = [];
	let pendingPoint: Endpoint | null = null;
	for (const { interval: iv, monotonicity } of variations.monotonicIntervals) {
		const isPoint = approx(iv.lower.value) === approx(iv.upper.value);
		if (isPoint && monotonicity === 'constant') {
			pendingPoint = { value: iv.lower.value, type: 'closed' };
			const last = raws[raws.length - 1];
			if (last && approx(last.upper.value) === approx(iv.lower.value)) last.upper = pendingPoint;
			continue;
		}
		if (monotonicity !== 'increasing' && monotonicity !== 'decreasing') return null;
		const increasing = monotonicity === 'increasing';
		const lower =
			pendingPoint && approx(pendingPoint.value) === approx(iv.lower.value)
				? pendingPoint
				: iv.lower;
		const last = raws[raws.length - 1];
		const touching =
			last && last.upper.type === 'closed' && approx(last.upper.value) === approx(lower.value);
		if (last && touching && last.increasing === increasing) last.upper = iv.upper;
		else raws.push({ lower, upper: iv.upper, increasing });
		pendingPoint = null;
	}
	if (raws.length === 0) return null;
	const pieces: MonotonePiece[] = [];
	for (const raw of raws) {
		const piece = interval(raw.lower, raw.upper);
		const image = imageOfPiece(f, variable, variations, piece, raw.increasing);
		if (image === null) return null;
		pieces.push({ piece, image });
	}
	return pieces;
}

/** Deux images se recouvrent (un point commun suffit). */
function overlap(a: Interval, b: Interval): boolean | null {
	const [aLow, aHigh, bLow, bHigh] = [a.lower, a.upper, b.lower, b.upper].map((e) =>
		approx(e.value)
	);
	if (aLow === null || aHigh === null || bLow === null || bHigh === null) return null;
	const low = Math.max(aLow, bLow);
	const high = Math.min(aHigh, bHigh);
	if (low < high) return true;
	if (low > high) return false;
	const closedAt = (iv: Interval, v: number): boolean =>
		(approx(iv.lower.value) === v && iv.lower.type === 'closed') ||
		(approx(iv.upper.value) === v && iv.upper.type === 'closed');
	return closedAt(a, low) && closedAt(b, low);
}

/** Vrai : injective ; faux : deux morceaux ont un point d'image commun ; null : inconnu. */
export function injectiveByPieces(pieces: Pieces): boolean | null {
	if (pieces === null) return null;
	for (let i = 0; i < pieces.length; i++) {
		for (let j = i + 1; j < pieces.length; j++) {
			const shared = overlap(pieces[i].image, pieces[j].image);
			if (shared === null) return null;
			if (shared) return false;
		}
	}
	return true;
}

export function imageByVariations(pieces: Pieces): Domain | null {
	if (pieces === null) return null;
	return pieces
		.map(({ image }): Domain => intervalSet([image]))
		.reduce((all, image) => union(all, image));
}

// =============================================================================
// Par le solveur
// =============================================================================

/** Les y qui vérifient la condition (« et », « ou », chaînes). */
function conditionDomain(condition: MathNode, letter: string): Domain {
	if (isLogical(condition) && (condition.operator === 'and' || condition.operator === 'or')) {
		const left = conditionDomain(condition.left, letter);
		const right = conditionDomain(condition.right, letter);
		return condition.operator === 'and' ? intersect(left, right) : union(left, right);
	}
	if (!isRelation(condition)) throw new Error('condition illisible');
	const { operands, relations } = flattenRelationChain(condition);
	return relations
		.map((op, i) => inequalityDomain(relation(op, operands[i], operands[i + 1]), letter))
		.reduce<Domain>((all, d) => intersect(all, d), universalDomain());
}

function inequalityDomain(atom: MathNode, letter: string): Domain {
	if (!isRelation(atom)) throw new Error('relation attendue');
	return solveInequality(atom, { variable: letter, strictMode: true }).solution;
}

/** Les y tels que s(y) appartient à l'intervalle. */
function landsIn(s: MathNode, letter: string, iv: Interval): Domain {
	let domain: Domain = { kind: 'universal' };
	const bound = (end: Endpoint, low: boolean): void => {
		if (isInfinity(end.value)) return;
		const op: RelationType = low
			? end.type === 'closed'
				? '>='
				: '>'
			: end.type === 'closed'
				? '<='
				: '<';
		domain = intersect(domain, inequalityDomain(relation(op, s, end.value), letter));
	};
	bound(iv.lower, true);
	bound(iv.upper, false);
	return domain;
}

/**
 * f(I) lue sur la solution x = s(y) : condition d'existence, domaine de s,
 * et s(y) ∈ I. `null` quand une inéquation ne se résout pas.
 */
export function imageBySolver(
	s: MathNode,
	condition: MathNode | undefined,
	letter: string,
	domain: Domain
): Domain | null {
	try {
		const definition = computeDomain(s, letter);
		if (definition.unresolved !== undefined && definition.unresolved.length > 0) return null;
		let image = definition.domain;
		if (condition) image = intersect(image, conditionDomain(condition, letter));
		if (domain.kind === 'universal') return image;
		if (domain.kind !== 'interval_set') return null;
		const lands = domain.intervals
			.map((iv) => landsIn(s, letter, iv))
			.reduce<Domain>((all, d) => union(all, d), emptyDomain());
		image = intersect(image, lands);
		for (const point of domain.excludedPoints) {
			image = intersect(image, inequalityDomain(relation('!=', s, point.value), letter));
		}
		return image;
	} catch {
		return null;
	}
}

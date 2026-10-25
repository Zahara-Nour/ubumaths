/**
 * Grapheur — une courbe restreinte à un ensemble (réunion d'intervalles).
 *
 * Lot 3 de `docs/archive/wip/atelier-intervalle-phase0.md` (I5) : une fonction de
 * l'atelier définie sur `[0;+∞[` ne se trace que là, et chaque borne finie se
 * marque d'un point plein (fermée) ou creux (ouverte), sur le modèle de
 * geometry-core (`functionToSVG`, `courbe … sur ]a;b]`).
 *
 * L'ensemble arrive ici NUMÉRIQUE : le grapheur ne lit pas les intervalles
 * symboliques, c'est l'appelant (l'atelier) qui convertit `π` en `3,14…`.
 * Champ optionnel : une courbe sans restriction se trace comme avant.
 *
 * @module grapheur/restriction
 */

import type { FunctionAnalysis, Viewport } from './types';

// =============================================================================
// Types
// =============================================================================

/** Un morceau de l'ensemble : bornes réelles (±∞ permis) et leur type. */
export interface CurvePiece {
	readonly from: number;
	readonly to: number;
	readonly fromClosed: boolean;
	readonly toClosed: boolean;
}

/** L'ensemble où la courbe est tracée : morceaux disjoints, dans l'ordre. */
export type Restriction = readonly CurvePiece[];

/** Un point de bord, en coordonnées mathématiques. */
export interface EndpointMarker {
	readonly x: number;
	readonly y: number;
	/** Plein pour une borne fermée, creux pour une borne ouverte. */
	readonly filled: boolean;
}

// =============================================================================
// Appartenance
// =============================================================================

function insidePiece(piece: CurvePiece, x: number): boolean {
	const afterFrom = piece.fromClosed ? x >= piece.from : x > piece.from;
	const beforeTo = piece.toClosed ? x <= piece.to : x < piece.to;
	return afterFrom && beforeTo;
}

/** `x` est-il dans l'ensemble ? Toujours vrai sans restriction. */
export function isInsideRestriction(restriction: Restriction | undefined, x: number): boolean {
	return restriction === undefined || restriction.some((piece) => insidePiece(piece, x));
}

/** Deux restrictions identiques ? Par le contenu : la synchronisation compare des copies. */
export function sameRestriction(a: Restriction | undefined, b: Restriction | undefined): boolean {
	if (a === undefined || b === undefined) return a === b;
	return (
		a.length === b.length &&
		a.every(
			(p, i) =>
				p.from === b[i].from &&
				p.to === b[i].to &&
				p.fromClosed === b[i].fromClosed &&
				p.toClosed === b[i].toClosed
		)
	);
}

// =============================================================================
// Tracé
// =============================================================================

/**
 * Les fenêtres à échantillonner : une par morceau visible, rognée à la fenêtre.
 * Sans restriction, la fenêtre entière — le tracé d'avant, inchangé.
 */
export function pieceViewports(
	restriction: Restriction | undefined,
	viewport: Viewport
): Viewport[] {
	if (restriction === undefined) return [viewport];
	const result: Viewport[] = [];
	for (const piece of restriction) {
		const xMin = Math.max(viewport.xMin, piece.from);
		const xMax = Math.min(viewport.xMax, piece.to);
		if (xMax > xMin) result.push({ ...viewport, xMin, xMax });
	}
	return result;
}

/**
 * Les points de bord visibles : un par borne finie où la fonction a une
 * valeur. Là où elle n'en a pas (`1/x` en 0, asymptote), aucun point — un
 * point creux y affirmerait une limite finie qui n'existe pas.
 *
 * Deux morceaux qui se touchent (`ℝ \ {0}`) donnent un seul point ; s'ils ne
 * s'accordent pas, le plein l'emporte (la valeur est atteinte).
 */
export function endpointMarkers(
	restriction: Restriction | undefined,
	evaluator: (x: number) => number | null,
	viewport: Viewport
): EndpointMarker[] {
	if (restriction === undefined) return [];
	const markers: EndpointMarker[] = [];
	const bounds = restriction.flatMap((p) => [
		{ x: p.from, closed: p.fromClosed },
		{ x: p.to, closed: p.toClosed }
	]);
	for (const { x, closed } of bounds) {
		if (!Number.isFinite(x) || x < viewport.xMin || x > viewport.xMax) continue;
		const y = evaluator(x);
		if (y === null || !Number.isFinite(y) || y < viewport.yMin || y > viewport.yMax) continue;
		const twin = markers.findIndex((m) => m.x === x);
		if (twin === -1) markers.push({ x, y, filled: closed });
		else if (closed) markers[twin] = { x, y, filled: true };
	}
	return markers;
}

// =============================================================================
// Analyses
// =============================================================================

/** Un côté infini de l'ensemble est-il atteint ? */
function reaches(restriction: Restriction, side: 'left' | 'right'): boolean {
	return restriction.some((p) => (side === 'left' ? p.from === -Infinity : p.to === Infinity));
}

/**
 * Restreindre une direction d'asymptote (horizontale, oblique…) aux côtés
 * infinis que l'ensemble atteint ; `null` si aucun.
 */
function restrictDirection(
	direction: 'left' | 'right' | 'both',
	restriction: Restriction
): 'left' | 'right' | 'both' | null {
	const left = direction !== 'right' && reaches(restriction, 'left');
	const right = direction !== 'left' && reaches(restriction, 'right');
	if (left && right) return 'both';
	if (left) return 'left';
	if (right) return 'right';
	return null;
}

function keepDirection<T extends { readonly direction: 'left' | 'right' | 'both' }>(
	items: readonly T[],
	restriction: Restriction
): T[] {
	return items.flatMap((item) => {
		const direction = restrictDirection(item.direction, restriction);
		return direction === null ? [] : [{ ...item, direction }];
	});
}

/**
 * Les points remarquables et asymptotes d'une courbe restreinte : zéros et
 * extremums dans l'ensemble ; asymptote verticale dans l'ensemble ou à son
 * bord (`1/x` sur `]0;5]` garde x = 0) ; asymptotes « à l'infini » du seul côté
 * que l'ensemble atteint.
 */
export function restrictAnalysis(
	analysis: FunctionAnalysis,
	restriction: Restriction | undefined
): FunctionAnalysis {
	if (restriction === undefined) return analysis;
	const inClosure = (x: number) => restriction.some((p) => x >= p.from && x <= p.to);
	return {
		...analysis,
		roots: analysis.roots.filter((r) => isInsideRestriction(restriction, r.x)),
		extrema: analysis.extrema.filter((e) => isInsideRestriction(restriction, e.x)),
		verticalAsymptotes: analysis.verticalAsymptotes.filter((a) => inClosure(a.x)),
		horizontalAsymptotes: keepDirection(analysis.horizontalAsymptotes, restriction),
		obliqueAsymptotes: keepDirection(analysis.obliqueAsymptotes, restriction),
		polynomialAsymptotes: keepDirection(analysis.polynomialAsymptotes, restriction)
	};
}

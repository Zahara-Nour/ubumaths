/**
 * Intégrale définie : la primitive F doit être continue sur [a ; b].
 *
 * F(b) − F(a) n'est la valeur de ∫ₐᵇ f que si F est une primitive de f sur
 * TOUT l'intervalle. À travers un pôle (cos/sin sur [−3 ; 2], 1/x sur
 * [−1 ; 1]), F diverge ou saute : la différence aux bornes est un nombre
 * sans signification (revue de #947). Ce contrôle numérique détecte :
 *
 * - une valeur non finie de F dans [a ; b] (F non définie, pôle atteint) ;
 * - une limite infinie aux bornes (∫₀¹ dx/x : ln x → −∞ en 0⁺) ;
 * - un saut intérieur (tan, −1/x) : bissection vers la plus grande variation ;
 * - une divergence intérieure (ln|·|) : zoom vers l'échantillon extrême, où
 *   F croît encore quand elle n'est pas bornée.
 *
 * Une F continue mais non dérivable en un point (2√x en 0, intégrale
 * impropre convergente) est acceptée : F(b) − F(a) est alors juste.
 *
 * @module mathAST/integration/singularity
 */

import type { MathNode } from '../types';
import { isGreek, isVariable } from '../guards';
import { findNodes } from '../transforms';
import { compile } from '../eval/compile';

// =============================================================================
// Constantes
// =============================================================================

/** Segments de la grille de [a ; b] */
const GRID_SEGMENTS = 400;
/** Bissections par segment (largeur finale ≈ L·10⁻¹⁶) */
const BISECTIONS = 45;
/** Distances relatives aux bornes pour la limite unilatérale */
const NEAR_END = 1e-12;
const NEARER_END = 1e-14;
/** Zoom de la divergence : 8 sous-segments, jusqu'à une largeur relative de 10⁻¹³ */
const ZOOM_SAMPLES = 8;
const ZOOM_WIDTH = 1e-13;
/** Zooms (×1/4 chacun) sur lesquels la croissance de F est mesurée */
const LOOKBACK = 5;
/** Écart toléré, relatif à l'ordre de grandeur de F */
const RELATIVE_TOLERANCE = 1e-4;
/** Prolongement par continuité : voisins à h = 10⁻⁷·max(1, |x|), puis h/100 */
const REMOVABLE_STEP = 1e-7;
const REMOVABLE_RATIO = 100;
/** Écart relatif toléré entre ces voisins */
const REMOVABLE_TOLERANCE = 1e-6;

// =============================================================================
// Outils
// =============================================================================

/** Lettres de F autres que la variable (paramètres) : contrôle impossible */
function hasFreeSymbols(antiderivative: MathNode, variable: string): boolean {
	return (
		findNodes(
			antiderivative,
			(n) => (isVariable(n) && n.name !== variable && n.name !== 'e') || isGreek(n)
		).length > 0
	);
}

function format(x: number): string {
	return String(Math.round(x * 1000) / 1000).replace('.', ',');
}

interface Segment {
	readonly left: number;
	readonly right: number;
	readonly fLeft: number;
	readonly fRight: number;
}

/**
 * Saut : bissection vers la moitié de plus grande variation. Une F continue
 * n'y varie presque plus au bout de BISECTIONS pas ; un saut (fini ou infini)
 * reste. Abscisse du saut, ou null.
 */
function jumpIn(F: (x: number) => number, segment: Segment, tolerance: number): number | null {
	let { left, right, fLeft, fRight } = segment;
	for (let step = 0; step < BISECTIONS; step++) {
		const middle = (left + right) / 2;
		const fMiddle = F(middle);
		if (!Number.isFinite(fMiddle)) return middle;
		if (Math.abs(fMiddle - fLeft) >= Math.abs(fRight - fMiddle)) {
			right = middle;
			fRight = fMiddle;
		} else {
			left = middle;
			fLeft = fMiddle;
		}
	}
	return Math.abs(fRight - fLeft) > tolerance ? (left + right) / 2 : null;
}

/**
 * Divergence (ln|x − z| → ∞) : zoom ×1/4 autour de l'échantillon le plus
 * éloigné de la moyenne des extrémités — le plus proche de z. Une F continue
 * s'y stabilise ; une F non bornée y croît encore de c·ln(4^LOOKBACK) sur
 * les derniers LOOKBACK zooms. Abscisse de la divergence, ou null.
 */
function blowUpIn(F: (x: number) => number, segment: Segment, tolerance: number): number | null {
	const reference = (segment.fLeft + segment.fRight) / 2;
	let { left, right } = segment;
	const extremes: number[] = [];
	let best = left;
	while (right - left > ZOOM_WIDTH * Math.max(1, Math.abs(left))) {
		const width = right - left;
		let bestIndex = 0;
		let bestGap = -1;
		let bestValue = 0;
		for (let j = 0; j <= ZOOM_SAMPLES; j++) {
			const x = left + (width * j) / ZOOM_SAMPLES;
			const value = F(x);
			if (!Number.isFinite(value)) return x;
			const gap = Math.abs(value - reference);
			if (gap > bestGap) {
				bestGap = gap;
				bestIndex = j;
				bestValue = value;
			}
		}
		extremes.push(bestValue);
		best = left + (width * bestIndex) / ZOOM_SAMPLES;
		const start = left;
		left = start + (width * Math.max(0, bestIndex - 1)) / ZOOM_SAMPLES;
		right = start + (width * Math.min(ZOOM_SAMPLES, bestIndex + 1)) / ZOOM_SAMPLES;
	}
	if (extremes.length <= LOOKBACK) return null;
	const growth = Math.abs(extremes[extremes.length - 1] - extremes[extremes.length - 1 - LOOKBACK]);
	return growth > tolerance ? best : null;
}

// =============================================================================
// Balayage commun (F, ou f dans le repli numérique)
// =============================================================================

/**
 * Raison pour laquelle `fn` n'est pas continue sur [lo ; hi], ou null.
 * `subject` nomme la fonction contrôlée dans les messages.
 */
function scanDiscontinuity(
	fn: (x: number) => number,
	lo: number,
	hi: number,
	subject: 'la primitive' | 'la fonction'
): string | null {
	const length = hi - lo;

	// Grille : bornes approchées de l'intérieur (F peut y valoir 0·∞, x ln x en 0)
	const xs: number[] = [lo + length * NEAR_END];
	for (let i = 1; i < GRID_SEGMENTS; i++) xs.push(lo + (length * i) / GRID_SEGMENTS);
	xs.push(hi - length * NEAR_END);
	const values = xs.map(fn);
	const bad = values.findIndex((v) => !Number.isFinite(v));
	if (bad !== -1) return `${subject} n'y est pas définie (x ≈ ${format(xs[bad])})`;

	const magnitudes = values.map(Math.abs).sort((p, q) => p - q);
	const tolerance = RELATIVE_TOLERANCE * Math.max(1, magnitudes[magnitudes.length >> 1]);

	// Limites unilatérales aux bornes
	for (const [end, toward] of [
		[lo, 1],
		[hi, -1]
	] as const) {
		const near = fn(end + toward * length * NEAR_END);
		const nearer = fn(end + toward * length * NEARER_END);
		if (!Number.isFinite(nearer) || Math.abs(nearer - near) > tolerance) {
			return `${subject} diverge en x = ${format(end)}`;
		}
	}

	// Sauts (tan, −1/x) puis divergences logarithmiques (ln|·|), segment par segment
	for (let i = 0; i + 1 < xs.length; i++) {
		const segment: Segment = {
			left: xs[i],
			right: xs[i + 1],
			fLeft: values[i],
			fRight: values[i + 1]
		};
		const at = jumpIn(fn, segment, tolerance) ?? blowUpIn(fn, segment, tolerance);
		if (at !== null) return `la fonction a une singularité en x ≈ ${format(at)}`;
	}
	return null;
}

/** f compilée, ou null (paramètres libres, nœud non compilable) */
function compiledIn(node: MathNode, variable: string): ((x: number) => number) | null {
	if (hasFreeSymbols(node, variable)) return null;
	try {
		const compiled = compile(node);
		return (x: number): number => compiled({ [variable]: x });
	} catch {
		return null;
	}
}

/**
 * f prolongée par continuité en ses points isolés non définis (sin x / x en
 * 0) : valeur commune des voisins à deux distances, des deux côtés dans
 * [lo ; hi]. Un pôle (1/x² : 10¹⁴ puis 10¹⁸) ou un saut reste NaN.
 */
function extendedByContinuity(
	f: (x: number) => number,
	lo: number,
	hi: number
): (x: number) => number {
	return (x: number): number => {
		const value = f(x);
		if (Number.isFinite(value)) return value;
		const h = REMOVABLE_STEP * Math.max(1, Math.abs(x));
		const neighbours = [x - h, x + h, x - h / REMOVABLE_RATIO, x + h / REMOVABLE_RATIO]
			.filter((p) => p >= lo && p <= hi)
			.map(f);
		if (neighbours.length < 2 || !neighbours.every(Number.isFinite)) return Number.NaN;
		const reference = neighbours[0];
		const scale = Math.max(1, Math.abs(reference));
		if (neighbours.some((v) => Math.abs(v - reference) > REMOVABLE_TOLERANCE * scale)) {
			return Number.NaN;
		}
		return neighbours.reduce((sum, v) => sum + v, 0) / neighbours.length;
	};
}

// =============================================================================
// Points d'entrée
// =============================================================================

/**
 * Raison (en français) pour laquelle F n'est pas continue sur [a ; b], ou
 * null (F continue, ou contrôle impossible : paramètres, bornes non numériques).
 */
export function antiderivativeDiscontinuity(
	antiderivative: MathNode,
	variable: string,
	lower: number,
	upper: number
): string | null {
	if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower === upper) return null;
	const F = compiledIn(antiderivative, variable);
	if (F === null) return null;
	return scanDiscontinuity(F, Math.min(lower, upper), Math.max(lower, upper), 'la primitive');
}

/** Intégrande prêt pour la quadrature, ou raison du refus */
export type NumericIntegrand =
	| { readonly kind: 'regular'; readonly f: (x: number) => number }
	| { readonly kind: 'singular'; readonly reason: string }
	| { readonly kind: 'unchecked' };

/**
 * Repli numérique (primitive refusée) : pas de F à contrôler, c'est f qui doit
 * être continue sur [a ; b] — sinon Simpson rend un nombre à travers un pôle
 * (e^x / x sur [−1 ; 1]). Les singularités prolongeables (sin x / x en 0)
 * sont levées : la fonction rendue les prolonge par continuité. Une f non
 * bornée mais intégrable (1/√x en 0) est refusée aussi : prudence, aucune
 * valeur douteuse. `unchecked` : paramètres libres ou f non compilable.
 */
export function numericIntegrand(
	integrand: MathNode,
	variable: string,
	lower: number,
	upper: number
): NumericIntegrand {
	const f = compiledIn(integrand, variable);
	if (f === null) return { kind: 'unchecked' };
	const lo = Math.min(lower, upper);
	const hi = Math.max(lower, upper);
	const extended = extendedByContinuity(f, lo, hi);
	if (lo === hi) return { kind: 'regular', f: extended };
	// Les bornes elles-mêmes (Simpson les évalue) : prolongeables, ou refus
	for (const end of [lo, hi]) {
		if (!Number.isFinite(extended(end))) {
			return { kind: 'singular', reason: `la fonction diverge en x = ${format(end)}` };
		}
	}
	const reason = scanDiscontinuity(extended, lo, hi, 'la fonction');
	return reason === null ? { kind: 'regular', f: extended } : { kind: 'singular', reason };
}

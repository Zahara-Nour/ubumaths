/**
 * Atelier — intersections et points sur un objet (géométrie v2, lot 2, PR 3 : L5)
 *
 * Le calcul PUR d'`intersection(a, b, k)` et de `point_sur(objet, position)`,
 * sur des supports déjà résolus (`Support` : une ligne par deux points, un
 * cercle, une conique par ses six coefficients, une courbe y = f(x)). Sans
 * atelier : `construction.ts` résout les supports et appelle ce module ; la vue
 * Géométrie (`figure-sync.ts`) l'appelle aussi, à chaque cran d'un curseur, sur
 * les supports où les valeurs des curseurs sont substituées — LE MÊME calcul
 * (racines exactes comprises), donc le même point et la même numérotation que
 * la carte (revue de la PR 3 : deux méthodes dessinaient un autre point).
 *
 * L1 (décision de David, 2026-10-18) : les fonctions PURES de `geometry-core`
 * (`intersectLL`, `intersectLC`, `intersectCC`, `intersectLQExact`,
 * `intersectQQ`, `intersectLF`, `intersectFF`), exactes quand leurs données le
 * sont ; une courbe y = f(x) passe d'abord par les racines EXACTES de mathAST
 * (`exactZeros` : fractions, a ± b√m), sinon par le Newton de geometry-core.
 *
 * ## La numérotation `k` (L5)
 *
 * Celle de `geometry-core`, telle que le DSL la donne, pour qu'un point ne saute
 * pas d'une branche à l'autre quand un curseur bouge :
 * - droite × cercle, droite × conique : dans le sens de la droite (de son
 *   premier point vers le second) ;
 * - cercle × cercle : k = 1 à gauche de (centre 1 → centre 2) ;
 * - droite × courbe y = f(x), deux courbes : abscisses croissantes ;
 * - conique × conique : l'ordre de `intersectQQ`.
 *
 * Les solutions sont numérotées sur les droites PORTEUSES ; un point hors d'un
 * segment ou d'une demi-droite n'existe pas (attente). Sans `k`, le seul point
 * commun aux portions est pris ; deux ou plus : refus qui dit quoi écrire.
 *
 * @module atelier/construction-intersect
 */

import type { MathNode } from '$lib/mathAST/types';
import type { GeoPoint } from '$lib/geometry-core/types/primitives';
import type { Domain } from '$lib/mathAST/domain/types';
import { exact, isExact, numeric, type GeoValue } from '$lib/geometry-core/types/geo-value';
import {
	geoAdd,
	geoDiv,
	geoFromFraction,
	geoFromNumber,
	geoMul,
	geoSub,
	simplifyExact
} from '$lib/geometry-core/compute/geo-arithmetic';
import { geoEqual, geoIsZero } from '$lib/geometry-core/compute/compare';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';
import {
	intersectCC,
	intersectFF,
	intersectLC,
	intersectLF,
	intersectLL,
	intersectLQExact,
	intersectQQ
} from '$lib/geometry-core/geometry/intersections';
import { compile } from '$lib/mathAST/eval/compile';
import { getVariables, substitute } from '$lib/mathAST/eval/substitute';
import { findNodes, mapNode } from '$lib/mathAST/transforms';
import { isZeroExpression } from '$lib/mathAST/normal';
import { exactZeros } from '$lib/mathAST/domain/exact-roots';
import { containsValue } from '$lib/mathAST/domain/algebra';
import {
	add,
	cos,
	divide,
	multiply,
	piConstant,
	sin,
	subtract,
	variable
} from '$lib/mathAST/factory';
import { numericNode } from '$lib/mathAST/common/numeric';
import type { LineShape } from './construction-spec';

// =============================================================================
// Types
// =============================================================================

/** Un support RÉSOLU : ce que coupe une intersection, ce qui porte un point. */
export type Support =
	| {
			readonly type: 'line';
			readonly shape: LineShape;
			readonly from: GeoPoint;
			readonly to: GeoPoint;
	  }
	| { readonly type: 'circle'; readonly center: GeoPoint; readonly radius: GeoValue }
	/** A·x² + B·xy + C·y² + D·x + E·y + F = 0 (une courbe par équation du second degré). */
	| { readonly type: 'conic'; readonly coefficients: readonly GeoValue[] }
	/** y = f(x) : une fonction de l'atelier, ou une courbe par équation affine en y. */
	| {
			readonly type: 'graph';
			readonly expression: MathNode;
			readonly domain: Domain | null;
			/** Une fonction de l'atelier (« fonction »), ou une courbe par équation. */
			readonly isFunction: boolean;
	  };

/**
 * Pourquoi rien n'est construit : une erreur (l'écriture ne va pas), une attente
 * (rien ne se coupe avec les valeurs du moment — un curseur peut y remédier),
 * une ambiguïté (plusieurs points, sans `k`), une infinité de points communs, ou
 * un couple que l'atelier ne sait pas encore couper (fonction × cercle, courbe
 * implicite). Les trois derniers sont refusés à la saisie : rien n'est créé.
 */
export type FailureReason = 'error' | 'pending' | 'ambiguous' | 'infinite' | 'unsupported';

export class GeometryFailure extends Error {
	constructor(
		message: string,
		readonly reason: FailureReason = 'error'
	) {
		super(message);
	}
}

// =============================================================================
// Constantes
// =============================================================================

/**
 * La fenêtre où chercher les intersections d'une courbe y = f(x) sans forme
 * exacte : celle du DSL (`FUNCTION_SEARCH_XMIN` / `XMAX` de `dsl/builtins.ts`).
 */
const SEARCH = { min: -10, max: 10 } as const;

/** Tolérance sur le paramètre d'un point le long d'un segment ou d'une demi-droite. */
const PORTION_EPSILON = 1e-9;

const TRIGONOMETRY = new Set(['sin', 'cos', 'tan']);

// =============================================================================
// Outils
// =============================================================================

function nodeOf(value: GeoValue): MathNode {
	return isExact(value) ? value.node : numericNode(value.value);
}

/** Le paramètre de `p` le long de la droite (from → to) : 0 en from, 1 en to. */
function parameterAlong(p: GeoPoint, from: GeoPoint, to: GeoPoint): number {
	const [fx, fy, tx, ty, px, py] = [from.x, from.y, to.x, to.y, p.x, p.y].map(geoToNumber);
	const [dx, dy] = [tx - fx, ty - fy];
	return ((px - fx) * dx + (py - fy) * dy) / (dx * dx + dy * dy);
}

/** Le point est-il sur la PORTION (segment, demi-droite) ? Toujours sur une droite, un cercle. */
function onPortion(p: GeoPoint, s: Support): boolean {
	if (s.type !== 'line' || s.shape === 'line') return true;
	const t = parameterAlong(p, s.from, s.to);
	if (!Number.isFinite(t)) return true;
	return s.shape === 'segment'
		? t >= -PORTION_EPSILON && t <= 1 + PORTION_EPSILON
		: t >= -PORTION_EPSILON;
}

/**
 * Une valeur exacte qui garde un cosinus ou un sinus non remarquable
 * (`cos(π/9)`) se dit en décimal, comme un angle non remarquable (PR 2).
 */
export function settled(value: GeoValue): GeoValue {
	if (!isExact(value)) return value;
	const trigonometric = findNodes(
		value.node,
		(n) => n.type === 'function' && TRIGONOMETRY.has(n.name)
	);
	if (trigonometric.length === 0 || getVariables(value.node).size > 0) return value;
	return numeric(geoToNumber(value));
}

/**
 * Une racine de `exactZeros` s'écrit `√2 ÷ 2` (division en ligne) : en fraction,
 * comme Calcul (`\\dfrac{\\sqrt{2}}{2}`, `√2/2`), avant tout calcul et tout rendu.
 */
function asFraction(node: MathNode): MathNode {
	return mapNode(node, (n) =>
		n.type === 'division' && n.displayStyle !== 'fraction' ? { ...n, displayStyle: 'fraction' } : n
	);
}

/** La valeur d'une courbe y = f(x) en x0, exacte si x0 l'est ; `null` hors de son ensemble. */
function graphValue(graph: Support & { type: 'graph' }, x0: GeoValue): GeoValue | null {
	const x = geoToNumber(x0);
	if (Number.isFinite(x) && graph.domain !== null && !containsValue(graph.domain, x)) return null;
	if (isExact(x0)) {
		const y = exact(simplifyExact(substitute(graph.expression, { x: x0.node })));
		// Une lettre libre (un curseur gardé par la vue Géométrie) : rien à juger
		if (getVariables(y.node).size > 0) return y;
		return Number.isFinite(geoToNumber(y)) ? settled(y) : null;
	}
	const y = compile(graph.expression)({ x });
	return Number.isFinite(y) ? numeric(y) : null;
}

// =============================================================================
// Les solutions, numérotées
// =============================================================================

type Solutions =
	| { readonly kind: 'points'; readonly points: readonly GeoPoint[]; readonly max: number | null }
	| { readonly kind: 'infinite' };

const NONE_FOR_GRAPHS = {
	circle: 'L’intersection d’une fonction et d’un cercle n’est pas encore dans l’atelier.',
	conic: 'L’intersection d’une fonction et d’une conique n’est pas encore dans l’atelier.'
} as const;

function lineLine(a: Support & { type: 'line' }, b: Support & { type: 'line' }): Solutions {
	const point = intersectLL(a.from, a.to, b.from, b.to);
	if (point !== null) return { kind: 'points', points: [point], max: 1 };
	// Parallèles : confondues si b.from est sur (a)
	const cross = geoSub(
		geoMul(geoSub(a.to.x, a.from.x), geoSub(b.from.y, a.from.y)),
		geoMul(geoSub(a.to.y, a.from.y), geoSub(b.from.x, a.from.x))
	);
	return geoIsZero(cross) ? { kind: 'infinite' } : { kind: 'points', points: [], max: 1 };
}

/** Les six coefficients d'un cercle, comme `compute-position.ts` (`getConicCoefficients`). */
function circleCoefficients(c: Support & { type: 'circle' }): readonly GeoValue[] {
	const { x, y } = c.center;
	const minusTwo = geoFromNumber(-2);
	return [
		geoFromNumber(1),
		geoFromNumber(0),
		geoFromNumber(1),
		geoMul(minusTwo, x),
		geoMul(minusTwo, y),
		geoSub(geoAdd(geoMul(x, x), geoMul(y, y)), geoMul(c.radius, c.radius))
	];
}

function numbers(values: readonly GeoValue[]): [number, number, number, number, number, number] {
	const [A, B, C, D, E, F] = values.map(geoToNumber);
	return [A, B, C, D, E, F];
}

/** Deux équations proportionnelles : la même courbe. */
function sameConic(p: readonly number[], q: readonly number[]): boolean {
	const pivot = q.reduce((best, v, i) => (Math.abs(v) > Math.abs(q[best]) ? i : best), 0);
	if (Math.abs(q[pivot]) < 1e-12) return false;
	const ratio = p[pivot] / q[pivot];
	const scale = Math.max(...p.map(Math.abs), 1);
	return p.every((v, i) => Math.abs(v - ratio * q[i]) < 1e-9 * scale);
}

/** Une droite y = m·x + p, ou x = k verticale (en valeurs, exactes si possible). */
function lineEquationOf(
	line: Support & { type: 'line' }
):
	| { readonly vertical: false; readonly m: GeoValue; readonly p: GeoValue }
	| { readonly vertical: true; readonly k: GeoValue } {
	const dx = geoSub(line.to.x, line.from.x);
	const m = geoIsZero(dx) ? null : geoDiv(geoSub(line.to.y, line.from.y), dx);
	if (m === null) return { vertical: true, k: line.from.x };
	return { vertical: false, m, p: geoSub(line.from.y, geoMul(m, line.from.x)) };
}

/** Les points de y = f(x) dont l'abscisse annule h, exacts d'abord. */
function graphPoints(
	h: MathNode,
	graph: Support & { type: 'graph' },
	other: (Support & { type: 'graph' }) | null,
	numericFallback: () => GeoPoint[] | null
): Solutions {
	const exactInputs = getVariables(h).size <= 1;
	if (exactInputs && isZeroExpression(h)) return { kind: 'infinite' };
	const roots = exactInputs ? exactZeros(h, 'x') : null;
	const candidates: GeoPoint[] =
		roots !== null
			? roots.flatMap((root) => {
					const x = exact(asFraction(root.node));
					const y = graphValue(graph, x);
					return y === null ? [] : [{ x, y }];
				})
			: (numericFallback() ?? []);
	const points = candidates.filter((p) => {
		const x = geoToNumber(p.x);
		const inside = (g: Support & { type: 'graph' }) =>
			g.domain === null || containsValue(g.domain, x);
		return inside(graph) && (other === null || inside(other));
	});
	return { kind: 'points', points, max: null };
}

function lineGraph(
	line: Support & { type: 'line' },
	graph: Support & { type: 'graph' }
): Solutions {
	const equation = lineEquationOf(line);
	if (equation.vertical) {
		const y = graphValue(graph, equation.k);
		return { kind: 'points', points: y === null ? [] : [{ x: equation.k, y }], max: null };
	}
	const h = subtract(
		graph.expression,
		add(multiply(nodeOf(equation.m), variable('x'), 'implicit'), nodeOf(equation.p))
	);
	return graphPoints(h, graph, null, () =>
		intersectLF(
			line.from,
			line.to,
			graph.expression,
			compile(graph.expression),
			SEARCH.min,
			SEARCH.max
		)
	);
}

function graphGraph(f: Support & { type: 'graph' }, g: Support & { type: 'graph' }): Solutions {
	return graphPoints(subtract(f.expression, g.expression), f, g, () =>
		intersectFF(f.expression, compile(f.expression), g.expression, SEARCH.min, SEARCH.max)
	);
}

/** Les solutions, numérotées comme `geometry-core` (voir l'en-tête). */
function solutionsOf(a: Support, b: Support): Solutions {
	if (a.type === 'line' && b.type === 'line') return lineLine(a, b);
	// Une droite d'abord, comme le DSL (`createIntersectionLC(droite, cercle)`)
	if (b.type === 'line') return solutionsOf(b, a);
	if (a.type === 'line') {
		if (b.type === 'circle') {
			return {
				kind: 'points',
				points: intersectLC(a.from, a.to, b.center, b.radius) ?? [],
				max: 2
			};
		}
		if (b.type === 'conic') {
			const result = intersectLQExact(a.from, a.to, b.coefficients);
			return result.kind === 'infinite'
				? result
				: { kind: 'points', points: result.points.map(settledPoint), max: 2 };
		}
		return lineGraph(a, b);
	}
	if (a.type === 'graph' || b.type === 'graph') {
		if (a.type === 'graph' && b.type === 'graph') return graphGraph(a, b);
		const other = a.type === 'graph' ? b : a;
		throw new GeometryFailure(
			NONE_FOR_GRAPHS[other.type === 'circle' ? 'circle' : 'conic'],
			'unsupported'
		);
	}
	if (a.type === 'circle' && b.type === 'circle') {
		if (
			geoEqual(a.center.x, b.center.x) &&
			geoEqual(a.center.y, b.center.y) &&
			geoEqual(a.radius, b.radius)
		) {
			return { kind: 'infinite' };
		}
		return {
			kind: 'points',
			points: intersectCC(a.center, a.radius, b.center, b.radius) ?? [],
			max: 2
		};
	}
	// Conique × conique, ou cercle × conique : en nombres (`intersectQQ`)
	const p = numbers(a.type === 'circle' ? circleCoefficients(a) : a.coefficients);
	const q = numbers(b.type === 'circle' ? circleCoefficients(b) : b.coefficients);
	if (sameConic(p, q)) return { kind: 'infinite' };
	return { kind: 'points', points: intersectQQ(p, q) ?? [], max: 4 };
}

function settledPoint(p: GeoPoint): GeoPoint {
	return { x: settled(p.x), y: settled(p.y) };
}

// =============================================================================
// Choisir le point
// =============================================================================

function writtenCall(labels: readonly [string, string], k: number): string {
	return `intersection(${labels[0]}, ${labels[1]}, ${k})`;
}

/** « écris intersection(d, c, 1) ou intersection(d, c, 2) », pour chaque numéro proposé. */
function choices(labels: readonly [string, string], ks: readonly number[]): string {
	if (ks.length > 4) {
		return `${writtenCall(labels, ks[0])}, …, ${writtenCall(labels, ks[ks.length - 1])}`;
	}
	const calls = ks.map((k) => writtenCall(labels, k));
	return `${calls.slice(0, -1).join(', ')} ou ${calls[calls.length - 1]}`;
}

function tooLarge(a: Support, b: Support, labels: readonly [string, string], max: number): string {
	const [la, lb] = labels;
	if (max === 1 && a.type === 'line' && b.type === 'line') {
		return `Deux droites ont au plus un point commun : écris intersection(${la}, ${lb}).`;
	}
	return max === 2
		? `${la} et ${lb} ont au plus 2 points communs : k vaut 1 ou 2.`
		: `${la} et ${lb} ont au plus ${max} points communs : k va de 1 à ${max}.`;
}

/**
 * Le point `k` (à partir de 1) d'`intersection(a, b, k)`, ou le seul point commun
 * aux portions sans `k`. Lève une `GeometryFailure` avec sa raison.
 */
export function intersectionPoint(
	a: Support,
	b: Support,
	k: number | null,
	labels: readonly [string, string]
): GeoPoint {
	const [la, lb] = labels;
	const solutions = solutionsOf(a, b);
	if (solutions.kind === 'infinite') {
		throw new GeometryFailure(`${la} et ${lb} ont une infinité de points communs.`, 'infinite');
	}
	const { points, max } = solutions;
	const apart = `${la} et ${lb} ne se coupent pas.`;
	if (k !== null) {
		if (max !== null && k > max) throw new GeometryFailure(tooLarge(a, b, labels, max));
		const point = points[k - 1];
		if (point === undefined) {
			const message =
				points.length === 0
					? apart
					: points.length === 1
						? `${la} et ${lb} n’ont qu’un point commun.`
						: `${la} et ${lb} n’ont que ${points.length} points communs.`;
			throw new GeometryFailure(message, 'pending');
		}
		const off = !onPortion(point, a) ? la : !onPortion(point, b) ? lb : null;
		if (off !== null) {
			throw new GeometryFailure(`Le point ${k} de ${la} et ${lb} n’est pas sur ${off}.`, 'pending');
		}
		return point;
	}
	const candidates = points
		.map((point, i) => ({ point, k: i + 1 }))
		.filter(({ point }) => onPortion(point, a) && onPortion(point, b));
	if (candidates.length === 0) throw new GeometryFailure(apart, 'pending');
	if (candidates.length === 1) return candidates[0].point;
	const count = candidates.length === 2 ? 'deux' : String(candidates.length);
	throw new GeometryFailure(
		`${la} et ${lb} se coupent en ${count} points : écris ${choices(
			labels,
			candidates.map((c) => c.k)
		)}.`,
		'ambiguous'
	);
}

/**
 * Les points communs à `a` et `b`, sur leurs portions, avec le numéro `k` qui
 * les écrit (`intersection(a, b, k)`) — `null` quand les deux supports n'ont
 * jamais qu'un point commun (deux lignes). Rien si l'atelier ne sait pas les
 * couper, ou s'ils ont une infinité de points communs : pour l'outil
 * Intersection de la vue Géométrie (lot 3, PR 3), qui choisit le point visé.
 */
export function commonPoints(a: Support, b: Support): { k: number | null; point: GeoPoint }[] {
	let solutions: Solutions;
	try {
		solutions = solutionsOf(a, b);
	} catch (error) {
		if (error instanceof GeometryFailure) return [];
		throw error;
	}
	if (solutions.kind === 'infinite') return [];
	const { points, max } = solutions;
	return points
		.map((point, i) => ({ k: max === 1 ? null : i + 1, point }))
		.filter(({ point }) => onPortion(point, a) && onPortion(point, b));
}

// =============================================================================
// Un point sur un objet
// =============================================================================

/**
 * `point_sur(objet, position)` — les conventions du DSL (`handlePointSur`) :
 * segment, de 0 (premier point) à 1 (second), 0,5 par défaut ; droite et
 * demi-droite, l'abscisse le long de (AB) (0 en A, 1 en B, 0 par défaut ; une
 * demi-droite ne va pas sous 0) ; cercle, l'angle depuis l'horizontale, 0 par
 * défaut, en DEGRÉS toujours (L5 ; le DSL : `unite_angle`, degrés par défaut —
 * le réglage « Angles » de l'atelier ne gouverne que l'écriture des mesures) ;
 * courbe y = f(x), l'abscisse x0, 0 par défaut.
 *
 * ⚠️ Écart avec le DSL, voulu : une position hors du segment (ou sous 0 sur une
 * demi-droite) n'est pas ramenée au bord, elle met le point en attente — le
 * point d'un segment à la position 1,5 n'est pas sur le segment.
 *
 * @param written - la position telle qu'écrite (`1,5`), pour les messages
 */
export function pointOn(
	support: Support,
	position: GeoValue | null,
	written: string | null,
	label: string
): GeoPoint {
	switch (support.type) {
		case 'line': {
			const t =
				position ?? (support.shape === 'segment' ? geoFromFraction(1, 2) : geoFromNumber(0));
			const value = geoToNumber(t);
			if (
				support.shape === 'segment' &&
				(value < -PORTION_EPSILON || value > 1 + PORTION_EPSILON)
			) {
				throw new GeometryFailure(
					`Sur le segment ${label}, la position va de 0 à 1 : ${written ?? ''} en sort.`,
					'pending'
				);
			}
			if (support.shape === 'ray' && value < -PORTION_EPSILON) {
				throw new GeometryFailure(
					`Sur la demi-droite ${label}, la position est positive ou nulle : ${written ?? ''} en sort.`,
					'pending'
				);
			}
			const { from, to } = support;
			return {
				x: geoAdd(from.x, geoMul(t, geoSub(to.x, from.x))),
				y: geoAdd(from.y, geoMul(t, geoSub(to.y, from.y)))
			};
		}
		case 'circle': {
			const angle = position ?? geoFromNumber(0);
			const { center, radius } = support;
			if (!isExact(angle) || !isExact(radius) || !isExact(center.x) || !isExact(center.y)) {
				const theta = (geoToNumber(angle) * Math.PI) / 180;
				const r = geoToNumber(radius);
				return {
					x: numeric(geoToNumber(center.x) + r * Math.cos(theta)),
					y: numeric(geoToNumber(center.y) + r * Math.sin(theta))
				};
			}
			const theta = divide(
				multiply(angle.node, piConstant(), 'implicit'),
				numericNode(180),
				'fraction'
			);
			const along = (trig: typeof cos): GeoValue =>
				exact(simplifyExact(multiply(radius.node, trig(theta), 'implicit')));
			return {
				x: settled(geoAdd(center.x, along(cos))),
				y: settled(geoAdd(center.y, along(sin)))
			};
		}
		case 'graph': {
			const x0 = position ?? geoFromNumber(0);
			const y = graphValue(support, x0);
			if (y === null) {
				throw new GeometryFailure(`${label} n’est pas définie en ${written ?? '0'}.`, 'pending');
			}
			return { x: x0, y };
		}
		case 'conic':
			throw new GeometryFailure(
				`point_sur d’une courbe du second degré n’est pas encore dans l’atelier : pose le point sur une droite, un cercle ou une fonction.`,
				'unsupported'
			);
	}
}

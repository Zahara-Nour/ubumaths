/**
 * Atelier — les PROPRIÉTÉS d'un objet de la figure (point, courbe)
 *
 * Ce que le panneau « Propriétés » d'une carte affiche, ligne par ligne :
 * nature, coordonnées, longueur, équations, périmètre… Chaque valeur est
 * calculée EXACTE (`GeoValue`, comme les cartes : `construction.ts`), écrite en
 * LaTeX pour l'écran et en texte pour la lecture d'écran, avec sa valeur
 * approchée (4 décimales, virgule) quand l'exacte n'est pas un décimal simple.
 *
 * Le LaTeX est RÉGÉNÉRÉ depuis le calcul (`toLatex`) : jamais le texte saisi.
 * Rien n'est rangé : tout se relit à chaque appel, aux valeurs du moment des
 * curseurs (comme `pointOutcome`, qui les remplace par leur valeur).
 *
 * @module atelier/figure-properties
 */

import type { Atelier } from './atelier.svelte';
import type { MathNode } from '$lib/mathAST/types';
import type { GeoPoint } from '$lib/geometry-core/types/primitives';
import { exact, isExact, type GeoValue } from '$lib/geometry-core/types/geo-value';
import {
	geoAdd,
	geoDiv,
	geoFromNumber,
	geoMul,
	geoOpposite,
	geoSqrt,
	geoSub,
	simplifyExact
} from '$lib/geometry-core/compute/geo-arithmetic';
import { geoEqual, geoIsZero } from '$lib/geometry-core/compute/compare';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';
import {
	conicCoefficientNodes,
	equationExpression,
	expandedEquation,
	quadraticOrImplicit
} from '$lib/geometry-core/geometry/curve-nature';
import { divide, equals, multiply, piConstant, variable } from '$lib/mathAST/factory';
import { numericNode } from '$lib/mathAST/common/numeric';
import {
	approximatePoint,
	approximateText,
	circleEquation,
	constructionOf,
	isConstruction,
	lineEquation,
	lineOutcome,
	nodeOf,
	plainLatex,
	plainText,
	pointOutcome,
	segmentLength,
	signedSum
} from './construction';
import { curveNatureOf } from './curve-nature';
import { substitutedAstOf } from './engine';

// =============================================================================
// Types
// =============================================================================

/** Une ligne du panneau : étiquette, valeur exacte (LaTeX, texte), valeur approchée. */
export interface PropertyRow {
	/** « Longueur » */
	readonly label: string;
	/** Pour l'écran (`convertLatexToMarkup`), régénéré depuis le calcul. */
	readonly latex: string;
	/** Pour la lecture d'écran et les tests, virgule décimale : « √5 », « y = 2x + 1 ». */
	readonly text: string;
	/** « ≈ 2,2361 » quand l'exacte n'est pas un décimal simple (racine, π, 1/3). */
	readonly approximate?: string;
}

/** Un rationnel exact, en entiers (dénominateur > 0). */
interface Rational {
	readonly n: bigint;
	readonly d: bigint;
}

// =============================================================================
// Constantes
// =============================================================================

const TWO = geoFromNumber(2);

/** Les natures d'un point construit, par mot. */
const POINT_NATURES: Readonly<Record<string, string>> = {
	point: 'point par coordonnées',
	milieu: 'milieu',
	intersection: 'point d’intersection',
	point_sur: 'point sur un objet',
	projection: 'projeté orthogonal'
};

const VERTICAL = 'aucun (droite verticale)';

// =============================================================================
// Entrée
// =============================================================================

/**
 * Les propriétés de l'objet `name` de la figure (point ou courbe), dans
 * l'ordre du panneau ; `[]` s'il n'existe pas, n'est pas de la figure, ou ne
 * se calcule pas (en attente, en erreur).
 */
export function figurePropertiesOf(atelier: Atelier, name: string): readonly PropertyRow[] {
	const object = atelier.get(name);
	if (object === undefined || object.status !== 'ok') return [];
	if (object.kind === 'point') return pointProperties(atelier, name);
	if (object.kind !== 'curve') return [];
	if (isConstruction(object)) return constructedCurveProperties(atelier, name);
	return equationCurveProperties(atelier, name);
}

// =============================================================================
// Points
// =============================================================================

function pointProperties(atelier: Atelier, name: string): readonly PropertyRow[] {
	const outcome = pointOutcome(atelier, { kind: 'ref', name });
	if (!outcome.ok) return [];
	const object = atelier.get(name);
	let nature = POINT_NATURES.point;
	if (object !== undefined && isConstruction(object)) {
		const built = constructionOf(atelier, name);
		if (!built.ok) return [];
		nature = POINT_NATURES[built.call.word] ?? 'point';
	}
	return [natureRow(nature), pointRow('Coordonnées', outcome.point)];
}

// =============================================================================
// Courbes
// =============================================================================

function constructedCurveProperties(atelier: Atelier, name: string): readonly PropertyRow[] {
	const outcome = constructionOf(atelier, name);
	if (!outcome.ok) return [];
	const { built } = outcome;
	switch (built.shape) {
		case 'point':
			return [];
		case 'segment':
			return segmentProperties(built.from, built.to);
		case 'ray':
			return rayProperties(built.from, built.to);
		case 'line':
			return lineProperties(built.from, built.to);
		case 'circle':
			return circleProperties(built.center, built.radius);
	}
}

/** Une courbe par équation : droite et cercle détaillés, les autres par leur nature seule. */
function equationCurveProperties(atelier: Atelier, name: string): readonly PropertyRow[] {
	const nature = curveNatureOf(atelier, name);
	if (nature === null) return [];
	if (nature.label === 'droite') {
		const line = lineOutcome(atelier, { kind: 'ref', name });
		return line.ok ? lineProperties(line.from, line.to) : [natureRow(nature.label)];
	}
	if (nature.label === 'cercle') {
		const circle = circleOfEquation(atelier, name);
		if (circle !== null) return circleProperties(circle.center, circle.radius);
	}
	return [natureRow(nature.label)];
}

function segmentProperties(from: GeoPoint, to: GeoPoint): readonly PropertyRow[] {
	const middle = { x: half(geoAdd(from.x, to.x)), y: half(geoAdd(from.y, to.y)) };
	const [a, b] = [pointValue(from), pointValue(to)];
	return [
		natureRow('segment'),
		valueRow('Longueur', withoutRootOfFraction(segmentLength(from, to))),
		{
			label: 'Extrémités',
			latex: `${a.latex}\\text{ et }${b.latex}`,
			text: `${a.text} et ${b.text}`
		},
		pointRow('Milieu', middle)
	];
}

function rayProperties(from: GeoPoint, to: GeoPoint): readonly PropertyRow[] {
	const direction = simplestDirection(geoSub(to.x, from.x), geoSub(to.y, from.y));
	return [
		natureRow('demi-droite'),
		pointRow('Origine', from),
		equationRow('Droite support', lineEquation(from, to)),
		pointRow('Vecteur directeur', direction)
	];
}

function lineProperties(from: GeoPoint, to: GeoPoint): readonly PropertyRow[] {
	const dx = geoSub(to.x, from.x);
	const dy = geoSub(to.y, from.y);
	// a·x + b·y + c = 0, avec (−b ; a) colinéaire à (dx ; dy)
	const [a, b, c] = normalizedCoefficients([
		dy,
		geoOpposite(dx),
		geoSub(geoMul(dx, from.y), geoMul(dy, from.x))
	]);
	const cartesian = equals(
		signedSum([
			{ coefficient: a, of: variable('x') },
			{ coefficient: b, of: variable('y') },
			{ coefficient: c, of: null }
		]),
		numericNode(0)
	);
	const slope = geoIsZero(dx) ? null : geoDiv(dy, dx);
	const rows: PropertyRow[] = [
		natureRow('droite'),
		equationRow('Équation réduite', lineEquation(from, to)),
		equationRow('Équation cartésienne', cartesian)
	];
	if (slope === null) {
		rows.push(
			wordRow('Coefficient directeur', VERTICAL),
			wordRow('Ordonnée à l’origine', VERTICAL)
		);
	} else {
		rows.push(
			valueRow('Coefficient directeur', slope),
			valueRow('Ordonnée à l’origine', geoSub(from.y, geoMul(slope, from.x)))
		);
	}
	rows.push(pointRow('Vecteur directeur', directionOf(geoOpposite(b), a)));
	return rows;
}

/**
 * Le vecteur directeur qu'écrit un élève : entier et réduit quand c'est
 * possible, première composante non nulle positive (`2y = 3` → (1 ; 0), pas
 * (−2 ; 0) — revue de #1630).
 */
function directionOf(x: GeoValue, y: GeoValue): GeoPoint {
	const [ix, iy] = proportionalIntegers([x, y]) ?? [x, y];
	const lead = geoIsZero(ix) ? iy : ix;
	return geoToNumber(lead) < 0 ? { x: geoOpposite(ix), y: geoOpposite(iy) } : { x: ix, y: iy };
}

function circleProperties(center: GeoPoint, exactRadius: GeoValue): readonly PropertyRow[] {
	const radius = withoutRootOfFraction(exactRadius);
	return [
		natureRow('cercle'),
		pointRow('Centre', center),
		valueRow('Rayon', radius),
		equationRow('Équation', circleEquation(center, radius)),
		piRow('Périmètre', geoMul(TWO, radius)),
		piRow('Aire', geoMul(radius, radius))
	];
}

/**
 * Le centre et le rayon d'un cercle par équation, exacts : de
 * A·x² + A·y² + D·x + E·y + F = 0, centre (−D/2A ; −E/2A) et
 * r² = (D² + E²)/4A² − F/A. `null` si un coefficient ne se calcule pas.
 */
function circleOfEquation(
	atelier: Atelier,
	name: string
): { readonly center: GeoPoint; readonly radius: GeoValue } | null {
	const substituted = substitutedAstOf(atelier, name);
	if (!substituted.ok) return null;
	const shape = quadraticOrImplicit(expandedEquation(equationExpression(substituted.ast)));
	if (shape.kind !== 'quadratic') return null;
	const [A, , , D, E, F] = conicCoefficientNodes(shape).map((node) =>
		node === undefined ? geoFromNumber(0) : exact(simplifyExact(node))
	);
	const twoA = geoMul(TWO, A);
	const x = geoDiv(geoOpposite(D), twoA);
	const y = geoDiv(geoOpposite(E), twoA);
	const shifted = geoDiv(geoAdd(geoMul(D, D), geoMul(E, E)), geoMul(twoA, twoA));
	const constant = geoDiv(F, A);
	if (x === null || y === null || shifted === null || constant === null) return null;
	const radius = geoSqrt(geoSub(shifted, constant));
	if (radius === null || geoIsZero(radius)) return null;
	return { center: { x, y }, radius };
}

// =============================================================================
// Lignes du panneau
// =============================================================================

function natureRow(nature: string): PropertyRow {
	return wordRow('Nature', nature);
}

/** Une ligne écrite en mots (pas une valeur). */
function wordRow(label: string, words: string): PropertyRow {
	return { label, latex: `\\text{${words}}`, text: words };
}

function equationRow(label: string, equation: MathNode): PropertyRow {
	return { label, latex: plainLatex(equation), text: textOf(equation) };
}

/** Une valeur : exacte (avec son approchée si besoin), ou seulement approchée. */
function valueRow(label: string, value: GeoValue): PropertyRow {
	if (!isExact(value)) {
		const approximate = approximateText(value);
		return {
			label,
			latex: `\\approx ${approximate.replace(',', '{,}')}`,
			text: `≈ ${approximate}`
		};
	}
	const node = rootOverInteger(nodeOf(value));
	const row = { label, latex: plainLatex(node), text: textOf(node) };
	return isSimpleDecimal(value) ? row : { ...row, approximate: `≈ ${approximateText(value)}` };
}

/**
 * `(1/3)√3` écrit comme au cahier, `√3/3` ; `(2/3)√5` → `2√5/3` (revue de
 * #1630). Toute autre forme est rendue telle quelle.
 */
function rootOverInteger(node: MathNode): MathNode {
	if (node.type !== 'multiplication' || !isSqrt(node.right)) return node;
	const coefficient = rationalOf(node.left);
	if (coefficient === null || coefficient.d === 1n || coefficient.n <= 0n) return node;
	const top =
		coefficient.n === 1n
			? node.right
			: multiply(numericNode(Number(coefficient.n)), node.right, 'implicit');
	return divide(top, numericNode(Number(coefficient.d)), 'fraction');
}

/** `k·π` (périmètre, aire), exact ; π écrit avant une racine (`2π√5`). */
function piRow(label: string, factor: GeoValue): PropertyRow {
	if (!isExact(factor)) return valueRow(label, geoMul(factor, exact(piConstant())));
	const node = piTimes(factor.node);
	return {
		label,
		latex: plainLatex(node),
		text: textOf(node),
		approximate: `≈ ${approximateText(exact(node))}`
	};
}

function piTimes(factor: MathNode): MathNode {
	const pi = piConstant();
	if (geoEqual(exact(factor), geoFromNumber(1))) return pi;
	if (isSqrt(factor)) return multiply(pi, factor, 'implicit');
	if (factor.type === 'multiplication' && isSqrt(factor.right)) {
		return multiply(multiply(factor.left, pi, 'implicit'), factor.right, 'implicit');
	}
	return multiply(factor, pi, 'implicit');
}

/** Le texte d'un arbre (`plainText`), π écrit π. */
function textOf(node: MathNode): string {
	return plainText(node)
		.replace(/\\pi\b/g, 'π')
		.replace(/π\s+(?=√)/g, 'π');
}

function isSqrt(node: MathNode): boolean {
	return node.type === 'function' && node.name === 'sqrt';
}

/** Un point, avec sa valeur approchée si une coordonnée exacte n'est pas un décimal simple. */
function pointRow(label: string, point: GeoPoint): PropertyRow {
	const row = { label, ...pointValue(point) };
	const exactPoint = isExact(point.x) && isExact(point.y);
	if (!exactPoint || (isSimpleDecimal(point.x) && isSimpleDecimal(point.y))) return row;
	const [x, y] = [point.x, point.y].map(approximateText);
	return { ...row, approximate: `≈ (${x} ; ${y})` };
}

/** `(x ; y)` exact, ou `≈ (… ; …)` si une coordonnée n'est qu'approchée. */
function pointValue(point: GeoPoint): { readonly latex: string; readonly text: string } {
	const approximate = approximatePoint(point);
	if (approximate !== null) {
		return {
			latex: `\\approx\\left(${approximate.latex}\\right)`,
			text: `≈ (${approximate.text})`
		};
	}
	const [x, y] = [point.x, point.y].map(nodeOf);
	return {
		latex: `\\left(${plainLatex(x)}\\,;\\,${plainLatex(y)}\\right)`,
		text: `(${textOf(x)} ; ${textOf(y)})`
	};
}

// =============================================================================
// Normaliser
// =============================================================================

function half(value: GeoValue): GeoValue {
	// Diviser par 2 ne peut pas échouer
	return geoDiv(value, TWO) ?? value;
}

/**
 * Les coefficients d'une équation cartésienne, au plus simple : rationnels →
 * entiers premiers entre eux ; dans tous les cas, le premier non nul positif.
 */
function normalizedCoefficients(values: readonly GeoValue[]): readonly GeoValue[] {
	const scaled = proportionalIntegers(values) ?? values;
	const first = scaled.find((value) => !geoIsZero(value));
	return first !== undefined && geoToNumber(first) < 0 ? scaled.map(geoOpposite) : scaled;
}

/** Un vecteur directeur au plus simple, dans le MÊME sens (entiers si possible). */
function simplestDirection(dx: GeoValue, dy: GeoValue): GeoPoint {
	const [x, y] = proportionalIntegers([dx, dy]) ?? [dx, dy];
	return { x, y };
}

/**
 * Comme `integerMultiple`, et aussi pour des valeurs irrationnelles mais
 * PROPORTIONNELLES à des rationnels (`[√2, −√2, 0]` → `[1, −1, 0]`, revue de
 * #1630) : divisées par la première non nulle, puis ramenées en entiers. Le
 * sens est gardé (un vecteur directeur reste dans le sien). `null` sinon.
 */
function proportionalIntegers(values: readonly GeoValue[]): readonly GeoValue[] | null {
	const direct = integerMultiple(values);
	if (direct !== null) return direct;
	const pivot = values.find((value) => !geoIsZero(value));
	if (pivot === undefined) return null;
	const ratios: GeoValue[] = [];
	for (const value of values) {
		const ratio = geoDiv(value, pivot);
		if (ratio === null) return null;
		ratios.push(ratio);
	}
	const scaled = integerMultiple(ratios);
	if (scaled === null) return null;
	return geoToNumber(pivot) < 0 ? scaled.map(geoOpposite) : scaled;
}

/**
 * La racine d'une fraction écrite sans racine au dénominateur, comme au
 * lycée : `√(1/3)` → `√3/3`, `√(1/2)` → `√2/2` (revue de #1630). Une valeur
 * dont le carré n'est pas une fraction (ou déjà entier) est rendue telle quelle.
 */
function withoutRootOfFraction(value: GeoValue): GeoValue {
	if (!isExact(value) || geoToNumber(value) <= 0) return value;
	const square = geoMul(value, value);
	const rational = isExact(square) ? rationalOf(square.node) : null;
	if (rational === null || rational.d === 1n) return value;
	const root = geoSqrt(geoFromNumber(Number(rational.n * rational.d)));
	if (root === null) return value;
	return geoDiv(root, geoFromNumber(Number(rational.d))) ?? value;
}

/**
 * Le plus petit multiple POSITIF de ces rationnels qui soit en entiers
 * premiers entre eux (`[1/2, -3/2, 1]` → `[1, -3, 2]`), ou `null` si l'un
 * n'est pas rationnel (ou s'ils sont tous nuls).
 */
function integerMultiple(values: readonly GeoValue[]): readonly GeoValue[] | null {
	const rationals: Rational[] = [];
	for (const value of values) {
		const rational = isExact(value) ? rationalOf(value.node) : null;
		if (rational === null) return null;
		rationals.push(rational);
	}
	const lcm = rationals.reduce((acc, { d }) => (acc / gcd(acc, d)) * d, 1n);
	const integers = rationals.map(({ n, d }) => (n * lcm) / d);
	const divisor = integers.reduce((acc, n) => gcd(acc, n), 0n);
	if (divisor === 0n) return null;
	return integers.map((n) => geoFromNumber(Number(n / divisor)));
}

/** Une valeur exacte au développement décimal fini (`2`, `1/2`, `-0,25`), sans racine ni π. */
function isSimpleDecimal(value: GeoValue): boolean {
	if (!isExact(value)) return false;
	const rational = rationalOf(value.node);
	// Une lettre restée (aucune valeur) : pas d'approchée à donner
	if (rational === null) return !Number.isFinite(geoToNumber(value));
	let d = rational.d;
	for (const p of [2n, 5n]) while (d % p === 0n) d /= p;
	return d === 1n;
}

/** Le rationnel qu'écrit cet arbre (nombre, fraction, opposé, parenthèses), ou `null`. */
function rationalOf(node: MathNode): Rational | null {
	switch (node.type) {
		case 'number': {
			const match = /^(\d+)(?:\.(\d+))?$/.exec(node.value);
			if (match === null) return null;
			const decimals = match[2] ?? '';
			return reduced(BigInt(match[1] + decimals), 10n ** BigInt(decimals.length));
		}
		case 'opposite': {
			const inner = rationalOf(node.operand);
			return inner === null ? null : { n: -inner.n, d: inner.d };
		}
		case 'delimiter':
			return rationalOf(node.content);
		case 'division': {
			const top = rationalOf(node.numerator);
			const bottom = rationalOf(node.denominator);
			if (top === null || bottom === null || bottom.n === 0n) return null;
			return reduced(top.n * bottom.d, top.d * bottom.n);
		}
		default:
			return null;
	}
}

function reduced(n: bigint, d: bigint): Rational {
	const sign = d < 0n ? -1n : 1n;
	const divisor = gcd(n, d) || 1n;
	return { n: (sign * n) / divisor, d: (sign * d) / divisor };
}

function gcd(a: bigint, b: bigint): bigint {
	let [x, y] = [a < 0n ? -a : a, b < 0n ? -b : b];
	while (y !== 0n) [x, y] = [y, x % y];
	return x;
}

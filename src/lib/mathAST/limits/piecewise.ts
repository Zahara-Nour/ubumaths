/**
 * Limites des fonctions en escalier : partie entière (`floor`), `ceil`,
 * `round`, signe (`sign`, `sgn`).
 *
 * Écart V60 (2026-10-14) : `floor(x)` en 1 rendait 1 — la substitution
 * directe ne voit pas le saut. L'ancienne stratégie évaluait l'expression en
 * a ± 10⁻⁸ et rendait le flottant obtenu.
 *
 * Méthode : chaque appel g(u) qui dépend de la variable est remplacé par la
 * CONSTANTE qu'il vaut au voisinage du point, du côté demandé :
 * - L = lim u, calculée par le moteur ;
 * - L hors d'un saut de g : g(L) (g est constante autour de L) ;
 * - L sur un saut (entier pour `floor`/`ceil`, demi-entier pour `round`,
 *   0 pour `sign`) : le côté d'où u atteint L, lu sur la limite de
 *   1/(u − L) (+∞ : par au-dessus, −∞ : par en dessous), donne la valeur ;
 * - L = ±∞ : `sign` vaut ±1 ; `floor`/`ceil`/`round` tendent vers le même
 *   infini, mais seulement quand l'appel EST toute l'expression.
 * La limite du reste, sans fonction en escalier, est celle du moteur. Sans
 * côté demandé en un point fini, on calcule les deux côtés : différents,
 * « pas de limite » (`sides-differ`).
 *
 * Ce qu'on ne sait pas décider (appels imbriqués, argument sans limite,
 * côté illisible, `floor(x)/x` en +∞) est REFUSÉ (`unsupported`) — jamais
 * une réponse fausse. Les fonctions entières seulement (`mod`, `gcd`) ne
 * sont pas définies sur les réels : une limite qui les applique à la
 * variable est refusée.
 *
 * @module mathAST/limits/piecewise
 */

import type { MathNode } from '../types';
import type { Rational } from '../normal/types';
import type { LimitDirection, LimitResult } from './types';
import { isFunction, isInfinity } from '../guards';
import { findNodes } from '../transforms';
import { transformAST } from '../visitor';
import { fraction, mathConstant, number, subtract } from '../factory';
import { substitute } from '../eval/substitute';
import { containsVariable } from '../common/contains-variable';
import { extractExactRational, numericNode, rationalToNode } from '../common/numeric';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';
import { toLatex } from '../latex-generator';

// =============================================================================
// Types
// =============================================================================

/** Une limite calculée par le moteur ; `null` quand il renonce (exception). */
export type LimitOf = (expr: MathNode, direction: LimitDirection) => LimitResult | null;

type StepFunctionName = 'floor' | 'ceil' | 'round' | 'sign';

/** Ce que vaut un appel au voisinage : une constante, ou un infini (l'appel y tend). */
type CallValue =
	| { readonly kind: 'constant'; readonly value: MathNode }
	| { readonly kind: 'infinite'; readonly value: MathNode };

interface ResultBase {
	readonly variable: string;
	readonly approach: MathNode;
	readonly direction: LimitDirection;
}

// =============================================================================
// Constantes
// =============================================================================

/** Les fonctions en escalier, et leur nom canonique (`sgn` = `sign`). */
const STEP_FUNCTIONS: ReadonlyMap<string, StepFunctionName> = new Map([
	['floor', 'floor'],
	['ceil', 'ceil'],
	['round', 'round'],
	['sign', 'sign'],
	['sgn', 'sign']
]);

/** Définies sur les entiers seulement : appliquées à la variable, refus. */
const INTEGER_ONLY_FUNCTIONS: ReadonlySet<string> = new Set(['mod', 'gcd']);

/** En deçà, un flottant ne dit pas de quel côté d'un saut on est. */
const BREAK_TOLERANCE = 1e-9;

/** Écarts au point où le côté d'un saut est confirmé (en ±∞ : 1/h). */
const SIDE_PROBES: readonly number[] = [1e-3, 1e-4, 1e-6];

/** Au plus près, deux sauts sont à 1/2 l'un de l'autre (`round`) : 1/8 reste entre eux. */
const EPSILON: Rational = { n: 1n, d: 8n };

// =============================================================================
// Détection
// =============================================================================

function stepFunctionName(node: MathNode): StepFunctionName | null {
	if (!isFunction(node)) return null;
	return STEP_FUNCTIONS.get(node.name.toLowerCase()) ?? null;
}

function isDiscontinuousCall(node: MathNode): boolean {
	if (!isFunction(node)) return false;
	const name = node.name.toLowerCase();
	return STEP_FUNCTIONS.has(name) || INTEGER_ONLY_FUNCTIONS.has(name);
}

/** Les appels de fonctions en escalier ou entières qui dépendent de la variable. */
function discontinuousCalls(expr: MathNode, varName: string): MathNode[] {
	return findNodes(expr, (node) => isDiscontinuousCall(node) && containsVariable(node, varName));
}

/**
 * L'expression contient-elle une fonction en escalier (ou entière) ? Avec
 * une variable : un appel qui en dépend.
 */
export function containsPiecewiseFunction(expr: MathNode, varName?: string): boolean {
	if (varName !== undefined) return discontinuousCalls(expr, varName).length > 0;
	return findNodes(expr, isDiscontinuousCall).length > 0;
}

// =============================================================================
// Fonction principale
// =============================================================================

/**
 * La limite d'une expression qui contient une fonction en escalier
 * dépendant de la variable ; `null` si elle n'en contient pas (le moteur
 * poursuit). Jamais `null` sinon : un refus est un résultat `unsupported`.
 *
 * @param limitOf - La limite du moteur, pour les arguments et le reste.
 */
export function evaluatePiecewiseLimit(
	expression: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	limitOf: LimitOf
): LimitResult | null {
	if (discontinuousCalls(expression, varName).length === 0) return null;
	const base: ResultBase = { variable: varName, approach, direction };
	if (direction !== 'both' || isInfinity(approach)) {
		return sidedLimit(expression, base, direction, limitOf) ?? unsupported(base);
	}
	const left = sidedLimit(expression, base, 'left', limitOf);
	const right = sidedLimit(expression, base, 'right', limitOf);
	if (left === null || right === null) return unsupported(base);
	return combineSides(left, right, base);
}

// =============================================================================
// Un côté
// =============================================================================

/** La limite d'un côté (ou en ±∞) ; `null` : on ne sait pas décider. */
function sidedLimit(
	expression: MathNode,
	base: ResultBase,
	direction: LimitDirection,
	limitOf: LimitOf
): LimitResult | null {
	const varName = base.variable;
	const replacements = new Map<string, MathNode>();
	for (const call of discontinuousCalls(expression, varName)) {
		const name = stepFunctionName(call);
		// mod, gcd : pas des fonctions des réels
		if (name === null || !isFunction(call) || call.args.length !== 1) return null;
		const [argument] = call.args;
		// Imbriquées : floor(floor(x)/2)
		if (discontinuousCalls(argument, varName).length > 0) return null;
		const value = callValue(name, argument, base, direction, limitOf);
		if (value === null) return null;
		if (value.kind === 'infinite') {
			// floor(u) → ±∞ ne dit rien de floor(x)/x ni de x − floor(x)
			if (ungrouped(expression) !== call) return null;
			return {
				...base,
				status: 'infinite',
				value: value.value,
				indeterminateForm: 'none',
				technique: 'one-sided',
				steps: []
			};
		}
		replacements.set(JSON.stringify(call), value.value);
	}
	const rest = transformAST(expression, {
		leaveFunction: (node) => replacements.get(JSON.stringify(node))
	});
	if (discontinuousCalls(rest, varName).length > 0) return null;
	const result = limitOf(rest, direction);
	if (result === null) return null;
	// Les étapes du moteur parlent du reste, pas de l'expression : retirées
	return { ...result, ...base, direction, steps: [] };
}

/** Ce que vaut g(u) au voisinage, du côté demandé ; `null` : indécidable. */
function callValue(
	name: StepFunctionName,
	argument: MathNode,
	base: ResultBase,
	direction: LimitDirection,
	limitOf: LimitOf
): CallValue | null {
	const limit = limitOf(argument, direction);
	if (limit === null || limit.value === null) return null;
	if (limit.status !== 'exact' && limit.status !== 'infinite') return null;
	if (isInfinity(limit.value)) {
		if (name !== 'sign') return { kind: 'infinite', value: limit.value };
		return { kind: 'constant', value: numericNode(limit.value.sign === 'positive' ? 1 : -1) };
	}
	const exact = extractExactRational(limit.value);
	if (exact === null) return approximateCallValue(name, limit.value);
	const at = normalized(exact);
	if (!isBreak(name, at)) return { kind: 'constant', value: rationalToNode(apply(name, at)) };
	// Sur un saut : de quel côté u atteint-il L ?
	const side = sideOfBreak(argument, at, base, direction, limitOf);
	if (side === null) return null;
	const near = side === 'above' ? add(at, EPSILON) : add(at, { n: -EPSILON.n, d: EPSILON.d });
	return { kind: 'constant', value: rationalToNode(apply(name, near)) };
}

/**
 * L irrationnel (√2, π) : un flottant suffit loin d'un saut ; trop près, on
 * ne sait pas trancher (ln(e) = 1 peut se lire 0,99999… ou 1,00000…).
 */
function approximateCallValue(name: StepFunctionName, limit: MathNode): CallValue | null {
	const value = approximate(limit);
	if (value === null) return null;
	const nearestBreak =
		name === 'sign' ? 0 : name === 'round' ? Math.floor(value) + 0.5 : Math.round(value);
	if (Math.abs(value - nearestBreak) <= BREAK_TOLERANCE) return null;
	const rounded = {
		floor: Math.floor,
		ceil: Math.ceil,
		round: Math.round,
		sign: Math.sign
	}[name](value);
	return { kind: 'constant', value: numericNode(rounded) };
}

/**
 * u − L garde-t-il un signe au voisinage ? Lu sur la limite de 1/(u − L) :
 * +∞ par au-dessus, −∞ par en dessous ; autre chose : `null`.
 *
 * Le moteur rend +∞ même quand u − L est identiquement nul de ce côté
 * (`|x| − x` à droite de 0 : revue de V60) : le côté annoncé est CONFIRMÉ
 * sur des valeurs de u − L de plus en plus près du point (`SIDE_PROBES`),
 * toutes non nulles et du signe annoncé — sinon `null`, refus.
 */
function sideOfBreak(
	argument: MathNode,
	at: Rational,
	base: ResultBase,
	direction: LimitDirection,
	limitOf: LimitOf
): 'above' | 'below' | null {
	const gap = subtract(argument, rationalToNode(at));
	const reciprocal = limitOf(fraction(number('1'), gap), direction);
	if (reciprocal === null || reciprocal.value === null || !isInfinity(reciprocal.value)) {
		return null;
	}
	const side = reciprocal.value.sign === 'positive' ? 'above' : 'below';
	const points = probePoints(base.approach, direction);
	if (points === null) return null;
	for (const point of points) {
		const value = approximate(substitute(gap, { [base.variable]: numericNode(point) }));
		if (value === null || value === 0 || value > 0 !== (side === 'above')) return null;
	}
	return side;
}

/** Les abscisses de confirmation, du côté demandé ; `null` si le point ne se lit pas. */
function probePoints(approach: MathNode, direction: LimitDirection): number[] | null {
	if (isInfinity(approach)) {
		const sign = approach.sign === 'positive' ? 1 : -1;
		return SIDE_PROBES.map((h) => sign / h);
	}
	if (direction === 'both') return null;
	const a = approximate(approach);
	if (a === null) return null;
	const sign = direction === 'right' ? 1 : -1;
	return SIDE_PROBES.map((h) => a + sign * h * Math.max(1, Math.abs(a)));
}

/**
 * Valeur approchée d'une expression numérique ; π tapé `π` (une variable
 * pour le parseur) vaut la constante. `null` si elle ne s'évalue pas.
 */
function approximate(node: MathNode): number | null {
	try {
		const value = evaluateNodeToApproximatedNumber(substitute(node, { π: mathConstant('pi') }));
		return Number.isFinite(value) ? value : null;
	} catch {
		return null;
	}
}

// =============================================================================
// Les deux côtés
// =============================================================================

/** Deux limites latérales : égales, leur valeur ; différentes, pas de limite. */
function combineSides(left: LimitResult, right: LimitResult, base: ResultBase): LimitResult {
	const known = (r: LimitResult) =>
		(r.status === 'exact' || r.status === 'infinite') && r.value !== null;
	const outside = (r: LimitResult) =>
		r.status === 'does-not-exist' && r.noLimitReason === 'outside-domain';
	// Convention lycée : un seul côté dans le domaine → la limite de ce côté
	if (known(left) && outside(right)) return { ...left, ...base, definedSide: 'left' };
	if (known(right) && outside(left)) return { ...right, ...base, definedSide: 'right' };
	if (outside(left) && outside(right)) return { ...left, ...base };
	if (!known(left) || !known(right)) return unsupported(base);
	if (sameValue(left.value as MathNode, right.value as MathNode)) return { ...left, ...base };
	return {
		...base,
		status: 'does-not-exist',
		value: null,
		indeterminateForm: 'none',
		technique: 'one-sided',
		steps: [],
		noLimitReason: 'sides-differ'
	};
}

/** Même écriture, ou même valeur numérique (1/2 et 0,5). */
function sameValue(a: MathNode, b: MathNode): boolean {
	if (toLatex(a) === toLatex(b)) return true;
	if (isInfinity(a) || isInfinity(b)) return isInfinity(a) && isInfinity(b) && a.sign === b.sign;
	const x = approximate(a);
	const y = approximate(b);
	if (x === null || y === null) return false;
	return Math.abs(x - y) <= 1e-12 * Math.max(1, Math.abs(x), Math.abs(y));
}

function unsupported(base: ResultBase): LimitResult {
	return {
		...base,
		status: 'unsupported',
		value: null,
		indeterminateForm: 'none',
		technique: 'one-sided',
		steps: [],
		error: 'Fonction en escalier : limite non décidée'
	};
}

// =============================================================================
// Rationnels exacts
// =============================================================================

function normalized(r: Rational): Rational {
	return r.d < 0n ? { n: -r.n, d: -r.d } : r;
}

function add(a: Rational, b: Rational): Rational {
	return { n: a.n * b.d + b.n * a.d, d: a.d * b.d };
}

/** ⌊n/d⌋, d > 0. */
function floorDiv(n: bigint, d: bigint): bigint {
	const q = n / d;
	return n % d !== 0n && n < 0n ? q - 1n : q;
}

function isInteger(r: Rational): boolean {
	return r.n % r.d === 0n;
}

/** Le point est-il un saut de g ? Entier (floor, ceil), demi-entier (round), 0 (sign). */
function isBreak(name: StepFunctionName, r: Rational): boolean {
	if (name === 'sign') return r.n === 0n;
	if (name === 'round') return !isInteger(r) && (2n * r.n) % r.d === 0n;
	return isInteger(r);
}

/** g(r) exact, hors d'un saut. */
function apply(name: StepFunctionName, r: Rational): Rational {
	const integer = (k: bigint): Rational => ({ n: k, d: 1n });
	switch (name) {
		case 'floor':
			return integer(floorDiv(r.n, r.d));
		case 'ceil':
			return integer(-floorDiv(-r.n, r.d));
		case 'round':
			return integer(floorDiv(2n * r.n + r.d, 2n * r.d));
		case 'sign':
			return integer(r.n > 0n ? 1n : r.n < 0n ? -1n : 0n);
	}
}

/** Sans les parenthèses de regroupement : `(floor(x))` est l'appel. */
function ungrouped(node: MathNode): MathNode {
	return node.type === 'delimiter' && node.semantic === 'grouping' ? ungrouped(node.content) : node;
}

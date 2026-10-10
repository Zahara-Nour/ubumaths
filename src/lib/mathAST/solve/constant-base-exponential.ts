/**
 * L'inconnue en exposant d'une base CONSTANTE : `k·aᵘ + b = 0`, a > 0, a ≠ 1.
 *
 * C'est l'équation des suites géométriques (1re / Tle) : `2^n = 1024`,
 * `3·2^n = 96`, `1.5^n = 10`. Le solveur transcendant ne reconnaît que la base
 * e (`e^u`, `exp(u)`) : `2^n = 1024` revenait « Type d'equation non supporte »
 * (2026-10-08).
 *
 * aᵘ = c (c > 0) ⟺ u = ln(c) / ln(a), écrit en entier (ou en fraction
 * simple) quand c'est exact : `2^n = 1024` → n = 10, pas ln(1024)/ln(2).
 * Puis `u = valeur` est résolue par le solveur général (u affine en n).
 *
 * La base e reste au solveur transcendant (`e^n = 5` → n = ln 5), sauf deux
 * cas (`euler: true`) : l'élève a tapé un décimal (`e^x = 0.5` → ln(0,5), pas
 * −ln 2), ou aucun autre solveur n'a su (`e^(-x) = 0.5`, revue 2026-10-09).
 *
 * @module mathAST/solve/constant-base-exponential
 */

import type { MathNode, RelationNode } from '../types';
import type { SolveOptions, SolveResult } from './types';
import {
	isDelimiter,
	isDivision,
	isEulerConstant,
	isNumber,
	isOpposite,
	isVariable
} from '../guards';
import { divide, equals, func, number, opposite, subtract } from '../factory';
import { extractLinearForm } from '../analysis/coefficient-utils';
import { denormalize, normalize } from '../normal';
import { getVariables } from '../eval/substitute';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';
import { flattenSumShallow, unflattenSum } from '../flatten';
import { P } from '../pattern/builder';
import { tryMatch } from '../pattern/match';
import { getBindingNode, isProductSequenceBinding } from '../pattern/types';
import { findNodes } from '../transforms';
import { createStepRecorder } from './step-recorder';
import { isSolverFailure } from './types';

/** Les dénominateurs d'un exposant écrit en fraction exacte (4ⁿ = 2 → 1/2). */
const EXACT_DENOMINATORS = [1, 2, 3, 4, 5, 6] as const;

/** Écart toléré pour reconnaître un exposant exact. */
const EXACT_TOLERANCE = 1e-9;

/** Au-delà, un décimal n'est plus « tapé par l'élève » : la fraction reste. */
const MAX_DECIMAL_PLACES = 6;

/** Une valeur numérique, ou `null` si le nœud ne s'évalue pas. */
function numericValue(node: MathNode): number | null {
	try {
		const value = evaluateNodeToApproximatedNumber(node);
		return Number.isFinite(value) ? value : null;
	} catch {
		return null;
	}
}

/** La base e (constante ou lettre `e`) : laissée au solveur transcendant. */
function isEulerBase(node: MathNode): boolean {
	return isEulerConstant(node) || (isVariable(node) && node.name === 'e');
}

/** Une base utilisable : sans lettre, > 0, ≠ 1 ; e seulement si `euler`. */
function isConstantBase(node: MathNode, euler: boolean): boolean {
	if (isEulerBase(node)) return euler;
	if (getVariables(node).size > 0) return false;
	const value = numericValue(node);
	return value !== null && value > 0 && Math.abs(value - 1) > EXACT_TOLERANCE;
}

/** Un entier en nœud, sans nombre négatif littéral. */
function integerNode(value: number): MathNode {
	return value < 0 ? opposite(number(String(-value))) : number(String(value));
}

/** Un nombre décimal écrit (`0.8`, `1.05`) quelque part dans l'expression. */
export function containsDecimal(node: MathNode): boolean {
	return findNodes(node, (n) => isNumber(n) && n.value.includes('.')).length > 0;
}

/**
 * Une fraction p/q (p, q entiers positifs) en décimal EXACT (`3/2` → `1.5`),
 * ou `null` si son développement ne s'arrête pas (ou est trop long).
 */
function decimalNode(fraction: MathNode): MathNode | null {
	if (!isDivision(fraction)) return null;
	const { numerator, denominator } = fraction;
	if (!isNumber(numerator) || !isNumber(denominator)) return null;
	if (!/^\d+$/.test(numerator.value) || !/^\d+$/.test(denominator.value)) return null;
	const p = BigInt(numerator.value);
	const q = BigInt(denominator.value);
	for (let places = 1; places <= MAX_DECIMAL_PLACES; places++) {
		const scaled = p * 10n ** BigInt(places);
		if (scaled % q !== 0n) continue;
		const digits = (scaled / q).toString().padStart(places + 1, '0');
		return number(`${digits.slice(0, -places)}.${digits.slice(-places)}`);
	}
	return null;
}

/**
 * La cible c de aᵘ = c. L'élève qui a tapé des décimaux les retrouve dans le
 * ln (décision de David, 2026-10-09) : `0.8^n < 0.1` → ln(0,1), pas ln(1/10),
 * et `1000·1.02^n = 1500` → ln(1,5). Sans décimal tapé, la fraction reste.
 */
function writtenTarget(expr: MathNode, target: MathNode): MathNode {
	if (!containsDecimal(expr)) return target;
	return decimalNode(target) ?? target;
}

/**
 * log_a(c) écrit exactement quand c'est une fraction simple (`2^n = 1024` →
 * 10, `4^n = 2` → 1/2), sinon ln(c) / ln(a).
 */
function logarithmInBase(base: MathNode, target: MathNode, value: number): MathNode {
	for (const denominator of EXACT_DENOMINATORS) {
		const scaled = value * denominator;
		const rounded = Math.round(scaled);
		if (Math.abs(scaled - rounded) < EXACT_TOLERANCE * Math.max(1, Math.abs(scaled))) {
			if (denominator === 1) return integerNode(rounded);
			return denormalize(
				normalize(divide(integerNode(rounded), number(String(denominator)), 'fraction'))
			);
		}
	}
	if (isEulerBase(base)) return func('ln', [target]);
	return divide(func('ln', [target]), func('ln', [base]), 'fraction');
}

/** La forme affine αn + β de l'exposant, `-x` et `(−x)` compris. */
function affineForm(
	exponent: MathNode,
	variable: string
): { coefficient: MathNode; offset: MathNode | null } | null {
	const inner = isDelimiter(exponent) ? exponent.content : exponent;
	if (isOpposite(inner)) {
		const form = affineForm(inner.operand, variable);
		if (form === null) return null;
		return {
			coefficient: opposite(form.coefficient),
			offset: form.offset === null ? null : opposite(form.offset)
		};
	}
	return extractLinearForm(inner, variable);
}

/**
 * αn + β = valeur → n = (valeur − β)/α, ou `null` si l'exposant n'est pas
 * affine en n (ou si α, β ne s'évaluent pas). Un ln d'un décimal tapé n'est
 * pas normalisé : `e^(2x) = 0.5` → ln(0,5)/2, pas −½ ln 2.
 */
function linearValue(
	exponent: MathNode,
	variable: string,
	value: MathNode,
	approximateValue: number
): { node: MathNode; approximate: number } | null {
	const form = affineForm(exponent, variable);
	if (form === null) return null;
	const alpha = numericValue(form.coefficient);
	const beta = form.offset === null ? 0 : numericValue(form.offset);
	if (alpha === null || beta === null || Math.abs(alpha) < EXACT_TOLERANCE) return null;
	const approximate = (approximateValue - beta) / alpha;
	if (form.offset === null && Math.abs(alpha - 1) < EXACT_TOLERANCE) {
		return { node: value, approximate };
	}
	const shifted = form.offset === null ? value : subtract(value, form.offset);
	if (containsDecimal(value)) {
		if (Math.abs(alpha + 1) < EXACT_TOLERANCE) return { node: opposite(shifted), approximate };
		return { node: divide(shifted, form.coefficient, 'fraction'), approximate };
	}
	return {
		node: denormalize(normalize(divide(shifted, form.coefficient, 'fraction'))),
		approximate
	};
}

/**
 * Résoudre `expr = 0` quand c'est `k·aᵘ + b = 0` (a constante, u contenant
 * l'inconnue, k et b sans elle). `null` si la forme ne s'applique pas, ou si
 * l'équation `u = log_a(c)` n'est pas résolue : l'appelant garde ses chemins.
 */
export function solveConstantBaseExponential(
	expr: MathNode,
	variable: string,
	solveFn: (eq: RelationNode, options?: SolveOptions) => SolveResult,
	options: Pick<SolveOptions, 'verbosity'> = {},
	euler = false
): SolveResult | null {
	const freeOfVariable = P.isFreeOf(variable);
	const pattern = P.prod(
		P.pow(
			P._(
				'a',
				P.custom((node) => isConstantBase(node, euler), 'base constante')
			),
			P._('u')
		),
		P.___('coeff', freeOfVariable)
	);
	const terms = flattenSumShallow(expr);

	for (let i = 0; i < terms.length; i++) {
		const others = terms.filter((_, j) => j !== i);
		if (others.some(({ term }) => getVariables(term).has(variable))) continue;
		const bindings = tryMatch(pattern, terms[i].term);
		if (!bindings) continue;
		const base = getBindingNode(bindings, 'a');
		const exponent = getBindingNode(bindings, 'u');
		if (!base || !exponent || !getVariables(exponent).has(variable)) continue;

		// k·aᵘ + b = 0 → aᵘ = −b/k (le signe du terme compris)
		const coeffBinding = bindings.get('coeff');
		const factors =
			coeffBinding && isProductSequenceBinding(coeffBinding) ? coeffBinding.factors : [];
		const coefficient = factors.reduce<MathNode | null>(
			(product, factor) =>
				product === null
					? factor
					: { type: 'multiplication', left: product, right: factor, displayStyle: 'implicit' },
			null
		);
		const signedCoefficient = (() => {
			const k = coefficient ?? number('1');
			return terms[i].sign === '-' ? opposite(k) : k;
		})();
		const rest = unflattenSum(others);
		const target =
			rest === null || others.length === 0
				? number('0')
				: writtenTarget(
						expr,
						denormalize(normalize(divide(opposite(rest), signedCoefficient, 'fraction')))
					);
		const targetValue = numericValue(target);
		const baseValue = numericValue(base);
		if (targetValue === null || baseValue === null) return null;

		const recorder = createStepRecorder();
		// aᵘ > 0 : pas de solution si la cible est négative ou nulle
		if (targetValue <= 0) {
			recorder.recordStep(
				'no-real-solution',
				'Une puissance de base positive est strictement positive : pas de solution',
				expr,
				expr,
				'summarized'
			);
			return {
				variable,
				status: 'no-real-solution',
				solutions: [],
				equationType: 'exponential',
				strategy: 'algebraic',
				steps: recorder.getStepsFiltered(options.verbosity ?? 'summarized'),
				conclusive: true
			};
		}

		const exponentValue = Math.log(targetValue) / Math.log(baseValue);
		const logarithm = logarithmInBase(base, target, exponentValue);
		const subEquation = equals(exponent, logarithm);
		recorder.recordStep(
			'apply-logarithm',
			'On applique le logarithme neperien aux deux membres',
			expr,
			subEquation,
			'summarized'
		);
		const steps = recorder.getStepsFiltered(options.verbosity ?? 'summarized');

		// u affine en n (n, n+1, 2n−1) : n = (log − β)/α, écrit directement. Le
		// solveur général ne sait pas isoler n devant ln(10)/ln(1,5) (mesuré).
		const linear = linearValue(exponent, variable, logarithm, exponentValue);
		if (linear !== null) {
			return {
				variable,
				status: 'unique',
				solutions: [{ value: linear.node, exact: true, approximate: linear.approximate }],
				equationType: 'exponential',
				strategy: 'algebraic',
				steps
			};
		}

		// Exposant non affine (2^{n²} = 16) : u = log_a(c) au solveur général
		const subResult = solveFn(subEquation, { variable, verbosity: options.verbosity });
		if (isSolverFailure(subResult)) return null;
		return {
			...subResult,
			equationType: 'exponential',
			strategy: 'algebraic',
			steps: [...steps, ...subResult.steps]
		};
	}
	return null;
}

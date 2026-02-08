/**
 * Transcendental Equation Solver
 *
 * Solves equations involving exp, ln, log, sin, cos, tan.
 *
 * ## Architecture
 *
 * A generic `extractTranscendentalEquation()` function uses `flattenSumShallow`
 * to decompose `expr = 0` into signed terms, then identifies the unique
 * transcendental term (trig function call, or e^u superscript, or ln/log call)
 * with an optional coefficient. Remaining constant terms form the RHS.
 *
 * ## Capabilities
 *
 * - **Exponential**: `a·e^u + b = 0` → `e^u = -b/a`.
 *   Linear arguments (e^(ax+b) = c) solved directly.
 *   Non-linear arguments delegated to recursive decomposition in solve.ts.
 * - **Logarithmic**: `a·ln(u) + b = 0` → `ln(u) = -b/a`.
 *   Linear arguments (ln(ax+b) = c) solved directly.
 *   Non-linear arguments delegated to recursive decomposition in solve.ts.
 * - **Trigonometric**: returns the **full periodic family** for sin/cos/tan.
 *   Non-linear arguments handled via tryTrigRecursiveDecomposition in solve.ts.
 * - **Mixed equations** (e.g. x·sin(x) = 0): not handled.
 *
 * @module mathAST/solve/solvers/transcendental
 */

import type { MathNode } from '../../types';
import type {
	EquationSolver,
	SolveResult,
	SolveOptions,
	SolveStepRecorder,
	Solution,
	PeriodicSolutionFamily
} from '../types';
import { containsTranscendental, getTranscendentalType } from '../classify';
import {
	number,
	func,
	variable as varNode,
	equals,
	superscript,
	euler,
	PI,
	TWO_PI,
	subtract,
	divide,
	opposite
} from '../../factory';
import { denormalize, normalize } from '../../normal';
import { getVariables } from '../../eval/substitute';
import { extractLinearForm } from '../../analysis/coefficient-utils';
import { evaluateNodeToApproximatedNumber } from '../../eval/evaluate';
import { flattenSumShallow, unflattenSum } from '../../flatten';
import type { SignedTerm } from '../../flatten';
import { P, tryMatch, getBindingNode, isProductSequenceBinding } from '../../pattern';
import type { MatchBindings } from '../../pattern';

// =============================================================================
// Generic Transcendental Equation Extraction
// =============================================================================

/**
 * Classification of transcendental equation kind.
 */
export type TranscendentalKind = 'trig' | 'exp' | 'log';

/**
 * Result of extracting transcendental equation structure from an expression.
 *
 * Represents `a·f(u) + b = 0` → `f(u) = -b/a = constantNode`.
 */
export interface TranscendentalEquationParts {
	readonly kind: TranscendentalKind;
	readonly funcName: string; // 'sin'|'cos'|'tan'|'ln'|'log'|'exp'
	readonly argument: MathNode; // u in f(u)
	readonly constantNode: MathNode; // c in f(u) = c (already isolated: c = -b/a)
	readonly constantNumeric: number;
}

// Keep backward compat alias
export type TrigEquationParts = TranscendentalEquationParts;

/**
 * Result of matching a transcendental pattern against a term.
 */
interface TranscendentalPatternMatch {
	readonly kind: TranscendentalKind;
	readonly funcName: string;
	readonly argument: MathNode;
	readonly coeffFactors: readonly MathNode[];
}

/**
 * Try to match a term against transcendental patterns using the pattern module.
 *
 * Tries each trig/log function pattern (sin, cos, tan, ln, log) and the exp pattern (e^u).
 * Each pattern uses `P.prod(target, P.___('coeff', P.isFreeOf(variable)))` to match
 * the transcendental call with optional coefficient factors.
 *
 * @returns Match info if found, null otherwise.
 */
function tryTranscendentalPatterns(
	term: MathNode,
	variable: string
): TranscendentalPatternMatch | null {
	const freeOfVar = P.isFreeOf(variable);

	// Pattern 1: trig/log functions — sin(u), cos(u), tan(u), ln(u), log(u)
	const funcKinds: Array<[TranscendentalKind, string]> = [
		['trig', 'sin'],
		['trig', 'cos'],
		['trig', 'tan'],
		['log', 'ln'],
		['log', 'log']
	];

	for (const [kind, funcName] of funcKinds) {
		const pattern = P.prod(P.func(funcName, [P._('u')]), P.___('coeff', freeOfVar));
		const bindings = tryMatch(pattern, term);
		if (bindings) {
			const u = getBindingNode(bindings, 'u');
			if (u && getVariables(u).has(variable)) {
				return { kind, funcName, argument: u, coeffFactors: extractCoeffFactors(bindings) };
			}
		}
	}

	// Pattern 2: exponential — e^u
	const expPattern = P.prod(P.pow(P.lit(euler()), P._('u')), P.___('coeff', freeOfVar));
	const bindings = tryMatch(expPattern, term);
	if (bindings) {
		const u = getBindingNode(bindings, 'u');
		if (u && getVariables(u).has(variable)) {
			return {
				kind: 'exp',
				funcName: 'exp',
				argument: u,
				coeffFactors: extractCoeffFactors(bindings)
			};
		}
	}

	return null;
}

/**
 * Extract coefficient factors from pattern match bindings.
 * The 'coeff' binding is a ProductSequenceBinding with factors array.
 */
function extractCoeffFactors(bindings: MatchBindings): readonly MathNode[] {
	const coeff = bindings.get('coeff');
	if (coeff && isProductSequenceBinding(coeff)) {
		return coeff.factors;
	}
	return [];
}

/**
 * Reconstruct a coefficient node from a list of factor nodes.
 * Empty list → number('1'), single factor → that factor, multiple → multiply chain.
 */
function reconstructCoefficient(factors: readonly MathNode[]): MathNode {
	if (factors.length === 0) return number('1');
	if (factors.length === 1) return factors[0];
	let result = factors[0];
	for (let i = 1; i < factors.length; i++) {
		result = { type: 'multiplication', left: result, right: factors[i], displayStyle: 'implicit' };
	}
	return result;
}

/**
 * Extract transcendental equation structure from expr = 0.
 *
 * Handles all forms:
 * - `f(u) = 0`
 * - `f(u) - c = 0` → `f(u) = c`
 * - `a*f(u) - b = 0` → `f(u) = b/a`
 * - `-f(u) = 0` → `f(u) = 0`
 *
 * where f is sin, cos, tan, ln, log, or exp (represented as e^u).
 *
 * Algorithm:
 * 1. flattenSumShallow → list of signed terms
 * 2. For each term, check if its unsigned part (factoring out sign) contains
 *    exactly one transcendental call (possibly multiplied by a constant coefficient)
 * 3. The remaining terms form `b`
 * 4. Compute `c = -b/a` where `a` is the coefficient
 */
export function extractTranscendentalEquation(
	expr: MathNode,
	variable: string
): TranscendentalEquationParts | null {
	const terms = flattenSumShallow(expr);

	// Try each term as the transcendental term
	for (let i = 0; i < terms.length; i++) {
		const { sign, term } = terms[i];

		// Try to match transcendental patterns on the unsigned term
		const matched = tryTranscendentalPatterns(term, variable);
		if (!matched) continue;

		// Verify remaining terms are free of the variable
		const remainingTerms: SignedTerm[] = [];
		let hasVariableInRemaining = false;

		for (let j = 0; j < terms.length; j++) {
			if (j === i) continue;
			remainingTerms.push(terms[j]);
			if (getVariables(terms[j].term).has(variable)) {
				hasVariableInRemaining = true;
			}
		}

		if (hasVariableInRemaining) continue;

		// Compute the coefficient a (considering sign of the transcendental term)
		const coeffNode = reconstructCoefficient(matched.coeffFactors);
		let aNumeric: number;
		try {
			aNumeric = evaluateNodeToApproximatedNumber(coeffNode);
		} catch {
			aNumeric = 1;
		}
		if (sign === '-') aNumeric = -aNumeric;

		// Compute b from remaining terms
		const bNode = unflattenSum(remainingTerms);

		// Compute c = -b/a
		let constantNode: MathNode;
		let constantNumeric: number;

		if (bNode === null || remainingTerms.length === 0) {
			// No remaining terms: f(u) = 0 (with possible coefficient)
			constantNode = number('0');
			constantNumeric = 0;
		} else {
			let bNumeric: number;
			try {
				bNumeric = evaluateNodeToApproximatedNumber(bNode);
			} catch {
				continue; // Can't evaluate remaining terms numerically
			}

			constantNumeric = -bNumeric / aNumeric;

			// Build symbolic constant: -b/a
			if (Math.abs(aNumeric - 1) < 1e-15 && sign === '+') {
				// a = 1, sign = '+': c = -b
				constantNode = denormalize(normalize(opposite(bNode)));
			} else if (Math.abs(aNumeric + 1) < 1e-15 && sign === '-') {
				// a = -1 (sign flipped): c = -b/(-1) = b
				constantNode = denormalize(normalize(bNode));
			} else {
				// General case: c = -b/a
				const signedCoeff = sign === '-' ? denormalize(normalize(opposite(coeffNode))) : coeffNode;
				constantNode = denormalize(normalize(divide(opposite(bNode), signedCoeff, 'fraction')));
			}
		}

		return {
			kind: matched.kind,
			funcName: matched.funcName,
			argument: matched.argument,
			constantNode,
			constantNumeric
		};
	}

	return null;
}

// Keep backward compat export
export function extractTrigEquation(
	expr: MathNode,
	variable: string
): TranscendentalEquationParts | null {
	const result = extractTranscendentalEquation(expr, variable);
	if (result && result.kind === 'trig') return result;
	return null;
}

/**
 * Simplify an inverse trig call through the normalizer.
 * The normalizer knows about remarkable values: arcsin(1/2) → π/6, etc.
 * Returns simplified MathNode, or the raw arcfunc(constant) if no simplification.
 */
export function simplifyInverseTrig(inverseFuncName: string, constantNode: MathNode): MathNode {
	const arcNode = func(inverseFuncName, [constantNode]);
	return denormalize(normalize(arcNode));
}

/**
 * A solution in u-space (before transformation to x-space).
 */
export interface USolution {
	readonly symbolic: MathNode;
	readonly numeric: number;
}

/**
 * Normalize an angle modulo a period to [0, period).
 */
function normalizeAngle(angle: number, period: number): number {
	return ((angle % period) + period) % period;
}

/**
 * Compute u-space solutions for a trig equation: funcName(u) = constant.
 *
 * Returns the base solutions (before linear transform to x-space):
 * - sin(u) = c → u = arcsin(c), u = π - arcsin(c) (if distinct mod 2π)
 * - cos(u) = c → u = arccos(c), u = -arccos(c) (if distinct mod 2π)
 * - tan(u) = c → u = arctan(c)
 *
 * Does NOT check domain restrictions (caller must check |c| ≤ 1 for sin/cos).
 */
export function computeUSolutions(
	funcName: string,
	constantNode: MathNode,
	constantNumeric: number,
	basePeriodNumeric: number
): USolution[] {
	const uSolutions: USolution[] = [];

	if (funcName === 'sin') {
		const arcsinVal = Math.asin(constantNumeric);
		const arcsinNode = simplifyInverseTrig('arcsin', constantNode);
		uSolutions.push({ symbolic: arcsinNode, numeric: arcsinVal });

		// Second solution: π - arcsin(c)
		const sol2Numeric = Math.PI - arcsinVal;
		const sol2Node = denormalize(normalize(subtract(PI, arcsinNode)));

		// Only add if distinct modulo 2π
		if (
			Math.abs(
				normalizeAngle(arcsinVal, basePeriodNumeric) -
					normalizeAngle(sol2Numeric, basePeriodNumeric)
			) > 1e-10
		) {
			uSolutions.push({ symbolic: sol2Node, numeric: sol2Numeric });
		}
	} else if (funcName === 'cos') {
		const arccosVal = Math.acos(constantNumeric);
		const arccosNode = simplifyInverseTrig('arccos', constantNode);
		uSolutions.push({ symbolic: arccosNode, numeric: arccosVal });

		// Second solution: -arccos(c)
		const sol2Numeric = -arccosVal;
		const sol2Node = denormalize(normalize(opposite(arccosNode)));

		// Only add if distinct modulo 2π
		if (
			Math.abs(
				normalizeAngle(arccosVal, basePeriodNumeric) -
					normalizeAngle(sol2Numeric, basePeriodNumeric)
			) > 1e-10
		) {
			uSolutions.push({ symbolic: sol2Node, numeric: sol2Numeric });
		}
	} else {
		// tan: single solution family
		const arctanVal = Math.atan(constantNumeric);
		const arctanNode = simplifyInverseTrig('arctan', constantNode);
		uSolutions.push({ symbolic: arctanNode, numeric: arctanVal });
	}

	return uSolutions;
}

// =============================================================================
// Exponential Solver (using generic extractor)
// =============================================================================

/** Type alias for solver options */
type SolverOptions = Required<Omit<SolveOptions, 'variable' | 'initialGuesses'>> & {
	initialGuesses?: readonly number[];
};

/**
 * Solve exponential equations: e^(ax+b) = c.
 *
 * Uses extractTranscendentalEquation to get the equation parts,
 * then solves for linear arguments only. Non-linear arguments return null
 * (handled by recursive decomposition in solve.ts).
 */
function solveExponential(
	expr: MathNode,
	variable: string,
	options: SolverOptions,
	recorder: SolveStepRecorder
): SolveResult | null {
	const extracted = extractTranscendentalEquation(expr, variable);
	if (!extracted || extracted.kind !== 'exp') return null;

	const { argument, constantNode, constantNumeric } = extracted;

	// Check for no solution (e^u = negative or zero)
	if (constantNumeric <= 0) {
		recorder.recordStep(
			'no-real-solution',
			`L'equation exponentielle n'a pas de solution reelle car la valeur cible est negative ou nulle`,
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
			steps: recorder.getStepsFiltered(options.verbosity)
		};
	}

	// Extract linear form from argument: u = ax + b
	const linearForm = extractLinearForm(argument, variable);
	if (!linearForm) {
		// Non-linear argument: delegate to recursive decomposition
		return null;
	}

	const coeffNode = linearForm.coefficient;
	const offsetNode = linearForm.offset;
	let aNumeric: number;
	try {
		aNumeric = evaluateNodeToApproximatedNumber(coeffNode);
	} catch {
		return null;
	}
	if (Math.abs(aNumeric) < 1e-15) return null;

	// e^(ax+b) = c → ax+b = ln(c) → x = (ln(c) - b) / a
	const lnC = func('ln', [constantNode]);
	const lnCNumeric = Math.log(constantNumeric);

	let solution: MathNode;
	let approximate: number;

	if (offsetNode === null && Math.abs(aNumeric - 1) < 1e-10) {
		// Simple case: e^x = c → x = ln(c)
		solution = lnC;
		approximate = lnCNumeric;
	} else if (offsetNode === null) {
		// e^(ax) = c → x = ln(c)/a
		solution = divide(lnC, coeffNode, 'fraction');
		approximate = lnCNumeric / aNumeric;
	} else {
		// e^(ax+b) = c → x = (ln(c) - b) / a
		let bNumeric: number;
		try {
			bNumeric = evaluateNodeToApproximatedNumber(offsetNode);
		} catch {
			bNumeric = 0;
		}
		solution = divide(subtract(lnC, offsetNode), coeffNode, 'fraction');
		approximate = (lnCNumeric - bNumeric) / aNumeric;
	}

	const solutionSimplified = denormalize(normalize(solution));

	recorder.recordStep(
		'apply-logarithm',
		`On applique le logarithme neperien`,
		expr,
		equals(varNode(variable), solutionSimplified),
		'detailed'
	);

	recorder.recordStep(
		'isolate-variable',
		`Solution: ${variable} = ${approximate.toPrecision(options.precision)}`,
		equals(varNode(variable), solution),
		equals(varNode(variable), solutionSimplified),
		'summarized'
	);

	return {
		variable,
		status: 'unique',
		solutions: [
			{
				value: solutionSimplified,
				exact: true,
				approximate
			}
		],
		equationType: 'exponential',
		strategy: 'algebraic',
		steps: recorder.getStepsFiltered(options.verbosity)
	};
}

// =============================================================================
// Logarithmic Solver (using generic extractor)
// =============================================================================

/**
 * Solve logarithmic equations: ln(ax+b) = c or log(ax+b) = c.
 *
 * Uses extractTranscendentalEquation to get the equation parts,
 * then solves for linear arguments only.
 */
function solveLogarithmic(
	expr: MathNode,
	variable: string,
	options: SolverOptions,
	recorder: SolveStepRecorder
): SolveResult | null {
	const extracted = extractTranscendentalEquation(expr, variable);
	if (!extracted || extracted.kind !== 'log') return null;

	const { funcName, argument, constantNode, constantNumeric } = extracted;

	// Extract linear form from argument: u = ax + b
	const linearForm = extractLinearForm(argument, variable);
	if (!linearForm) {
		// Non-linear argument: delegate to recursive decomposition
		return null;
	}

	const coeffNode = linearForm.coefficient;
	const offsetNode = linearForm.offset;
	let aNumeric: number;
	try {
		aNumeric = evaluateNodeToApproximatedNumber(coeffNode);
	} catch {
		return null;
	}
	if (Math.abs(aNumeric) < 1e-15) return null;

	// ln(ax+b) = c → ax+b = e^c → x = (e^c - b) / a
	// log(ax+b) = c → ax+b = 10^c → x = (10^c - b) / a
	let inverseNode: MathNode;
	let inverseNumeric: number;

	if (funcName === 'ln') {
		inverseNode =
			constantNumeric === 0
				? number('1')
				: constantNumeric === 1
					? euler()
					: superscript(euler(), constantNode);
		inverseNumeric = Math.exp(constantNumeric);
	} else {
		// log base 10
		inverseNode = constantNumeric === 0 ? number('1') : superscript(number('10'), constantNode);
		inverseNumeric = Math.pow(10, constantNumeric);
	}

	let solution: MathNode;
	let approximate: number;

	if (offsetNode === null && Math.abs(aNumeric - 1) < 1e-10) {
		// Simple case: ln(x) = c → x = e^c
		solution = inverseNode;
		approximate = inverseNumeric;
	} else if (offsetNode === null) {
		// ln(ax) = c → x = e^c/a
		solution = divide(inverseNode, coeffNode, 'fraction');
		approximate = inverseNumeric / aNumeric;
	} else {
		// ln(ax+b) = c → x = (e^c - b) / a
		let bNumeric: number;
		try {
			bNumeric = evaluateNodeToApproximatedNumber(offsetNode);
		} catch {
			bNumeric = 0;
		}
		solution = divide(subtract(inverseNode, offsetNode), coeffNode, 'fraction');
		approximate = (inverseNumeric - bNumeric) / aNumeric;
	}

	const solutionSimplified = denormalize(normalize(solution));

	const applyRule = funcName === 'ln' ? 'apply-exponential' : 'apply-exponential';
	const applyDesc =
		funcName === 'ln' ? `On applique l'exponentielle` : `On applique la puissance de 10`;

	recorder.recordStep(
		applyRule,
		applyDesc,
		expr,
		equals(varNode(variable), solutionSimplified),
		'detailed'
	);

	recorder.recordStep(
		'isolate-variable',
		`Solution: ${variable} = ${approximate.toPrecision(options.precision)}`,
		equals(varNode(variable), solution),
		equals(varNode(variable), solutionSimplified),
		'summarized'
	);

	return {
		variable,
		status: 'unique',
		solutions: [
			{
				value: solutionSimplified,
				exact: true,
				approximate
			}
		],
		equationType: 'logarithmic',
		strategy: 'algebraic',
		steps: recorder.getStepsFiltered(options.verbosity)
	};
}

// =============================================================================
// Trigonometric Solver
// =============================================================================

/**
 * Solve trigonometric equations: sin(ax+b) = c, cos(ax+b) = c, tan(ax+b) = c.
 *
 * Returns the full periodic solution family.
 */
function solveTrigonometric(
	expr: MathNode,
	variable: string,
	options: SolverOptions,
	recorder: SolveStepRecorder
): SolveResult | null {
	const extracted = extractTranscendentalEquation(expr, variable);
	if (!extracted || extracted.kind !== 'trig') return null;

	const { funcName, argument, constantNode, constantNumeric: constant } = extracted;

	// Check domain restrictions for sin/cos
	if (funcName === 'sin' || funcName === 'cos') {
		if (constant < -1 || constant > 1) {
			recorder.recordStep(
				'no-real-solution',
				`L'equation ${funcName}(x) = ${constant} n'a pas de solution car ${constant} n'est pas dans [-1, 1]`,
				expr,
				expr,
				'summarized'
			);

			return {
				variable,
				status: 'no-real-solution',
				solutions: [],
				equationType: 'trigonometric',
				strategy: 'algebraic',
				steps: recorder.getStepsFiltered(options.verbosity)
			};
		}
	}

	// Extract linear form from argument: u = ax + b
	const linearForm = extractLinearForm(argument, variable);
	if (!linearForm) {
		// Non-linear argument (e.g. sin(x²)): not supported here
		return null;
	}

	const coeffNode = linearForm.coefficient;
	const offsetNode = linearForm.offset;
	let aNumeric: number;
	try {
		aNumeric = evaluateNodeToApproximatedNumber(coeffNode);
	} catch {
		return null;
	}
	if (Math.abs(aNumeric) < 1e-15) return null; // degenerate

	// Compute base solutions in u-space
	const inverseFuncName = funcName === 'sin' ? 'arcsin' : funcName === 'cos' ? 'arccos' : 'arctan';
	const basePeriodNumeric = funcName === 'tan' ? Math.PI : 2 * Math.PI;
	const basePeriodNode: MathNode = funcName === 'tan' ? PI : TWO_PI;

	const uSolutions = computeUSolutions(funcName, constantNode, constant, basePeriodNumeric);

	// Transform from u-space to x-space: x = (u - b) / a
	const absA = Math.abs(aNumeric);
	const xSolutions: Solution[] = uSolutions.map((uSol) => {
		let xNumeric: number;
		let xSymbolic: MathNode;

		if (offsetNode === null && Math.abs(aNumeric - 1) < 1e-10) {
			// a = 1, b = 0: x = u directly
			xNumeric = uSol.numeric;
			xSymbolic = uSol.symbolic;
		} else if (offsetNode === null) {
			// b = 0: x = u / a
			xNumeric = uSol.numeric / aNumeric;
			xSymbolic = divide(uSol.symbolic, coeffNode, 'fraction');
		} else {
			// General: x = (u - b) / a
			let bNumeric: number;
			try {
				bNumeric = evaluateNodeToApproximatedNumber(offsetNode);
			} catch {
				bNumeric = 0;
			}
			xNumeric = (uSol.numeric - bNumeric) / aNumeric;
			xSymbolic = divide(subtract(uSol.symbolic, offsetNode), coeffNode, 'fraction');
		}

		const simplified = denormalize(normalize(xSymbolic));

		return {
			value: simplified,
			approximate: xNumeric,
			exact: true
		};
	});

	// Compute period in x-space: base_period / |a|
	const xPeriodNumeric = basePeriodNumeric / absA;
	let xPeriodNode: MathNode;
	if (Math.abs(absA - 1) < 1e-10) {
		xPeriodNode = basePeriodNode;
	} else {
		xPeriodNode = denormalize(
			normalize(divide(basePeriodNode, number(absA.toString()), 'fraction'))
		);
	}

	// Build periodic solution family
	const periodicSolutions: PeriodicSolutionFamily = {
		baseSolutions: xSolutions,
		period: xPeriodNode,
		periodNumeric: xPeriodNumeric
	};

	// Record steps
	recorder.recordStep(
		`apply-${inverseFuncName}`,
		`On resout ${funcName}(u) = ${constant}`,
		expr,
		expr,
		'detailed'
	);

	recorder.recordStep(
		'periodic-solutions',
		`${xSolutions.length} solution(s) de base, periode ${xPeriodNumeric.toPrecision(6)}`,
		expr,
		expr,
		'summarized'
	);

	return {
		variable,
		status: xSolutions.length > 1 ? 'multiple' : 'unique',
		solutions: xSolutions,
		equationType: 'trigonometric',
		strategy: 'algebraic',
		steps: recorder.getStepsFiltered(options.verbosity),
		periodicSolutions
	};
}

// =============================================================================
// Transcendental Solver Implementation
// =============================================================================

/**
 * Solver for transcendental equations: exp, ln, log, sin, cos, tan.
 */
export const transcendentalSolver: EquationSolver = {
	name: 'transcendental',

	canSolve(expr: MathNode, variable: string): boolean {
		return containsTranscendental(expr) && getVariables(expr).has(variable);
	},

	solve(
		expr: MathNode,
		variable: string,
		options: Required<Omit<SolveOptions, 'variable' | 'initialGuesses'>> & {
			initialGuesses?: readonly number[];
		},
		recorder: SolveStepRecorder
	): SolveResult {
		const transcType = getTranscendentalType(expr);

		// Try specific solver based on type
		let result: SolveResult | null = null;

		if (transcType === 'exponential') {
			result = solveExponential(expr, variable, options, recorder);
		} else if (transcType === 'logarithmic') {
			result = solveLogarithmic(expr, variable, options, recorder);
		} else if (transcType === 'trigonometric') {
			result = solveTrigonometric(expr, variable, options, recorder);
		}

		// If classification-based approach failed, try generic extraction
		// (e.g., e^x is classified as 'exponential' but e^{x^2} may be 'mixed')
		if (!result) {
			result =
				solveExponential(expr, variable, options, recorder) ??
				solveLogarithmic(expr, variable, options, recorder) ??
				solveTrigonometric(expr, variable, options, recorder);
		}

		if (result) return result;

		// Fallback: equation not supported
		return {
			variable,
			status: 'no-solution',
			solutions: [],
			equationType: transcType ?? 'mixed',
			strategy: 'algebraic',
			steps: recorder.getStepsFiltered(options.verbosity),
			error: "Type d'equation transcendante non supporte"
		};
	}
};

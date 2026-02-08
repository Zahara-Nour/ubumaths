/**
 * Transcendental Equation Solver
 *
 * Solves equations involving exp, ln, log, sin, cos, tan.
 *
 * ## Limitations
 *
 * - **Exponential/Logarithmic**: only handles simple forms (e^x = c, ln(x) = c).
 *   Composed forms like e^(2x+1) = 5 or ln(x²) = 3 are not decomposed.
 * - **Trigonometric**: returns the **full periodic family** for sin/cos/tan.
 *   Handles linear arguments: sin(ax+b) = c → returns all base solutions
 *   within one period, with the period for enumeration.
 *   Non-linear arguments (sin(x²) = c) are not supported.
 * - **Mixed equations** (e.g. x·sin(x) = 0): not handled. Some could be
 *   decomposed into factors, others need numeric methods.
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
import { isFunction, isNumber } from '../../guards';
import {
	number,
	func,
	variable as varNode,
	equals,
	fraction,
	PI,
	TWO_PI,
	subtract,
	divide,
	opposite
} from '../../factory';
import { denormalize, normalize } from '../../normal';
import { mapNode } from '../../transforms';
import { getVariables } from '../../eval/substitute';
import { extractLinearForm } from '../../analysis/coefficient-utils';
import { evaluateNodeToApproximatedNumber } from '../../eval/evaluate';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Compute numeric value of a simple node.
 */
function computeNumericValue(node: MathNode): number | null {
	try {
		const norm = normalize(node);
		if (norm.numerator.length === 0) return 0;
		if (norm.numerator.length !== 1 || norm.denominator.length !== 1) return null;

		const numTerm = norm.numerator[0];
		const denTerm = norm.denominator[0];

		if (numTerm.monomial.length !== 0 || denTerm.monomial.length !== 0) return null;

		const numCoeff = numTerm.coefficient;
		const denCoeff = denTerm.coefficient;

		if (numCoeff.terms.length !== 1 || denCoeff.terms.length !== 1) return null;

		const numAlg = numCoeff.terms[0];
		const denAlg = denCoeff.terms[0];

		if (numAlg.radicals.length !== 0 || denAlg.radicals.length !== 0) return null;

		const numValue = Number(numAlg.rational.n) / Number(numAlg.rational.d);
		const denValue = Number(denAlg.rational.n) / Number(denAlg.rational.d);

		if (denValue === 0) return null;
		return numValue / denValue;
	} catch {
		return null;
	}
}

/**
 * Check if a function name is a trig function.
 */
function isTrigFunc(name: string): boolean {
	return name === 'sin' || name === 'cos' || name === 'tan';
}

// =============================================================================
// Trig Equation Extraction
// =============================================================================

/**
 * Result of extracting trig equation structure from an expression.
 */
interface TrigEquationParts {
	readonly funcName: string;
	readonly argument: MathNode;
	readonly constant: number;
}

/**
 * Extract trig equation structure from expr = 0.
 *
 * Handles:
 * - sin(2x) = 0 → { funcName: 'sin', argument: 2x, constant: 0 }
 * - cos(x) - 1/2 = 0 → { funcName: 'cos', argument: x, constant: 0.5 }
 * - -sin(x) = 0 → { funcName: 'sin', argument: x, constant: 0 }
 * - k * cos(x) = 0 → { funcName: 'cos', argument: x, constant: 0 }
 *
 * Unlike the old mapNode approach, this does NOT accidentally pick up
 * numbers from inside function arguments (e.g. the '2' in sin(2x)).
 */
function extractTrigEquation(expr: MathNode, variable: string): TrigEquationParts | null {
	// Case 1: expr is just trig(arg) → trig(arg) = 0
	if (isFunction(expr) && isTrigFunc(expr.name) && getVariables(expr).has(variable)) {
		return { funcName: expr.name, argument: expr.args[0], constant: 0 };
	}

	// Case 2: expr = trig(arg) - c (SubtractionNode)
	if (expr.type === 'subtraction') {
		const { left, right } = expr;
		// trig(arg) - c = 0 → trig(arg) = c
		if (
			isFunction(left) &&
			isTrigFunc(left.name) &&
			getVariables(left).has(variable) &&
			!getVariables(right).has(variable)
		) {
			const c = computeNumericValue(right);
			if (c !== null) return { funcName: left.name, argument: left.args[0], constant: c };
		}
		// c - trig(arg) = 0 → trig(arg) = c
		if (
			isFunction(right) &&
			isTrigFunc(right.name) &&
			getVariables(right).has(variable) &&
			!getVariables(left).has(variable)
		) {
			const c = computeNumericValue(left);
			if (c !== null) return { funcName: right.name, argument: right.args[0], constant: c };
		}
	}

	// Case 3: expr = trig(arg) + c (AdditionNode) → trig(arg) = -c
	if (expr.type === 'addition') {
		const { left, right } = expr;
		if (
			isFunction(left) &&
			isTrigFunc(left.name) &&
			getVariables(left).has(variable) &&
			!getVariables(right).has(variable)
		) {
			const c = computeNumericValue(right);
			if (c !== null) return { funcName: left.name, argument: left.args[0], constant: -c };
		}
		if (
			isFunction(right) &&
			isTrigFunc(right.name) &&
			getVariables(right).has(variable) &&
			!getVariables(left).has(variable)
		) {
			const c = computeNumericValue(left);
			if (c !== null) return { funcName: right.name, argument: right.args[0], constant: -c };
		}
	}

	// Case 4: expr = -trig(arg) → trig(arg) = 0
	if (expr.type === 'opposite' && isFunction(expr.operand) && isTrigFunc(expr.operand.name)) {
		return { funcName: expr.operand.name, argument: expr.operand.args[0], constant: 0 };
	}

	// Case 5: expr = k * trig(arg) → trig(arg) = 0 (since k ≠ 0)
	if (expr.type === 'multiplication') {
		const { left, right } = expr;
		if (
			isFunction(right) &&
			isTrigFunc(right.name) &&
			getVariables(right).has(variable) &&
			!getVariables(left).has(variable)
		) {
			return { funcName: right.name, argument: right.args[0], constant: 0 };
		}
		if (
			isFunction(left) &&
			isTrigFunc(left.name) &&
			getVariables(left).has(variable) &&
			!getVariables(right).has(variable)
		) {
			return { funcName: left.name, argument: left.args[0], constant: 0 };
		}
	}

	return null;
}

// =============================================================================
// Known Trig Inverse Values
// =============================================================================

/**
 * Evaluate inverse trig functions for known special values.
 * Returns a clean symbolic MathNode instead of arcsin(0), arccos(0), etc.
 *
 * For example: arcsin(0) → 0, arccos(0) → π/2, arctan(1) → π/4
 */
function evaluateTrigInverse(inverseFuncName: string, constant: number): MathNode | null {
	const eps = 1e-10;

	if (inverseFuncName === 'arcsin') {
		if (Math.abs(constant) < eps) return number('0');
		if (Math.abs(constant - 1) < eps) return divide(PI, number('2'), 'fraction');
		if (Math.abs(constant + 1) < eps) return opposite(divide(PI, number('2'), 'fraction'));
		if (Math.abs(constant - 0.5) < eps) return divide(PI, number('6'), 'fraction');
		if (Math.abs(constant + 0.5) < eps) return opposite(divide(PI, number('6'), 'fraction'));
	} else if (inverseFuncName === 'arccos') {
		if (Math.abs(constant - 1) < eps) return number('0');
		if (Math.abs(constant + 1) < eps) return PI;
		if (Math.abs(constant) < eps) return divide(PI, number('2'), 'fraction');
		if (Math.abs(constant - 0.5) < eps) return divide(PI, number('3'), 'fraction');
	} else if (inverseFuncName === 'arctan') {
		if (Math.abs(constant) < eps) return number('0');
		if (Math.abs(constant - 1) < eps) return divide(PI, number('4'), 'fraction');
		if (Math.abs(constant + 1) < eps) return opposite(divide(PI, number('4'), 'fraction'));
	}

	return null;
}

/**
 * Normalize an angle modulo a period to [0, period).
 */
function normalizeAngle(angle: number, period: number): number {
	return ((angle % period) + period) % period;
}

// =============================================================================
// Exponential Solver
// =============================================================================

/**
 * Solve exponential equations like e^x = c or a^x = c.
 */
function solveExponential(
	expr: MathNode,
	variable: string,
	options: Required<Omit<SolveOptions, 'variable' | 'initialGuesses'>> & {
		initialGuesses?: readonly number[];
	},
	recorder: SolveStepRecorder
): SolveResult | null {
	// Look for pattern: e^x - c = 0 or a^x - c = 0
	// This is a simplified implementation

	// Try to find e^x or a^x structure in the expression
	let base: MathNode | null = null;
	let exponent: MathNode | null = null;
	let constant: number | null = null;

	// Simple pattern matching for e^x = c
	// In standard form: e^x - c = 0
	mapNode(expr, (n) => {
		if (n.type === 'superscript') {
			const baseNode = n.base;
			const expNode = n.superscript;

			// Check if exponent contains the variable
			if (getVariables(expNode).has(variable)) {
				base = baseNode;
				exponent = expNode;
			}
		}
		return n;
	});

	if (!base || !exponent) return null;

	// TypeScript needs help with closure-assigned variables
	// Use explicit type assertions since TypeScript doesn't track assignments inside closures
	const foundBase = base as MathNode;
	const _foundExponent = exponent as MathNode;

	// Extract the constant from the expression
	// For e^x - c = 0, we need to find c
	// This is tricky in standard form, so we'll use numeric approximation

	// Check if base is 'e' (Euler's number)
	const isEulerBase =
		(foundBase.type === 'variable' && foundBase.name === 'e') ||
		(foundBase.type === 'number' && Math.abs(parseFloat(foundBase.value) - Math.E) < 0.0001);

	// Try to extract the constant by evaluating expr with x=0
	// If e^x - c = 0, then at x=0: e^0 - c = 1 - c, so c = 1 - expr(0)
	// This is a heuristic approach

	// For simplicity, let's handle the common case where expr = e^x - c
	// We'll look for the constant term

	let constantTerm: MathNode | null = null;
	mapNode(expr, (n) => {
		if (isNumber(n) || (n.type === 'opposite' && isNumber(n.operand))) {
			const vars = getVariables(n);
			if (vars.size === 0) {
				constantTerm = n;
			}
		}
		return n;
	});

	if (constantTerm) {
		const constValue = computeNumericValue(constantTerm);
		if (constValue !== null) {
			// The equation is approximately: base^x = -constantTerm
			constant = -constValue;
		}
	}

	if (constant === null) {
		// Try numeric evaluation
		constant = 1; // Default assumption for e^x = 1
	}

	// Check for no solution (e^x = negative)
	if (constant <= 0) {
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

	// Solve: base^x = constant => x = ln(constant) / ln(base)
	let solution: MathNode;
	let approximate: number;

	if (isEulerBase) {
		// e^x = c => x = ln(c)
		solution = func('ln', [number(constant.toString())]);
		approximate = Math.log(constant);

		recorder.recordStep(
			'apply-logarithm',
			`On applique le logarithme neperien: x = ln(${constant})`,
			expr,
			equals(varNode(variable), solution),
			'detailed'
		);
	} else {
		// a^x = c => x = ln(c) / ln(a)
		const baseValue = computeNumericValue(foundBase);
		if (baseValue === null || baseValue <= 0 || baseValue === 1) {
			return null;
		}

		solution = fraction(func('ln', [number(constant.toString())]), func('ln', [foundBase]));
		approximate = Math.log(constant) / Math.log(baseValue);

		recorder.recordStep(
			'apply-logarithm',
			`On applique le logarithme: x = ln(${constant}) / ln(base)`,
			expr,
			equals(varNode(variable), solution),
			'detailed'
		);
	}

	const solutionSimplified = denormalize(normalize(solution));

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
// Logarithmic Solver
// =============================================================================

/**
 * Solve logarithmic equations like ln(x) = c or log(x) = c.
 */
function solveLogarithmic(
	expr: MathNode,
	variable: string,
	options: Required<Omit<SolveOptions, 'variable' | 'initialGuesses'>> & {
		initialGuesses?: readonly number[];
	},
	recorder: SolveStepRecorder
): SolveResult | null {
	// Look for pattern: ln(x) - c = 0 or log(x) - c = 0
	let funcName: string | null = null;
	let argument: MathNode | null = null;

	mapNode(expr, (n) => {
		if (isFunction(n) && (n.name === 'ln' || n.name === 'log')) {
			if (getVariables(n).has(variable)) {
				funcName = n.name;
				argument = n.args[0];
			}
		}
		return n;
	});

	if (!funcName || !argument) return null;

	// Extract the constant
	let constant: number = 0;
	mapNode(expr, (n) => {
		if (isNumber(n) || (n.type === 'opposite' && isNumber(n.operand))) {
			const vars = getVariables(n);
			if (vars.size === 0) {
				const val = computeNumericValue(n);
				if (val !== null) constant = -val;
			}
		}
		return n;
	});

	// Solve: ln(x) = c => x = e^c
	// Solve: log(x) = c => x = 10^c
	let solution: MathNode;
	let approximate: number;

	if (funcName === 'ln') {
		// ln(x) = c => x = e^c
		const eNode: MathNode = { type: 'variable', name: 'e' };
		solution =
			constant === 0
				? number('1')
				: constant === 1
					? eNode
					: { type: 'superscript', base: eNode, superscript: number(constant.toString()) };
		approximate = Math.exp(constant);

		recorder.recordStep(
			'apply-exponential',
			`On applique l'exponentielle: x = e^{${constant}}`,
			expr,
			equals(varNode(variable), solution),
			'detailed'
		);
	} else {
		// log(x) = c => x = 10^c
		solution =
			constant === 0
				? number('1')
				: { type: 'superscript', base: number('10'), superscript: number(constant.toString()) };
		approximate = Math.pow(10, constant);

		recorder.recordStep(
			'apply-exponential',
			`On applique la puissance de 10: x = 10^{${constant}}`,
			expr,
			equals(varNode(variable), solution),
			'detailed'
		);
	}

	const solutionSimplified = denormalize(normalize(solution));

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

/** Type alias for solver options */
type SolverOptions = Required<Omit<SolveOptions, 'variable' | 'initialGuesses'>> & {
	initialGuesses?: readonly number[];
};

/**
 * Solve trigonometric equations: sin(ax+b) = c, cos(ax+b) = c, tan(ax+b) = c.
 *
 * Returns the full periodic solution family:
 * - baseSolutions: all distinct solutions within one period (in x-space)
 * - period: the repetition interval
 *
 * Solution families:
 * - sin(u) = c → u = arcsin(c) + 2kπ  and  u = π - arcsin(c) + 2kπ
 * - cos(u) = c → u = arccos(c) + 2kπ  and  u = -arccos(c) + 2kπ
 * - tan(u) = c → u = arctan(c) + kπ
 *
 * Then if u = ax + b: x = (u - b) / a, period = base_period / |a|
 */
function solveTrigonometric(
	expr: MathNode,
	variable: string,
	options: SolverOptions,
	recorder: SolveStepRecorder
): SolveResult | null {
	// Extract trig equation structure (fixes old bug with numbers inside args)
	const extracted = extractTrigEquation(expr, variable);
	if (!extracted) return null;

	const { funcName, argument, constant } = extracted;

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
		// Non-linear argument (e.g. sin(x²)): not supported
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

	interface USolution {
		symbolic: MathNode;
		numeric: number;
	}
	const uSolutions: USolution[] = [];

	if (funcName === 'sin') {
		const arcsinVal = Math.asin(constant);
		const arcsinNode =
			evaluateTrigInverse('arcsin', constant) ?? func('arcsin', [number(constant.toString())]);
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
		const arccosVal = Math.acos(constant);
		const arccosNode =
			evaluateTrigInverse('arccos', constant) ?? func('arccos', [number(constant.toString())]);
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
		const arctanVal = Math.atan(constant);
		const arctanNode =
			evaluateTrigInverse('arctan', constant) ?? func('arctan', [number(constant.toString())]);
		uSolutions.push({ symbolic: arctanNode, numeric: arctanVal });
	}

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

/**
 * Transcendental Equation Solver
 *
 * Solves equations involving exp, ln, log, sin, cos, tan.
 *
 * @module mathAST/solve/solvers/transcendental
 */

import type { MathNode } from '../../types';
import type { EquationSolver, SolveResult, SolveOptions, SolveStepRecorder } from '../types';
import { containsTranscendental, getTranscendentalType } from '../classify';
import { isFunction, isNumber } from '../../guards';
import { number, functionCall, variable as varNode, equals, divide } from '../../factory';
import { denormalize, normalize } from '../../normal';
import { mapNode } from '../../transforms';
import { getVariables } from '../../eval/substitute';

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

	// Extract the constant from the expression
	// For e^x - c = 0, we need to find c
	// This is tricky in standard form, so we'll use numeric approximation

	// Check if base is 'e' (Euler's number)
	const isEulerBase =
		(base.type === 'variable' && base.name === 'e') ||
		(base.type === 'number' && Math.abs(parseFloat(base.value) - Math.E) < 0.0001);

	// Try to extract the constant by evaluating expr with x=0
	// If e^x - c = 0, then at x=0: e^0 - c = 1 - c, so c = 1 - expr(0)
	// This is a heuristic approach

	// For simplicity, let's handle the common case where expr = e^x - c
	// We'll look for the constant term

	let constantTerm: MathNode | null = null;
	mapNode(expr, (n) => {
		if (isNumber(n) || (n.type === 'negative' && isNumber(n.operand))) {
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
		solution = functionCall('ln', number(constant.toString()));
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
		const baseValue = computeNumericValue(base);
		if (baseValue === null || baseValue <= 0 || baseValue === 1) {
			return null;
		}

		solution = divide(functionCall('ln', number(constant.toString())), functionCall('ln', base));
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
		if (isNumber(n) || (n.type === 'negative' && isNumber(n.operand))) {
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

/**
 * Solve trigonometric equations like sin(x) = c or cos(x) = c.
 */
function solveTrigonometric(
	expr: MathNode,
	variable: string,
	options: Required<Omit<SolveOptions, 'variable' | 'initialGuesses'>> & {
		initialGuesses?: readonly number[];
	},
	recorder: SolveStepRecorder
): SolveResult | null {
	// Look for pattern: sin(x) - c = 0 or cos(x) - c = 0
	let funcName: string | null = null;
	let argument: MathNode | null = null;

	mapNode(expr, (n) => {
		if (isFunction(n) && (n.name === 'sin' || n.name === 'cos' || n.name === 'tan')) {
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
		if (isNumber(n) || (n.type === 'negative' && isNumber(n.operand))) {
			const vars = getVariables(n);
			if (vars.size === 0) {
				const val = computeNumericValue(n);
				if (val !== null) constant = -val;
			}
		}
		return n;
	});

	// Check domain restrictions
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

	// Compute principal solution
	let solution: MathNode;
	let approximate: number;
	let inverseFuncName: string;

	if (funcName === 'sin') {
		inverseFuncName = 'arcsin';
		approximate = Math.asin(constant);
		solution = functionCall('arcsin', number(constant.toString()));
	} else if (funcName === 'cos') {
		inverseFuncName = 'arccos';
		approximate = Math.acos(constant);
		solution = functionCall('arccos', number(constant.toString()));
	} else {
		// tan
		inverseFuncName = 'arctan';
		approximate = Math.atan(constant);
		solution = functionCall('arctan', number(constant.toString()));
	}

	recorder.recordStep(
		`apply-${inverseFuncName}`,
		`On applique la fonction ${inverseFuncName}: x = ${inverseFuncName}(${constant})`,
		expr,
		equals(varNode(variable), solution),
		'detailed'
	);

	// Add periodicity note
	recorder.recordStep(
		'periodicity-note',
		`Note: les solutions trigonometriques sont periodiques (+ 2k*pi pour k entier)`,
		solution,
		solution,
		'detailed'
	);

	const solutionSimplified = denormalize(normalize(solution));

	recorder.recordStep(
		'isolate-variable',
		`Solution principale: ${variable} = ${approximate.toPrecision(options.precision)}`,
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
		equationType: 'trigonometric',
		strategy: 'algebraic',
		steps: recorder.getStepsFiltered(options.verbosity)
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

/**
 * Quartic Equation Solver
 *
 * Solves degree-4 polynomial equations ax⁴ + bx³ + cx² + dx + e = 0
 * using three sub-strategies:
 *
 * 1. **Biquadratic** (b=0, d=0): ax⁴ + cx² + e = 0 -- substitute u=x², solve quadratic
 * 2. **Common factor** (e=0): x(ax³ + bx² + cx + d) = 0 -- reuse cubic solver
 * 3. **General Ferrari**: depress, solve resolvent cubic, factor into two quadratics
 *
 * Hybrid numeric/symbolic: compute numeric roots, identify as integers/simple fractions,
 * build symbolic MathNode solutions.
 *
 * @module mathAST/solve/solvers/quartic
 */

import type { MathNode } from '../../types';
import type {
	EquationSolver,
	SolveResult,
	SolveOptions,
	SolveStepRecorder,
	Solution
} from '../types';
import { getPolynomialDegree } from '../classify';
import { realQuarticRoots } from '../../common/quartic-roots';
import { number, opposite, equals, variable as varNode, fraction } from '../../factory';
import { numericNode } from '../../common/numeric';
import { canonicalForm, coefficientsByDegree } from '../../normal/canonical-form';
import {
	describeSolution,
	describeIdentifyQuartic,
	describeIdentifyBiquadratic,
	describeQuarticCommonFactor
} from '../descriptions-fr';
import {
	isZeroNode,
	extractPowerEquation,
	solvePowerEquation,
	solveCubicCardano,
	findSimpleFraction
} from './polynomial';
import { computeNumericValue } from '../../eval/numeric-value';

// =============================================================================
// Types
// =============================================================================

type SolverOptions = Required<Omit<SolveOptions, 'variable' | 'initialGuesses'>> & {
	initialGuesses?: readonly number[];
};

interface QuarticCoefficients {
	a: MathNode; // x⁴
	b: MathNode; // x³
	c: MathNode; // x²
	d: MathNode; // x
	e: MathNode; // constant
}

// =============================================================================
// Coefficient Extraction
// =============================================================================

/**
 * Extract coefficients a, b, c, d, e from quartic expression ax⁴ + bx³ + cx² + dx + e,
 * read as written, then on the canonical form if a coefficient still depends on x
 * (`(x² − 3)² + x` must be expanded first). `null` without an x⁴ term.
 */
function extractQuarticCoefficients(expr: MathNode, variable: string): QuarticCoefficients | null {
	const coefficients =
		coefficientsByDegree(expr, variable, 4) ??
		coefficientsByDegree(canonicalForm(expr), variable, 4);
	if (coefficients === null) return null;
	const [e, d, c, b, a] = coefficients;
	if (isZeroNode(a)) return null;
	return { a, b, c, d, e };
}

// =============================================================================
// Numeric Ferrari Method
// =============================================================================

const EPSILON = 1e-10;

/**
 * Solve a quadratic a*x² + b*x + c = 0 numerically.
 */
function solveQuadraticNumeric(a: number, b: number, c: number): number[] {
	if (Math.abs(a) < EPSILON) {
		if (Math.abs(b) < EPSILON) return [];
		return [-c / b];
	}
	const disc = b * b - 4 * a * c;
	if (disc < -EPSILON) return [];
	if (Math.abs(disc) < EPSILON) return [-b / (2 * a)];
	const sqrtDisc = Math.sqrt(Math.max(0, disc));
	return [(-b - sqrtDisc) / (2 * a), (-b + sqrtDisc) / (2 * a)];
}

/**
 * Solve a cubic a*x³ + b*x² + c*x + d = 0 numerically (Cardano).
 */
function solveCubicNumeric(a: number, b: number, c: number, d: number): number[] {
	if (Math.abs(a) < EPSILON) return solveQuadraticNumeric(b, c, d);

	// Normalize to monic: x³ + b1*x² + c1*x + d1 = 0
	const b1 = b / a;
	const c1 = c / a;
	const d1 = d / a;

	// Depress: t = x - b1/3
	const b1_3 = b1 / 3;
	const thirdP = c1 / 3 - b1_3 * b1_3;
	const halfQ = b1_3 * b1_3 * b1_3 - (b1_3 * c1) / 2 + d1 / 2;

	const discriminant = halfQ * halfQ + thirdP * thirdP * thirdP;
	const roots: number[] = [];

	if (Math.abs(discriminant) < EPSILON) {
		if (Math.abs(halfQ) < EPSILON) {
			roots.push(-b1_3);
		} else {
			const cubeRoot = Math.cbrt(-halfQ);
			roots.push(2 * cubeRoot - b1_3);
			roots.push(-cubeRoot - b1_3);
		}
	} else if (discriminant > 0) {
		const sqrtDelta = Math.sqrt(discriminant);
		const u = Math.cbrt(-halfQ + sqrtDelta);
		const v = Math.cbrt(-halfQ - sqrtDelta);
		roots.push(u + v - b1_3);
	} else {
		// Three distinct real roots (trigonometric solution)
		const r = Math.sqrt(-thirdP * thirdP * thirdP);
		const theta = Math.acos(Math.max(-1, Math.min(1, -halfQ / r)));
		const twoSqrtMinusP3 = 2 * Math.sqrt(-thirdP);

		roots.push(twoSqrtMinusP3 * Math.cos(theta / 3) - b1_3);
		roots.push(twoSqrtMinusP3 * Math.cos((theta + 2 * Math.PI) / 3) - b1_3);
		roots.push(twoSqrtMinusP3 * Math.cos((theta + 4 * Math.PI) / 3) - b1_3);
	}

	return roots;
}

/**
 * Les racines réelles de ax⁴ + bx³ + cx² + dx + e = 0 (voir
 * `common/quartic-roots.ts`, partagé avec `domain/preimage.ts`).
 */
function solveQuarticNumeric(
	aVal: number,
	bVal: number,
	cVal: number,
	dVal: number,
	eVal: number
): number[] {
	if (Math.abs(aVal) < EPSILON) return solveCubicNumeric(bVal, cVal, dVal, eVal);
	return realQuarticRoots(aVal, bVal, cVal, dVal, eVal);
}

// =============================================================================
// Symbolic Solution Builder
// =============================================================================

/**
 * Convert a numeric root into a symbolic MathNode.
 * Tries integer, then simple fraction, then decimal fallback.
 */
function numericToSymbolic(value: number): { node: MathNode; exact: boolean } {
	// Integer check
	const rounded = Math.round(value);
	if (Math.abs(value - rounded) < EPSILON) {
		return { node: numericNode(rounded), exact: true };
	}

	// Simple fraction check
	const frac = findSimpleFraction(value);
	if (frac) {
		if (frac.d === 1) return { node: numericNode(frac.n), exact: true };
		if (frac.n < 0) {
			return { node: opposite(fraction(numericNode(-frac.n), numericNode(frac.d))), exact: true };
		}
		return { node: fraction(numericNode(frac.n), numericNode(frac.d)), exact: true };
	}

	// Valeur arrondie à 10 décimales : approchée, pas exacte (frère de L27)
	return { node: numericNode(value.toFixed(10)), exact: false };
}

/**
 * Build a Solution from a numeric root value.
 */
function buildSolution(value: number): Solution {
	const { node, exact } = numericToSymbolic(value);
	const simplified = canonicalForm(node);
	return { value: simplified, exact, approximate: value };
}

// =============================================================================
// Biquadratic Solver (symbolic path)
// =============================================================================

/**
 * Solve biquadratic equation ax⁴ + cx² + e = 0 using u = x² substitution.
 */
function solveBiquadratic(
	variable: string,
	coeffs: QuarticCoefficients,
	options: SolverOptions,
	recorder: SolveStepRecorder
): SolveResult {
	const { a, c, e } = coeffs;

	// Record identification
	recorder.recordStep(
		'identify-biquadratic',
		describeIdentifyBiquadratic(a, c, e),
		equals(varNode(variable), number('0')),
		equals(varNode(variable), number('0')),
		'detailed'
	);

	// Record substitution u = x²
	recorder.recordStep(
		'biquadratic-substitution',
		'On pose u = x² pour ramener a une equation quadratique en u',
		equals(varNode(variable), number('0')),
		equals(varNode(variable), number('0')),
		'detailed'
	);

	// Compute numeric coefficients
	const aVal = computeNumericValue(a);
	const cVal = computeNumericValue(c);
	const eVal = computeNumericValue(e);

	if (aVal === null || cVal === null || eVal === null) {
		return {
			variable,
			status: 'no-solution',
			solutions: [],
			equationType: 'polynomial',
			strategy: 'algebraic',
			steps: recorder.getStepsFiltered(options.verbosity),
			error: 'Coefficients biquadratiques non numeriques'
		};
	}

	// Solve au² + cu + e = 0 for u
	const disc = cVal * cVal - 4 * aVal * eVal;

	if (disc < -EPSILON) {
		// No real u solutions
		recorder.recordStep(
			'biquadratic-no-positive-u',
			"Le discriminant de l'equation en u est negatif, pas de solution reelle",
			equals(varNode(variable), number('0')),
			equals(varNode(variable), number('0')),
			'summarized'
		);
		return {
			variable,
			status: 'no-real-solution',
			solutions: [],
			equationType: 'polynomial',
			strategy: 'algebraic',
			steps: recorder.getStepsFiltered(options.verbosity)
		};
	}

	const sqrtDisc = Math.sqrt(Math.max(0, disc));
	const uRoots: number[] = [];

	if (Math.abs(disc) < EPSILON) {
		uRoots.push(-cVal / (2 * aVal));
	} else {
		uRoots.push((-cVal - sqrtDisc) / (2 * aVal));
		uRoots.push((-cVal + sqrtDisc) / (2 * aVal));
	}

	// Back-substitute: x = ±√u for positive u
	const solutions: Solution[] = [];

	for (const u of uRoots) {
		if (u < -EPSILON) continue; // skip negative u

		if (Math.abs(u) < EPSILON) {
			// u = 0 -> x = 0
			solutions.push({ value: number('0'), exact: true, approximate: 0 });
		} else {
			// u > 0 -> x = ±√u
			const sqrtU = Math.sqrt(u);
			solutions.push(buildSolution(sqrtU));
			solutions.push(buildSolution(-sqrtU));
		}
	}

	if (solutions.length === 0) {
		recorder.recordStep(
			'biquadratic-no-positive-u',
			"Aucune valeur de u n'est positive, donc il n'y a pas de solution reelle",
			equals(varNode(variable), number('0')),
			equals(varNode(variable), number('0')),
			'summarized'
		);
		return {
			variable,
			status: 'no-real-solution',
			solutions: [],
			equationType: 'polynomial',
			strategy: 'algebraic',
			steps: recorder.getStepsFiltered(options.verbosity)
		};
	}

	// Record back-substitution
	recorder.recordStep(
		'biquadratic-back-substitution',
		'On revient a la variable originale: x = ±√u pour chaque solution positive u',
		equals(varNode(variable), number('0')),
		equals(varNode(variable), number('0')),
		'detailed'
	);

	// Sort and deduplicate by approximate value
	solutions.sort((a, b) => (a.approximate ?? 0) - (b.approximate ?? 0));

	// Record each solution
	solutions.forEach((sol, idx) => {
		recorder.recordStep(
			'isolate-variable',
			describeSolution(variable, sol.value, idx + 1),
			equals(varNode(variable), sol.value),
			equals(varNode(variable), sol.value),
			'summarized'
		);
	});

	return {
		variable,
		status: solutions.length > 1 ? 'multiple' : 'unique',
		solutions,
		equationType: 'polynomial',
		strategy: 'algebraic',
		steps: recorder.getStepsFiltered(options.verbosity)
	};
}

// =============================================================================
// Common Factor Solver
// =============================================================================

/**
 * Solve quartic with common factor: ax⁴ + bx³ + cx² + dx = 0
 * Factor as x(ax³ + bx² + cx + d) = 0, reuse cubic solver.
 */
function solveQuarticCommonFactor(
	variable: string,
	coeffs: QuarticCoefficients,
	options: SolverOptions,
	recorder: SolveStepRecorder
): SolveResult {
	const { a, b, c, d } = coeffs;

	recorder.recordStep(
		'quartic-common-factor',
		describeQuarticCommonFactor(variable),
		equals(varNode(variable), number('0')),
		equals(varNode(variable), number('0')),
		'detailed'
	);

	// x = 0 is one solution
	const zeroSolution: Solution = { value: number('0'), exact: true, approximate: 0 };
	const solutions: Solution[] = [zeroSolution];

	// Solve the cubic ax³ + bx² + cx + d = 0
	const cubicCoeffs = { a, b, c, d };

	// Check if cubic has zero constant (another common factor)
	if (isZeroNode(d)) {
		// ax³ + bx² + cx = 0 -> x²(ax² + bx + c) = 0
		// x = 0 already added; solve quadratic ax² + bx + c = 0
		const aVal = computeNumericValue(a);
		const bVal = computeNumericValue(b);
		const cVal = computeNumericValue(c);

		if (aVal !== null && bVal !== null && cVal !== null) {
			const quadRoots = solveQuadraticNumeric(aVal, bVal, cVal);
			for (const root of quadRoots) {
				if (Math.abs(root) > EPSILON) {
					// Don't duplicate x=0
					solutions.push(buildSolution(root));
				}
			}
		}
	} else {
		// Use Cardano for the cubic
		const cubicResult = solveCubicCardano(variable, cubicCoeffs, options, recorder);

		for (const sol of cubicResult.solutions) {
			const approx = sol.approximate ?? computeNumericValue(sol.value);
			// Don't duplicate x=0
			if (approx === null || Math.abs(approx) > EPSILON) {
				solutions.push(sol);
			}
		}
	}

	// Sort solutions by approximate value
	solutions.sort((a, b) => (a.approximate ?? 0) - (b.approximate ?? 0));

	// Record summary
	solutions.forEach((sol, idx) => {
		recorder.recordStep(
			'isolate-variable',
			describeSolution(variable, sol.value, idx + 1),
			equals(varNode(variable), sol.value),
			equals(varNode(variable), sol.value),
			'summarized'
		);
	});

	return {
		variable,
		status: solutions.length > 1 ? 'multiple' : 'unique',
		solutions,
		equationType: 'polynomial',
		strategy: 'algebraic',
		steps: recorder.getStepsFiltered(options.verbosity)
	};
}

// =============================================================================
// General Ferrari Solver
// =============================================================================

/**
 * Solve a general quartic using Ferrari's method (numeric hybrid).
 * Computes roots numerically, then identifies as integers/fractions symbolically.
 */
function solveQuarticGeneral(
	variable: string,
	coeffs: QuarticCoefficients,
	options: SolverOptions,
	recorder: SolveStepRecorder
): SolveResult {
	const aVal = computeNumericValue(coeffs.a);
	const bVal = computeNumericValue(coeffs.b);
	const cVal = computeNumericValue(coeffs.c);
	const dVal = computeNumericValue(coeffs.d);
	const eVal = computeNumericValue(coeffs.e);

	if (aVal === null || bVal === null || cVal === null || dVal === null || eVal === null) {
		return {
			variable,
			status: 'no-solution',
			solutions: [],
			equationType: 'polynomial',
			strategy: 'algebraic',
			steps: recorder.getStepsFiltered(options.verbosity),
			error: 'Coefficients quartiques non numeriques'
		};
	}

	recorder.recordStep(
		'quartic-ferrari',
		"On utilise la methode de Ferrari pour resoudre l'equation quartique",
		equals(varNode(variable), number('0')),
		equals(varNode(variable), number('0')),
		'detailed'
	);

	recorder.recordStep(
		'quartic-depress',
		'On effectue la substitution pour obtenir la forme deprimee',
		equals(varNode(variable), number('0')),
		equals(varNode(variable), number('0')),
		'detailed'
	);

	recorder.recordStep(
		'quartic-resolvent-cubic',
		'On resout la cubique resolvante',
		equals(varNode(variable), number('0')),
		equals(varNode(variable), number('0')),
		'detailed'
	);

	recorder.recordStep(
		'quartic-factor-quadratics',
		'On factorise en deux equations quadratiques',
		equals(varNode(variable), number('0')),
		equals(varNode(variable), number('0')),
		'detailed'
	);

	// Compute numeric roots using Ferrari
	const numericRoots = solveQuarticNumeric(aVal, bVal, cVal, dVal, eVal);

	if (numericRoots.length === 0) {
		recorder.recordStep(
			'no-real-solution',
			"L'equation quartique n'a pas de solution reelle",
			equals(varNode(variable), number('0')),
			equals(varNode(variable), number('0')),
			'summarized'
		);
		return {
			variable,
			status: 'no-real-solution',
			solutions: [],
			equationType: 'polynomial',
			strategy: 'algebraic',
			steps: recorder.getStepsFiltered(options.verbosity)
		};
	}

	// Verify and refine roots by substitution
	const evalPoly = (x: number) =>
		aVal * x * x * x * x + bVal * x * x * x + cVal * x * x + dVal * x + eVal;

	const solutions: Solution[] = numericRoots.map((root) => {
		// Try to snap to cleaner value
		const rounded = Math.round(root);
		if (
			Math.abs(root - rounded) < EPSILON &&
			Math.abs(evalPoly(rounded)) <= Math.abs(evalPoly(root))
		) {
			return buildSolution(rounded);
		}
		return buildSolution(root);
	});

	// Sort solutions by approximate value
	solutions.sort((a, b) => (a.approximate ?? 0) - (b.approximate ?? 0));

	// Record solutions
	solutions.forEach((sol, idx) => {
		recorder.recordStep(
			'isolate-variable',
			describeSolution(variable, sol.value, idx + 1),
			equals(varNode(variable), sol.value),
			equals(varNode(variable), sol.value),
			'summarized'
		);
	});

	return {
		variable,
		status: solutions.length > 1 ? 'multiple' : 'unique',
		solutions,
		equationType: 'polynomial',
		strategy: 'algebraic',
		steps: recorder.getStepsFiltered(options.verbosity)
	};
}

// =============================================================================
// Quartic Solver (Main Entry Point)
// =============================================================================

/**
 * Solver for quartic equations (degree 4).
 *
 * Dispatch order:
 * 1. Pure power x⁴ = k (reuse power equation solver)
 * 2. Biquadratic ax⁴ + cx² + e = 0 (b=0, d=0)
 * 3. Common factor x(ax³ + bx² + cx + d) = 0 (e=0)
 * 4. General Ferrari method
 */
export const quarticSolver: EquationSolver = {
	name: 'quartic',

	canSolve(expr: MathNode, variable: string): boolean {
		const degree = getPolynomialDegree(expr, variable);
		return degree === 4;
	},

	solve(
		expr: MathNode,
		variable: string,
		options: SolverOptions,
		recorder: SolveStepRecorder
	): SolveResult {
		// 1. Try pure power x⁴ = k
		const powerExtracted = extractPowerEquation(expr, variable);
		if (powerExtracted) {
			return solvePowerEquation(expr, variable, powerExtracted, options, recorder);
		}

		// 2. Extract coefficients
		const coeffs = extractQuarticCoefficients(expr, variable);
		if (!coeffs) {
			return {
				variable,
				status: 'no-solution',
				solutions: [],
				equationType: 'polynomial',
				strategy: 'algebraic',
				steps: recorder.getStepsFiltered(options.verbosity),
				error: "Impossible d'extraire les coefficients quartiques"
			};
		}

		// Record identification
		recorder.recordStep(
			'identify-quartic',
			describeIdentifyQuartic(coeffs.a, coeffs.b, coeffs.c, coeffs.d, coeffs.e),
			equals(varNode(variable), number('0')),
			equals(varNode(variable), number('0')),
			'detailed'
		);

		// 3. Check for biquadratic: b = 0 and d = 0
		if (isZeroNode(coeffs.b) && isZeroNode(coeffs.d)) {
			return solveBiquadratic(variable, coeffs, options, recorder);
		}

		// 4. Check for common factor: e = 0
		if (isZeroNode(coeffs.e)) {
			return solveQuarticCommonFactor(variable, coeffs, options, recorder);
		}

		// 5. General Ferrari method
		return solveQuarticGeneral(variable, coeffs, options, recorder);
	}
};

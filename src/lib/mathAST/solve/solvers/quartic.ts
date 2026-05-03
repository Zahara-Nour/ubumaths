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
import { flattenSumShallow } from '../../flatten';
import { number, opposite, equals, variable as varNode, fraction } from '../../factory';
import { numericNode } from '../../common/numeric';
import { denormalize, normalize } from '../../normal';
import {
	describeSolution,
	describeIdentifyQuartic,
	describeIdentifyBiquadratic,
	describeQuarticCommonFactor
} from '../descriptions-fr';
import {
	isZeroNode,
	computeNumericValue,
	getTermDegree,
	extractCoefficient,
	extractPowerEquation,
	solvePowerEquation,
	solveCubicCardano,
	findSimpleFraction
} from './polynomial';

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
 * Extract coefficients a, b, c, d, e from quartic expression ax⁴ + bx³ + cx² + dx + e.
 */
function extractQuarticCoefficients(expr: MathNode, variable: string): QuarticCoefficients | null {
	const flatSum = flattenSumShallow(expr);

	const aTerms: MathNode[] = []; // degree 4
	const bTerms: MathNode[] = []; // degree 3
	const cTerms: MathNode[] = []; // degree 2
	const dTerms: MathNode[] = []; // degree 1
	const eTerms: MathNode[] = []; // degree 0

	for (const { sign, term } of flatSum) {
		const signedTerm = sign === '-' ? opposite(term) : term;
		const degree = getTermDegree(signedTerm, variable);

		if (degree === 4) {
			aTerms.push(signedTerm);
		} else if (degree === 3) {
			bTerms.push(signedTerm);
		} else if (degree === 2) {
			cTerms.push(signedTerm);
		} else if (degree === 1) {
			dTerms.push(signedTerm);
		} else if (degree === 0) {
			eTerms.push(signedTerm);
		} else {
			// Unexpected degree (>4 or transcendental)
			return null;
		}
	}

	// Must have x⁴ term
	if (aTerms.length === 0) return null;

	const a = extractCoefficient(aTerms, variable, 4);
	const b = extractCoefficient(bTerms, variable, 3);
	const c = extractCoefficient(cTerms, variable, 2);
	const d = extractCoefficient(dTerms, variable, 1);
	const e = extractCoefficient(eTerms, variable, 0);

	// Verify a != 0
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
 * Solve a quartic ax⁴ + bx³ + cx² + dx + e = 0 numerically using Ferrari's method.
 * Based on the existing solveQuarticZeros in domain/preimage.ts.
 */
function solveQuarticNumeric(
	aVal: number,
	bVal: number,
	cVal: number,
	dVal: number,
	eVal: number
): number[] {
	if (Math.abs(aVal) < EPSILON) return solveCubicNumeric(bVal, cVal, dVal, eVal);

	// Normalize to monic: x⁴ + px³ + qx² + rx + s = 0
	const p = bVal / aVal;
	const q = cVal / aVal;
	const r = dVal / aVal;
	const s = eVal / aVal;

	// Substitute x = t - p/4 to get depressed quartic: t⁴ + At² + Bt + C = 0
	const p2 = p * p;
	const p3 = p2 * p;
	const p4 = p3 * p;
	const shift = p / 4;

	const A = q - (3 * p2) / 8;
	const B = r - (p * q) / 2 + p3 / 8;
	const C = s - (p * r) / 4 + (p2 * q) / 16 - (3 * p4) / 256;

	// Special case: Biquadratic (B = 0)
	if (Math.abs(B) < EPSILON) {
		return solveBiquadraticNumeric(A, C, shift);
	}

	// Solve the resolvent cubic: y³ + (A/2)y² + ((A² - 4C)/16)y - B²/64 = 0
	const cubicP = A / 2;
	const cubicQ = (A * A - 4 * C) / 16;
	const cubicR = -(B * B) / 64;

	const cubicRoots = solveCubicNumeric(1, cubicP, cubicQ, cubicR);

	// Find a suitable root y for factorization (prefer positive)
	let y = 0;
	for (const root of cubicRoots) {
		if (root > y) y = root;
	}
	if (Math.abs(y) < EPSILON && cubicRoots.length > 0) {
		y = Math.max(...cubicRoots.map(Math.abs));
		for (const root of cubicRoots) {
			if (Math.abs(Math.abs(root) - y) < EPSILON) {
				y = root;
				break;
			}
		}
	}

	// Factor depressed quartic as (t² + √(2y)t + q₁)(t² - √(2y)t + q₂)
	const twoY = 2 * y;
	if (twoY < -EPSILON) return [];

	const sqrtTwoY = Math.sqrt(Math.max(0, twoY));
	if (Math.abs(sqrtTwoY) < EPSILON) {
		return solveBiquadraticNumeric(A, C, shift);
	}

	const q1 = A / 2 + y - B / (2 * sqrtTwoY);
	const q2 = A / 2 + y + B / (2 * sqrtTwoY);

	// Solve the two quadratics
	const roots1 = solveQuadraticNumeric(1, sqrtTwoY, q1);
	const roots2 = solveQuadraticNumeric(1, -sqrtTwoY, q2);

	// Transform back: x = t - p/4
	const allRoots = [...roots1, ...roots2].map((t) => t - shift);
	return deduplicateRoots(allRoots);
}

/**
 * Solve depressed biquadratic t⁴ + At² + C = 0 numerically.
 */
function solveBiquadraticNumeric(A: number, C: number, shift: number): number[] {
	const uRoots = solveQuadraticNumeric(1, A, C);
	const tRoots: number[] = [];

	for (const u of uRoots) {
		if (u >= -EPSILON) {
			const sqrtU = Math.sqrt(Math.max(0, u));
			tRoots.push(sqrtU - shift);
			if (sqrtU > EPSILON) {
				tRoots.push(-sqrtU - shift);
			}
		}
	}

	return deduplicateRoots(tRoots);
}

/**
 * Remove duplicate roots within tolerance.
 */
function deduplicateRoots(roots: number[]): number[] {
	if (roots.length === 0) return [];

	// Clean roots: snap near-integers
	const cleaned = roots.map((r) => {
		const rounded = Math.round(r);
		return Math.abs(r - rounded) < EPSILON ? rounded : r;
	});

	cleaned.sort((a, b) => a - b);
	const unique: number[] = [cleaned[0]];
	for (let i = 1; i < cleaned.length; i++) {
		if (Math.abs(cleaned[i] - unique[unique.length - 1]) > EPSILON) {
			unique.push(cleaned[i]);
		}
	}
	return unique;
}

// =============================================================================
// Symbolic Solution Builder
// =============================================================================

/**
 * Convert a numeric root into a symbolic MathNode.
 * Tries integer, then simple fraction, then decimal fallback.
 */
function numericToSymbolic(value: number): MathNode {
	// Integer check
	const rounded = Math.round(value);
	if (Math.abs(value - rounded) < EPSILON) {
		return numericNode(rounded);
	}

	// Simple fraction check
	const frac = findSimpleFraction(value);
	if (frac) {
		if (frac.d === 1) return numericNode(frac.n);
		if (frac.n < 0) {
			return opposite(fraction(numericNode(-frac.n), numericNode(frac.d)));
		}
		return fraction(numericNode(frac.n), numericNode(frac.d));
	}

	// Decimal fallback
	return numericNode(value.toFixed(10));
}

/**
 * Build a Solution from a numeric root value.
 */
function buildSolution(value: number): Solution {
	const node = numericToSymbolic(value);
	const simplified = denormalize(normalize(node));
	return { value: simplified, exact: true, approximate: value };
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

/**
 * Pedagogical Solve — Public Barrel
 *
 * Public surface of the pedagogical equation-solving module. External callers
 * (`questions/generator/correction-generator.ts`, demo scripts, debug pages)
 * should import from here rather than reaching into individual files.
 *
 * Exposes :
 * - `generateEquationSteps(eq, options)` — auto-dispatch on polynomial degree
 *   to the linear or quadratic pipeline. Bumps under-curriculum levels
 *   (`primaire` for linear, `primaire`+`college` for quadratic).
 * - The individual `generateLinearEquationSteps` and
 *   `generateQuadraticEquationSteps` for callers that already know the type.
 * - The two renderers and the public types / error classes.
 *
 * @module mathAST/pedagogical-solve
 */

import type { RelationNode } from '../types';
import type { SchoolLevel } from '../common/step-renderer-base';
import { add as addNode, opposite } from '../factory';
import { detectVariable, getPolynomialDegree } from '../solve/classify';
import { canon } from './_helpers';
import { generateLinearEquationSteps } from './linear';
import { generateQuadraticEquationSteps, PedagogicalQuadraticNotImplemented } from './quadratic';
import type {
	EquationStep,
	LinearEquationStepsOptions,
	LinearSchoolLevel,
	QuadraticEquationStepsOptions,
	QuadraticSchoolLevel
} from './types';

// =============================================================================
// Unified options
// =============================================================================

/**
 * Options accepted by `generateEquationSteps` (the polymorphic entry point).
 *
 * `level` accepts any `SchoolLevel`. The dispatcher bumps levels that are not
 * compatible with the matching pipeline :
 * - linear pipeline : `primaire` → `college`.
 * - quadratic pipeline : `primaire | college` → `lycee`.
 */
export interface EquationStepsOptions {
	readonly level: SchoolLevel;
	readonly includeSubSteps?: boolean;
	readonly variable?: string;
}

// =============================================================================
// Errors
// =============================================================================

/**
 * Thrown by `generateEquationSteps` when the polynomial degree is unsupported
 * (≥ 3 in V1, or non-polynomial). Distinct from
 * `PedagogicalQuadraticNotImplemented` (which signals "quadratic but out of
 * V1 scope") — this error is for shapes that are not quadratic-or-linear at
 * all.
 */
export class UnsupportedEquationDegree extends Error {
	constructor(public readonly degree: number | null) {
		super(
			degree === null
				? 'generateEquationSteps: equation is not a polynomial in the unknown.'
				: `generateEquationSteps: polynomial degree ${degree} is unsupported (V1 covers degrees 1 and 2).`
		);
		this.name = 'UnsupportedEquationDegree';
	}
}

// =============================================================================
// Level bump helpers
// =============================================================================

function bumpForLinear(level: SchoolLevel): LinearSchoolLevel {
	return level === 'primaire' ? 'college' : level;
}

function bumpForQuadratic(level: SchoolLevel): QuadraticSchoolLevel {
	return level === 'primaire' || level === 'college' ? 'lycee' : level;
}

// Rational inequalities use the same level mapping as quadratic.
const bumpForRational = bumpForQuadratic;

// =============================================================================
// Dispatcher
// =============================================================================

/**
 * Generate pedagogical steps for solving any supported equation. Routes to
 * the linear or quadratic pipeline based on the polynomial degree of the
 * standard form `f(x) − g(x)`.
 *
 * @throws {Error} when no single unknown can be detected.
 * @throws {UnsupportedEquationDegree} when the degree is not 0, 1 or 2.
 * @throws {PedagogicalQuadraticNotImplemented} when the degree is 2 but the
 *   quadratic pipeline rejects the input (parametric coefficients, etc.).
 */
export function generateEquationSteps(
	equation: RelationNode,
	options: EquationStepsOptions
): readonly EquationStep[] {
	const variable = options.variable ?? detectVariable(equation);
	if (variable === null) {
		throw new Error('generateEquationSteps: cannot detect a single variable');
	}

	const standardForm = canon(addNode(equation.left, opposite(equation.right)));
	const degree = getPolynomialDegree(standardForm, variable);

	if (degree === null) {
		throw new UnsupportedEquationDegree(null);
	}

	if (degree === 0 || degree === 1) {
		const linearOpts: LinearEquationStepsOptions = {
			level: bumpForLinear(options.level),
			...(options.includeSubSteps !== undefined && {
				includeSubSteps: options.includeSubSteps
			}),
			...(options.variable !== undefined && { variable: options.variable })
		};
		return generateLinearEquationSteps(equation, linearOpts);
	}

	if (degree === 2) {
		const quadraticOpts: QuadraticEquationStepsOptions = {
			level: bumpForQuadratic(options.level),
			...(options.includeSubSteps !== undefined && {
				includeSubSteps: options.includeSubSteps
			}),
			...(options.variable !== undefined && { variable: options.variable })
		};
		return generateQuadraticEquationSteps(equation, quadraticOpts);
	}

	throw new UnsupportedEquationDegree(degree);
}

// =============================================================================
// Inequality dispatcher (palier 2a)
// =============================================================================

import {
	generateLinearInequalitySteps,
	UnsupportedInequalityDegree,
	PedagogicalInequalityError
} from './linear-inequality';
import { generateQuadraticInequalitySteps } from './quadratic-inequality';
import { generateRationalInequalitySteps } from './rational-inequality';
import { InequalityNotSolvable } from '../solve/inequality/types';
import { collectDenominators } from '../solve/rational';
import type {
	LinearInequalityStepsOptions,
	QuadraticInequalityStepsOptions,
	QuadraticSchoolLevel,
	RationalInequalityStepsOptions
} from './types';

/**
 * Options accepted by `generateInequalitySteps`. `level` accepts any
 * `SchoolLevel`; the dispatcher bumps `primaire` to `college` (linear
 * inequalities aren't taught at primaire).
 */
export interface InequalityStepsOptions {
	readonly level: SchoolLevel;
	readonly includeSubSteps?: boolean;
	readonly variable?: string;
}

/**
 * Generate pedagogical steps for solving any supported inequality. Routes by
 * polynomial degree of `f − g`:
 * - **No variable detected** (constant inequality `0 < 1`, etc.) → linear
 *   pipeline (emits an `inequality-conclude-truth` step).
 * - **Degree 0 or 1** → `generateLinearInequalitySteps`.
 * - **Degree 2** → `generateQuadraticInequalitySteps` (palier 2b).
 * - **Degree ≥ 3** → throws `UnsupportedInequalityDegree(degree)`.
 * - **Non-polynomial** (`getPolynomialDegree` returns `null`, e.g.
 *   `sin(x) < 0`) → throws `UnsupportedInequalityDegree(null)`. Use
 *   `solveInequality` from `solve/inequality` for transcendental inputs
 *   (returns a Domain — no pedagogical steps).
 *
 * @throws PedagogicalInequalityError if `relation === '='`.
 * @throws UnsupportedInequalityDegree on degree ≥ 3 or non-polynomial.
 * @throws InequalityNotSolvable on parametric coefficients (delegated).
 */
export function generateInequalitySteps(
	inequality: RelationNode,
	options: InequalityStepsOptions
): readonly EquationStep[] {
	if (inequality.relation === '=') {
		throw new PedagogicalInequalityError(
			"L'égalité n'est pas une inéquation — utiliser generateEquationSteps()"
		);
	}

	const variable = options.variable ?? detectVariable(inequality);

	// Constant inequality (no variable) — route directly to linear.
	if (variable === null) {
		return generateLinearInequalitySteps(inequality, {
			level: bumpForLinear(options.level),
			...(options.includeSubSteps !== undefined && {
				includeSubSteps: options.includeSubSteps
			})
		});
	}

	const standardForm = canon(addNode(inequality.left, opposite(inequality.right)));
	const degree = getPolynomialDegree(standardForm, variable);

	if (degree === null) {
		// Could be rational. Route to the rational pipeline if the standard form
		// has at least one variable-bearing denominator (palier 3).
		if (collectDenominators(standardForm, variable).length > 0) {
			const rationalOpts: RationalInequalityStepsOptions = {
				level: bumpForRational(options.level),
				...(options.includeSubSteps !== undefined && {
					includeSubSteps: options.includeSubSteps
				}),
				...(options.variable !== undefined && { variable: options.variable })
			};
			return generateRationalInequalitySteps(inequality, rationalOpts);
		}
		throw new UnsupportedInequalityDegree(null);
	}
	if (degree >= 3) {
		throw new UnsupportedInequalityDegree(degree);
	}

	if (degree === 2) {
		const quadraticOpts: QuadraticInequalityStepsOptions = {
			level: bumpForQuadratic(options.level),
			...(options.includeSubSteps !== undefined && {
				includeSubSteps: options.includeSubSteps
			}),
			...(options.variable !== undefined && { variable: options.variable })
		};
		return generateQuadraticInequalitySteps(inequality, quadraticOpts);
	}

	// Degree 0 or 1
	const linearOpts: LinearInequalityStepsOptions = {
		level: bumpForLinear(options.level),
		...(options.includeSubSteps !== undefined && {
			includeSubSteps: options.includeSubSteps
		}),
		...(options.variable !== undefined && { variable: options.variable })
	};
	return generateLinearInequalitySteps(inequality, linearOpts);
}

// =============================================================================
// Re-exports — public surface for consumers
// =============================================================================

export {
	generateLinearEquationSteps,
	generateQuadraticEquationSteps,
	generateLinearInequalitySteps,
	generateQuadraticInequalitySteps,
	generateRationalInequalitySteps,
	PedagogicalQuadraticNotImplemented,
	UnsupportedInequalityDegree,
	PedagogicalInequalityError,
	InequalityNotSolvable
};

export { LinearEquationRenderer, formatTransformationLines } from './linear-renderer';
export { QuadraticEquationRenderer } from './quadratic-renderer';

export type {
	EquationOperation,
	EquationStep,
	GenerationStrategy,
	LinearEquationStepsOptions,
	LinearInequalityStepsOptions,
	QuadraticInequalityStepsOptions,
	RationalInequalityStepsOptions,
	LinearSchoolLevel,
	QuadraticEquationStepsOptions,
	QuadraticGenerationStrategy,
	QuadraticSchoolLevel,
	RationalSchoolLevel
} from './types';

export { STRATEGIES, STRATEGIES_QUADRATIC, STRATEGIES_RATIONAL } from './types';

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
import { InequalityNotSolvable } from '../solve/inequality/types';
import type { LinearInequalityStepsOptions } from './types';

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
 * - **No variable detected** (constant inequality `0 < 1`, etc.) → routed
 *   to the linear pipeline, which emits a single `inequality-conclude-truth`
 *   step (this is *not* a `null`-degree non-polynomial — it's a constant
 *   that has trivial truth value).
 * - **Degree 0 or 1** → `generateLinearInequalitySteps`.
 * - **Degree ≥ 2** → throws `UnsupportedInequalityDegree(degree)` (palier 2b
 *   will handle quadratic).
 * - **Non-polynomial in the unknown** (`getPolynomialDegree` returns `null`
 *   despite a variable being present, e.g. `\sin(x) < 0`) → throws
 *   `UnsupportedInequalityDegree(null)`. Use `solveInequality` from
 *   `solve/inequality` for transcendental inputs (no pedagogical steps).
 *
 * @throws PedagogicalInequalityError if `relation === '='`.
 * @throws UnsupportedInequalityDegree on degree ≥ 2 or non-polynomial.
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

	// Constant inequality (no variable) — route directly to linear, which
	// emits the conclude-truth step. We deliberately do NOT throw
	// `UnsupportedInequalityDegree(null)` here: a missing variable means the
	// expression is a constant, which has a trivial truth value. The "null
	// degree" error is reserved for cases where a variable IS present but
	// the expression is not polynomial in it (e.g. `sin(x) < 0`).
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
		// Variable present but expression is non-polynomial.
		throw new UnsupportedInequalityDegree(null);
	}
	if (degree >= 2) {
		throw new UnsupportedInequalityDegree(degree);
	}

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
	LinearSchoolLevel,
	QuadraticEquationStepsOptions,
	QuadraticGenerationStrategy,
	QuadraticSchoolLevel
} from './types';

export { STRATEGIES, STRATEGIES_QUADRATIC } from './types';

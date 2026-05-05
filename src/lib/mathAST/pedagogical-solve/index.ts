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
// Re-exports — public surface for consumers
// =============================================================================

export {
	generateLinearEquationSteps,
	generateQuadraticEquationSteps,
	PedagogicalQuadraticNotImplemented
};

export { LinearEquationRenderer, formatTransformationLines } from './linear-renderer';
export { QuadraticEquationRenderer } from './quadratic-renderer';

export type {
	EquationOperation,
	EquationStep,
	GenerationStrategy,
	LinearEquationStepsOptions,
	LinearSchoolLevel,
	QuadraticEquationStepsOptions,
	QuadraticGenerationStrategy,
	QuadraticSchoolLevel
} from './types';

export { STRATEGIES, STRATEGIES_QUADRATIC } from './types';

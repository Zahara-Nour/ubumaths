/**
 * Equation Solvers Registry
 *
 * Exports all available equation solvers.
 *
 * @module mathAST/solve/solvers
 */

export { linearSolver } from './linear';
export { quadraticSolver } from './quadratic';
export { transcendentalSolver } from './transcendental';
// Future: export { polynomialSolver } from './polynomial';
// Future: export { numericSolver } from './numeric';

import type { EquationSolver } from '../types';
import { linearSolver } from './linear';
import { quadraticSolver } from './quadratic';
import { transcendentalSolver } from './transcendental';

/**
 * All available solvers in order of preference.
 */
export const ALL_SOLVERS: readonly EquationSolver[] = [
	linearSolver,
	quadraticSolver,
	transcendentalSolver
	// Future solvers will be added here
];

/**
 * Get a solver by name.
 */
export function getSolverByName(name: string): EquationSolver | undefined {
	return ALL_SOLVERS.find((s) => s.name === name);
}

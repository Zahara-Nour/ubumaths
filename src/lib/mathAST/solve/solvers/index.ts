/**
 * Equation Solvers Registry
 *
 * Exports all available equation solvers.
 *
 * @module mathAST/solve/solvers
 */

export { linearSolver } from './linear';
// Future: export { quadraticSolver } from './quadratic';
// Future: export { polynomialSolver } from './polynomial';
// Future: export { transcendentalSolver } from './transcendental';
// Future: export { numericSolver } from './numeric';

import type { EquationSolver } from '../types';
import { linearSolver } from './linear';

/**
 * All available solvers in order of preference.
 */
export const ALL_SOLVERS: readonly EquationSolver[] = [
	linearSolver
	// Future solvers will be added here
];

/**
 * Get a solver by name.
 */
export function getSolverByName(name: string): EquationSolver | undefined {
	return ALL_SOLVERS.find((s) => s.name === name);
}

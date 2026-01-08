/**
 * Integration Integrators Registry
 *
 * Central registry of all integrators with priority ordering.
 *
 * @module mathAST/integration/integrators
 */

import type { MathNode } from '../../types';
import type { Integrator } from '../types';
import { basicIntegrator } from './basic';
import { uSubstitutionIntegrator } from './u-substitution';
import { partsIntegrator } from './parts';
import { partialFractionsIntegrator } from './partial-fractions';

// TODO Phase 7+: Add other integrators as they are implemented
// import { trigSubstitutionIntegrator } from './trig-substitution';
// import { numericIntegrator } from './numeric';

// =============================================================================
// Integrator Registry
// =============================================================================

/**
 * All available integrators, sorted by priority (lowest to highest).
 *
 * Priority guidelines:
 * - 0-10: Basic rules (power, trig, exp, etc.)
 * - 11-20: U-substitution
 * - 21-30: Integration by parts
 * - 31-40: Partial fractions
 * - 41-50: Trigonometric substitution
 * - 100+: Numeric fallback
 *
 * Lower priority integrators are tried first (more specific techniques).
 * Higher priority integrators are tried last (more general/fallback).
 */
export const ALL_INTEGRATORS: readonly Integrator[] = [
	basicIntegrator, // priority 0
	uSubstitutionIntegrator, // priority 10
	partsIntegrator, // priority 20
	partialFractionsIntegrator // priority 30
	// TODO Phase 7+: Add other integrators here in priority order
	// trigSubstitutionIntegrator,   // priority 40
	// numericIntegrator             // priority 100
] as const;

// =============================================================================
// Integrator Selection
// =============================================================================

/**
 * Select the first integrator that can handle the given expression.
 *
 * Integrators are tried in order of priority (lowest first).
 * Returns the first integrator whose canIntegrate() returns true.
 *
 * @param expr - The expression to integrate
 * @param variable - The variable of integration
 * @returns The selected integrator, or null if none can handle the expression
 *
 * @example
 * ```typescript
 * const integrator = selectIntegrator(parseLatex('x^2'), 'x');
 * // Returns basicIntegrator (can handle power rule)
 * ```
 */
export function selectIntegrator(expr: MathNode, variable: string): Integrator | null {
	// Sort integrators by priority (ascending - lowest priority first)
	const sorted = [...ALL_INTEGRATORS].sort((a, b) => a.priority - b.priority);

	// Find the first integrator that can handle this expression
	for (const integrator of sorted) {
		if (integrator.canIntegrate(expr, variable)) {
			return integrator;
		}
	}

	// No integrator found
	return null;
}

// =============================================================================
// Exports
// =============================================================================

export { basicIntegrator } from './basic';
export { uSubstitutionIntegrator } from './u-substitution';
export { partsIntegrator } from './parts';
export { partialFractionsIntegrator } from './partial-fractions';

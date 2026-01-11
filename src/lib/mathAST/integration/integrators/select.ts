/**
 * Integrator Selection (Lazy Loading)
 *
 * Provides a selectIntegrator function that avoids circular dependencies
 * by loading integrators lazily using a registry pattern.
 *
 * @module mathAST/integration/integrators/select
 */

import type { MathNode } from '../../types';
import type { Integrator } from '../types';

// =============================================================================
// Integrator Registry
// =============================================================================

/**
 * Global registry for integrators.
 * Integrators register themselves here to avoid circular dependencies.
 */
let integratorsRegistry: readonly Integrator[] | null = null;

/**
 * Register integrators in the global registry.
 * Called by index.ts after all integrators are loaded.
 */
export function registerIntegrators(integrators: readonly Integrator[]): void {
	integratorsRegistry = integrators;
}

/**
 * Get all registered integrators.
 */
function getIntegrators(): readonly Integrator[] {
	if (integratorsRegistry === null) {
		// Fallback: if registry not yet populated, return empty
		// This shouldn't happen in practice if index.ts calls registerIntegrators
		return [];
	}
	return integratorsRegistry;
}

// =============================================================================
// Integrator Selection
// =============================================================================

/**
 * Select the first integrator that can handle the given expression.
 *
 * Integrators are tried in order of priority (lowest first).
 * Returns the first integrator whose canIntegrate() returns true.
 *
 * This function uses a registry to avoid circular dependencies.
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
	const integrators = getIntegrators();

	// Sort integrators by priority (ascending - lowest priority first)
	const sorted = [...integrators].sort((a, b) => a.priority - b.priority);

	// Find the first integrator that can handle this expression
	for (const integrator of sorted) {
		if (integrator.canIntegrate(expr, variable)) {
			return integrator;
		}
	}

	// No integrator found
	return null;
}

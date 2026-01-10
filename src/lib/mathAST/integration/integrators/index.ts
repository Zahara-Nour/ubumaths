/**
 * Integration Integrators Registry
 *
 * Central registry of all integrators with priority ordering.
 *
 * @module mathAST/integration/integrators
 */

import type { Integrator } from '../types';
import { basicIntegrator } from './basic';
import { uSubstitutionIntegrator } from './u-substitution';
import { partsIntegrator } from './parts';
import { partialFractionsIntegrator } from './partial-fractions';
import { trigSubstitutionIntegrator } from './trig-substitution';
import { registerIntegrators } from './select';

// TODO Phase 8: Add numeric integrator
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
	partialFractionsIntegrator, // priority 30
	trigSubstitutionIntegrator // priority 40
	// TODO Phase 8: Add numeric integrator here
	// numericIntegrator             // priority 100
] as const;

// Register integrators in the global registry to avoid circular dependencies
// This must be done after ALL_INTEGRATORS is defined
registerIntegrators(ALL_INTEGRATORS);

// =============================================================================
// Integrator Selection
// =============================================================================

// Re-export selectIntegrator from separate file to avoid circular dependencies
export { selectIntegrator } from './select';

// =============================================================================
// Exports
// =============================================================================

export { basicIntegrator } from './basic';
export { uSubstitutionIntegrator } from './u-substitution';
export { partsIntegrator } from './parts';
export { partialFractionsIntegrator } from './partial-fractions';
export { trigSubstitutionIntegrator } from './trig-substitution';

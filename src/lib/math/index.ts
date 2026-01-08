/**
 * Math Utilities Module
 * =====================
 *
 * Shared mathematical utilities and compute engine integration.
 *
 * @module math
 */

// Compute Engine
export {
	evaluateExpression,
	simplifyExpression,
	areEquivalent,
	isValidLatex,
	evaluateWithModifiers
} from './compute-engine';

// Intervals (re-export for convenience)
export * as intervals from './intervals';

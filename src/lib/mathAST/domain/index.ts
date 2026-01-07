/**
 * Domain System
 *
 * Provides comprehensive domain of definition handling for mathematical expressions:
 * - Domain types (empty, universal, interval, condition)
 * - Domain algebra (intersect, union, complement)
 * - Automatic domain computation for expressions
 * - Validation at evaluation time
 * - French interval notation formatting
 *
 * @module mathAST/domain
 */

// =============================================================================
// Types
// =============================================================================

export type {
	Domain,
	EmptyDomain,
	UniversalDomain,
	IntervalDomain,
	ConditionDomain,
	Interval,
	Endpoint,
	EndpointValue,
	ExcludedPoint,
	Condition,
	ComparisonCondition,
	DomainViolation,
	DomainResult,
	DomainStep
} from './types';

// =============================================================================
// Factory Functions
// =============================================================================

export {
	// Domain factories
	emptyDomain,
	universalDomain,
	intervalDomain,
	conditionDomain,
	// Interval factories
	closedInterval,
	openInterval,
	leftClosedInterval,
	rightClosedInterval,
	// Endpoint factories
	openEndpoint,
	closedEndpoint,
	// Common domain factories
	positiveReals,
	nonNegativeReals,
	nonZeroReals,
	unitInterval,
	// Constraint factories (for building domains)
	greaterThan,
	greaterThanOrEqual,
	lessThan,
	lessThanOrEqual,
	excludedPoint
} from './factory';

// =============================================================================
// Algebra Operations
// =============================================================================

export { isEmpty, containsValue, intersect, union, complement, excludePoints } from './algebra';

// =============================================================================
// Domain Computation
// =============================================================================

export { computeDomain } from './compute';
export type { ComputeDomainOptions } from './compute';

// =============================================================================
// Validation
// =============================================================================

export { isInDomain, getDomainViolations } from './validate';
export type { Bindings } from './validate';

// =============================================================================
// Formatting
// =============================================================================

export { formatDomainInterval, formatDomainCondition, formatDomainFull } from './format';

// =============================================================================
// Built-in Function Domains
// =============================================================================

export { getBuiltinDomain, hasRestrictedDomain, getBuiltinConstraintDescription } from './builtins';

// =============================================================================
// Errors
// =============================================================================

export { DomainError } from './errors';

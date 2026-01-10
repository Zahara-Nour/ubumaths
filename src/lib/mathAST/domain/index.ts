/**
 * Domain System
 *
 * Provides comprehensive domain of definition handling for mathematical expressions:
 * - Domain types (empty, universal, interval set, condition)
 * - Domain algebra (intersect, union, complement, difference)
 * - Automatic domain computation for expressions
 * - Validation at evaluation time
 * - French interval notation formatting
 *
 * Uses the intervals module for interval representation and algebra.
 *
 * @module mathAST/domain
 */

// =============================================================================
// Types
// =============================================================================

export type {
	// Core interval types (from intervals module via types.ts)
	EndpointValue,
	EndpointType,
	Endpoint,
	Interval,
	ExcludedPoint,
	EmptySet,
	UniversalSet,
	IntervalSet,
	CompareOutcome,
	CompareResult,
	// Domain-specific types
	Domain,
	ConditionDomain,
	Condition,
	ComparisonCondition,
	ComparisonOp,
	DomainViolation,
	DomainResult,
	DomainStep,
	// Backward compatibility aliases
	EmptyDomain,
	UniversalDomain,
	IntervalDomain
} from './types';

// =============================================================================
// Factory Functions
// =============================================================================

export {
	// Bound value constructors (from intervals)
	fromNumber,
	rationalBound,
	radicalBound,
	positiveInfinity,
	negativeInfinity,
	pi,
	e,
	sqrt2,
	sqrt3,
	// Endpoint factories
	endpoint,
	openEndpoint,
	closedEndpoint,
	negInfinity,
	posInfinity,
	// Interval factories
	interval,
	openInterval,
	closedInterval,
	leftClosedInterval,
	rightClosedInterval,
	lessThan,
	lessThanOrEqual,
	greaterThan,
	greaterThanOrEqual,
	realLine,
	// Domain constants
	EMPTY_SET,
	UNIVERSAL_SET,
	EMPTY_DOMAIN,
	UNIVERSAL_DOMAIN,
	// Domain factories
	emptySet,
	universalSet,
	emptyDomain,
	universalDomain,
	intervalDomain,
	excludedPoint,
	// Common domain shortcuts
	positiveReals,
	nonNegativeReals,
	nonZeroReals,
	unitInterval,
	// Domain-specific factories (conditions)
	conditionDomain,
	comparison
} from './factory';

// =============================================================================
// Algebra Operations
// =============================================================================

export {
	isEmpty,
	isUniversal,
	containsValue,
	intersect,
	union,
	complement,
	difference,
	excludePoints,
	excludeNumericPoints
} from './algebra';

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

export {
	formatDomainInterval,
	formatDomainCondition,
	formatDomainFull,
	formatEndpointValue
} from './format';

// =============================================================================
// Built-in Function Domains
// =============================================================================

export {
	getBuiltinDomain,
	hasRestrictedDomain,
	getBuiltinConstraintDescription,
	getRestrictedFunctions
} from './builtins';

// =============================================================================
// Errors
// =============================================================================

export { DomainError } from './errors';

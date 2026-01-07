/**
 * MathAST Domain Type System
 *
 * Types for representing mathematical domains: sets of valid input values
 * for functions. Supports interval notation, condition-based constraints,
 * and domain algebra operations.
 */

import type { MathNode } from '../types';

// =============================================================================
// Endpoint Types (for intervals)
// =============================================================================

/**
 * Type of endpoint for an interval bound
 * - 'closed': includes the endpoint (<=, >=)
 * - 'open': excludes the endpoint (<, >)
 */
export type EndpointType = 'open' | 'closed';

/**
 * Special value representing positive or negative infinity
 */
export type Infinity = 'positive_infinity' | 'negative_infinity';

/**
 * An endpoint value can be:
 * - A MathNode (for symbolic bounds like pi, sqrt(2))
 * - A number (for numeric bounds)
 * - Infinity
 */
export type EndpointValue = MathNode | number | Infinity;

/**
 * Represents one end of an interval
 */
export interface Endpoint {
	readonly value: EndpointValue;
	readonly type: EndpointType;
}

// =============================================================================
// Interval Types
// =============================================================================

/**
 * Represents a single continuous interval on the real line.
 *
 * French notation conventions:
 * - ]a, b[ = open interval (a, b) in English notation
 * - [a, b] = closed interval
 * - ]a, b] or [a, b[ = half-open intervals
 *
 * @example
 * // ]0, +infinity[ represents x > 0
 * { lower: { value: 0, type: 'open' },
 *   upper: { value: 'positive_infinity', type: 'open' } }
 *
 * // [-1, 1] represents -1 <= x <= 1
 * { lower: { value: -1, type: 'closed' },
 *   upper: { value: 1, type: 'closed' } }
 */
export interface Interval {
	readonly kind: 'interval';
	readonly lower: Endpoint;
	readonly upper: Endpoint;
}

/**
 * Represents a single excluded point (e.g., x != 0)
 */
export interface ExcludedPoint {
	readonly kind: 'excluded_point';
	readonly value: EndpointValue;
}

// =============================================================================
// Condition Types (Constraint-based representation)
// =============================================================================

/**
 * Comparison operators for domain conditions
 */
export type ComparisonOp = '<' | '<=' | '>' | '>=' | '=' | '!=';

/**
 * A simple comparison condition: variable op expression
 *
 * @example
 * // x > 0
 * { kind: 'comparison', variable: 'x', op: '>', bound: 0 }
 */
export interface ComparisonCondition {
	readonly kind: 'comparison';
	readonly variable: string;
	readonly op: ComparisonOp;
	readonly bound: EndpointValue;
}

/**
 * Union of all condition types
 */
export type Condition = ComparisonCondition;

// =============================================================================
// Domain Types
// =============================================================================

/**
 * The empty domain (no valid values)
 */
export interface EmptyDomain {
	readonly kind: 'empty';
}

/**
 * The universal domain (all real numbers)
 */
export interface UniversalDomain {
	readonly kind: 'universal';
}

/**
 * An interval-based domain (union of intervals with optional excluded points)
 *
 * Represents domains like:
 * - ]0, +infinity[
 * - ]-infinity, 0[ union ]0, +infinity[ (R \ {0})
 * - [-1, 1]
 */
export interface IntervalDomain {
	readonly kind: 'interval_domain';
	readonly intervals: readonly Interval[];
	readonly excludedPoints: readonly ExcludedPoint[];
}

/**
 * A condition-based domain (conjunction or disjunction of conditions)
 *
 * Represents domains like:
 * - x > 0
 * - x >= -1 AND x <= 1
 * - x != 0
 */
export interface ConditionDomain {
	readonly kind: 'condition_domain';
	readonly conditions: readonly Condition[];
	readonly combinator: 'and' | 'or';
}

/**
 * Union of all domain types
 */
export type Domain = EmptyDomain | UniversalDomain | IntervalDomain | ConditionDomain;

// =============================================================================
// Domain Result Types (for domain operations)
// =============================================================================

/**
 * A step in the domain computation (for pedagogical display)
 */
export interface DomainStep {
	readonly expression: string;
	readonly constraint: string;
	readonly explanation: string;
}

/**
 * Result of a domain computation - may include reasons/explanations
 */
export interface DomainResult {
	readonly domain: Domain;
	readonly variable: string;
	readonly steps?: readonly DomainStep[];
}

/**
 * Represents a domain violation found during validation
 */
export interface DomainViolation {
	/** The function or operation that caused the violation */
	readonly source: string;
	/** The parameter name that violated the constraint */
	readonly parameter: string;
	/** Human-readable constraint description */
	readonly constraint: string;
	/** The violating value */
	readonly value: number;
	/** French pedagogical message */
	readonly messageFr: string;
	/** English technical message */
	readonly messageEn: string;
}

/**
 * Domain formatting functions.
 *
 * Delegates to intervals module for IntervalSet formatting.
 * Handles ConditionDomain locally.
 *
 * Formats domains for display using:
 * - French interval notation: ]a, b[
 * - Mathematical symbols: ℝ, ∪, ∞
 * - Symbolic bounds: √2, π, ln(2)
 * - Condition notation: x > 0
 */

import type { Domain, ConditionDomain, PeriodicExclusion } from './types';
import {
	formatInterval as intervalsFormatInterval,
	formatCondition as intervalsFormatCondition,
	formatDomainFull as intervalsFormatFull,
	formatEndpointValue
} from '$lib/math/intervals/format';
import { toCustom } from '../custom-generator';

// =============================================================================
// Re-export from intervals
// =============================================================================

export { formatEndpointValue } from '$lib/math/intervals/format';

// =============================================================================
// Main API
// =============================================================================

/**
 * Format a domain as an interval notation string.
 *
 * Uses French notation: ]a, b[ for open intervals.
 *
 * @example
 * formatInterval(positiveReals()) // → "]0, +∞["
 * formatInterval(unitInterval()) // → "[-1, 1]"
 * formatInterval(nonZeroReals()) // → "ℝ \\ {0}"
 */
export function formatInterval(domain: Domain): string {
	if (domain.kind === 'condition_domain') {
		return formatConditionDomainInterval(domain);
	}
	if (domain.kind === 'periodic_exclusion') {
		return formatPeriodicExclusionInterval(domain);
	}
	return intervalsFormatInterval(domain);
}

/**
 * Format a domain as a condition string.
 *
 * @example
 * formatCondition(positiveReals(), 'x') // → "x > 0"
 * formatCondition(unitInterval(), 'x') // → "-1 ≤ x ≤ 1"
 */
export function formatCondition(domain: Domain, variable: string = 'x'): string {
	if (domain.kind === 'condition_domain') {
		return formatConditionDomainAsCondition(domain, variable);
	}
	if (domain.kind === 'periodic_exclusion') {
		return formatPeriodicExclusionCondition(domain, variable);
	}
	return intervalsFormatCondition(domain, variable);
}

/**
 * Format both interval and condition representations.
 */
export function formatDomainFull(
	domain: Domain,
	variable: string = 'x'
): {
	interval: string;
	condition: string;
} {
	if (domain.kind === 'condition_domain') {
		return {
			interval: formatConditionDomainInterval(domain),
			condition: formatConditionDomainAsCondition(domain, variable)
		};
	}
	if (domain.kind === 'periodic_exclusion') {
		return {
			interval: formatPeriodicExclusionInterval(domain),
			condition: formatPeriodicExclusionCondition(domain, variable)
		};
	}
	return intervalsFormatFull(domain, variable);
}

// =============================================================================
// Deprecated Aliases (backward compatibility)
// =============================================================================

/** @deprecated Use formatInterval instead */
export const formatDomainInterval = formatInterval;

/** @deprecated Use formatCondition instead */
export const formatDomainCondition = formatCondition;

// =============================================================================
// ConditionDomain Formatting (domain-specific)
// =============================================================================

function formatConditionDomainInterval(domain: ConditionDomain): string {
	const conditions = domain.conditions.map((c) => {
		if (c.kind === 'comparison') {
			return `${c.variable} ${formatComparisonOp(c.op)} ${formatEndpointValue(c.bound)}`;
		}
		return '(condition)';
	});

	const separator = domain.combinator === 'and' ? ' ∩ ' : ' ∪ ';
	return `{x : ${conditions.join(separator)}}`;
}

function formatConditionDomainAsCondition(domain: ConditionDomain, _variable: string): string {
	const conditions = domain.conditions.map((c) => {
		if (c.kind === 'comparison') {
			const op = formatComparisonOp(c.op);
			return `${c.variable} ${op} ${formatEndpointValue(c.bound)}`;
		}
		return '(condition)';
	});

	const separator = domain.combinator === 'and' ? ' et ' : ' ou ';
	return conditions.join(separator);
}

function formatComparisonOp(op: string): string {
	switch (op) {
		case '<=':
			return '≤';
		case '>=':
			return '≥';
		case '!=':
			return '≠';
		default:
			return op;
	}
}

// =============================================================================
// PeriodicExclusion Formatting (domain-specific)
// =============================================================================

/**
 * Format a MathNode for display in domain context.
 */
function formatMathNode(node: import('../types').MathNode): string {
	return toCustom(node);
}

/**
 * Format a periodic exclusion as interval notation.
 * Example: "ℝ \ {π/2 + kπ : k ∈ ℤ}"
 */
function formatPeriodicExclusionInterval(pe: PeriodicExclusion): string {
	const baseStr = formatMathNode(pe.basePoint);
	const periodStr = formatMathNode(pe.period);

	// Check if base is 0
	const isZeroBase = pe.basePoint.type === 'number' && pe.basePoint.value === '0';

	if (isZeroBase) {
		// ℝ \ {kπ : k ∈ ℤ}
		return `ℝ \\ {k·${periodStr} : k ∈ ℤ}`;
	}

	// ℝ \ {base + k·period : k ∈ ℤ}
	return `ℝ \\ {${baseStr} + k·${periodStr} : k ∈ ℤ}`;
}

/**
 * Format a periodic exclusion as condition notation.
 * Example: "x ≠ π/2 + kπ, k ∈ ℤ"
 */
function formatPeriodicExclusionCondition(pe: PeriodicExclusion, variable: string): string {
	const baseStr = formatMathNode(pe.basePoint);
	const periodStr = formatMathNode(pe.period);

	// Check if base is 0
	const isZeroBase = pe.basePoint.type === 'number' && pe.basePoint.value === '0';

	if (isZeroBase) {
		// x ≠ kπ, k ∈ ℤ
		return `${variable} ≠ k·${periodStr}, k ∈ ℤ`;
	}

	// x ≠ base + kπ, k ∈ ℤ
	return `${variable} ≠ ${baseStr} + k·${periodStr}, k ∈ ℤ`;
}

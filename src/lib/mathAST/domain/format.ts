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

import type { Domain, ConditionDomain } from './types';
import {
	formatDomainInterval as intervalsFormatInterval,
	formatDomainCondition as intervalsFormatCondition,
	formatDomainFull as intervalsFormatFull,
	formatEndpointValue
} from '$lib/math/intervals/format';

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
 * formatDomainInterval(positiveReals()) // → "]0, +∞["
 * formatDomainInterval(unitInterval()) // → "[-1, 1]"
 * formatDomainInterval(nonZeroReals()) // → "ℝ \\ {0}"
 */
export function formatDomainInterval(domain: Domain): string {
	if (domain.kind === 'condition_domain') {
		return formatConditionDomain(domain);
	}
	return intervalsFormatInterval(domain);
}

/**
 * Format a domain as a condition string.
 *
 * @example
 * formatDomainCondition(positiveReals(), 'x') // → "x > 0"
 * formatDomainCondition(unitInterval(), 'x') // → "-1 ≤ x ≤ 1"
 */
export function formatDomainCondition(domain: Domain, variable: string = 'x'): string {
	if (domain.kind === 'condition_domain') {
		return formatConditionDomainAsCondition(domain, variable);
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
			interval: formatConditionDomain(domain),
			condition: formatConditionDomainAsCondition(domain, variable)
		};
	}
	return intervalsFormatFull(domain, variable);
}

// =============================================================================
// ConditionDomain Formatting (domain-specific)
// =============================================================================

function formatConditionDomain(domain: ConditionDomain): string {
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

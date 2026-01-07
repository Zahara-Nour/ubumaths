/**
 * Domain formatting functions.
 *
 * Formats domains for display using:
 * - French interval notation: ]a, b[
 * - Mathematical symbols: ℝ, ∪, ∞
 * - Condition notation: x > 0
 */

import type { Domain, Interval, EndpointValue, IntervalDomain, ConditionDomain } from './types';

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
	switch (domain.kind) {
		case 'empty':
			return '∅';
		case 'universal':
			return 'ℝ';
		case 'interval_domain':
			return formatIntervalDomain(domain);
		case 'condition_domain':
			return formatConditionDomain(domain);
	}
}

/**
 * Format a domain as a condition string.
 *
 * @example
 * formatDomainCondition(positiveReals(), 'x') // → "x > 0"
 * formatDomainCondition(unitInterval(), 'x') // → "-1 ≤ x ≤ 1"
 */
export function formatDomainCondition(domain: Domain, variable: string = 'x'): string {
	switch (domain.kind) {
		case 'empty':
			return 'aucune valeur';
		case 'universal':
			return `${variable} ∈ ℝ`;
		case 'interval_domain':
			return formatIntervalDomainAsCondition(domain, variable);
		case 'condition_domain':
			return formatConditionDomainAsCondition(domain, variable);
	}
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
	return {
		interval: formatDomainInterval(domain),
		condition: formatDomainCondition(domain, variable)
	};
}

// =============================================================================
// Interval Formatting
// =============================================================================

function formatIntervalDomain(domain: IntervalDomain): string {
	if (domain.intervals.length === 0) {
		return '∅';
	}

	const intervalStrs = domain.intervals.map(formatInterval);

	// Check for full real line
	if (intervalStrs.length === 1 && intervalStrs[0] === ']-∞, +∞[') {
		if (domain.excludedPoints.length === 0) {
			return 'ℝ';
		}
		return `ℝ \\ {${domain.excludedPoints.map((p) => formatEndpointValue(p.value)).join(', ')}}`;
	}

	let result = intervalStrs.join(' ∪ ');

	// Add excluded points if any
	if (domain.excludedPoints.length > 0) {
		const excludedStr = domain.excludedPoints.map((p) => formatEndpointValue(p.value)).join(', ');
		result += ` \\ {${excludedStr}}`;
	}

	return result;
}

function formatInterval(interval: Interval): string {
	const leftBracket = interval.lower.type === 'closed' ? '[' : ']';
	const rightBracket = interval.upper.type === 'closed' ? ']' : '[';
	const lower = formatEndpointValue(interval.lower.value);
	const upper = formatEndpointValue(interval.upper.value);

	return `${leftBracket}${lower}, ${upper}${rightBracket}`;
}

function formatEndpointValue(value: EndpointValue): string {
	if (value === 'negative_infinity') return '-∞';
	if (value === 'positive_infinity') return '+∞';
	if (typeof value === 'number') {
		// Format nicely: avoid -0, show integers without decimals
		if (Object.is(value, -0)) return '0';
		if (Number.isInteger(value)) return String(value);
		return value.toFixed(4).replace(/\.?0+$/, '');
	}
	// MathNode - would need toCustom, for now just indicate symbolic
	return '(expr)';
}

// =============================================================================
// Condition Formatting
// =============================================================================

function formatIntervalDomainAsCondition(domain: IntervalDomain, variable: string): string {
	if (domain.intervals.length === 0) {
		return 'aucune valeur';
	}

	const conditions: string[] = [];

	for (const interval of domain.intervals) {
		const cond = formatIntervalAsCondition(interval, variable);
		if (cond) conditions.push(cond);
	}

	// Handle excluded points
	if (domain.excludedPoints.length > 0) {
		for (const ep of domain.excludedPoints) {
			conditions.push(`${variable} ≠ ${formatEndpointValue(ep.value)}`);
		}
	}

	if (conditions.length === 0) {
		return `${variable} ∈ ℝ`;
	}

	// Join with "et" (and) or "ou" (or) depending on structure
	if (domain.intervals.length > 1) {
		// Multiple disjoint intervals: use "ou"
		const intervalConds = domain.intervals.map((i) => formatIntervalAsCondition(i, variable));
		const excludedConds = domain.excludedPoints.map(
			(ep) => `${variable} ≠ ${formatEndpointValue(ep.value)}`
		);
		const allConds = [...intervalConds.filter(Boolean), ...excludedConds];
		return allConds.join(' ou ');
	}

	return conditions.join(' et ');
}

function formatIntervalAsCondition(interval: Interval, variable: string): string {
	const lower = interval.lower;
	const upper = interval.upper;

	const isLowerInf = lower.value === 'negative_infinity';
	const isUpperInf = upper.value === 'positive_infinity';

	if (isLowerInf && isUpperInf) {
		return `${variable} ∈ ℝ`;
	}

	if (isLowerInf) {
		const op = upper.type === 'closed' ? '≤' : '<';
		return `${variable} ${op} ${formatEndpointValue(upper.value)}`;
	}

	if (isUpperInf) {
		const op = lower.type === 'closed' ? '≥' : '>';
		return `${variable} ${op} ${formatEndpointValue(lower.value)}`;
	}

	// Bounded interval
	const lowerVal = formatEndpointValue(lower.value);
	const upperVal = formatEndpointValue(upper.value);
	const lowerOp = lower.type === 'closed' ? '≤' : '<';
	const upperOp = upper.type === 'closed' ? '≤' : '<';

	return `${lowerVal} ${lowerOp} ${variable} ${upperOp} ${upperVal}`;
}

function formatConditionDomain(domain: ConditionDomain): string {
	// Convert conditions back to interval notation if possible
	// For now, just indicate it's a condition-based domain
	const conditions = domain.conditions.map((c) => {
		if (c.kind === 'comparison') {
			return `${c.variable} ${c.op} ${formatEndpointValue(c.bound)}`;
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

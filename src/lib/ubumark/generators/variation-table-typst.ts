/**
 * Variation Table Typst Generator - Convert variation tables to vartable
 * =======================================================================
 *
 * Generates Typst code using the vartable package for sign and variation tables.
 *
 * Features:
 * - Sign rows with markers (zero, asymptote, forbidden, discontinuity)
 * - Variation rows with positions and limits
 * - Math expressions converted from LaTeX to Typst
 * - Error comments for invalid input
 *
 * @module ubumark/generators/variation-table-typst
 */

import type {
	VariationTableNode,
	SignRow,
	VariationRow,
	VariationValue,
	DomainPoint
} from '../types/variation-table';
import { convertLatexToTypstMath } from './typst-generator';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface VariationTableTypstOptions {
	/** Extra styling or configuration (reserved for future use) */
	extraOptions?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format an array of elements as a Typst tuple
 *
 * In Typst, single-element tuples require a trailing comma: (x,)
 * Without it, (x) is just parentheses around a value, not a tuple.
 *
 * @param elements - Array of stringified elements
 * @returns Properly formatted Typst tuple
 *
 * @example
 * formatTypstTuple(['$-$'])  // Returns "($-$,)"
 * formatTypstTuple(['$+$', '$-$'])  // Returns "($+$, $-$)"
 */
function formatTypstTuple(elements: string[]): string {
	if (elements.length === 0) {
		return '()';
	}
	if (elements.length === 1) {
		return `(${elements[0]},)`; // Trailing comma for single element
	}
	return `(${elements.join(', ')})`;
}

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

/**
 * Generate Typst code for a variation table using vartable package
 *
 * @param node - Variation table AST node
 * @param options - Generator options
 * @returns Typst code string
 *
 * @example
 * ```typescript
 * const typst = generateVariationTableTypst(variationNode);
 * // Returns:
 * // #import "@preview/vartable:0.2.3": tabvar
 * //
 * // #tabvar(
 * //   variable: $x$,
 * //   domain: ($-infinity$, $-1$, $0$, $1$, $+infinity$),
 * //   label: ($f'(x)$, $f(x)$),
 * //   contents: (
 * //     ($+$, "z", $-$, "z", $+$, "z", $-$),
 * //     ((bottom, $-infinity$), (top, $3$), (bottom, $0$), (top, $2$), (bottom, $-infinity$))
 * //   )
 * // )
 * ```
 */
export function generateVariationTableTypst(
	node: VariationTableNode,
	_options: VariationTableTypstOptions = {}
): string {
	// Validate input
	if (node.rows.length === 0) {
		return '// Error: Variation table has no rows';
	}

	if (node.domain.length === 0) {
		return '// Error: Variation table has no domain points';
	}

	try {
		const importStatement = '#import "@preview/vartable:0.2.3": tabvar\n\n';
		const variable = formatVariable(node.variable);
		const domain = generateDomain(node.domain);
		const labels = generateLabels(node.rows);
		const content = generateContent(node);

		return `${importStatement}#tabvar(
  variable: ${variable},
  domain: ${domain},
  label: ${labels},
  contents: (
${content}
  )
)`;
	} catch (error) {
		return `// Error: ${error instanceof Error ? error.message : 'Failed to generate variation table'}`;
	}
}

// ============================================================================
// VARIABLE FORMATTING
// ============================================================================

/**
 * Format variable for Typst
 *
 * @param variable - Variable name
 * @returns Formatted variable wrapped in $...$
 */
function formatVariable(variable: string): string {
	const converted = convertLatexToTypstMath(variable);
	return `$${converted}$`;
}

// ============================================================================
// DOMAIN GENERATION
// ============================================================================

/**
 * Generate the domain array for tabvar
 *
 * Format: ($point1$, $point2$, ...)
 *
 * @param domain - Array of domain points
 * @returns Domain tuple string
 *
 * @example
 * "($-infinity$, $0$, $2$, $+infinity$)"
 */
function generateDomain(domain: DomainPoint[]): string {
	const points = domain.map((point) => {
		const expr = formatMathExpression(point.expression);
		// Note: vartable doesn't have built-in open bound notation like LaTeX ]a[
		// Open bounds would need to be handled via styling if supported
		return `$${expr}$`;
	});

	return formatTypstTuple(points);
}

/**
 * Format a math expression for Typst
 *
 * Converts LaTeX expressions to Typst math syntax
 *
 * @param expr - Math expression (may be LaTeX)
 * @returns Typst math expression
 */
function formatMathExpression(expr: string): string {
	// Handle infinity special cases
	if (expr === '-inf' || expr === '-∞') {
		return '-infinity';
	}
	if (expr === '+inf' || expr === 'inf' || expr === '∞') {
		return '+infinity';
	}

	// Convert LaTeX to Typst
	return convertLatexToTypstMath(expr);
}

// ============================================================================
// LABELS GENERATION
// ============================================================================

/**
 * Generate labels array for tabvar
 *
 * Format: (([label1], "s"), ([label2], "v"), ...)
 * where "s" is for sign rows and "v" is for variation rows
 * Labels use content blocks [...] with embedded math
 *
 * @param rows - Table rows
 * @returns Labels tuple string
 *
 * @example
 * "([$f'(x)$], \"s\"), ([$f(x)$], \"v\"))"
 */
function generateLabels(rows: (SignRow | VariationRow)[]): string {
	const labels = rows.map((row) => {
		const converted = convertLatexToTypstMath(row.label);
		const rowType = row.type === 'sign' ? 's' : 'v';
		// Use content blocks [...] for labels, with embedded math
		// vartable 0.2.3 format: ([label], "type") - no height parameter
		return `([$${converted}$], "${rowType}")`;
	});

	return formatTypstTuple(labels);
}

// ============================================================================
// CONTENT GENERATION
// ============================================================================

/**
 * Generate content array for tabvar
 *
 * Each row becomes a tuple in the content array
 *
 * @param node - Variation table node
 * @returns Content rows indented and formatted
 */
function generateContent(node: VariationTableNode): string {
	const lines: string[] = [];

	for (let i = 0; i < node.rows.length; i++) {
		const row = node.rows[i];
		const isLast = i === node.rows.length - 1;

		if (row.type === 'sign') {
			const line = generateSignRow(row, node.domain);
			lines.push(`    ${line}${isLast ? '' : ','}`);
		} else {
			const line = generateVariationRow(row, node.domain);
			lines.push(`    ${line}${isLast ? '' : ','}`);
		}
	}

	return lines.join('\n');
}

// ============================================================================
// SIGN ROW GENERATION
// ============================================================================

/**
 * Generate a sign row for vartable
 *
 * Vartable uses interval-based format: n-1 elements for n domain points.
 * Each element represents an interval.
 * If there's a marker at the START of an interval, it's combined as a tuple.
 *
 * Format: ($+$, ("z", $-$), ...) or ($+$, $-$, ...)
 *
 * @param row - Sign row
 * @param domain - Domain points
 * @returns Sign row tuple with n-1 elements
 *
 * @example
 * Domain: [-inf, 0, +inf] with sign +, zero at 0, sign -
 * Output: "($+$, (\"z\", $-$))"
 */
function generateSignRow(row: SignRow, domain: DomainPoint[]): string {
	const values: string[] = [];

	// n-1 elements for n domain points (interval-based)
	for (let i = 0; i < domain.length - 1; i++) {
		const startPoint = domain[i].expression;
		const endPoint = domain[i + 1].expression;

		// Get the sign for this interval
		const intervalKey = `${startPoint},${endPoint}`;
		const intervalValue = row.values.get(intervalKey);

		// Get marker at the START of this interval (if any, except for first interval)
		let marker: string | null = null;
		if (i > 0) {
			const markerValue = row.values.get(startPoint);
			if (markerValue && markerValue.type === 'marker') {
				marker = convertSignMarkerToTypst(markerValue.marker);
			}
		}

		// Format the element
		let signStr = '""';
		if (intervalValue) {
			if (intervalValue.type === 'sign') {
				signStr = `$${intervalValue.value}$`;
			} else {
				// Interval itself is a marker (e.g., hatched region)
				signStr = convertSignMarkerToTypst(intervalValue.marker);
			}
		}

		if (marker) {
			// Combine marker with sign as tuple: (marker, sign)
			values.push(`(${marker}, ${signStr})`);
		} else {
			values.push(signStr);
		}
	}

	// Check for trailing marker at the LAST domain point (separate element)
	// vartable handles "||" at the end by drawing a bar at the boundary
	const lastPoint = domain[domain.length - 1].expression;
	const trailingValue = row.values.get(lastPoint);
	if (trailingValue && trailingValue.type === 'marker') {
		values.push(convertSignMarkerToTypst(trailingValue.marker));
	}

	return formatTypstTuple(values);
}

/**
 * Convert a sign marker to Typst representation
 *
 * @param marker - Marker type
 * @returns Typst string for the marker
 */
function convertSignMarkerToTypst(marker: string): string {
	switch (marker) {
		case 'zero':
			return '"z"';
		case 'asymptote':
			return '"||"';
		case 'forbidden':
			return '"||"'; // Use same as asymptote - vartable may support hatching
		case 'discontinuity':
			return '"||"'; // Use asymptote notation for discontinuity
		default:
			return '""';
	}
}

// ============================================================================
// VARIATION ROW GENERATION
// ============================================================================

/**
 * Generate a variation row for vartable
 *
 * Vartable uses a point-based model where each element describes
 * the value at that domain point (n elements for n domain points).
 *
 * Each point element is a tuple:
 * - Normal: (position, $value$)
 * - Asymptote with limits: (leftPos, rightPos, "||", $leftValue$, $rightValue$)
 *
 * @param row - Variation row
 * @param domain - Domain points
 * @returns Variation row tuple with n elements
 *
 * @example
 * // Domain: (-inf, 0, +inf) with values: -inf->bottom, 0->top, +inf->bottom
 * // Generates: ((bottom, $-infinity$), (top, $0$), (bottom, $-infinity$))
 */
function generateVariationRow(row: VariationRow, domain: DomainPoint[]): string {
	const elements: string[] = [];

	// Generate one element per domain point (n elements for n domain points)
	for (let i = 0; i < domain.length; i++) {
		const point = domain[i].expression;
		const value = row.values.get(point);

		// Format the element for this domain point
		const formatted = formatPointVariation(value);
		elements.push(formatted);
	}

	return formatTypstTuple(elements);
}

/**
 * Format a variation point for vartable
 *
 * vartable 0.2.3 format:
 * - (top, $value$) for maximum
 * - (bottom, $value$) for minimum
 * - () for intermediate points (no value displayed)
 * - "||" for asymptotes
 *
 * @param value - Value at the domain point
 * @returns Formatted point tuple
 */
function formatPointVariation(value: VariationValue | undefined): string {
	// Handle missing values - empty tuple for intermediate points
	if (!value) {
		return '()';
	}

	// Handle asymptote
	if (value.marker === 'asymptote') {
		// For asymptote with two limits: (leftPos, rightPos, "||", leftValue, rightValue)
		if (value.limits) {
			const [leftLimit, rightLimit] = value.limits;
			const leftExpr = formatMathExpression(leftLimit.expression);
			const rightExpr = formatMathExpression(rightLimit.expression);
			const leftPos = convertPositionForVartable(leftLimit.position);
			const rightPos = convertPositionForVartable(rightLimit.position);
			return `(${leftPos}, ${rightPos}, "||", $${leftExpr}$, $${rightExpr}$)`;
		}
		// For single-limit asymptote (left side): show limit then asymptote bar
		if (value.limitSide === 'left') {
			const limitExpr = formatMathExpression(value.expression);
			const limitPos = convertPositionForVartable(value.position);
			return `(${limitPos}, "||", $${limitExpr}$)`;
		}
		// For single-limit asymptote (right side): asymptote bar then limit
		if (value.limitSide === 'right') {
			const limitExpr = formatMathExpression(value.expression);
			const limitPos = convertPositionForVartable(value.position);
			return `("||", ${limitPos}, $${limitExpr}$)`;
		}
		// For asymptote without explicit limits: just the marker
		return '"||"';
	}

	// Normal value: (position, $value$)
	const expr = formatMathExpression(value.expression);
	const pos = convertPositionForVartable(value.position);
	return `(${pos}, $${expr}$)`;
}

/**
 * Convert position to vartable format
 *
 * vartable supports 'top', 'bottom', and 'center' positions.
 *
 * @param position - Position from AST
 * @returns Position string for vartable (top, bottom, or center)
 */
function convertPositionForVartable(position: string | undefined): string {
	switch (position) {
		case 'top':
		case 'limit-top':
			return 'top';
		case 'bottom':
		case 'limit-bottom':
			return 'bottom';
		case 'center':
		default:
			// Default to center for intermediate values
			return 'center';
	}
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { VariationTableTypstOptions };

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
 * //   content: (
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
  content: (
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

	return `(${points.join(', ')})`;
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
 * Format: ($label1$, $label2$, ...)
 *
 * @param rows - Table rows
 * @returns Labels tuple string
 *
 * @example
 * "($f'(x)$, $f(x)$)"
 */
function generateLabels(rows: (SignRow | VariationRow)[]): string {
	const labels = rows.map((row) => {
		const converted = convertLatexToTypstMath(row.label);
		return `$${converted}$`;
	});

	return `(${labels.join(', ')})`;
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
 * Format: ($+$, "z", $-$, ...)
 * Values: $+$, $-$, "z" (zero), "||" (asymptote)
 *
 * @param row - Sign row
 * @param domain - Domain points
 * @returns Sign row tuple
 *
 * @example
 * Domain: [-inf, 0, +inf]
 * Values: {-inf,0: +, 0: z, 0,+inf: -}
 * Output: "($+$, \"z\", $-$)"
 */
function generateSignRow(row: SignRow, domain: DomainPoint[]): string {
	const values: string[] = [];

	// Generate values alternating: [interval0-1, point1, interval1-2, point2, ...]
	// For each intermediate point, add interval BEFORE then point marker
	for (let i = 0; i < domain.length - 1; i++) {
		const point = domain[i].expression;
		const nextPoint = domain[i + 1].expression;

		// Add interval [i, i+1]
		const intervalKey = `${point},${nextPoint}`;
		const intervalValue = row.values.get(intervalKey);

		if (intervalValue) {
			if (intervalValue.type === 'sign') {
				values.push(`$${intervalValue.value}$`);
			} else {
				values.push(convertSignMarkerToTypst(intervalValue.marker));
			}
		} else {
			// Empty interval - use empty string for spacing
			values.push('""');
		}

		// Add point marker for nextPoint (if it's an intermediate point, not last)
		if (i < domain.length - 2) {
			const pointValue = row.values.get(nextPoint);
			if (pointValue && pointValue.type === 'marker') {
				values.push(convertSignMarkerToTypst(pointValue.marker));
			}
		}
	}

	return `(${values.join(', ')})`;
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
 * Format: ((position, $value$), (position, $value$), ...)
 * Positions: top, bottom, middle (default)
 *
 * @param row - Variation row
 * @param domain - Domain points
 * @returns Variation row tuple
 *
 * @example
 * "((bottom, $-infinity$), (top, $3$), (bottom, $0$), (top, $2$))"
 */
function generateVariationRow(row: VariationRow, domain: DomainPoint[]): string {
	const values: string[] = [];

	for (const point of domain) {
		const value = row.values.get(point.expression);

		if (!value) {
			continue;
		}

		// Format the variation value with position
		const formatted = formatVariationValue(value);
		values.push(formatted);
	}

	return `(${values.join(', ')})`;
}

/**
 * Format a variation value for Typst
 *
 * Returns either:
 * - (position, $value$) for positioned values
 * - $value$ for middle/default position
 * - "||" for asymptotes without limits
 *
 * @param value - Variation value
 * @returns Formatted Typst string
 */
function formatVariationValue(value: VariationValue): string {
	// Handle asymptotes
	if (value.marker === 'asymptote') {
		// vartable uses || for asymptotes
		// Limits are handled implicitly by surrounding values
		return '"||"';
	}

	// Format the expression
	const expr = formatMathExpression(value.expression);
	const mathValue = `$${expr}$`;

	// Determine position
	const position = convertPosition(value.position);

	// If middle position, return value only (default)
	if (position === '') {
		return mathValue;
	}

	// Return positioned value
	return `(${position}, ${mathValue})`;
}

/**
 * Convert position to vartable format
 *
 * @param position - Position from AST
 * @returns Position string for vartable (top, bottom, or empty for middle)
 */
function convertPosition(position: string): string {
	switch (position) {
		case 'top':
		case 'limit-top':
			return 'top';
		case 'bottom':
		case 'limit-bottom':
			return 'bottom';
		case 'center':
		default:
			return ''; // Default/middle position
	}
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { VariationTableTypstOptions };

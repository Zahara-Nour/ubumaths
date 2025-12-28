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
 * Format: (($label1$, "s"), ($label2$, "v"), ...)
 * where "s" is for sign rows and "v" is for variation rows
 *
 * @param rows - Table rows
 * @returns Labels tuple string
 *
 * @example
 * "(($f'(x)$, \"s\"), ($f(x)$, \"v\"))"
 */
function generateLabels(rows: (SignRow | VariationRow)[]): string {
	const labels = rows.map((row) => {
		const converted = convertLatexToTypstMath(row.label);
		const rowType = row.type === 'sign' ? 's' : 'v';
		return `($${converted}$, "${rowType}")`;
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
 * Vartable uses an interval-based model where each element describes
 * what happens in that interval (n-1 elements for n domain points).
 *
 * Each interval element is a tuple: (startPos, endPos, startValue, endValue)
 * For asymptotes: (startPos, endPos, "||", startValue, endValue)
 *
 * @param row - Variation row
 * @param domain - Domain points
 * @returns Variation row tuple with n-1 elements
 *
 * @example
 * // Domain: (-inf, 0, +inf) with values: -inf->top, 0->center, +inf->bottom
 * // Generates: ((top, center, $-infinity$, $0$), (center, bottom, $0$, $-infinity$))
 */
function generateVariationRow(row: VariationRow, domain: DomainPoint[]): string {
	const intervals: string[] = [];

	// Generate one element per interval (n-1 elements for n domain points)
	for (let i = 0; i < domain.length - 1; i++) {
		const startPoint = domain[i].expression;
		const endPoint = domain[i + 1].expression;

		const startValue = row.values.get(startPoint);
		const endValue = row.values.get(endPoint);

		// Format the interval element
		const formatted = formatIntervalVariation(startValue, endValue);
		intervals.push(formatted);
	}

	return `(${intervals.join(', ')})`;
}

/**
 * Format a variation interval for vartable
 *
 * @param startValue - Value at interval start
 * @param endValue - Value at interval end
 * @returns Formatted interval tuple
 */
function formatIntervalVariation(
	startValue: VariationValue | undefined,
	endValue: VariationValue | undefined
): string {
	// Handle missing values
	if (!startValue && !endValue) {
		return '()';
	}

	// Get positions and expressions
	const startPos = startValue ? convertPosition(startValue.position) || 'center' : 'center';
	const endPos = endValue ? convertPosition(endValue.position) || 'center' : 'center';
	const startExpr = startValue ? formatMathExpression(startValue.expression) : '';
	const endExpr = endValue ? formatMathExpression(endValue.expression) : '';

	// Handle asymptote at end
	if (endValue?.marker === 'asymptote') {
		// For asymptote with two limits
		if (endValue.limits) {
			const [leftLimit, rightLimit] = endValue.limits;
			const leftExpr = formatMathExpression(leftLimit.expression);
			const rightExpr = formatMathExpression(rightLimit.expression);
			const leftPos = convertPosition(leftLimit.position) || 'center';
			const rightPos = convertPosition(rightLimit.position) || 'center';
			return `(${startPos}, ${leftPos}, "||", $${startExpr}$, $${leftExpr}$, ${rightPos}, $${rightExpr}$)`;
		}
		// For single-limit asymptote (left side)
		if (endValue.limitSide === 'left') {
			const limitExpr = formatMathExpression(endValue.expression);
			const limitPos = convertPosition(endValue.position) || 'center';
			return `(${startPos}, ${limitPos}, "||", $${startExpr}$, $${limitExpr}$)`;
		}
		// For asymptote without limits
		return `(${startPos}, center, "||", $${startExpr}$, ())`;
	}

	// Handle asymptote at start
	if (startValue?.marker === 'asymptote') {
		// For single-limit asymptote (right side)
		if (startValue.limitSide === 'right') {
			const limitExpr = formatMathExpression(startValue.expression);
			const limitPos = convertPosition(startValue.position) || 'center';
			return `(${limitPos}, ${endPos}, "||", $${limitExpr}$, $${endExpr}$)`;
		}
		// For asymptote with two limits
		if (startValue.limits) {
			const [_leftLimit, rightLimit] = startValue.limits;
			const rightExpr = formatMathExpression(rightLimit.expression);
			const rightPos = convertPosition(rightLimit.position) || 'center';
			return `(${rightPos}, ${endPos}, "||", $${rightExpr}$, $${endExpr}$)`;
		}
		// For asymptote without limits
		return `(center, ${endPos}, "||", (), $${endExpr}$)`;
	}

	// Normal interval (no asymptotes)
	return `(${startPos}, ${endPos}, $${startExpr}$, $${endExpr}$)`;
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

/**
 * Variation Table LaTeX Generator - Convert variation tables to tkz-tab LaTeX
 * ===========================================================================
 *
 * Generates LaTeX code using the tkz-tab package for sign and variation tables.
 *
 * Features:
 * - Sign rows with markers (zero, asymptote, forbidden, discontinuity)
 * - Variation rows with positions and limits
 * - Open/closed domain bounds
 * - Math expressions in values
 * - Error comments for invalid input
 *
 * @module ubumark/generators/variation-table-latex
 */

import type {
	VariationTableNode,
	SignRow,
	VariationRow,
	VariationValue,
	DomainPoint
} from '../types/variation-table';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface VariationTableLatexOptions {
	/** Line height for tkz-tab (lgt parameter) */
	lineHeight?: number;
	/** Column spacing for tkz-tab (espcl parameter) */
	columnSpacing?: number;
}

const DEFAULT_OPTIONS: Required<VariationTableLatexOptions> = {
	lineHeight: 3,
	columnSpacing: 1.5
};

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

/**
 * Generate LaTeX code for a variation table using tkz-tab package
 *
 * @param node - Variation table AST node
 * @param options - Generator options
 * @returns LaTeX code string
 *
 * @example
 * ```typescript
 * const latex = generateVariationTableLatex(variationNode);
 * // Returns:
 * // \begin{tikzpicture}
 * // \tkzTabInit[lgt=3,espcl=1.5]{$x$/1,$f'(x)$/1,$f(x)$/2}{$-\infty$,$-1$,$0$,$1$,$+\infty$}
 * // \tkzTabLine{,+,z,-,z,+,z,-}
 * // \tkzTabVar{-/$-\infty$,+/$3$,-/$0$,+/$2$,-/$-\infty$}
 * // \end{tikzpicture}
 * ```
 */
export function generateVariationTableLatex(
	node: VariationTableNode,
	options: VariationTableLatexOptions = {}
): string {
	const opts = { ...DEFAULT_OPTIONS, ...options };

	// Validate input
	if (node.rows.length === 0) {
		return '% Error: Variation table has no rows';
	}

	if (node.domain.length === 0) {
		return '% Error: Variation table has no domain points';
	}

	try {
		const header = generateHeader(node, opts);
		const domain = generateDomain(node.domain);
		const lines = generateLines(node);

		return `\\begin{tikzpicture}
\\tkzTabInit[lgt=${opts.lineHeight},espcl=${opts.columnSpacing}]{${header}}{${domain}}
${lines}
\\end{tikzpicture}`;
	} catch (error) {
		return `% Error: ${error instanceof Error ? error.message : 'Failed to generate variation table'}`;
	}
}

// ============================================================================
// HEADER GENERATION
// ============================================================================

/**
 * Generate the header for tkzTabInit
 *
 * Format: $variable$/height,$label1$/height,...
 *
 * @param node - Variation table node
 * @param _options - Generator options (unused, kept for consistency)
 * @returns Header string
 *
 * @example
 * "$x$/1,$f'(x)$/1,$f(x)$/2"
 */
function generateHeader(
	node: VariationTableNode,
	_options: Required<VariationTableLatexOptions>
): string {
	const parts: string[] = [];

	// Variable name (always height 1)
	parts.push(`$${escapeLatexMath(node.variable)}$/1`);

	// Row labels with heights
	for (const row of node.rows) {
		const label = escapeLabelForLatex(row.label);
		// Sign rows get height 1, variation rows get height 2
		const height = row.type === 'sign' ? 1 : 2;
		parts.push(`${label}/${height}`);
	}

	return parts.join(',');
}

/**
 * Escape a label for LaTeX
 *
 * Wraps in $ if it contains math, otherwise escapes special characters
 *
 * @param label - Label to escape
 * @returns Escaped label
 */
function escapeLabelForLatex(label: string): string {
	// If already has $ signs, assume it's math and preserve
	if (label.includes('$')) {
		return label;
	}

	// Common patterns that indicate math
	const mathPatterns = [
		/[a-z]'/, // Derivatives like f'(x)
		/\\[a-z]+/, // LaTeX commands
		/[a-z]\([a-z]\)/, // Functions like f(x)
		/\^/, // Exponents
		/_/ // Subscripts
	];

	const isMath = mathPatterns.some((pattern) => pattern.test(label));

	if (isMath) {
		return `$${label}$`;
	}

	// Escape special LaTeX characters
	return escapeLatexText(label);
}

/**
 * Escape special LaTeX characters in text
 *
 * @param text - Text to escape
 * @returns Escaped text
 */
function escapeLatexText(text: string): string {
	const replacements: Record<string, string> = {
		'\\': '\\textbackslash{}',
		'&': '\\&',
		'%': '\\%',
		$: '\\$',
		'#': '\\#',
		_: '\\_',
		'{': '\\{',
		'}': '\\}',
		'~': '\\textasciitilde{}',
		'^': '\\textasciicircum{}'
	};

	return text.replace(/[\\&%$#_{}~^]/g, (match) => replacements[match] || match);
}

/**
 * Escape math expressions for LaTeX
 *
 * Preserves LaTeX commands and common math symbols
 *
 * @param expr - Math expression
 * @returns Expression safe for use in LaTeX math mode
 */
function escapeLatexMath(expr: string): string {
	// Preserve LaTeX commands (\frac, \sqrt, etc.)
	// No escaping needed inside math mode
	return expr;
}

// ============================================================================
// DOMAIN GENERATION
// ============================================================================

/**
 * Generate the domain specification for tkzTabInit
 *
 * Format: $point1$,$point2$,...
 * Uses inverted brackets for open bounds: ]a or b[
 *
 * @param domain - Array of domain points
 * @returns Domain string
 *
 * @example
 * "$-\\infty$,$]0$,$2[$,$+\\infty$"
 */
function generateDomain(domain: DomainPoint[]): string {
	return domain
		.map((point, index) => {
			let expr = formatMathExpression(point.expression);

			// Apply open bound brackets
			if (point.open) {
				// First point: ]expr
				if (index === 0) {
					expr = `]${expr}`;
				}
				// Last point: expr[
				else if (index === domain.length - 1) {
					expr = `${expr}[`;
				}
				// Middle points are open on both sides: ]expr[
				else {
					expr = `]${expr}[`;
				}
			}

			return `$${expr}$`;
		})
		.join(',');
}

/**
 * Format a math expression for LaTeX
 *
 * Handles special cases like infinity
 *
 * @param expr - Math expression
 * @returns Formatted expression
 */
function formatMathExpression(expr: string): string {
	// Handle infinity
	if (expr === '-inf' || expr === '-∞') {
		return '-\\infty';
	}
	if (expr === '+inf' || expr === 'inf' || expr === '∞') {
		return '+\\infty';
	}

	// Preserve LaTeX commands and return as-is
	return escapeLatexMath(expr);
}

// ============================================================================
// LINES GENERATION
// ============================================================================

/**
 * Generate all line commands (tkzTabLine and tkzTabVar)
 *
 * @param node - Variation table node
 * @returns Line commands joined with newlines
 */
function generateLines(node: VariationTableNode): string {
	const lines: string[] = [];

	for (const row of node.rows) {
		if (row.type === 'sign') {
			lines.push(generateSignLine(row, node.domain));
		} else {
			lines.push(generateVariationLine(row, node.domain));
		}
	}

	return lines.join('\n');
}

// ============================================================================
// SIGN LINE GENERATION
// ============================================================================

/**
 * Generate a sign line (tkzTabLine)
 *
 * Format: \tkzTabLine{,val1,val2,...}
 * Values: +, -, z (zero), || (asymptote), h (forbidden), t (discontinuity)
 *
 * @param row - Sign row
 * @param domain - Domain points
 * @returns tkzTabLine command
 *
 * @example
 * "\\tkzTabLine{,+,z,-,z,+}"
 */
function generateSignLine(row: SignRow, domain: DomainPoint[]): string {
	const values: string[] = [];

	// Generate intervals between domain points
	for (let i = 0; i < domain.length; i++) {
		const point = domain[i].expression;

		// Check for point value (marker)
		const pointValue = row.values.get(point);
		if (pointValue && pointValue.type === 'marker') {
			values.push(convertSignMarkerToLatex(pointValue.marker));
		}

		// Check for interval value (sign)
		if (i < domain.length - 1) {
			const nextPoint = domain[i + 1].expression;
			const intervalKey = `${point},${nextPoint}`;
			const intervalValue = row.values.get(intervalKey);

			if (intervalValue) {
				if (intervalValue.type === 'sign') {
					values.push(intervalValue.value);
				} else {
					// Interval shouldn't have markers, but handle gracefully
					values.push(convertSignMarkerToLatex(intervalValue.marker));
				}
			} else {
				// Empty interval
				values.push('');
			}
		}
	}

	// tkzTabLine format: start with comma
	return `\\tkzTabLine{,${values.join(',')}}`;
}

/**
 * Convert a sign marker to LaTeX representation
 *
 * @param marker - Marker type
 * @returns LaTeX string for the marker
 */
function convertSignMarkerToLatex(marker: string): string {
	switch (marker) {
		case 'zero':
			return 'z';
		case 'asymptote':
			return '||';
		case 'forbidden':
			return 'h';
		case 'discontinuity':
			return 't';
		default:
			return '';
	}
}

// ============================================================================
// VARIATION LINE GENERATION
// ============================================================================

/**
 * Generate a variation line (tkzTabVar)
 *
 * Format: \tkzTabVar{dir1/val1,dir2/val2,...}
 * Directions: + (increasing), - (decreasing)
 * Special: -D+/ (left limit), +D-/ (right limit) for asymptotes with different limits
 *
 * @param row - Variation row
 * @param domain - Domain points
 * @returns tkzTabVar command
 *
 * @example
 * "\\tkzTabVar{-/$-\\infty$,+/$3$,-/$0$,+/$2$,-/$-\\infty$}"
 */
function generateVariationLine(row: VariationRow, domain: DomainPoint[]): string {
	const parts: string[] = [];
	let previousPosition: string | null = null;

	for (let i = 0; i < domain.length; i++) {
		const point = domain[i].expression;
		const value = row.values.get(point);

		if (!value) {
			continue;
		}

		// Determine direction based on position change
		const direction = getVariationDirection(previousPosition, value.position);

		// Format the value
		const formattedValue = formatVariationValue(value);

		// Combine direction and value
		if (direction) {
			parts.push(`${direction}/${formattedValue}`);
		} else {
			// First point has no direction
			parts.push(formattedValue);
		}

		previousPosition = value.position;
	}

	return `\\tkzTabVar{${parts.join(',')}}`;
}

/**
 * Determine variation direction based on position change
 *
 * @param previousPos - Previous position (or null for first point)
 * @param currentPos - Current position
 * @returns Direction symbol (+ or -)
 */
function getVariationDirection(previousPos: string | null, currentPos: string): string {
	if (previousPos === null) {
		return '';
	}

	// Map positions to numeric values for comparison
	const positionOrder: Record<string, number> = {
		bottom: 0,
		'limit-bottom': 1,
		center: 2,
		'limit-top': 3,
		top: 4
	};

	const prevOrder = positionOrder[previousPos] ?? 2;
	const currOrder = positionOrder[currentPos] ?? 2;

	return currOrder > prevOrder ? '+' : '-';
}

/**
 * Format a variation value for LaTeX
 *
 * Handles asymptotes with limits, regular values, and markers
 *
 * @param value - Variation value
 * @returns Formatted LaTeX string
 */
function formatVariationValue(value: VariationValue): string {
	// Handle asymptotes with two limits
	if (value.marker === 'asymptote' && value.limits) {
		const [leftLimit, rightLimit] = value.limits;
		const formattedLeft = formatMathExpression(leftLimit.expression);
		const formattedRight = formatMathExpression(rightLimit.expression);

		// Determine direction prefix based on limits
		// If left is -inf and right is +inf: use -D+/
		// If left is +inf and right is -inf: use +D-/
		if (formattedLeft.includes('-\\infty') && formattedRight.includes('+\\infty')) {
			return `-D+/$${formattedLeft}$/$${formattedRight}$`;
		} else if (formattedLeft.includes('+\\infty') && formattedRight.includes('-\\infty')) {
			return `+D-/$${formattedLeft}$/$${formattedRight}$`;
		} else {
			// Generic format for other limit combinations
			return `-D+/$${formattedLeft}$/$${formattedRight}$`;
		}
	}

	// Handle asymptotes with single limit (left or right)
	if (value.marker === 'asymptote' && value.limitSide) {
		const formattedExpr = formatMathExpression(value.expression);
		// Single limit - format with position
		if (value.limitSide === 'left') {
			return `$${formattedExpr}$ / ||`;
		} else {
			return `|| / $${formattedExpr}$`;
		}
	}

	// Handle asymptotes without limits (use ||)
	if (value.marker === 'asymptote') {
		return '||';
	}

	// Regular value
	const formatted = formatMathExpression(value.expression);
	return `$${formatted}$`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { VariationTableLatexOptions };

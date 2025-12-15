/**
 * Math to Custom Syntax Converter
 *
 * Converts LaTeX math expressions to mathAST custom syntax.
 * Falls back to original LaTeX when conversion is not possible.
 *
 * Custom syntax differences from LaTeX:
 * - Functions: sin(x) not \sin(x)
 * - Fractions: a/b or {a+b}/{c+d} not \frac{a}{b}
 * - Only 5 Greek letters: \pi, \alpha, \beta, \gamma, \theta
 * - Only \infty for symbols
 */

import { parseLatexSafe } from '$lib/mathAST/parser';
import { toCustom, SUPPORTED_GREEK, SUPPORTED_SYMBOLS } from '$lib/mathAST/custom-generator';
import { findNodes } from '$lib/mathAST/transforms';
import type { MathNode, GreekLetterNode, SymbolNode } from '$lib/mathAST/types';
import type { ConversionContext } from '../types';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of math conversion attempt
 */
export interface MathConversionResult {
	/** The output string (custom syntax or original LaTeX) */
	output: string;

	/** Whether conversion to custom syntax succeeded */
	converted: boolean;

	/** List of unsupported features that prevented conversion */
	unsupportedFeatures?: UnsupportedFeature[];
}

/**
 * Description of an unsupported feature
 */
export interface UnsupportedFeature {
	/** Category of the feature */
	category: 'greek' | 'symbol' | 'environment' | 'command' | 'parse-error';

	/** The specific feature (e.g., 'delta', 'matrix') */
	feature: string;

	/** The original LaTeX that triggered this */
	latex?: string;
}

// =============================================================================
// Detection Functions
// =============================================================================

/**
 * Detect unsupported Greek letters in a MathAST node
 */
function detectUnsupportedGreek(ast: MathNode): UnsupportedFeature[] {
	const greekNodes = findNodes(ast, (node): node is GreekLetterNode => node.type === 'greek');

	return greekNodes
		.filter((node) => !SUPPORTED_GREEK.has(node.letter))
		.map((node) => ({
			category: 'greek' as const,
			feature: node.letter,
			latex: `\\${node.letter}`
		}));
}

/**
 * Detect unsupported symbols in a MathAST node
 */
function detectUnsupportedSymbols(ast: MathNode): UnsupportedFeature[] {
	const symbolNodes = findNodes(ast, (node): node is SymbolNode => node.type === 'symbol');

	return symbolNodes
		.filter((node) => !SUPPORTED_SYMBOLS.has(node.symbol))
		.map((node) => ({
			category: 'symbol' as const,
			feature: node.symbol,
			latex: `\\${node.symbol}`
		}));
}

/**
 * Detect all unsupported features in a MathAST node
 */
function detectUnsupportedFeatures(ast: MathNode): UnsupportedFeature[] {
	return [...detectUnsupportedGreek(ast), ...detectUnsupportedSymbols(ast)];
}

// =============================================================================
// Safe Conversion
// =============================================================================

/**
 * Safely convert a MathAST node to custom syntax.
 * Returns the custom syntax string and any unsupported features.
 */
function toCustomSafe(ast: MathNode): { output: string; unsupported: UnsupportedFeature[] } {
	// First detect unsupported features
	const unsupported = detectUnsupportedFeatures(ast);

	if (unsupported.length > 0) {
		return { output: '', unsupported };
	}

	// Try conversion
	try {
		const output = toCustom(ast);
		return { output, unsupported: [] };
	} catch (error) {
		// CustomGenerator throws for unsupported features
		const message = error instanceof Error ? error.message : String(error);

		// Extract feature from error message
		let feature: UnsupportedFeature;
		if (message.includes('Greek letter')) {
			const match = message.match(/: (\w+)\./);
			feature = {
				category: 'greek',
				feature: match?.[1] ?? 'unknown'
			};
		} else if (message.includes('symbol')) {
			const match = message.match(/: (\w+)\./);
			feature = {
				category: 'symbol',
				feature: match?.[1] ?? 'unknown'
			};
		} else {
			feature = {
				category: 'command',
				feature: message
			};
		}

		return { output: '', unsupported: [feature] };
	}
}

// =============================================================================
// Preprocessing Functions
// =============================================================================

/**
 * Format a number string with French spacing (thin space every 3 digits).
 * Uses Unicode thin space (U+202F) for proper typographic spacing.
 *
 * - Integer part: spaces from right to left (1234567 -> 1 234 567)
 * - Decimal part: spaces from left to right (89012345 -> 890 123 45)
 */
function formatFrenchNumber(numStr: string): string {
	// Split on decimal separator (comma or period)
	const decimalMatch = numStr.match(/^([^,.]*)([,.]?)(.*)$/);
	if (!decimalMatch) return numStr;

	const [, intPart, separator, decPart] = decimalMatch;

	// Add thin spaces to integer part (from right to left)
	const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');

	if (!separator) {
		return formattedInt;
	}

	// Add thin spaces to decimal part (from left to right, every 3 digits)
	const formattedDec = decPart.replace(/(\d{3})(?=\d)/g, '$1\u202F');

	return `${formattedInt}${separator}${formattedDec}`;
}

/**
 * Preprocess LaTeX math to handle non-standard commands before parsing.
 * Currently handles:
 * - \np{...} (numprint package) - French number formatting
 */
function preprocessMathLatex(latex: string): string {
	// Replace \np{...} with formatted number
	// Pattern: \np followed by {content}
	return latex.replace(/\\np\s*\{([^}]*)\}/g, (_match, content: string) => {
		return formatFrenchNumber(content);
	});
}

// =============================================================================
// Main Conversion Function
// =============================================================================

/**
 * Convert a LaTeX math expression to custom syntax.
 *
 * @param latex - The LaTeX math content (without delimiters)
 * @param context - The conversion context for adding warnings
 * @param line - Optional line number for warnings
 * @param column - Optional column number for warnings
 * @returns Conversion result with output and status
 *
 * @example
 * ```typescript
 * // Simple expression
 * const result = convertMathToCustomSyntax('x^2 + 3x', context);
 * // result.output = 'x^2+3x'
 * // result.converted = true
 *
 * // Unsupported Greek
 * const result = convertMathToCustomSyntax('\\delta x', context);
 * // result.output = '\\delta x'
 * // result.converted = false
 * // result.unsupportedFeatures = [{ category: 'greek', feature: 'delta' }]
 * ```
 */
export function convertMathToCustomSyntax(
	latex: string,
	context: ConversionContext,
	line?: number,
	column?: number
): MathConversionResult {
	// Handle empty input
	if (!latex || latex.trim() === '') {
		return { output: '', converted: true };
	}

	// Preprocess to handle non-standard commands like \np
	const preprocessedLatex = preprocessMathLatex(latex);

	// Step 1: Parse LaTeX to MathAST
	const parseResult = parseLatexSafe(preprocessedLatex);

	// Check for parse errors
	if (parseResult.errors.length > 0) {
		// Add warning for parse error
		context.addWarning(
			{
				type: 'unsupported-math-feature',
				message: `Could not parse LaTeX math: ${parseResult.errors[0].message}`,
				severity: 'info',
				command: preprocessedLatex.slice(0, 50) + (preprocessedLatex.length > 50 ? '...' : '')
			},
			line,
			column
		);

		// Return preprocessed LaTeX (with \np converted) even if parsing failed
		return {
			output: preprocessedLatex,
			converted: false,
			unsupportedFeatures: [
				{
					category: 'parse-error',
					feature: parseResult.errors[0].message,
					latex: preprocessedLatex
				}
			]
		};
	}

	// Step 2: Convert MathAST to custom syntax
	// ast is non-null here since we checked for errors above and returned
	const conversionResult = toCustomSafe(parseResult.ast!);

	// Check for unsupported features
	if (conversionResult.unsupported.length > 0) {
		// Add warnings for each unsupported feature
		for (const feature of conversionResult.unsupported) {
			context.addWarning(
				{
					type: 'unsupported-math-feature',
					message: `Unsupported ${feature.category} in math: ${feature.feature}`,
					severity: 'info',
					command: feature.latex ?? feature.feature
				},
				line,
				column
			);
		}

		// Return preprocessed LaTeX (with \np converted) even if conversion failed
		return {
			output: preprocessedLatex,
			converted: false,
			unsupportedFeatures: conversionResult.unsupported
		};
	}

	// Success!
	return {
		output: conversionResult.output,
		converted: true
	};
}

// =============================================================================
// Utility Exports
// =============================================================================

export { detectUnsupportedFeatures, toCustomSafe, SUPPORTED_GREEK, SUPPORTED_SYMBOLS };

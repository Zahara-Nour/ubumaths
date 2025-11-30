/**
 * AsciiMath to LaTeX Converter
 *
 * Converts AsciiMath expressions to LaTeX format while preserving
 * template placeholders like {{a}}, {{1..10}}, {{eval:...}}, etc.
 *
 * Uses MathLive's convertAsciiMathToLatex function for the actual conversion.
 */

import { convertAsciiMathToLatex } from 'mathlive';

/**
 * Result of an AsciiMath to LaTeX conversion
 */
export interface AsciiMathConversionResult {
	/** Whether conversion succeeded */
	success: boolean;
	/** Converted string (LaTeX) */
	converted: string;
	/** Error message if conversion failed */
	error?: string;
	/** Number of placeholders preserved */
	placeholdersPreserved: number;
}

/**
 * Placeholder token used during conversion
 * Uses characters that won't be interpreted as math by AsciiMath
 * Format: UBUPLACEHOLDERXNX where N is the index
 */
const PLACEHOLDER_PREFIX = 'UBUPLACEHOLDERX';
const PLACEHOLDER_SUFFIX = 'X';

/**
 * Regex to match template placeholders: {{...}}
 * Matches nested braces to handle cases like {{eval:a+b}}
 */
const PLACEHOLDER_REGEX = /\{\{(?:[^{}]|\{[^{}]*\})*\}\}/g;

/**
 * Convert AsciiMath to LaTeX while preserving {{...}} template placeholders
 *
 * @param input - AsciiMath expression with potential placeholders
 * @returns Conversion result with LaTeX output
 *
 * @example
 * // Simple fraction
 * convertAsciiMathToLatexSafe('1/2')
 * // => { success: true, converted: '\\frac{1}{2}', placeholdersPreserved: 0 }
 *
 * @example
 * // With placeholders
 * convertAsciiMathToLatexSafe('{{a}}/{{b}}')
 * // => { success: true, converted: '\\frac{{{a}}}{{{b}}}', placeholdersPreserved: 2 }
 *
 * @example
 * // Square root with placeholder
 * convertAsciiMathToLatexSafe('sqrt({{a}})')
 * // => { success: true, converted: '\\sqrt{{{a}}}', placeholdersPreserved: 1 }
 */
export function convertAsciiMathToLatexSafe(input: string): AsciiMathConversionResult {
	// Handle empty/undefined input
	if (!input || input.trim() === '') {
		return {
			success: true,
			converted: input || '',
			placeholdersPreserved: 0
		};
	}

	// Step 1: Extract and replace placeholders with tokens
	const placeholders: string[] = [];
	const tokenized = input.replace(PLACEHOLDER_REGEX, (match) => {
		const index = placeholders.length;
		placeholders.push(match);
		return `${PLACEHOLDER_PREFIX}${index}${PLACEHOLDER_SUFFIX}`;
	});

	// Step 2: Convert AsciiMath to LaTeX
	let latex: string;
	try {
		latex = convertAsciiMathToLatex(tokenized);
	} catch (e) {
		// If conversion fails, return original input
		return {
			success: false,
			converted: input,
			error: e instanceof Error ? e.message : String(e),
			placeholdersPreserved: placeholders.length
		};
	}

	// Step 3: Restore placeholders
	const tokenRegex = new RegExp(
		`${PLACEHOLDER_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)${PLACEHOLDER_SUFFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
		'g'
	);

	const result = latex.replace(tokenRegex, (_, indexStr) => {
		const index = parseInt(indexStr, 10);
		return placeholders[index] ?? '';
	});

	return {
		success: true,
		converted: result,
		placeholdersPreserved: placeholders.length
	};
}

/**
 * Check if a string contains AsciiMath syntax that would benefit from conversion
 *
 * @param input - String to check
 * @returns true if the string contains AsciiMath patterns
 */
export function containsAsciiMath(input: string): boolean {
	if (!input) return false;

	// Common AsciiMath patterns that differ from LaTeX
	const asciiMathPatterns = [
		/\bsqrt\s*\(/i, // sqrt(x)
		/\broot\s*\(/i, // root(n)(x)
		/\babs\s*\(/i, // abs(x)
		/\bfloor\s*\(/i, // floor(x)
		/\bceil\s*\(/i, // ceil(x)
		/\bsin\s*\(/i, // sin(x) without backslash
		/\bcos\s*\(/i, // cos(x) without backslash
		/\btan\s*\(/i, // tan(x) without backslash
		/\blog\s*\(/i, // log(x) without backslash
		/\bln\s*\(/i, // ln(x) without backslash
		/\bexp\s*\(/i, // exp(x) without backslash
		/\bsum\b/i, // sum
		/\bprod\b/i, // prod
		/\bint\b/i, // int (integral)
		/\blim\b/i, // lim
		/[a-zA-Z0-9)]\s*\/\s*[a-zA-Z0-9(]/, // a/b pattern (potential fraction)
		/\^[a-zA-Z0-9](?![{])/, // x^2 without braces (should be x^{2})
		/_[a-zA-Z0-9](?![{])/, // x_i without braces (should be x_{i})
		/\b(alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|omega)\b/i // Greek letters
	];

	return asciiMathPatterns.some((pattern) => pattern.test(input));
}

/**
 * Batch convert multiple expressions
 *
 * @param inputs - Array of AsciiMath expressions
 * @returns Array of conversion results
 */
export function convertAsciiMathBatch(inputs: string[]): AsciiMathConversionResult[] {
	return inputs.map((input) => convertAsciiMathToLatexSafe(input));
}

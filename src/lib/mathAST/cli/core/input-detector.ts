/**
 * Input Format Detector
 *
 * Auto-detects whether input is LaTeX or custom syntax based on pattern matching.
 * Returns a confidence score to indicate detection certainty.
 */

import type { DetectionResult } from '../types';

/**
 * LaTeX-specific patterns that indicate LaTeX input
 */
const LATEX_PATTERNS: readonly RegExp[] = [
	// Backslash commands: \frac, \sin, \alpha, etc.
	/\\[a-zA-Z]+/,
	// Fractions with braces
	/\\frac\s*\{/,
	// Braced superscripts or subscripts
	/\^{|_{/,
	// Square roots
	/\\sqrt\s*(\[|{)/,
	// Left/right delimiters
	/\\left\s*[([{|]/,
	/\\right\s*[)\]}|]/,
	// Text formatting commands
	/\\text(rm|bf|it)?\s*{/,
	// Color commands
	/\\(text)?color\s*{/
];

/**
 * Patterns that suggest custom (non-LaTeX) syntax
 * Currently reserved for future custom syntax support
 */
const CUSTOM_PATTERNS: readonly RegExp[] = [
	// Reserved for future custom syntax patterns
];

/**
 * Detect the input format of a mathematical expression.
 *
 * Analyzes the input string for LaTeX-specific patterns to determine
 * the most likely format. Returns a confidence score between 0 and 1.
 *
 * @param input - The mathematical expression to analyze
 * @returns Detection result with format and confidence
 *
 * @example
 * ```typescript
 * detectInputFormat('\\frac{a}{b}')
 * // => { format: 'latex', confidence: 0.9 }
 *
 * detectInputFormat('x + 1')
 * // => { format: 'latex', confidence: 0.5 }
 * ```
 */
export function detectInputFormat(input: string): DetectionResult {
	const trimmed = input.trim();

	if (trimmed.length === 0) {
		return { format: 'unknown', confidence: 0 };
	}

	// Check for LaTeX-specific patterns (high confidence)
	for (const pattern of LATEX_PATTERNS) {
		if (pattern.test(trimmed)) {
			return { format: 'latex', confidence: 0.9 };
		}
	}

	// Check for custom syntax patterns (reserved for future)
	for (const pattern of CUSTOM_PATTERNS) {
		if (pattern.test(trimmed)) {
			return { format: 'custom', confidence: 0.9 };
		}
	}

	// Fallback: treat simple expressions as LaTeX
	// The LaTeX parser handles basic expressions like "x + 1" correctly
	return { format: 'latex', confidence: 0.5 };
}

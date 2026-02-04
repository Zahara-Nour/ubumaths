/**
 * Form Verification for Student Answers
 *
 * Provides utilities for verifying that a student's answer matches
 * an expected mathematical form using pattern matching.
 *
 * @example
 * ```typescript
 * import { verifyForm } from '$lib/mathAST/pattern';
 *
 * // Check if answer is in linear form ax + b
 * const result = verifyForm('2x + 3', 'a * $x + b');
 * if (result.matches) {
 *   console.log('a =', result.bindings.a); // '2'
 *   console.log('b =', result.bindings.b); // '3'
 * }
 *
 * // Check with constraints
 * const intResult = verifyForm('x^2', 'base ^ n:integer');
 * ```
 *
 * @module mathAST/pattern/verify
 */

import type { MathNode } from '../types';
import type { MatchBindings } from './types';
import { parsePattern } from '../parser/custom/pattern-parser';
import { match } from './match';
import { parseLatex, type LatexParserOptions } from '../parser';
import { toLatex } from '../latex-generator';

// =============================================================================
// Result Types
// =============================================================================

/**
 * Result of a successful form verification
 */
export interface VerifyFormSuccess {
	/** Whether the form matched */
	readonly matches: true;
	/** Bindings from wildcards to their matched values (as LaTeX strings) */
	readonly bindings: Readonly<Record<string, string>>;
	/** Raw bindings with MathNode values */
	readonly rawBindings: MatchBindings;
}

/**
 * Result of a failed form verification
 */
export interface VerifyFormFailure {
	/** Whether the form matched */
	readonly matches: false;
	/** Optional error message if parsing failed */
	readonly error?: string;
}

/**
 * Result of verifyForm function
 */
export type VerifyFormResult = VerifyFormSuccess | VerifyFormFailure;

/**
 * Options for verifyForm
 */
export interface VerifyFormOptions {
	/** Options for parsing the student's LaTeX answer */
	readonly parserOptions?: LatexParserOptions;
}

// =============================================================================
// Main Function
// =============================================================================

/**
 * Verifies that a student's answer matches an expected mathematical form.
 *
 * @param answer - The student's answer as a LaTeX string
 * @param patternStr - The expected form as a pattern string
 * @param options - Optional configuration
 * @returns A result object indicating if the form matched and the captured bindings
 *
 * @example
 * // Check linear form
 * verifyForm('2x + 3', 'a * $x + b')
 * // => { matches: true, bindings: { a: '2', b: '3' } }
 *
 * @example
 * // Check with constraint (must be integer exponent)
 * verifyForm('x^2', 'base ^ n:integer')
 * // => { matches: true, bindings: { base: 'x', n: '2' } }
 *
 * verifyForm('x^{1.5}', 'base ^ n:integer')
 * // => { matches: false }
 *
 * @example
 * // Check factored form
 * verifyForm('(x+1)(x-2)', '(a + b) * (c + d)')
 * // => { matches: true, bindings: { a: 'x', b: '1', c: 'x', d: '-2' } }
 *
 * @example
 * // Check if answer is just a number
 * verifyForm('42', 'n:number')
 * // => { matches: true, bindings: { n: '42' } }
 *
 * verifyForm('x', 'n:number')
 * // => { matches: false }
 */
export function verifyForm(
	answer: string,
	patternStr: string,
	options?: VerifyFormOptions
): VerifyFormResult {
	// Parse the student's answer
	let answerNode: MathNode;
	try {
		answerNode = parseLatex(answer, options?.parserOptions);
	} catch (e) {
		return {
			matches: false,
			error: `Invalid answer: ${e instanceof Error ? e.message : String(e)}`
		};
	}

	// Parse the pattern
	let pattern;
	try {
		pattern = parsePattern(patternStr);
	} catch (e) {
		return {
			matches: false,
			error: `Invalid pattern: ${e instanceof Error ? e.message : String(e)}`
		};
	}

	// Perform the match
	const result = match(pattern, answerNode);

	if (!result.success) {
		return { matches: false };
	}

	// Convert bindings to LaTeX strings
	const bindings: Record<string, string> = {};
	for (const [name, value] of result.bindings) {
		if ('type' in value) {
			// It's a MathNode
			try {
				bindings[name] = toLatex(value);
			} catch {
				bindings[name] = `[${value.type}]`;
			}
		} else if ('kind' in value) {
			// It's a SequenceBinding
			bindings[name] = `[sequence: ${value.kind}]`;
		}
	}

	return {
		matches: true,
		bindings,
		rawBindings: result.bindings
	};
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Checks if the answer matches the pattern (boolean result only).
 *
 * @param answer - The student's answer as a LaTeX string
 * @param patternStr - The expected form as a pattern string
 * @returns true if the form matches, false otherwise
 *
 * @example
 * matchesForm('2x + 3', 'a * $x + b')  // true
 * matchesForm('x^2', 'a * $x + b')     // false
 */
export function matchesForm(answer: string, patternStr: string): boolean {
	return verifyForm(answer, patternStr).matches;
}

/**
 * Extracts bindings if the form matches, or null if it doesn't.
 *
 * @param answer - The student's answer as a LaTeX string
 * @param patternStr - The expected form as a pattern string
 * @returns The bindings object if matched, null otherwise
 *
 * @example
 * extractBindings('2x + 3', 'a * $x + b')
 * // => { a: '2', b: '3' }
 *
 * extractBindings('x^2', 'a * $x + b')
 * // => null
 */
export function extractBindings(
	answer: string,
	patternStr: string
): Readonly<Record<string, string>> | null {
	const result = verifyForm(answer, patternStr);
	return result.matches ? result.bindings : null;
}

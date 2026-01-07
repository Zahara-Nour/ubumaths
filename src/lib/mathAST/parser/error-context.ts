/**
 * Error Context Utilities
 *
 * Provides enhanced error information for parse errors:
 * - Context snippets showing surrounding text
 * - Line and column numbers
 * - Suggestions for common mistakes
 *
 * @module mathAST/parser/error-context
 */

import { KNOWN_COMMANDS, FUNCTION_COMMANDS } from './types';
import type { ParseErrorCode } from './types';

// =============================================================================
// Context Extraction
// =============================================================================

/**
 * Context around an error position.
 */
export interface ErrorContext {
	/** Text before the error (max 20 chars) */
	readonly before: string;
	/** The erroneous segment */
	readonly error: string;
	/** Text after the error (max 20 chars) */
	readonly after: string;
}

/** Maximum length for before/after context */
const MAX_CONTEXT_LENGTH = 20;

/**
 * Extract context around an error position in the input.
 *
 * @param input - The full input string
 * @param position - Start position of the error
 * @param length - Length of the erroneous segment
 * @returns ErrorContext with before, error, and after strings
 */
export function createErrorContext(input: string, position: number, length: number): ErrorContext {
	// Clamp values to valid range
	const safePos = Math.max(0, Math.min(position, input.length));
	const safeLen = Math.max(0, Math.min(length, input.length - safePos));

	// Extract the error segment
	const errorSegment = input.slice(safePos, safePos + safeLen);

	// Extract before context (up to MAX_CONTEXT_LENGTH chars)
	const beforeStart = Math.max(0, safePos - MAX_CONTEXT_LENGTH);
	const beforeText = input.slice(beforeStart, safePos);

	// Extract after context (up to MAX_CONTEXT_LENGTH chars)
	const afterEnd = Math.min(input.length, safePos + safeLen + MAX_CONTEXT_LENGTH);
	const afterText = input.slice(safePos + safeLen, afterEnd);

	return {
		before: beforeText,
		error: errorSegment,
		after: afterText
	};
}

// =============================================================================
// Line and Column Computation
// =============================================================================

/**
 * Line and column position (1-indexed).
 */
export interface LineColumn {
	/** Line number (1-indexed) */
	readonly line: number;
	/** Column number (1-indexed) */
	readonly column: number;
}

/**
 * Compute line and column for a position in the input.
 *
 * @param input - The full input string
 * @param position - The position (0-indexed)
 * @returns Line and column (both 1-indexed)
 */
export function computeLineAndColumn(input: string, position: number): LineColumn {
	const safePos = Math.max(0, Math.min(position, input.length));

	let line = 1;
	let column = 1;

	for (let i = 0; i < safePos; i++) {
		if (input[i] === '\n') {
			line++;
			column = 1;
		} else {
			column++;
		}
	}

	return { line, column };
}

// =============================================================================
// Suggestions
// =============================================================================

/**
 * Get suggestions based on error code and message.
 *
 * @param code - The ParseErrorCode
 * @param message - The error message
 * @returns Array of suggestion strings (in French)
 */
export function getSuggestions(code: ParseErrorCode, message: string): string[] {
	const suggestions: string[] = [];

	switch (code) {
		case 'MISSING_BRACE':
			suggestions.push("Avez-vous oublié '}' ?");
			break;

		case 'MISSING_DELIMITER':
			if (message.includes(')')) {
				suggestions.push("Vérifiez que chaque '(' a sa ')' correspondante");
			} else if (message.includes(']')) {
				suggestions.push("Vérifiez que chaque '[' a son ']' correspondant");
			} else {
				suggestions.push('Vérifiez les délimiteurs (parenthèses, crochets)');
			}
			break;

		case 'UNKNOWN_COMMAND': {
			// Try to extract the unknown command from the message
			const match = message.match(/(?:Unknown command|commande inconnue)[:\s]+\\?(\w+)/i);
			if (match) {
				const unknownCmd = match[1].toLowerCase();
				const similar = findSimilarCommands(unknownCmd);
				if (similar.length > 0) {
					suggestions.push(`Commandes similaires : \\${similar.join(', \\')}`);
				}
			}
			break;
		}

		case 'EMPTY_GROUP':
			suggestions.push('Les accolades vides {} ne sont pas autorisées');
			break;

		case 'UNBALANCED_DELIMITERS':
			suggestions.push('Vérifiez que \\left et \\right sont correctement appariés');
			break;

		case 'INVALID_SUBSCRIPT':
			suggestions.push('Utilisez des accolades pour les indices complexes : x_{ab}');
			break;

		case 'INVALID_SUPERSCRIPT':
			suggestions.push('Utilisez des accolades pour les exposants complexes : x^{ab}');
			if (message.includes('negative') || message.includes('négatif')) {
				suggestions.push('Pour un exposant négatif, écrivez x^{-2} et non x^-2');
			}
			break;

		case 'INVALID_UNIT':
			suggestions.push("Vérifiez la syntaxe de l'unité : m, kg, s, etc.");
			break;

		case 'INVALID_COLOR':
			suggestions.push('Couleurs valides : red, blue, green, orange, ou #RRGGBB');
			break;

		case 'UNEXPECTED_EOF':
			suggestions.push('Expression incomplète - vérifiez les accolades et parenthèses');
			break;
	}

	return suggestions;
}

/**
 * Find commands similar to an unknown command using Levenshtein distance.
 */
function findSimilarCommands(unknown: string, maxDistance: number = 2): string[] {
	const similar: Array<{ cmd: string; distance: number }> = [];

	// Check known commands
	for (const cmd of KNOWN_COMMANDS) {
		const distance = levenshteinDistance(unknown, cmd);
		if (distance <= maxDistance) {
			similar.push({ cmd, distance });
		}
	}

	// Check function commands too
	for (const cmd of FUNCTION_COMMANDS) {
		if (!KNOWN_COMMANDS.has(cmd)) {
			const distance = levenshteinDistance(unknown, cmd);
			if (distance <= maxDistance) {
				similar.push({ cmd, distance });
			}
		}
	}

	// Sort by distance, then alphabetically
	similar.sort((a, b) => a.distance - b.distance || a.cmd.localeCompare(b.cmd));

	// Return top 3
	return similar.slice(0, 3).map((s) => s.cmd);
}

/**
 * Compute Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
	const m = a.length;
	const n = b.length;

	// Create 2D array
	const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

	// Base cases
	for (let i = 0; i <= m; i++) dp[i][0] = i;
	for (let j = 0; j <= n; j++) dp[0][j] = j;

	// Fill table
	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			if (a[i - 1] === b[j - 1]) {
				dp[i][j] = dp[i - 1][j - 1];
			} else {
				dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
			}
		}
	}

	return dp[m][n];
}

// =============================================================================
// Enhanced Error Creation
// =============================================================================

/**
 * Enhanced fields to add to a ParseError.
 */
export interface EnhancedErrorFields {
	readonly context?: ErrorContext;
	readonly line?: number;
	readonly column?: number;
	readonly suggestions?: readonly string[];
}

/**
 * Create enhanced error fields for a parse error.
 *
 * @param input - The full input string
 * @param position - Error position
 * @param length - Error length
 * @param code - Error code
 * @param message - Error message
 * @returns Enhanced fields to spread into ParseError
 */
export function createEnhancedErrorFields(
	input: string,
	position: number,
	length: number,
	code: ParseErrorCode,
	message: string
): EnhancedErrorFields {
	const context = createErrorContext(input, position, length);
	const { line, column } = computeLineAndColumn(input, position);
	const suggestions = getSuggestions(code, message);

	return {
		context,
		line,
		column,
		...(suggestions.length > 0 && { suggestions })
	};
}

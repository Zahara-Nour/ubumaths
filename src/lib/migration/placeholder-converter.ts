/**
 * Placeholder Converter
 * =====================
 *
 * Converts legacy placeholder syntax to unified {{}} syntax
 * for the correction system migration.
 *
 * This converter handles placeholders found in correction text,
 * such as &sol, &answer, &expression, and color references.
 */

import { numberToLetterName } from './question-transformer';

/**
 * A single change made during conversion
 */
export interface ConversionChange {
	/** Original placeholder text */
	original: string;
	/** New placeholder syntax */
	replacement: string;
	/** Position in the original string */
	position: number;
}

/**
 * Result of converting placeholders in a string
 */
export interface PlaceholderConversionResult {
	/** The converted string with new syntax */
	converted: string;
	/** List of all changes made */
	changes: ConversionChange[];
	/** Whether any changes were made */
	hasChanges: boolean;
}

/**
 * Statistics about placeholder conversions
 */
export interface PlaceholderStats {
	/** Number of &sol patterns converted */
	solutions: number;
	/** Number of &answer patterns converted */
	answers: number;
	/** Number of &expression patterns converted */
	expressions: number;
	/** Number of numbered variable patterns converted (&1, &2, etc.) */
	numberedVariables: number;
	/** Number of color reference patterns converted */
	colorReferences: number;
	/** Total number of conversions */
	total: number;
}

/**
 * Pattern definitions for legacy placeholders
 *
 * These patterns identify legacy syntax that needs to be converted
 * to the new unified {{}} syntax.
 */
export const LEGACY_PLACEHOLDER_PATTERNS = {
	/**
	 * Solution placeholder: &sol or &sol1, &sol2, etc.
	 * - &sol -> {{solution}}
	 * - &sol1 -> {{solution:1}}
	 */
	solution: /&sol(\d+)?(?![a-zA-Z])/g,

	/**
	 * HTML-formatted solution: &solution
	 * -> {{solution:html}}
	 */
	solutionHtml: /&solution(?![a-zA-Z\d])/g,

	/**
	 * Student answer: &answer or &answer1, &answer2, etc.
	 * - &answer -> {{answer}}
	 * - &answer1 -> {{answer:1}}
	 */
	answer: /&answer(\d+)?(?![a-zA-Z])/g,

	/**
	 * Expression placeholder: &expression
	 * -> {{expression}}
	 */
	expression: /&expression(?![a-zA-Z\d])/g,

	/**
	 * Raw expression: &exp
	 * -> {{expression:raw}}
	 */
	expressionRaw: /&exp(?![a-zA-Z\d])/g,

	/**
	 * Numbered variables: &1, &2, &n (digits only)
	 * -> {{1}}, {{2}}, {{n}}
	 *
	 * Note: This only matches pure numeric references.
	 * Named variables like &varName are handled by the syntax converter.
	 */
	numberedVariable: /&(\d+)(?![a-zA-Z])/g,

	/**
	 * Color references using Svelte store syntax:
	 * - ${get(color1)} -> {{color:color1}}
	 * - ${get(couleur2)} -> {{color:couleur2}}
	 * - ${color1} -> {{color:color1}}
	 *
	 * Note: Uses negative lookbehind to avoid matching LaTeX \$
	 */
	color: /(?<!\\)\$\{(?:get\()?(\w+)\)?\}/g
};

/**
 * Convert a single placeholder to the new syntax
 *
 * @param placeholder - The legacy placeholder to convert
 * @returns The new syntax for the placeholder, or the original if not recognized
 *
 * @example
 * convertSinglePlaceholder('&sol')      // '{{solution}}'
 * convertSinglePlaceholder('&sol2')     // '{{solution:2}}'
 * convertSinglePlaceholder('&answer')   // '{{answer}}'
 * convertSinglePlaceholder('&1')        // '{{1}}'
 */
export function convertSinglePlaceholder(placeholder: string): string {
	// &solution (HTML format) - must check before &sol
	if (placeholder === '&solution') {
		return '{{solution:html}}';
	}

	// &sol or &solN
	const solMatch = placeholder.match(/^&sol(\d+)?$/);
	if (solMatch) {
		const index = solMatch[1];
		return index ? `{{solution:${index}}}` : '{{solution}}';
	}

	// &answer or &answerN
	const answerMatch = placeholder.match(/^&answer(\d+)?$/);
	if (answerMatch) {
		const index = answerMatch[1];
		return index ? `{{answer:${index}}}` : '{{answer}}';
	}

	// &expression
	if (placeholder === '&expression') {
		return '{{expression}}';
	}

	// &exp (raw expression)
	if (placeholder === '&exp') {
		return '{{expression:raw}}';
	}

	// Numbered variable: &N → {{a}}, {{b}}, etc.
	const numMatch = placeholder.match(/^&(\d+)$/);
	if (numMatch) {
		return `{{${numberToLetterName(parseInt(numMatch[1], 10))}}}`;
	}

	// Color references: ${get(colorName)} or ${colorName}
	const colorMatch = placeholder.match(/^\$\{(?:get\()?(\w+)\)?\}$/);
	if (colorMatch) {
		return `{{color:${colorMatch[1]}}}`;
	}

	// Not recognized, return as-is
	return placeholder;
}

/**
 * Check if a string contains any legacy placeholders
 *
 * @param input - The string to check
 * @returns True if legacy placeholders are found
 *
 * @example
 * hasLegacyPlaceholders('The answer is &sol')     // true
 * hasLegacyPlaceholders('The answer is {{sol}}')  // false
 * hasLegacyPlaceholders('No placeholders here')   // false
 */
export function hasLegacyPlaceholders(input: string): boolean {
	if (!input) return false;

	// Check each pattern
	for (const pattern of Object.values(LEGACY_PLACEHOLDER_PATTERNS)) {
		// Reset regex lastIndex since we reuse patterns
		pattern.lastIndex = 0;
		if (pattern.test(input)) {
			return true;
		}
	}

	return false;
}

/**
 * Find all legacy placeholders in a string
 *
 * @param input - The string to search
 * @returns Array of all legacy placeholders found (unique)
 *
 * @example
 * findLegacyPlaceholders('&sol and &1 and &sol')  // ['&sol', '&1']
 * findLegacyPlaceholders('No placeholders')        // []
 */
export function findLegacyPlaceholders(input: string): string[] {
	if (!input) return [];

	const found = new Set<string>();

	// Search for each pattern type
	for (const pattern of Object.values(LEGACY_PLACEHOLDER_PATTERNS)) {
		// Reset regex lastIndex
		pattern.lastIndex = 0;

		let match;
		while ((match = pattern.exec(input)) !== null) {
			found.add(match[0]);
		}
	}

	return Array.from(found);
}

/**
 * Convert all legacy placeholders in a string to new syntax
 *
 * Performs the conversion in a specific order to avoid conflicts:
 * 1. Color references (to avoid conflicts with LaTeX $)
 * 2. &solution (before &sol to avoid partial match)
 * 3. &sol and &solN
 * 4. &answer and &answerN
 * 5. &expression
 * 6. &exp
 * 7. Numbered variables (&1, &2, etc.)
 *
 * @param input - The string containing legacy placeholders
 * @returns Conversion result with the converted string and change details
 *
 * @example
 * const result = convertPlaceholders('Answer: &sol, Variable: &1');
 * // result.converted: 'Answer: {{solution}}, Variable: {{1}}'
 * // result.hasChanges: true
 * // result.changes: [
 * //   { original: '&sol', replacement: '{{solution}}', position: 8 },
 * //   { original: '&1', replacement: '{{1}}', position: 24 }
 * // ]
 */
export function convertPlaceholders(input: string): PlaceholderConversionResult {
	if (!input) {
		return {
			converted: input,
			changes: [],
			hasChanges: false
		};
	}

	const changes: ConversionChange[] = [];
	let converted = input;

	/**
	 * Helper to perform a single pattern replacement with tracking
	 */
	const replaceWithTracking = (
		pattern: RegExp,
		replacer: (match: RegExpExecArray) => string
	): void => {
		// Reset pattern
		pattern.lastIndex = 0;

		// Find all matches first (to get original positions)
		const matches: { match: RegExpExecArray; index: number }[] = [];
		let match;
		while ((match = pattern.exec(input)) !== null) {
			matches.push({ match: { ...match } as RegExpExecArray, index: match.index });
		}

		// Apply replacements
		for (const { match: m, index } of matches) {
			const replacement = replacer(m);

			// Only track if there's an actual change
			if (m[0] !== replacement) {
				changes.push({
					original: m[0],
					replacement,
					position: index
				});
			}
		}

		// Reset and apply to converted string
		pattern.lastIndex = 0;
		converted = converted.replace(pattern, (fullMatch, ...args) => {
			// Reconstruct match object for replacer
			const matchArray = [fullMatch, ...args.slice(0, -2)] as unknown as RegExpExecArray;
			return replacer(matchArray);
		});
	};

	// Step 1: Convert color references first
	// Uses negative lookbehind to avoid LaTeX \$
	replaceWithTracking(LEGACY_PLACEHOLDER_PATTERNS.color, (match) => {
		const colorName = match[1];
		return `{{color:${colorName}}}`;
	});

	// Step 2: Convert &solution before &sol (longer match first)
	replaceWithTracking(LEGACY_PLACEHOLDER_PATTERNS.solutionHtml, () => {
		return '{{solution:html}}';
	});

	// Step 3: Convert &sol and &solN
	replaceWithTracking(LEGACY_PLACEHOLDER_PATTERNS.solution, (match) => {
		const index = match[1];
		return index ? `{{solution:${index}}}` : '{{solution}}';
	});

	// Step 4: Convert &answer and &answerN
	replaceWithTracking(LEGACY_PLACEHOLDER_PATTERNS.answer, (match) => {
		const index = match[1];
		return index ? `{{answer:${index}}}` : '{{answer}}';
	});

	// Step 5: Convert &expression
	replaceWithTracking(LEGACY_PLACEHOLDER_PATTERNS.expression, () => {
		return '{{expression}}';
	});

	// Step 6: Convert &exp
	replaceWithTracking(LEGACY_PLACEHOLDER_PATTERNS.expressionRaw, () => {
		return '{{expression:raw}}';
	});

	// Step 7: Convert numbered variables (&1, &2, etc.) to letter names
	replaceWithTracking(LEGACY_PLACEHOLDER_PATTERNS.numberedVariable, (match) => {
		const num = parseInt(match[1], 10);
		return `{{${numberToLetterName(num)}}}`;
	});

	return {
		converted,
		changes,
		hasChanges: changes.length > 0
	};
}

/**
 * Convert placeholders and return statistics
 *
 * @param input - The string to convert
 * @returns Object with converted string, changes, and statistics
 */
export function convertPlaceholdersWithStats(input: string): PlaceholderConversionResult & {
	stats: PlaceholderStats;
} {
	const result = convertPlaceholders(input);

	const stats: PlaceholderStats = {
		solutions: 0,
		answers: 0,
		expressions: 0,
		numberedVariables: 0,
		colorReferences: 0,
		total: 0
	};

	// Count each type from the changes
	for (const change of result.changes) {
		if (change.original.startsWith('&sol')) {
			stats.solutions++;
		} else if (change.original.startsWith('&answer')) {
			stats.answers++;
		} else if (change.original === '&expression' || change.original === '&exp') {
			stats.expressions++;
		} else if (/^&\d+$/.test(change.original)) {
			stats.numberedVariables++;
		} else if (change.original.startsWith('${')) {
			stats.colorReferences++;
		}
	}

	stats.total = result.changes.length;

	return {
		...result,
		stats
	};
}

/**
 * Batch convert multiple strings
 *
 * @param inputs - Array of strings to convert
 * @returns Array of conversion results
 */
export function convertPlaceholdersBatch(inputs: string[]): PlaceholderConversionResult[] {
	return inputs.map(convertPlaceholders);
}

/**
 * Validate that a conversion was successful
 *
 * Checks that:
 * 1. No legacy placeholders remain
 * 2. New placeholders are properly formed
 *
 * @param original - Original string
 * @param converted - Converted string
 * @returns True if conversion appears valid
 */
export function validatePlaceholderConversion(original: string, converted: string): boolean {
	// Check no legacy patterns remain
	if (hasLegacyPlaceholders(converted)) {
		return false;
	}

	// If original had placeholders, converted should have new syntax
	if (hasLegacyPlaceholders(original)) {
		// Check for at least one new-style placeholder
		if (!/\{\{[^}]+\}\}/.test(converted)) {
			return false;
		}
	}

	return true;
}

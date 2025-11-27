/**
 * Conditional Converter
 * =====================
 *
 * Converts legacy @@condition ?? text@@ syntax to {{if:condition|text}}
 * for the correction system migration.
 *
 * Legacy syntax examples:
 * - Single: @@&2+&3<60 ?? Simple@@
 * - Paired (if/else): @@&2+&3<60 ?? Simple @@ @@&2+&3>59 ?? Avec retenue @@
 *
 * New syntax:
 * - Single: {{if:{{2}}+{{3}}<60|Simple}}
 * - If/else: {{if:{{2}}+{{3}}<60|Simple|Avec retenue}}
 */

/**
 * A single change made during conditional conversion
 */
export interface ConditionalChange {
	/** Original conditional text */
	original: string;
	/** New conditional syntax */
	replacement: string;
	/** Type of conditional (single or paired) */
	type: 'single' | 'paired';
	/** Position in the original string */
	position: number;
}

/**
 * Result of converting conditionals in a string
 */
export interface ConditionalConversionResult {
	/** The converted string with new syntax */
	converted: string;
	/** List of all changes made */
	changes: ConditionalChange[];
	/** Whether any changes were made */
	hasChanges: boolean;
}

/**
 * Statistics about conditional conversions
 */
export interface ConditionalStats {
	/** Number of single conditionals converted */
	single: number;
	/** Number of paired conditionals converted */
	paired: number;
	/** Total number of conditional blocks converted */
	total: number;
}

/**
 * Pattern definitions for legacy conditionals
 *
 * These patterns identify legacy syntax that needs to be converted
 * to the new unified {{if:}} syntax.
 */
export const CONDITIONAL_PATTERNS = {
	/**
	 * Single conditional: @@condition ?? text@@
	 * Captures: [1] condition, [2] text
	 *
	 * Note: Uses lazy quantifiers to handle multiple conditionals
	 */
	single: /@@\s*([^@]+?)\s*\?\?\s*([^@]+?)@@/g,

	/**
	 * Variable reference in conditions: &N
	 * Converts to {{N}}
	 */
	variable: /&(\d+)(?![a-zA-Z])/g
};

/**
 * Convert variable references inside conditions
 *
 * Transforms legacy &N references to new {{N}} syntax
 *
 * @param condition - The condition string containing legacy variable references
 * @returns The condition with converted variable references
 *
 * @example
 * convertConditionVariables('&2+&3<60')    // '{{2}}+{{3}}<60'
 * convertConditionVariables('mod(&1;2)=0') // 'mod({{1}};2)=0'
 * convertConditionVariables('&1 > &2')     // '{{1}} > {{2}}'
 */
export function convertConditionVariables(condition: string): string {
	if (!condition) return condition;

	return condition.replace(CONDITIONAL_PATTERNS.variable, '{{$1}}');
}

/**
 * Check if two conditions appear to be mutually exclusive (if/else pattern)
 *
 * Uses heuristics to detect complementary operators:
 * - < and >= or >
 * - > and <= or <
 * - = and !=
 * - >= and <
 * - <= and >
 *
 * @param cond1 - First condition
 * @param cond2 - Second condition
 * @returns True if the conditions appear to be mutually exclusive
 *
 * @example
 * areMutuallyExclusive('&2+&3<60', '&2+&3>=60')     // true
 * areMutuallyExclusive('&2+&3<60', '&2+&3>59')     // true (effectively exclusive)
 * areMutuallyExclusive('mod(&1;2)=0', 'mod(&1;2)!=0') // true
 * areMutuallyExclusive('&1<5', '&2>10')            // false (different expressions)
 */
export function areMutuallyExclusive(cond1: string, cond2: string): boolean {
	if (!cond1 || !cond2) return false;

	// Normalize whitespace
	const c1 = cond1.trim();
	const c2 = cond2.trim();

	// Pattern to extract the expression and operator
	// Matches: expression operator value
	// e.g., "&2+&3<60" -> ["&2+&3", "<", "60"]
	const comparisonPattern = /^(.+?)\s*(!=|>=|<=|>|<|=)\s*(.+)$/;

	const match1 = c1.match(comparisonPattern);
	const match2 = c2.match(comparisonPattern);

	if (!match1 || !match2) return false;

	const [, expr1, op1, val1] = match1;
	const [, expr2, op2, val2] = match2;

	// Expressions must be the same (or very similar)
	const normalizedExpr1 = expr1.replace(/\s/g, '');
	const normalizedExpr2 = expr2.replace(/\s/g, '');

	if (normalizedExpr1 !== normalizedExpr2) return false;

	// Check for complementary operators
	const complementaryPairs: [string, string][] = [
		['<', '>='],
		['>', '<='],
		['<=', '>'],
		['>=', '<'],
		['=', '!='],
		['!=', '=']
	];

	for (const [a, b] of complementaryPairs) {
		if (op1 === a && op2 === b && val1 === val2) {
			return true;
		}
	}

	// Check for adjacent values (e.g., <60 and >59)
	const numVal1 = parseFloat(val1);
	const numVal2 = parseFloat(val2);

	if (!isNaN(numVal1) && !isNaN(numVal2)) {
		// <N and >=N-1 (effectively exclusive for integers)
		if (op1 === '<' && op2 === '>' && numVal2 === numVal1 - 1) return true;
		if (op1 === '>' && op2 === '<' && numVal2 === numVal1 + 1) return true;
		if (op1 === '<' && op2 === '>=' && numVal1 === numVal2) return true;
		if (op1 === '>' && op2 === '<=' && numVal1 === numVal2) return true;
		if (op1 === '<=' && op2 === '>' && numVal1 === numVal2) return true;
		if (op1 === '>=' && op2 === '<' && numVal1 === numVal2) return true;
	}

	return false;
}

/**
 * Check if a string contains legacy conditionals
 *
 * @param input - The string to check
 * @returns True if legacy conditionals are found
 *
 * @example
 * hasLegacyConditionals('@@&2<60 ?? text@@')      // true
 * hasLegacyConditionals('{{if:{{2}}<60|text}}')  // false
 * hasLegacyConditionals('No conditionals here')   // false
 */
export function hasLegacyConditionals(input: string): boolean {
	if (!input) return false;

	// Reset regex lastIndex
	CONDITIONAL_PATTERNS.single.lastIndex = 0;
	return CONDITIONAL_PATTERNS.single.test(input);
}

/**
 * Find all legacy conditionals in a string
 *
 * @param input - The string to search
 * @returns Array of all legacy conditionals found (with their parsed content)
 */
export function findLegacyConditionals(
	input: string
): Array<{ full: string; condition: string; text: string; index: number }> {
	if (!input) return [];

	const found: Array<{ full: string; condition: string; text: string; index: number }> = [];

	// Reset regex lastIndex
	CONDITIONAL_PATTERNS.single.lastIndex = 0;

	let match;
	while ((match = CONDITIONAL_PATTERNS.single.exec(input)) !== null) {
		found.push({
			full: match[0],
			condition: match[1].trim(),
			text: match[2].trim(),
			index: match.index
		});
	}

	return found;
}

/**
 * Convert a single conditional to new syntax
 *
 * @param condition - The condition (e.g., "&2+&3<60")
 * @param text - The text to display when condition is true
 * @returns The new {{if:condition|text}} syntax
 *
 * @example
 * convertSingleConditional('&2+&3<60', 'Simple')
 * // '{{if:{{2}}+{{3}}<60|Simple}}'
 */
export function convertSingleConditional(condition: string, text: string): string {
	const convertedCondition = convertConditionVariables(condition.trim());
	return `{{if:${convertedCondition}|${text.trim()}}}`;
}

/**
 * Convert a paired (if/else) conditional to new syntax
 *
 * @param condition - The condition (e.g., "&2+&3<60")
 * @param thenText - The text to display when condition is true
 * @param elseText - The text to display when condition is false
 * @returns The new {{if:condition|then|else}} syntax
 *
 * @example
 * convertPairedConditional('&2+&3<60', 'Simple', 'Avec retenue')
 * // '{{if:{{2}}+{{3}}<60|Simple|Avec retenue}}'
 */
export function convertPairedConditional(
	condition: string,
	thenText: string,
	elseText: string
): string {
	const convertedCondition = convertConditionVariables(condition.trim());
	return `{{if:${convertedCondition}|${thenText.trim()}|${elseText.trim()}}}`;
}

/**
 * Convert all conditionals in a string
 *
 * Detects paired conditionals (if/else) and converts them to single {{if:cond|then|else}}
 * Converts remaining single conditionals to {{if:cond|text}}
 *
 * Processing order:
 * 1. Find all conditionals in the string
 * 2. Identify pairs that are mutually exclusive (if/else patterns)
 * 3. Convert pairs first, then remaining singles
 *
 * @param input - The string containing legacy conditionals
 * @returns Conversion result with the converted string and change details
 *
 * @example
 * const result = convertConditionals('@@&2+&3<60 ?? Simple @@ @@&2+&3>59 ?? Avec retenue @@');
 * // result.converted: '{{if:{{2}}+{{3}}<60|Simple|Avec retenue}}'
 * // result.hasChanges: true
 */
export function convertConditionals(input: string): ConditionalConversionResult {
	if (!input) {
		return {
			converted: input,
			changes: [],
			hasChanges: false
		};
	}

	const changes: ConditionalChange[] = [];
	let converted = input;

	// Find all conditionals
	const conditionals = findLegacyConditionals(input);

	if (conditionals.length === 0) {
		return {
			converted: input,
			changes: [],
			hasChanges: false
		};
	}

	// Track which conditionals have been processed
	const processed = new Set<number>();

	// First pass: identify and convert pairs
	for (let i = 0; i < conditionals.length; i++) {
		if (processed.has(i)) continue;

		const current = conditionals[i];

		// Look for a potential pair (the next conditional)
		for (let j = i + 1; j < conditionals.length; j++) {
			if (processed.has(j)) continue;

			const next = conditionals[j];

			// Check if they are adjacent (only whitespace between them)
			const textBetween = input.substring(current.index + current.full.length, next.index);

			// They should be adjacent (only whitespace/tabs/newlines between them)
			if (textBetween.trim() !== '') continue;

			// Check if conditions are mutually exclusive
			if (areMutuallyExclusive(current.condition, next.condition)) {
				// This is a paired conditional (if/else)
				const fullPairOriginal = input.substring(current.index, next.index + next.full.length);
				const replacement = convertPairedConditional(current.condition, current.text, next.text);

				changes.push({
					original: fullPairOriginal,
					replacement,
					type: 'paired',
					position: current.index
				});

				processed.add(i);
				processed.add(j);
				break;
			}
		}
	}

	// Second pass: convert remaining single conditionals
	for (let i = 0; i < conditionals.length; i++) {
		if (processed.has(i)) continue;

		const cond = conditionals[i];
		const replacement = convertSingleConditional(cond.condition, cond.text);

		changes.push({
			original: cond.full,
			replacement,
			type: 'single',
			position: cond.index
		});

		processed.add(i);
	}

	// Sort changes by position (descending) to avoid offset issues when replacing
	const sortedChanges = [...changes].sort((a, b) => b.position - a.position);

	// Apply replacements from end to start
	for (const change of sortedChanges) {
		const before = converted.substring(0, change.position);
		const after = converted.substring(change.position + change.original.length);
		converted = before + change.replacement + after;
	}

	// Re-sort changes by position (ascending) for reporting
	changes.sort((a, b) => a.position - b.position);

	return {
		converted,
		changes,
		hasChanges: changes.length > 0
	};
}

/**
 * Convert conditionals and return statistics
 *
 * @param input - The string to convert
 * @returns Object with converted string, changes, and statistics
 */
export function convertConditionalsWithStats(input: string): ConditionalConversionResult & {
	stats: ConditionalStats;
} {
	const result = convertConditionals(input);

	const stats: ConditionalStats = {
		single: 0,
		paired: 0,
		total: 0
	};

	// Count each type from the changes
	for (const change of result.changes) {
		if (change.type === 'single') {
			stats.single++;
		} else if (change.type === 'paired') {
			stats.paired++;
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
export function convertConditionalsBatch(inputs: string[]): ConditionalConversionResult[] {
	return inputs.map(convertConditionals);
}

/**
 * Validate that a conversion was successful
 *
 * Checks that:
 * 1. No legacy conditionals remain
 * 2. New conditionals are properly formed
 *
 * @param original - Original string
 * @param converted - Converted string
 * @returns True if conversion appears valid
 */
export function validateConditionalConversion(original: string, converted: string): boolean {
	// Check no legacy patterns remain
	if (hasLegacyConditionals(converted)) {
		return false;
	}

	// If original had conditionals, converted should have new syntax
	if (hasLegacyConditionals(original)) {
		// Check for at least one new-style conditional
		if (!/\{\{if:[^}]+\}\}/.test(converted)) {
			return false;
		}
	}

	return true;
}

/**
 * Count the number of legacy conditionals in a string
 *
 * @param input - The string to analyze
 * @returns The count of legacy conditionals
 */
export function countLegacyConditionals(input: string): number {
	if (!input) return 0;

	return findLegacyConditionals(input).length;
}

/**
 * Extract all unique conditions from legacy conditionals
 *
 * Useful for analysis and debugging
 *
 * @param input - The string to analyze
 * @returns Array of unique conditions found
 */
export function extractConditions(input: string): string[] {
	const conditionals = findLegacyConditionals(input);
	const conditions = new Set(conditionals.map((c) => c.condition));
	return Array.from(conditions);
}

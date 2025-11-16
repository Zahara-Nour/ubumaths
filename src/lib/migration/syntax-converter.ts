/**
 * TinyCAS to UbuMaths v2 Syntax Converter
 *
 * Converts old TinyMath/TinyCAS syntax patterns to new UbuMaths v2 syntax.
 * This converter handles all variable patterns, random generation, evaluation,
 * and special modifiers used in the legacy system.
 */

// Unused import retained for future validation needs
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { z } from 'zod';

/**
 * Result of a syntax conversion operation
 */
export interface ConversionResult {
	/** Whether conversion succeeded */
	success: boolean;
	/** Converted string if successful */
	converted?: string;
	/** List of errors encountered */
	errors?: string[];
	/** List of warnings about potential issues */
	warnings?: string[];
	/** Statistics about conversions made */
	stats?: ConversionStats;
}

/**
 * Statistics about conversions performed
 */
interface ConversionStats {
	/** Number of random integer patterns converted */
	randomIntegers: number;
	/** Number of exclusion patterns converted */
	exclusions: number;
	/** Number of n-digit patterns converted */
	nDigitNumbers: number;
	/** Number of list selections converted */
	listSelections: number;
	/** Number of variable references converted */
	variableRefs: number;
	/** Number of evaluations converted */
	evaluations: number;
	/** Total number of conversions */
	total: number;
}

/**
 * Conversion rule definition
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ConversionRule {
	/** Name of the rule for debugging */
	name: string;
	/** Pattern to match */
	pattern: RegExp;
	/** Replacement function */
	replacement: (match: RegExpMatchArray) => string;
	/** Track conversions for stats */
	statKey?: keyof Omit<ConversionStats, 'total'>;
}

/**
 * Main syntax converter class
 */
export class TinyCASConverter {
	private stats: ConversionStats = {
		randomIntegers: 0,
		exclusions: 0,
		nDigitNumbers: 0,
		listSelections: 0,
		variableRefs: 0,
		evaluations: 0,
		total: 0
	};

	private warnings: string[] = [];
	private errors: string[] = [];

	/**
	 * Convert TinyCAS syntax to UbuMaths v2 syntax
	 * @param oldSyntax - String containing old TinyCAS patterns
	 * @returns Conversion result with converted string or errors
	 */
	public convert(oldSyntax: string): ConversionResult {
		// Reset state for each conversion
		this.resetState();

		try {
			// Validate input
			if (!oldSyntax) {
				return {
					success: false,
					errors: ['Empty input provided']
				};
			}

			// Apply conversions in specific order to avoid conflicts
			let converted = oldSyntax;

			// Step 1: Convert evaluation expressions FIRST (before variable conversion)
			// This is important because evaluations contain variable references
			// that need to be converted as part of the evaluation
			converted = this.convertEvaluations(converted);

			// Step 2: Convert random patterns with exclusions (before simple random)
			converted = this.convertRandomWithExclusions(converted);

			// Step 3: Convert variable references
			converted = this.convertVariableReferences(converted);

			// Step 4: Convert other random patterns
			converted = this.convertRandomIntegers(converted);
			converted = this.convertNDigitNumbers(converted);
			converted = this.convertListSelections(converted);

			// Step 5: Check for unconverted patterns
			this.checkForUnconvertedPatterns(converted);

			// Calculate total conversions
			this.stats.total = Object.entries(this.stats)
				.filter(([key]) => key !== 'total')
				.reduce((sum, [_, val]) => sum + (typeof val === 'number' ? val : 0), 0);

			return {
				success: this.errors.length === 0,
				converted,
				errors: this.errors.length > 0 ? this.errors : undefined,
				warnings: this.warnings.length > 0 ? this.warnings : undefined,
				stats: this.stats
			};
		} catch (error) {
			return {
				success: false,
				errors: [
					`Unexpected error during conversion: ${error instanceof Error ? error.message : String(error)}`
				]
			};
		}
	}

	/**
	 * Convert variable references: &varname → {@:varname}
	 */
	private convertVariableReferences(input: string): string {
		// Match &followed by word characters or digits
		const pattern = /&(\w+)/g;

		return input.replace(pattern, (match, varName) => {
			this.stats.variableRefs++;
			return `{@:${varName}}`;
		});
	}

	/**
	 * Convert random integers with exclusions: $e[min;max]\{excl1;excl2} → {#:min-max!excl1,excl2}
	 */
	private convertRandomWithExclusions(input: string): string {
		// Pattern for random with exclusions
		// Note: \\{ in the original is actually \{ in the string
		const pattern = /\$e\[([^;]+);([^\]]+)\]\\{([^}]+)\}/g;

		return input.replace(pattern, (match, min, max, exclusions) => {
			this.stats.exclusions++;

			// Count variable references in exclusions
			const varMatches = exclusions.match(/&(\w+)/g);
			if (varMatches) {
				this.stats.variableRefs += varMatches.length;
			}

			// Convert exclusion list from semicolon to comma separated
			// Also convert any variable references in exclusions
			const convertedExclusions = this.convertExclusionList(exclusions);

			return `{#:${min}-${max}!${convertedExclusions}}`;
		});
	}

	/**
	 * Convert simple random integers: $e[min;max] → {#:min-max}
	 */
	private convertRandomIntegers(input: string): string {
		// Pattern for simple random integers (without exclusions)
		const pattern = /\$e\[([^;]+);([^\]]+)\]/g;

		return input.replace(pattern, (match, min, max) => {
			this.stats.randomIntegers++;
			return `{#:${min}-${max}}`;
		});
	}

	/**
	 * Convert n-digit number generation: $e{n;m} → {#:n.0} or {digits:n-m}
	 */
	private convertNDigitNumbers(input: string): string {
		// First handle patterns with variable references like $e{&1;&1}
		const varPattern = /\$e\{([^}]+)\}/g;

		return input.replace(varPattern, (match, content) => {
			// Check if it contains only digits and semicolons
			if (!/^\d+;\d+$/.test(content)) {
				// Contains variable references or other non-digit content
				this.warnings.push(`Complex n-digit pattern $e{${content}} may need manual review`);

				// Try to convert variable references within it
				const convertedContent = content.replace(/&(\w+)/g, '{@:$1}');

				// Return a custom pattern that will need implementation
				return `{digits:${convertedContent}}`;
			}

			// Split the numeric pattern
			const parts = content.split(';');
			const n = parts[0];
			const m = parts[1];

			this.stats.nDigitNumbers++;

			if (n === m) {
				// Same number of digits - use special notation
				// $e{3;3} means 3-digit number (100-999)
				if (n === '2') return '{#:10-99}';
				if (n === '3') return '{#:100-999}';
				if (n === '4') return '{#:1000-9999}';
				if (n === '5') return '{#:10000-99999}';

				// For other cases, use a custom pattern
				this.warnings.push(
					`N-digit pattern $e{${n};${n}} converted to {#:${n}.0} - verify range is correct`
				);
				return `{#:${n}.0}`;
			} else {
				// Variable number of digits
				this.warnings.push(`Variable digit pattern $e{${n};${m}} needs custom implementation`);
				return `{digits:${n}-${m}}`;
			}
		});
	}

	/**
	 * Convert random selection from list: $l{item1;item2;item3} → {#list:item1,item2,item3}
	 */
	private convertListSelections(input: string): string {
		// Pattern for list selection with semicolon separator
		const pattern1 = /\$l\{([^}]+)\}/g;

		return input.replace(pattern1, (match, items) => {
			this.stats.listSelections++;

			// Check if it's using colon separator (alternative syntax)
			let separator = ';';
			if (items.includes(':') && !items.includes(';')) {
				separator = ':';
			}

			// Split items and convert each one
			const itemList = items.split(separator).map((item: string) => {
				// Trim whitespace
				item = item.trim();

				// Check if item contains nested expressions
				if (item.includes('$e')) {
					// This is a complex case like $l{0;$e[1;9]}
					this.warnings.push(`Complex list item "${item}" may need manual review`);
					// Try to convert nested expressions
					item = this.convertRandomIntegers(item);
				}

				return item;
			});

			// Join with commas for new syntax
			return `{#list:${itemList.join(',')}}`;
		});
	}

	/**
	 * Convert evaluation expressions: [_expr_] → {eval:expr}
	 */
	private convertEvaluations(input: string): string {
		// Helper function to convert variables within expressions
		const convertVarsInExpr = (expr: string): string => {
			// Count variable conversions
			const varMatches = expr.match(/&(\w+)/g);
			if (varMatches) {
				this.stats.variableRefs += varMatches.length;
			}
			// Convert variable references within the expression
			return expr.replace(/&(\w+)/g, '{@:$1}');
		};

		// Pattern for basic evaluation [_..._]
		// Match [_ followed by anything until _]
		const pattern1 = /\[_([\s\S]*?)_\]/g;

		let result = input.replace(pattern1, (match, expr) => {
			this.stats.evaluations++;
			const convertedExpr = convertVarsInExpr(expr);
			return `{eval:${convertedExpr}}`;
		});

		// Pattern for decimal evaluation [._..._.]
		const pattern2 = /\[._([^]*?)_.\]/g;
		result = result.replace(pattern2, (match, expr) => {
			this.stats.evaluations++;
			this.warnings.push(`Decimal evaluation [._${expr}_.] converted - verify decimal handling`);
			const convertedExpr = convertVarsInExpr(expr);
			return `{eval:${convertedExpr}}`;
		});

		// Pattern for evaluation with + sign [+_..._]
		const pattern3 = /\[+_([^]*?)_]/g;
		result = result.replace(pattern3, (match, expr) => {
			this.stats.evaluations++;
			this.warnings.push(
				`Evaluation with + sign [+_${expr}_] converted - may need special handling`
			);
			const convertedExpr = convertVarsInExpr(expr);
			return `{eval:+${convertedExpr}}`;
		});

		// Pattern for evaluation with parentheses [(_..._]
		const pattern4 = /\[\(_([^]*?)_]/g;
		result = result.replace(pattern4, (match, expr) => {
			this.stats.evaluations++;
			this.warnings.push(
				`Evaluation with parentheses [(_${expr}_] converted - may need special handling`
			);
			const convertedExpr = convertVarsInExpr(expr);
			return `{eval:(${convertedExpr})}`;
		});

		return result;
	}

	/**
	 * Convert exclusion list from semicolon to comma separated
	 */
	private convertExclusionList(exclusions: string): string {
		// First, handle any variable references in the exclusions
		let processedExclusions = exclusions;

		// Convert variable references
		processedExclusions = processedExclusions.replace(/&(\w+)/g, '{@:$1}');

		// Split by semicolon and join with comma
		const items = processedExclusions.split(';').map((item) => item.trim());

		return items.join(',');
	}

	/**
	 * Check for patterns that might not have been converted
	 */
	private checkForUnconvertedPatterns(converted: string): void {
		// Check for remaining old patterns
		if (converted.includes('$e[')) {
			this.warnings.push('Possible unconverted random integer pattern detected');
		}
		if (converted.includes('$e{')) {
			this.warnings.push('Possible unconverted n-digit pattern detected');
		}
		if (converted.includes('$l{')) {
			this.warnings.push('Possible unconverted list selection pattern detected');
		}
		if (converted.includes('&') && /&\w+/.test(converted)) {
			// Check if it's actually a variable reference (not HTML entity like &amp;)
			const matches = converted.match(/&(\w+)/g);
			if (matches && matches.some((m) => !m.match(/&(amp|lt|gt|quot|apos|nbsp);/))) {
				this.warnings.push('Possible unconverted variable reference detected');
			}
		}
		if (converted.includes('[_') && converted.includes('_]')) {
			this.warnings.push('Possible unconverted evaluation expression detected');
		}

		// Check for other TinyCAS patterns
		if (converted.includes('$d{')) {
			this.errors.push('Decimal pattern $d{} detected - not yet implemented');
		}
	}

	/**
	 * Reset converter state for new conversion
	 */
	private resetState(): void {
		this.stats = {
			randomIntegers: 0,
			exclusions: 0,
			nDigitNumbers: 0,
			listSelections: 0,
			variableRefs: 0,
			evaluations: 0,
			total: 0
		};
		this.warnings = [];
		this.errors = [];
	}
}

/**
 * Main conversion function for simple usage
 * @param oldSyntax - String containing old TinyCAS patterns
 * @returns Conversion result
 */
export function convertTinyCASToNew(oldSyntax: string): ConversionResult {
	const converter = new TinyCASConverter();
	return converter.convert(oldSyntax);
}

/**
 * Batch conversion function for multiple strings
 * @param oldSyntaxArray - Array of strings to convert
 * @returns Array of conversion results
 */
export function convertBatch(oldSyntaxArray: string[]): ConversionResult[] {
	const converter = new TinyCASConverter();
	return oldSyntaxArray.map((syntax) => converter.convert(syntax));
}

/**
 * Validate that a conversion is correct by checking structure
 * @param original - Original TinyCAS string
 * @param converted - Converted UbuMaths v2 string
 * @returns Whether conversion appears valid
 */
export function validateConversion(original: string, converted: string): boolean {
	// Basic validation checks

	// Check that old patterns are gone
	const oldPatterns = [/\$e\[/, /\$e\{/, /\$l\{/, /&\w+/, /\[_.*?_\]/];

	for (const pattern of oldPatterns) {
		if (pattern.test(converted)) {
			// Exception: & might be in HTML entities
			if (pattern.source === '&\\w+' && /&(amp|lt|gt|quot|apos|nbsp);/.test(converted)) {
				continue;
			}
			return false;
		}
	}

	// Check that new patterns exist if old ones did
	if (/\$e\[/.test(original) && !/{#:/.test(converted)) {
		return false;
	}

	if (/&\w+/.test(original) && !/{@:/.test(converted)) {
		return false;
	}

	if (/\[_.*?_\]/.test(original) && !/{eval:/.test(converted)) {
		return false;
	}

	return true;
}

// Test cases (as comments for reference)
// These should all pass when the converter is working correctly:

// Random integers:
// "$e[1;10]" → "{#:1-10}"
// "$e[0;99]" → "{#:0-99}"
// "$e[-5;5]" → "{#:-5-5}"

// Random with exclusions:
// "$e[1;10]\\{5}" → "{#:1-10!5}"
// "$e[1;10]\\{5;7}" → "{#:1-10!5,7}"
// "$e[0;9]\\{&1}" → "{#:0-9!{@:1}}"
// "$e[0;9]\\{&1;&2}" → "{#:0-9!{@:1},{@:2}}"

// N-digit numbers:
// "$e{3;3}" → "{#:100-999}" or "{#:3.0}"
// "$e{2;2}" → "{#:10-99}" or "{#:2.0}"
// "$e{4;4}" → "{#:1000-9999}" or "{#:4.0}"

// List selection:
// "$l{1;2;5;10}" → "{#list:1,2,5,10}"
// "$l{rouge;bleu;vert}" → "{#list:rouge,bleu,vert}"
// "$l{0;$e[1;9]}" → "{#list:0,{#:1-9}}" (with warning)

// Variable references:
// "&1" → "{@:1}"
// "&2" → "{@:2}"
// "&varname" → "{@:varname}"

// Evaluations:
// "[_&1+&2_]" → "{eval:{@:1}+{@:2}}"
// "[_&1*10+&2_]" → "{eval:{@:1}*10+{@:2}}"
// "[_2*&1_]" → "{eval:2*{@:1}}"
// "[_10-&1_]" → "{eval:10-{@:1}}"
// "[._expression_.]" → "{eval:expression}" (with warning)
// "[+_expression_]" → "{eval:+expression}" (with warning)
// "[(_expression_]" → "{eval:(expression)}" (with warning)

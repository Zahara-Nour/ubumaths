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
import { numberToLetterName } from './question-transformer';

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
	/** Number of relative integer patterns converted */
	relativeIntegers: number;
	/** Number of decimal patterns converted */
	decimals: number;
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
	/** Number of color references converted */
	colorReferences: number;
	/** Number of ternary operators converted */
	ternaryOperators: number;
	/** Number of mini/maxi functions converted */
	minMaxFunctions: number;
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
		relativeIntegers: 0,
		decimals: 0,
		exclusions: 0,
		nDigitNumbers: 0,
		listSelections: 0,
		variableRefs: 0,
		evaluations: 0,
		colorReferences: 0,
		ternaryOperators: 0,
		minMaxFunctions: 0,
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

			// Step 0: Convert color references FIRST (before evaluations)
			// This prevents color store calls from being treated as evaluations
			converted = this.convertColorReferences(converted);

			// Step 1: Convert ternary operators BEFORE evaluations
			// This is critical because ternary values can contain [_..._] patterns
			// and the :: separator would conflict with {{eval:...}} colons
			converted = this.convertTernaryOperators(converted);

			// Step 2: Convert mini/maxi functions (before evaluations so they're in the right format)
			converted = this.convertMinMaxFunctions(converted);

			// Step 3: Convert evaluation expressions (before variable conversion)
			// This is important because evaluations contain variable references
			// that need to be converted as part of the evaluation
			converted = this.convertEvaluations(converted);

			// Step 4: Convert list selections FIRST (before random conversions)
			// Lists may contain nested $e[...] that need to be converted to raw ranges (not {{...}})
			converted = this.convertListSelections(converted);

			// Step 5: Convert random patterns with exclusions (before simple random)
			converted = this.convertRandomWithExclusions(converted);

			// Step 6: Convert variable references
			converted = this.convertVariableReferences(converted);

			// Step 7: Convert other random patterns
			converted = this.convertRelativeIntegers(converted);
			converted = this.convertDecimalPatterns(converted);
			converted = this.convertRandomIntegers(converted);
			converted = this.convertNDigitNumbers(converted);

			// Step 7: Check for unconverted patterns
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
	 * Convert Svelte store color references to color template syntax
	 * ${get(colorName)} → {{color:colorName}}
	 */
	private convertColorReferences(input: string): string {
		// Pattern: ${get(colorName)} or ${get(color1)}
		const colorPattern = /\$\{get\((\w+)\)\}/g;

		return input.replace(colorPattern, (match, colorName) => {
			// Check if this is likely a color variable (starts with "color" or "couleur")
			if (colorName.match(/^(color|couleur|col)\d*$/i)) {
				this.stats.colorReferences++;
				// Map common color names to palette references
				// color1, color2, etc. will use primary palette with different indices
				const colorMatch = colorName.match(/(\d+)$/);
				if (colorMatch) {
					const index = parseInt(colorMatch[1]) - 1; // Convert to 0-based
					return `{{color:primary.${index}}}`;
				}
				// Generic color name without number
				return `{{color:primary}}`;
			}
			// Not a color reference, leave as-is for now (might be other store variable)
			this.warnings.push(`Store reference ${match} detected - may need manual review`);
			return match;
		});
	}

	/**
	 * Convert variable references: &varname → {{varname}}, &1 → {{a}}
	 *
	 * Important: Numeric variable names (&1, &2) must NOT include trailing letters.
	 * E.g., "&1x" should become "{{a}}x", not "{{1x}}"
	 */
	private convertVariableReferences(input: string): string {
		// First, convert numeric variable references: &1 → {{a}}, &2 → {{b}}, etc.
		// These MUST NOT include trailing letters (e.g., &1x should be &1 followed by x)
		let result = input.replace(/&(\d+)/g, (match, digits) => {
			this.stats.variableRefs++;
			const name = numberToLetterName(parseInt(digits, 10));
			return `{{${name}}}`;
		});

		// Then, convert named variable references: &varname → {{varname}}
		// These are non-numeric identifiers that start with a letter
		result = result.replace(/&([a-zA-Z_]\w*)/g, (match, varName) => {
			this.stats.variableRefs++;
			return `{{${varName}}}`;
		});

		return result;
	}

	/**
	 * Convert random integers with exclusions: $e[min;max]\{excl1;excl2} → {{min..max!excl1,excl2}}
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

			return `{{${min}..${max}!${convertedExclusions}}}`;
		});
	}

	/**
	 * Convert simple random integers: $e[min;max] → {{min..max}}
	 */
	private convertRandomIntegers(input: string): string {
		// Pattern for simple random integers (without exclusions)
		const pattern = /\$e\[([^;]+);([^\]]+)\]/g;

		return input.replace(pattern, (match, min, max) => {
			this.stats.randomIntegers++;
			return `{{${min}..${max}}}`;
		});
	}

	/**
	 * Convert relative integers: $er[min;max] → {{min..max;±}} or $er{n} → {{n..n;±}}
	 *
	 * Relative integers generate non-zero signed values from the union
	 * of {-max..-min} ∪ {min..max}
	 */
	private convertRelativeIntegers(input: string): string {
		// Pattern for $er[min;max] - range form
		const rangePattern = /\$er\[([^;]+);([^\]]+)\]/g;
		let result = input.replace(rangePattern, (match, min, max) => {
			this.stats.relativeIntegers++;
			// Convert to new ;± suffix syntax with .. separator
			return `{{${min}..${max};±}}`;
		});

		// Pattern for $er{n} - single value form (generates ±n)
		const singlePattern = /\$er\{(\d+)\}/g;
		result = result.replace(singlePattern, (match, n) => {
			this.stats.relativeIntegers++;
			// Single value: $er{1} → {{1..1;±}}
			return `{{${n}..${n};±}}`;
		});

		return result;
	}

	/**
	 * Convert decimal patterns: $d{n;m} → {{digits:n.m}}
	 *
	 * Generates decimals with n digits before and m digits after decimal point.
	 * Supports nested expressions and variable references.
	 */
	private convertDecimalPatterns(input: string): string {
		// Pattern for $d{...} - need to handle nested braces
		// This matches $d{ followed by content until the matching }
		const pattern = /\$d\{((?:[^{}]|\{\{[^}]*\}\})+)\}/g;

		return input.replace(pattern, (match, content) => {
			this.stats.decimals++;

			// Split on semicolon (separator between digitsBefore and digitsAfter)
			const parts = content.split(';');
			if (parts.length !== 2) {
				this.warnings.push(`Decimal pattern $d{${content}} has unexpected format`);
				return `{{digits:${content}}}`;
			}

			const digitsBefore = parts[0].trim();
			const digitsAfter = parts[1].trim();

			// Check for complex expressions that need manual review
			if (digitsBefore.includes('$e') || digitsAfter.includes('$e')) {
				// Has nested random - convert those first
				this.warnings.push(
					`Complex decimal pattern $d{${content}} with nested random - verify conversion`
				);
				// The nested $e patterns will have been converted to {{...}} by this point
				// since convertDecimalPatterns runs after convertVariableReferences
			}

			// Return new syntax: {{digits:n.m}}
			return `{{digits:${digitsBefore}.${digitsAfter}}}`;
		});
	}

	/**
	 * Convert n-digit number generation: $e{n;m} → {{n.0}} or {{digits:n..m}}
	 */
	private convertNDigitNumbers(input: string): string {
		// First handle patterns with variable references like $e{&1;&1}
		// Note: Variables are already converted by this point (Step 3), so we need to handle {{...}}
		// Use a pattern that handles nested {{...}} braces properly
		const varPattern = /\$e\{((?:[^{}]|\{\{[^}]*\}\})+)\}/g;

		return input.replace(varPattern, (match, content) => {
			// Check if it contains only digits and semicolons
			if (!/^\d+;\d+$/.test(content)) {
				// Contains variable references (already converted to {{...}}) or other non-digit content
				this.warnings.push(`Complex n-digit pattern $e{${content}} may need manual review`);

				// Content already has variables converted (e.g., "{{1}};{{1}}")
				// No further conversion needed - just wrap it
				return `{{digits:${content}}}`;
			}

			// Split the numeric pattern
			const parts = content.split(';');
			const n = parts[0];
			const m = parts[1];

			this.stats.nDigitNumbers++;

			if (n === m) {
				// Same number of digits - use special notation
				// $e{3;3} means 3-digit number (100-999)
				if (n === '2') return '{{10..99}}';
				if (n === '3') return '{{100..999}}';
				if (n === '4') return '{{1000..9999}}';
				if (n === '5') return '{{10000..99999}}';

				// For other cases, use digits:n (n-digit integer)
				this.warnings.push(
					`N-digit pattern $e{${n};${n}} converted to {{digits:${n}}} - verify range is correct`
				);
				return `{{digits:${n}}}`;
			} else {
				// Variable number of digits
				this.warnings.push(`Variable digit pattern $e{${n};${m}} needs custom implementation`);
				return `{{digits:${n}..${m}}}`;
			}
		});
	}

	/**
	 * Split a string by separator, but respect brackets (don't split inside [...] or {...})
	 */
	private splitRespectingBrackets(str: string, separator: string): string[] {
		const result: string[] = [];
		let current = '';
		let depth = 0;

		for (let i = 0; i < str.length; i++) {
			const char = str[i];
			if (char === '[' || char === '{') {
				depth++;
				current += char;
			} else if (char === ']' || char === '}') {
				depth--;
				current += char;
			} else if (char === separator && depth === 0) {
				result.push(current);
				current = '';
			} else {
				current += char;
			}
		}
		if (current) {
			result.push(current);
		}
		return result;
	}

	/**
	 * Extract list content from $l{...}, handling nested \{...\} for exclusions
	 */
	private extractListContent(
		input: string,
		startIndex: number
	): { content: string; endIndex: number } | null {
		// startIndex should point to the '{' after '$l'
		if (input[startIndex] !== '{') return null;

		let depth = 1;
		let i = startIndex + 1;
		const start = i;

		while (i < input.length && depth > 0) {
			const char = input[i];
			// Handle escaped brace sequence \{...\} - scan to the closing }
			// The exclusion syntax is \{items} where items ends at first }
			if (char === '\\' && i + 1 < input.length && input[i + 1] === '{') {
				// Skip \{ and scan to find the closing }
				i += 2; // Move past \{
				while (i < input.length && input[i] !== '}') {
					i++;
				}
				if (i < input.length) {
					i++; // Skip the closing }
				}
				continue;
			}
			if (char === '{') depth++;
			if (char === '}') depth--;
			i++;
		}

		if (depth !== 0) return null; // Unbalanced braces

		return {
			content: input.slice(start, i - 1), // Exclude the final '}'
			endIndex: i
		};
	}

	/**
	 * Convert random selection from list: $l{item1;item2;item3} → {{item1|item2|item3}}
	 */
	private convertListSelections(input: string): string {
		let result = '';
		let i = 0;

		while (i < input.length) {
			// Look for $l{
			if (input.slice(i, i + 3) === '$l{') {
				const extracted = this.extractListContent(input, i + 2);
				if (extracted) {
					const items = extracted.content;
					this.stats.listSelections++;

					// Check if it's using colon separator (alternative syntax)
					let separator = ';';
					if (items.includes(':') && !items.includes(';')) {
						separator = ':';
					}

					// Process items and build replacement
					const itemList = this.processListItems(items, separator);
					result += `{{${itemList.join('|')}}}`;
					i = extracted.endIndex;
					continue;
				}
			}
			result += input[i];
			i++;
		}

		return result;
	}

	/**
	 * Process list items, converting nested patterns
	 */
	private processListItems(items: string, separator: string): string[] {
		return this.splitRespectingBrackets(items, separator).map((item: string) => {
			// Trim whitespace
			item = item.trim();

			// IMPORTANT: Handle patterns with exclusions FIRST (before simple random patterns)
			// $e[min;max]\{excl} → min..max!excl (with variable conversion)
			if (item.includes('$e[') && item.includes('\\{')) {
				item = item.replace(/\$e\[([^;]+);([^\]]+)\]\\{([^}]+)\}/g, (_, min, max, excl) => {
					// Convert variable references in exclusion list
					const convertedExcl = excl
						.replace(/&(\d+)/g, (_: string, d: string) => numberToLetterName(parseInt(d, 10)))
						.replace(/;/g, ','); // Convert semicolon separators to commas
					return `${min}..${max}!${convertedExcl}`;
				});
			}

			// Check if item contains simple random expressions $e[1;9] (without exclusions)
			if (item.includes('$e[')) {
				// Convert $e[min;max] → min..max (raw format, no {{...}})
				item = item.replace(/\$e\[([^;]+);([^\]]+)\]/g, '$1..$2');
			}

			// Check if item contains relative integers $er[...]
			if (item.includes('$er[')) {
				// Convert $er[min;max] → min..max;+- (raw format, no {{...}})
				item = item.replace(/\$er\[([^;]+);([^\]]+)\]/g, '$1..$2;+-');
			}

			return item;
		});
	}

	/**
	 * Convert evaluation expressions: [_expr_] → {{eval:expr}}
	 */
	private convertEvaluations(input: string): string {
		// Helper function to convert variables within expressions
		const convertVarsInExpr = (expr: string): string => {
			// Count variable conversions
			const varMatches = expr.match(/&(\w+)/g);
			if (varMatches) {
				this.stats.variableRefs += varMatches.length;
			}
			// Convert variable references within the expression (numeric → letters)
			// Simplified syntax - the parser now supports bare variable names
			return expr.replace(/&(\w+)/g, (match, varName) => {
				const name = /^\d+$/.test(varName) ? numberToLetterName(parseInt(varName, 10)) : varName;
				return name;
			});
		};

		// Pattern for basic evaluation [_..._]
		// Match [_ followed by anything until _]
		const pattern1 = /\[_([\s\S]*?)_\]/g;

		let result = input.replace(pattern1, (match, expr) => {
			this.stats.evaluations++;
			const convertedExpr = convertVarsInExpr(expr);
			return `{{eval:${convertedExpr}}}`;
		});

		// Pattern for decimal evaluation [._..._.]
		const pattern2 = /\[\._([\s\S]*?)_\.\]/g;
		result = result.replace(pattern2, (match, expr) => {
			this.stats.evaluations++;
			this.warnings.push(`Decimal evaluation [._${expr}_.] converted - verify decimal handling`);
			const convertedExpr = convertVarsInExpr(expr);
			return `{{eval:${convertedExpr}}}`;
		});

		// Pattern for evaluation with + sign [+_..._]
		const pattern3 = /\[\+_([\s\S]*?)_\]/g;
		result = result.replace(pattern3, (match, expr) => {
			this.stats.evaluations++;
			this.warnings.push(
				`Evaluation with + sign [+_${expr}_] converted - may need special handling`
			);
			const convertedExpr = convertVarsInExpr(expr);
			return `{{eval:+${convertedExpr}}}`;
		});

		// Pattern for evaluation with parentheses [(_..._]
		const pattern4 = /\[\(_([\s\S]*?)_\]/g;
		result = result.replace(pattern4, (match, expr) => {
			this.stats.evaluations++;
			this.warnings.push(
				`Evaluation with parentheses [(_${expr}_] converted - may need special handling`
			);
			const convertedExpr = convertVarsInExpr(expr);
			return `{{eval:(${convertedExpr})}}`;
		});

		return result;
	}

	/**
	 * Convert ternary operators: condition ?? trueVal :: falseVal → {{if:condition|trueVal|falseVal}}
	 *
	 * TinyCAS ternary syntax:
	 * - `&5<&6 ?? 0 :: 1` means: if &5 < &6 then 0 else 1
	 * - `mod(&1;2)=0 ?? 0 :: 1` means: if &1 is even then 0 else 1
	 *
	 * IMPORTANT: This runs BEFORE evaluation conversion, so values can contain [_..._]
	 */
	private convertTernaryOperators(input: string): string {
		// Pattern: condition ?? trueValue :: falseValue
		// Uses a more permissive pattern since this runs early in the pipeline
		// The trueValue can contain [_..._] patterns (evaluations not yet converted)
		// Use a greedy match for trueValue that stops at ::
		const pattern = /([^?\n]+?)\s*\?\?\s*(.+?)\s*::\s*([^\n,\]}"]+)/g;

		return input.replace(pattern, (match, condition, trueVal, falseVal) => {
			this.stats.ternaryOperators++;

			// Clean up whitespace
			condition = condition.trim();
			trueVal = trueVal.trim();
			falseVal = falseVal.trim();

			// Convert variable references in all parts (numeric → letters)
			// Simplified syntax - the parser now supports bare variable names
			const convertVars = (s: string) =>
				s.replace(/&(\w+)/g, (match, varName) => {
					const name = /^\d+$/.test(varName) ? numberToLetterName(parseInt(varName, 10)) : varName;
					return name;
				});
			condition = convertVars(condition);
			trueVal = convertVars(trueVal);
			falseVal = convertVars(falseVal);

			// Convert mod(a;b) syntax to mod(a,b) in condition
			condition = condition.replace(/mod\(([^;]+);([^)]+)\)/g, 'mod($1,$2)');

			// Convert comparison operators for consistency
			// TinyCAS uses = for equality, we keep it as is since it's math notation
			// But we need to handle := which is NOT assignment but comparison
			condition = condition.replace(/:=/g, '==');

			return `{{if:${condition}|${trueVal}|${falseVal}}}`;
		});
	}

	/**
	 * Convert mini/maxi functions: mini(a;b) → min(a,b) and maxi(a;b) → max(a,b)
	 *
	 * These functions appear in:
	 * - Variable definitions: $e[2;[_mini(10-&1;&1-1)_]]
	 * - Correction details: mini(&1;&2) or maxi(&2;&3)
	 */
	private convertMinMaxFunctions(input: string): string {
		// Pattern for mini(a;b) - minimum function
		const miniPattern = /mini\(([^;)]+);([^)]+)\)/g;
		let result = input.replace(miniPattern, (match, a, b) => {
			this.stats.minMaxFunctions++;
			return `min(${a.trim()},${b.trim()})`;
		});

		// Pattern for maxi(a;b) - maximum function
		const maxiPattern = /maxi\(([^;)]+);([^)]+)\)/g;
		result = result.replace(maxiPattern, (match, a, b) => {
			this.stats.minMaxFunctions++;
			return `max(${a.trim()},${b.trim()})`;
		});

		return result;
	}

	/**
	 * Convert exclusion list from semicolon to comma separated
	 */
	private convertExclusionList(exclusions: string): string {
		// First, handle any variable references in the exclusions
		let processedExclusions = exclusions;

		// Convert variable references (numeric → letters)
		// Simplified syntax - the parser now supports bare variable names
		processedExclusions = processedExclusions.replace(/&(\w+)/g, (match, varName) => {
			const name = /^\d+$/.test(varName) ? numberToLetterName(parseInt(varName, 10)) : varName;
			return name;
		});

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
			this.warnings.push('Possible unconverted decimal pattern $d{} detected');
		}
		if (converted.includes('$er')) {
			this.warnings.push('Possible unconverted relative integer pattern $er detected');
		}

		// Check for unconverted ternary operators
		if (/\?\?.*::/.test(converted)) {
			this.warnings.push('Possible unconverted ternary operator ?? :: detected');
		}

		// Check for unconverted mini/maxi functions
		if (/mini\(|maxi\(/.test(converted)) {
			this.warnings.push('Possible unconverted mini/maxi function detected');
		}
	}

	/**
	 * Reset converter state for new conversion
	 */
	private resetState(): void {
		this.stats = {
			randomIntegers: 0,
			relativeIntegers: 0,
			decimals: 0,
			exclusions: 0,
			nDigitNumbers: 0,
			listSelections: 0,
			variableRefs: 0,
			evaluations: 0,
			colorReferences: 0,
			ternaryOperators: 0,
			minMaxFunctions: 0,
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
	const oldPatterns = [/\$e\[/, /\$e\{/, /\$er[[{]/, /\$d\{/, /\$l\{/, /&\w+/, /\[_.*?_\]/];

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
	if (/\$e\[/.test(original) && !/\{\{.*?\}\}/.test(converted)) {
		return false;
	}

	if (/&\w+/.test(original) && !/\{\{.*?\}\}/.test(converted)) {
		return false;
	}

	if (/\[_.*?_\]/.test(original) && !/\{\{eval:/.test(converted)) {
		return false;
	}

	return true;
}

// Test cases (as comments for reference)
// These should all pass when the converter is working correctly:

// Random integers:
// "$e[1;10]" → "{{1..10}}"
// "$e[0;99]" → "{{0..99}}"
// "$e[-5;5]" → "{{-5..5}}"

// Relative integers:
// "$er[2;9]" → "{{2..9;±}}"
// "$er[1;5]" → "{{1..5;±}}"
// "$er{1}" → "{{1..1;±}}"

// Decimal patterns (using digits: prefix):
// "$d{1;1}" → "{{digits:1.1}}"
// "$d{2;3}" → "{{digits:2.3}}"
// "$d{0;2}" → "{{digits:0.2}}"

// Random with exclusions:
// "$e[1;10]\\{5}" → "{{1..10!5}}"
// "$e[1;10]\\{5;7}" → "{{1..10!5,7}}"
// "$e[0;9]\\{&1}" → "{{0..9!a}}"
// "$e[0;9]\\{&1;&2}" → "{{0..9!a,b}}"

// N-digit numbers:
// "$e{3;3}" → "{{100..999}}" or "{{3.0}}"
// "$e{2;2}" → "{{10..99}}" or "{{2.0}}"
// "$e{4;4}" → "{{1000..9999}}" or "{{4.0}}"

// List selection:
// "$l{1;2;5;10}" → "{{1|2|5|10}}"
// "$l{rouge;bleu;vert}" → "{{rouge|bleu|vert}}"
// "$l{0;$e[1;9]}" → "{{0|{{1..9}}}}" (with warning)

// Variable references:
// "&1" → "{{1}}"
// "&2" → "{{2}}"
// "&varname" → "{{varname}}"

// Evaluations (simplified syntax - bare variable names):
// "[_&1+&2_]" → "{{eval:a+b}}"
// "[_&1*10+&2_]" → "{{eval:a*10+b}}"
// "[_2*&1_]" → "{{eval:2*a}}"
// "[_10-&1_]" → "{{eval:10-a}}"
// "[._expression_.]" → "{{eval:expression}}" (with warning)
// "[+_expression_]" → "{{eval:+expression}}" (with warning)
// "[(_expression_]" → "{{eval:(expression)}}" (with warning)

// ============================================================================
// MATH DELIMITER FIXER
// ============================================================================

// ============================================================================
// SIMPLIFIED SYNTAX CONVERTER (for variable expressions)
// ============================================================================

/**
 * Convert legacy {{...}} syntax to simplified syntax for variable expressions.
 *
 * This is used ONLY for variable definitions (QuestionVariable.expression),
 * NOT for text templates where {{...}} is still required for variable references.
 *
 * Conversions:
 * - {{1..10}} → 1..10
 * - {{1..10!5}} → 1..10!5
 * - {{2..9;±}} → 2..9;+-
 * - {{1.2}} → digits:1.2 (decimal by digits needs prefix for clarity)
 * - {{digits:1.2}} → digits:1.2
 * - {{eval:a+b}} → eval:a+b
 * - {{rouge|vert|bleu}} → rouge|vert|bleu
 * - {{a}} → a (single variable reference)
 * - {{if:...}} → {{if:...}} (kept as-is, not in simplified syntax)
 * - {{color:...}} → {{color:...}} (kept as-is, not in simplified syntax)
 *
 * @param legacySyntax - Expression in {{...}} format
 * @returns Expression in simplified format
 */
export function toSimplifiedSyntax(legacySyntax: string): string {
	const trimmed = legacySyntax.trim();

	// If it doesn't contain {{, return as-is (already simple or literal)
	if (!trimmed.includes('{{')) {
		return legacySyntax;
	}

	// Check if the whole expression is wrapped in outer {{...}}
	// This needs to handle nested {{...}} like {{2..9-{{a}}}}
	if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) {
		// Find the matching closing }} for the opening {{
		let depth = 0;
		let closingIndex = -1;
		for (let i = 0; i < trimmed.length; i++) {
			if (trimmed[i] === '{' && trimmed[i + 1] === '{') {
				depth++;
				i++; // Skip the second {
			} else if (trimmed[i] === '}' && trimmed[i + 1] === '}') {
				depth--;
				i++; // Skip the second }
				if (depth === 0) {
					closingIndex = i;
					break;
				}
			}
		}

		// If the closing }} is at the end, the whole expression is wrapped
		if (closingIndex === trimmed.length - 1) {
			// Extract the content between outer {{ and }}
			const content = trimmed.slice(2, -2);

			// Keep special prefixes that aren't in simplified syntax
			if (content.startsWith('if:') || content.startsWith('color:')) {
				return legacySyntax;
			}

			// Simplify inner {{varName}} references to just varName
			let simplified = content.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, '$1');

			// Also simplify inner {{range}} patterns like {{1..2}} to just 1..2
			// This handles patterns inside digits: like digits:{{1..2}};{{0..2}}
			simplified = simplified.replace(/\{\{([^}]+)\}\}/g, '$1');

			// Convert ± to +- for sign modifier
			simplified = simplified.replace(/±/g, '+-');

			// Add digits: prefix for decimal-by-digits pattern (e.g., "1.2" meaning 1 digit before, 2 after)
			// This distinguishes it from a numeric literal like "1.2"
			if (/^\d+\.\d+$/.test(simplified) && !simplified.includes('..')) {
				simplified = `digits:${simplified}`;
			}

			return simplified;
		}
	}

	// Multiple tokens or mixed content - more complex case
	// Try to strip {{...}} from generator expressions (eval:, digits:, random specs)
	let result = legacySyntax;

	// Strip {{eval:...}} → eval:... (handles nested {{}} and single {} for LaTeX)
	// The pattern allows: non-brace chars, single LaTeX braces {}, or double {{}}
	result = result.replace(/\{\{(eval:(?:[^{}]|\{[^{}]*\}|\{\{[^}]*\}\})*)\}\}/g, (_, content) => {
		// Also strip inner {{}} from the eval content for bare variable names
		return content.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, '$1');
	});

	// Strip {{digits:...}} → digits:... (handles nested {{}} inside)
	result = result.replace(/\{\{(digits:(?:[^{}]|\{\{[^}]*\}\})*)\}\}/g, (_, content) => {
		// Also strip inner {{}} from the digits content
		return content.replace(/\{\{([^}]+)\}\}/g, '$1');
	});

	// Strip {{min..max...}} → min..max... (random specs)
	// This handles patterns like {{2..5;±}} → 2..5;+-
	result = result.replace(/\{\{(\d+\.\.\d+[^}]*)\}\}/g, (_, content) => {
		return content.replace(/±/g, '+-');
	});

	// Also strip {{}} from inside digits: content (even without outer {{}})
	// digits:{{1..2}};{{1..2}} → digits:1..2;1..2
	result = result.replace(/digits:([^;\s]+);([^;\s]+)/g, (_, part1, part2) => {
		const stripped1 = part1.replace(/\{\{([^}]+)\}\}/g, '$1');
		const stripped2 = part2.replace(/\{\{([^}]+)\}\}/g, '$1');
		return `digits:${stripped1};${stripped2}`;
	});

	// Strip {{random:...}} → random:...
	result = result.replace(/\{\{(random:[^}]+)\}\}/g, '$1');

	// Strip {{a|b|c}} → a|b|c (discrete lists)
	result = result.replace(/\{\{([^}|]+(?:\|[^}|]+)+)\}\}/g, '$1');

	// Strip {{...}} with ranges/unions (semicolon-separated): {{1..9;11..99}} → 1..9;11..99
	// Also handles simple lists like {{a;b}}
	result = result.replace(/\{\{([^}]+;[^}]+)\}\}/g, '$1');

	// Strip remaining simple {{...}} wrappers that weren't caught above
	// Only strip if content looks like a valid expression (not text)
	result = result.replace(/\{\{([a-zA-Z_]\w*)\}\}/g, '$1');

	// Reduce LaTeX double braces {{...}} to single {..} when content is math-like
	// This handles cases like {{b}/{d}} → {b}/{d} (fraction notation)
	// The pattern matches {{...}} where content contains } followed by / followed by {
	result = result.replace(/\{\{(\w+\}\/\{\w+)\}\}/g, '{$1}');

	return result;
}

/**
 * Convert all {{varName}} references to bare variable names.
 *
 * Used for expression variables (like expression1) where we want
 * `a^b*a^c` instead of `{{a}}^{{b}}*{{a}}^{{c}}`.
 *
 * This allows cleaner syntax in stored expressions, and the resolver
 * handles bare variable name substitution automatically.
 *
 * @param expression - Expression with {{...}} variable references
 * @returns Expression with bare variable names
 *
 * @example
 * toBareVariableSyntax('{{a}}^{{b}}*{{a}}^{{c}}')  // → 'a^b*a^c'
 * toBareVariableSyntax('{{a}} + {{b}}')            // → 'a + b'
 * toBareVariableSyntax('10^{{n}}')                 // → '10^n'
 */
export function toBareVariableSyntax(expression: string): string {
	// Replace all {{varName}} with just varName
	// Only matches valid variable names (letters, digits, underscores, starting with letter/underscore)
	return expression.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, '$1');
}

/**
 * Fix math delimiters: convert $$...$$ to $...$ when used inline.
 *
 * In LaTeX/ubumark:
 * - $...$ or ~...~ = inline math (within text flow)
 * - $$...$$ or ~~...~~ = display math (block, centered)
 *
 * Old TinyMath used $$...$$ everywhere. This function detects when
 * $$...$$ is used inline (text before/after on same line) and converts
 * it to $...$ for proper rendering.
 *
 * @param text - Text with math delimiters
 * @returns Text with corrected delimiters
 *
 * @example
 * // Inline - should convert
 * "Dans $$5+3$$, calcule" → "Dans $5+3$, calcule"
 *
 * // Display - should keep
 * "Calcule:\n$$5+3$$\n" → "Calcule:\n$$5+3$$\n"
 */
export function fixMathDelimiters(text: string): string {
	if (!text || !text.includes('$$')) {
		return text;
	}

	// Split by lines to analyze context
	const lines = text.split('\n');
	const result: string[] = [];

	for (const line of lines) {
		// Check if line contains $$...$$
		if (!line.includes('$$')) {
			result.push(line);
			continue;
		}

		// Check if entire line (trimmed) is just $$...$$ (display math)
		const trimmed = line.trim();
		if (/^\$\$[^$]+\$\$$/.test(trimmed) && trimmed === line.trim()) {
			// Could be display if it's the only content
			// But we need to check if there's text before/after the $$...$$
			const match = line.match(/^(\s*)\$\$([^$]+)\$\$(\s*)$/);
			if (match) {
				// Line is only whitespace + $$...$$ + whitespace → display, keep as is
				result.push(line);
				continue;
			}
		}

		// Line has $$...$$ with other content → convert to inline
		// Use regex to find all $$...$$ and check their context
		let converted = line;
		const mathPattern = /\$\$([^$]+)\$\$/g;
		let hasNonMathContent = false;

		// Check if there's non-math content on the line
		const withoutMath = line.replace(mathPattern, '').trim();
		if (withoutMath.length > 0) {
			hasNonMathContent = true;
		}

		if (hasNonMathContent) {
			// Convert all $$...$$ to $...$ on this line
			converted = line.replace(mathPattern, (_, content) => `$${content}$`);
		}

		result.push(converted);
	}

	return result.join('\n');
}

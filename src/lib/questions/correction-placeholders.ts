/**
 * Correction Placeholder System
 * =============================
 *
 * Defines the placeholder syntax used in QuestionCorrection.
 * Placeholders are resolved at runtime when displaying corrections.
 *
 * @example
 * ```typescript
 * // Basic usage
 * const template = "La solution est {{solution}}, mais vous avez écrit {{answer}}.";
 * const placeholders = extractPlaceholders(template);
 * // => [{ type: 'solution', raw: '{{solution}}' }, { type: 'answer', raw: '{{answer}}' }]
 *
 * // Parsing individual placeholder
 * const parsed = parsePlaceholder('{{solution:1}}');
 * // => { type: 'solution', raw: '{{solution:1}}', index: 1 }
 * ```
 */

// ============================================================================
// PLACEHOLDER TYPES
// ============================================================================

/**
 * Solution placeholder variants
 *
 * @example
 * - `{{solution}}` - Default: LaTeX formatted first solution
 * - `{{solution:1}}` - Second solution (0-indexed)
 * - `{{solution:html}}` - HTML formatted solution (not LaTeX)
 */
export type SolutionPlaceholder =
	| '{{solution}}' // Default: LaTeX formatted
	| `{{solution:${number}}}` // Indexed: {{solution:1}}, {{solution:2}}
	| '{{solution:html}}'; // HTML formatted

/**
 * Answer placeholder variants (student's answer)
 *
 * @example
 * - `{{answer}}` - First answer provided by student
 * - `{{answer:1}}` - Second answer (0-indexed)
 */
export type AnswerPlaceholder = '{{answer}}' | `{{answer:${number}}}`;

/**
 * Expression placeholder variants
 *
 * @example
 * - `{{expression}}` - LaTeX formatted expression
 * - `{{expression:raw}}` - Raw text without LaTeX
 */
export type ExpressionPlaceholder =
	| '{{expression}}' // LaTeX formatted
	| '{{expression:raw}}'; // Raw format

/**
 * Variable placeholder
 * References question variables by name or index
 *
 * @example
 * - `{{a}}` - Named variable 'a'
 * - `{{coefficient}}` - Named variable 'coefficient'
 * - `{{1}}` - First indexed variable
 */
export type VariablePlaceholder = `{{${string}}}`;

/**
 * Color placeholder
 * References semantic colors defined in the question
 *
 * @example
 * - `{{color:primary}}` - Primary color
 * - `{{color:error}}` - Error color
 */
export type ColorPlaceholder = `{{color:${string}}}`;

/**
 * Conditional placeholder
 * Syntax: {{if:condition|thenText}} or {{if:condition|thenText|elseText}}
 *
 * @example
 * - `{{if:isCorrect|Bravo!}}` - Show "Bravo!" if isCorrect is truthy
 * - `{{if:hasError|Erreur|Correct}}` - Show "Erreur" or "Correct"
 */
export type ConditionalPlaceholder = `{{if:${string}|${string}}}`;

/**
 * All placeholder types
 */
export type CorrectionPlaceholder =
	| SolutionPlaceholder
	| AnswerPlaceholder
	| ExpressionPlaceholder
	| VariablePlaceholder
	| ColorPlaceholder
	| ConditionalPlaceholder;

// ============================================================================
// PLACEHOLDER PATTERNS (for parsing)
// ============================================================================

/**
 * Regular expression patterns for placeholder detection and parsing
 *
 * @remarks
 * These patterns are used to extract and identify placeholders in correction templates.
 * The `g` flag is used for global matching to find all occurrences.
 */
export const PLACEHOLDER_PATTERNS = {
	/** Matches {{solution}}, {{solution:N}}, {{solution:html}} */
	solution: /\{\{solution(?::(\d+|html))?\}\}/g,

	/** Matches {{answer}}, {{answer:N}} */
	answer: /\{\{answer(?::(\d+))?\}\}/g,

	/** Matches {{expression}}, {{expression:raw}} */
	expression: /\{\{expression(?::raw)?\}\}/g,

	/** Matches {{N}} where N is a number */
	indexedVariable: /\{\{(\d+)\}\}/g,

	/** Matches {{varName}} where varName is alphanumeric */
	namedVariable: /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g,

	/** Matches {{color:name}} */
	color: /\{\{color:([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g,

	/** Matches {{if:cond|text}} or {{if:cond|text|else}} */
	conditional: /\{\{if:([^|]+)\|([^|}]+)(?:\|([^}]+))?\}\}/g,

	/** Matches any placeholder */
	any: /\{\{[^}]+\}\}/g
} as const;

// ============================================================================
// PARSING UTILITIES
// ============================================================================

/**
 * Parsed placeholder result
 *
 * @remarks
 * This interface represents a placeholder that has been parsed from a template string.
 * The `type` field indicates which kind of placeholder it is, and additional fields
 * provide type-specific information.
 */
export interface ParsedPlaceholder {
	/** The type of placeholder detected */
	type: 'solution' | 'answer' | 'expression' | 'variable' | 'color' | 'conditional' | 'unknown';

	/** The raw placeholder string as it appears in the template */
	raw: string;

	/** Index for indexed placeholders (solution:N, answer:N, {{N}}) */
	index?: number;

	/** Format modifier (html, raw) */
	format?: string;

	/** Name for named variables and colors */
	name?: string;

	/** Condition for conditional placeholders */
	condition?: string;

	/** Then-branch text for conditional placeholders */
	thenText?: string;

	/** Else-branch text for conditional placeholders */
	elseText?: string;
}

/**
 * Parse a single placeholder string
 *
 * @param placeholder - The placeholder string to parse (e.g., "{{solution:1}}")
 * @returns Parsed placeholder information
 *
 * @example
 * ```typescript
 * parsePlaceholder('{{solution}}');
 * // => { type: 'solution', raw: '{{solution}}' }
 *
 * parsePlaceholder('{{solution:2}}');
 * // => { type: 'solution', raw: '{{solution:2}}', index: 2 }
 *
 * parsePlaceholder('{{color:primary}}');
 * // => { type: 'color', raw: '{{color:primary}}', name: 'primary' }
 *
 * parsePlaceholder('{{if:isCorrect|Bravo!|Réessayez}}');
 * // => { type: 'conditional', raw: '{{if:...}}', condition: 'isCorrect', thenText: 'Bravo!', elseText: 'Réessayez' }
 * ```
 */
export function parsePlaceholder(placeholder: string): ParsedPlaceholder {
	// Solution placeholders: {{solution}}, {{solution:N}}, {{solution:html}}
	if (placeholder.startsWith('{{solution')) {
		const match = placeholder.match(/\{\{solution(?::(\d+|html))?\}\}/);
		if (match) {
			const modifier = match[1];
			if (modifier === 'html') {
				return { type: 'solution', raw: placeholder, format: 'html' };
			} else if (modifier) {
				return { type: 'solution', raw: placeholder, index: parseInt(modifier, 10) };
			}
			return { type: 'solution', raw: placeholder };
		}
	}

	// Answer placeholders: {{answer}}, {{answer:N}}
	if (placeholder.startsWith('{{answer')) {
		const match = placeholder.match(/\{\{answer(?::(\d+))?\}\}/);
		if (match) {
			const modifier = match[1];
			if (modifier) {
				return { type: 'answer', raw: placeholder, index: parseInt(modifier, 10) };
			}
			return { type: 'answer', raw: placeholder };
		}
	}

	// Expression placeholders: {{expression}}, {{expression:raw}}
	if (placeholder.startsWith('{{expression')) {
		const match = placeholder.match(/\{\{expression(?::raw)?\}\}/);
		if (match) {
			const isRaw = placeholder.includes(':raw');
			return { type: 'expression', raw: placeholder, format: isRaw ? 'raw' : undefined };
		}
	}

	// Color placeholders: {{color:name}}
	if (placeholder.startsWith('{{color:')) {
		const match = placeholder.match(/\{\{color:([a-zA-Z_][a-zA-Z0-9_]*)\}\}/);
		if (match) {
			return { type: 'color', raw: placeholder, name: match[1] };
		}
	}

	// Conditional placeholders: {{if:cond|text}} or {{if:cond|text|else}}
	if (placeholder.startsWith('{{if:')) {
		const match = placeholder.match(/\{\{if:([^|]+)\|([^|}]+)(?:\|([^}]+))?\}\}/);
		if (match) {
			return {
				type: 'conditional',
				raw: placeholder,
				condition: match[1].trim(),
				thenText: match[2].trim(),
				elseText: match[3]?.trim()
			};
		}
	}

	// Variable placeholders: {{N}} (indexed) or {{varName}} (named)
	const content = placeholder.slice(2, -2); // Remove {{ and }}

	// Check if it's an indexed variable (pure number)
	if (/^\d+$/.test(content)) {
		return {
			type: 'variable',
			raw: placeholder,
			index: parseInt(content, 10)
		};
	}

	// Check if it's a named variable (alphanumeric identifier)
	if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(content)) {
		return {
			type: 'variable',
			raw: placeholder,
			name: content
		};
	}

	// Unknown placeholder format
	return { type: 'unknown', raw: placeholder };
}

/**
 * Extract all placeholders from a template string
 *
 * @param template - The template string containing placeholders
 * @returns Array of parsed placeholders in the order they appear
 *
 * @example
 * ```typescript
 * const template = "La solution est {{solution}}, mais vous avez écrit {{answer}}.";
 * const placeholders = extractPlaceholders(template);
 * // => [
 * //   { type: 'solution', raw: '{{solution}}' },
 * //   { type: 'answer', raw: '{{answer}}' }
 * // ]
 *
 * // With multiple solutions
 * const multiTemplate = "{{solution}} ou {{solution:1}}";
 * const multi = extractPlaceholders(multiTemplate);
 * // => [
 * //   { type: 'solution', raw: '{{solution}}' },
 * //   { type: 'solution', raw: '{{solution:1}}', index: 1 }
 * // ]
 * ```
 */
export function extractPlaceholders(template: string): ParsedPlaceholder[] {
	const matches = template.match(PLACEHOLDER_PATTERNS.any) || [];
	return matches.map(parsePlaceholder);
}

/**
 * Check if a template string contains any placeholders
 *
 * @param template - The template string to check
 * @returns True if the template contains at least one placeholder
 *
 * @example
 * ```typescript
 * hasPlaceholders("La solution est {{solution}}");
 * // => true
 *
 * hasPlaceholders("La solution est 42");
 * // => false
 * ```
 */
export function hasPlaceholders(template: string): boolean {
	return PLACEHOLDER_PATTERNS.any.test(template);
}

/**
 * Get all unique placeholder types used in a template
 *
 * @param template - The template string to analyze
 * @returns Array of unique placeholder types found
 *
 * @example
 * ```typescript
 * getPlaceholderTypes("{{solution}} vs {{answer}} and {{expression}}");
 * // => ['solution', 'answer', 'expression']
 *
 * getPlaceholderTypes("{{solution}} et {{solution:1}}");
 * // => ['solution']
 * ```
 */
export function getPlaceholderTypes(template: string): Array<ParsedPlaceholder['type']> {
	const placeholders = extractPlaceholders(template);
	const types = new Set(placeholders.map((p) => p.type));
	return Array.from(types);
}

// ============================================================================
// RESOLUTION CONTEXT
// ============================================================================

/**
 * Context required to resolve placeholders
 *
 * @remarks
 * This interface defines all the data needed to replace placeholders in a correction
 * template with actual values. It's passed to the placeholder resolution function
 * (implemented in `placeholder-converter.ts`).
 *
 * @example
 * ```typescript
 * const context: PlaceholderContext = {
 *   solutions: ['x = 2', 'x = -3'],
 *   answers: ['x = 2'],
 *   expression: '(x-2)(x+3) = 0',
 *   variables: {
 *     a: 1,
 *     b: -1,
 *     c: -6
 *   },
 *   colors: {
 *     primary: '#3b82f6',
 *     error: '#ef4444'
 *   }
 * };
 * ```
 */
export interface PlaceholderContext {
	/** Correct solution(s) in LaTeX format */
	solutions: string[];

	/** Student's answer(s) */
	answers: string[];

	/** Original expression/problem (optional) */
	expression?: string;

	/** Resolved variable values by name */
	variables: Record<string, string | number>;

	/** Color mappings for semantic colors (optional) */
	colors?: Record<string, string>;

	/** Additional context for conditional evaluation (optional) */
	conditions?: Record<string, boolean | string | number>;
}

/**
 * Validation result for placeholder context
 */
export interface PlaceholderContextValidation {
	/** Whether the context is valid */
	valid: boolean;

	/** Missing required fields */
	missing: string[];

	/** Out-of-bounds placeholder references */
	outOfBounds: Array<{ placeholder: string; requested: number; available: number }>;
}

/**
 * Validate that a context has all the data needed for a template
 *
 * @param template - The template string with placeholders
 * @param context - The context to validate
 * @returns Validation result with details about any issues
 *
 * @example
 * ```typescript
 * const template = "{{solution}} et {{solution:1}}";
 * const context = { solutions: ['x = 2'], answers: [], variables: {} };
 * const validation = validatePlaceholderContext(template, context);
 * // => {
 * //   valid: false,
 * //   missing: [],
 * //   outOfBounds: [{ placeholder: '{{solution:1}}', requested: 1, available: 1 }]
 * // }
 * ```
 */
export function validatePlaceholderContext(
	template: string,
	context: PlaceholderContext
): PlaceholderContextValidation {
	const placeholders = extractPlaceholders(template);
	const missing: string[] = [];
	const outOfBounds: PlaceholderContextValidation['outOfBounds'] = [];

	for (const placeholder of placeholders) {
		switch (placeholder.type) {
			case 'solution': {
				const index = placeholder.index ?? 0;
				if (index >= context.solutions.length) {
					outOfBounds.push({
						placeholder: placeholder.raw,
						requested: index,
						available: context.solutions.length
					});
				}
				break;
			}

			case 'answer': {
				const index = placeholder.index ?? 0;
				if (index >= context.answers.length) {
					outOfBounds.push({
						placeholder: placeholder.raw,
						requested: index,
						available: context.answers.length
					});
				}
				break;
			}

			case 'expression': {
				if (!context.expression) {
					missing.push('expression');
				}
				break;
			}

			case 'variable': {
				if (placeholder.name && !(placeholder.name in context.variables)) {
					missing.push(`variables.${placeholder.name}`);
				}
				if (
					placeholder.index !== undefined &&
					!(placeholder.index.toString() in context.variables)
				) {
					missing.push(`variables.${placeholder.index}`);
				}
				break;
			}

			case 'color': {
				if (placeholder.name && !context.colors?.[placeholder.name]) {
					missing.push(`colors.${placeholder.name}`);
				}
				break;
			}

			case 'conditional': {
				if (placeholder.condition && !context.conditions?.[placeholder.condition]) {
					// Conditionals are optional, just note if missing
					// (evaluation might use default logic)
				}
				break;
			}
		}
	}

	return {
		valid: missing.length === 0 && outOfBounds.length === 0,
		missing: Array.from(new Set(missing)),
		outOfBounds
	};
}

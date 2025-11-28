/**
 * Random Parser - Parse random number specifications
 * ====================================================
 *
 * Parses random number specifications from Markdown syntax:
 * - Integer ranges: {{1..10}} or {{-3..-1}}
 * - Relative integers: {{2..9;±}} or {{2..9;+-}} → union of {-9..-2} ∪ {2..9}
 * - Decimal by digits: {{2.3}} (2 digits before, 3 after)
 * - Decimal ranges: {{1..1.6}} (auto-step=0.1) or {{0.5..9.99:0.01}} (explicit step)
 * - Variable bounds: {{{{min}}..{{max}}}}
 * - Exclusions: {{1..20!5,7..9}}
 *
 * Syntax order:
 * - `baseSpec;modifier!exclusions`
 * - Range separator: `..` (double dot) for all ranges including negative ones like {{-3..-1}}
 * - Modifier separator: `;` (semicolon) for modifiers like `;±`
 * - Exclusion separator: `!` for exclusions
 *
 * @module shared/parameterization/parser/random-parser
 */

import type { RandomSpec, NumberOrVariable, Exclusion } from '../types';

/**
 * Parse a random specification token
 *
 * Parses all supported random number formats with full support for:
 * - Variable bounds and digit counts
 * - Exclusion patterns (values, ranges, variables)
 * - Multiple decimal formats
 * - Discrete lists
 *
 * @param token - Full token string including delimiters
 * @returns Parsed RandomSpec, or null if token is not a valid random specification
 *
 * @example Integer range with prefix
 * ```typescript
 * parseRandomSpec('{{random:1..10}}')
 * // → { type: 'integer', min: {type:'number',value:1}, max: {...,value:10}, exclusions: [] }
 * ```
 *
 * @example Integer range shorthand
 * ```typescript
 * parseRandomSpec('{{1..10}}')
 * // → { type: 'integer', min: {type:'number',value:1}, max: {...,value:10}, exclusions: [] }
 * ```
 *
 * @example Decimal by digits
 * ```typescript
 * parseRandomSpec('{{2.3}}')
 * // → { type: 'decimal-by-digits', digitsBefore: {type:'number',value:2}, digitsAfter: {...,value:3}, exclusions: [] }
 * ```
 *
 * @example Decimal range with step
 * ```typescript
 * parseRandomSpec('{{0.5..9.99:0.01}}')
 * // → { type: 'decimal-range', min: {...,value:0.5}, max: {...,value:9.99}, step: 0.01, exclusions: [] }
 * ```
 *
 * @example Discrete list
 * ```typescript
 * parseRandomSpec('{{random:rouge|vert|bleu}}')
 * // → { type: 'discrete-list', items: ['rouge', 'vert', 'bleu'], exclusions: [] }
 * ```
 *
 * @example With exclusions
 * ```typescript
 * parseRandomSpec('{{1..20!5,7..9}}')
 * // → { type: 'integer', ..., exclusions: [
 * //      { type: 'value', value: {type:'number',value:5} },
 * //      { type: 'range', min: {type:'number',value:7}, max: {type:'number',value:9} }
 * //    ] }
 * ```
 *
 * @example Variable bounds
 * ```typescript
 * parseRandomSpec('{{random:{{min}}..{{max}}}}')
 * // → { type: 'integer', min: {type:'variable',name:'min'}, max: {type:'variable',name:'max'}, exclusions: [] }
 * ```
 *
 * @example Variable digits
 * ```typescript
 * parseRandomSpec('{{{{before}}.{{after}}}}')
 * // → { type: 'decimal-by-digits', digitsBefore: {type:'variable',name:'before'}, digitsAfter: {type:'variable',name:'after'}, exclusions: [] }
 * ```
 */
export function parseRandomSpec(token: string): RandomSpec | null {
	// Extract content from Markdown syntax
	let content: string | null = null;

	// Try {{random:...}} format
	if (token.startsWith('{{random:') && token.endsWith('}}')) {
		content = token.slice(9, -2);
	}
	// Try {{...}} shorthand format
	else if (token.startsWith('{{') && token.endsWith('}}')) {
		content = token.slice(2, -2);
	}

	if (!content) {
		return null;
	}

	try {
		return parseRandomContent(content);
	} catch {
		return null;
	}
}

/**
 * Parse the inner content of a random specification
 */
function parseRandomContent(content: string): RandomSpec {
	// Check for discrete list first (contains top-level pipe before splitting)
	if (hasTopLevelPipe(content.split(';')[0].split('!')[0])) {
		return parseDiscreteList(content);
	}

	// Split at semicolon to get modifier
	const [specPart, modifierAndExclusionsPart] = splitAtTopLevel(content, ';');

	let baseSpec = specPart;
	let exclusionSpec: string | undefined;
	let isRelative = false;

	// If modifier part exists, check for relative integer modifier
	if (modifierAndExclusionsPart) {
		// Split modifier part at ! to get modifier and exclusions
		const [modifier, exclusionsAfterModifier] = splitAtTopLevel(modifierAndExclusionsPart, '!');

		// Check if modifier is ± or +-
		if (modifier === '±' || modifier === '+-') {
			isRelative = true;
			exclusionSpec = exclusionsAfterModifier;
		} else {
			// No valid modifier found, treat the whole thing as spec!exclusions
			const [newBase, newExclusions] = splitAtTopLevel(content, '!');
			baseSpec = newBase;
			exclusionSpec = newExclusions;
		}
	} else {
		// No semicolon found, split at ! for exclusions
		const [newBase, newExclusions] = splitAtTopLevel(specPart, '!');
		baseSpec = newBase;
		exclusionSpec = newExclusions;
	}

	// Parse base specification
	let spec: RandomSpec;

	// Check if it's a decimal by digits format (e.g., {{2.3}})
	// This is identified by: contains single `.`, no range separator, and both parts are simple numbers
	if (isDecimalByDigitsFormat(baseSpec)) {
		spec = parseDecimalByDigits(baseSpec);
	} else {
		spec = parseRange(baseSpec, isRelative);
	}

	// Parse exclusions if present
	if (exclusionSpec) {
		spec.exclusions = parseExclusions(exclusionSpec);
	} else {
		spec.exclusions = [];
	}

	return spec;
}

/**
 * Check if spec is decimal-by-digits format: {{n.m}} where n and m are integers
 * Not a decimal range like {{1..1.6}} or {{1.5-2.5}}
 */
function isDecimalByDigitsFormat(spec: string): boolean {
	// Must contain a single dot
	const dotCount = (spec.match(/\./g) || []).length;
	if (dotCount !== 1) return false;

	// Must NOT contain range separator (- or ..)
	if (spec.includes('..') || hasRangeSeparator(spec)) return false;

	// Both parts must be simple integers or variables
	const [before, after] = spec.split('.');
	return isSimpleIntOrVar(before) && isSimpleIntOrVar(after);
}

/**
 * Check if string has a range separator dash (not a negative sign)
 */
function hasRangeSeparator(spec: string): boolean {
	// Look for dash that's not at the start (which would be a negative sign)
	let braceCount = 0;
	for (let i = 0; i < spec.length; i++) {
		const char = spec[i];
		if (char === '{') braceCount++;
		if (char === '}') braceCount--;
		// Dash is separator if: not at start AND not inside braces
		if (char === '-' && i > 0 && braceCount === 0) return true;
	}
	return false;
}

/**
 * Check if string is a simple integer or variable reference
 */
function isSimpleIntOrVar(str: string): boolean {
	const trimmed = str.trim();
	// Variable: {{name}}
	if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) return true;
	// Integer
	return /^\d+$/.test(trimmed);
}

/**
 * Parse decimal format: {{2.3}} or {{{{before}}.{{after}}}}
 */
function parseDecimalByDigits(spec: string): RandomSpec {
	const [beforeStr, afterStr] = spec.split('.');

	if (!beforeStr || !afterStr) {
		throw new Error(`Invalid decimal specification: ${spec}`);
	}

	return {
		type: 'decimal-by-digits',
		digitsBefore: parseNumberOrVariable(beforeStr),
		digitsAfter: parseNumberOrVariable(afterStr),
		exclusions: []
	};
}

/**
 * Parse range format
 * Examples:
 * - {{1..10}}, {{-3..-1}}
 * - {{±2..9}} (relative)
 * - {{0.5..9.99:0.01}}, {{1..1.6}} (decimal with auto-step)
 */
function parseRange(spec: string, isRelative: boolean = false): RandomSpec {
	// Check for step notation (split at top level to avoid splitting inside variables)
	const [rangeSpec, stepStr] = splitAtTopLevel(spec, ':');

	// Parse min-max (uses `..` separator)
	const { min, max, originalMinStr, originalMaxStr } = parseMinMax(rangeSpec);

	// Determine if decimal or integer based on:
	// 1. Explicit step provided
	// 2. Either bound contains decimals (in the original string)
	const hasDecimalInBounds = hasDecimalDigits(originalMinStr) || hasDecimalDigits(originalMaxStr);
	const isDecimal = stepStr !== undefined || hasDecimalInBounds;

	if (isRelative) {
		// Relative integer: {{±2..9}} → union of {-9..-2} ∪ {2..9}
		return {
			type: 'relative-integer',
			min,
			max,
			exclusions: []
		};
	} else if (isDecimal) {
		// Decimal range with auto-step inference
		const step = stepStr
			? parseFloat(stepStr)
			: inferStepFromDecimals(originalMinStr, originalMaxStr);
		return {
			type: 'decimal-range',
			min,
			max,
			step,
			exclusions: []
		};
	} else {
		// Integer range
		return {
			type: 'integer',
			min,
			max,
			exclusions: []
		};
	}
}

/**
 * Check if a string representation contains decimal digits
 */
function hasDecimalDigits(str: string): boolean {
	// Remove variable references first
	const withoutVars = str.replace(/\{\{[^}]+\}\}/g, '');
	return withoutVars.includes('.');
}

/**
 * Infer step size from the maximum decimal places in bounds
 *
 * Examples:
 * - "1", "1.6" → 1 decimal → step = 0.1
 * - "1", "1.25" → 2 decimals → step = 0.01
 * - "0.5", "2.5" → 1 decimal → step = 0.1
 */
function inferStepFromDecimals(minStr: string, maxStr: string): number {
	const minDecimals = countDecimalPlaces(minStr);
	const maxDecimals = countDecimalPlaces(maxStr);
	const precision = Math.max(minDecimals, maxDecimals);
	return precision === 0 ? 1 : Math.pow(10, -precision);
}

/**
 * Count decimal places in a number string
 */
function countDecimalPlaces(str: string): number {
	// Handle variable references - treat as 0 decimals
	if (str.includes('{{')) return 0;

	const match = str.match(/\.(\d+)/);
	return match ? match[1].length : 0;
}

/**
 * Parse min-max from range string, handling negative numbers and variables
 *
 * Uses `..` (double dot) as the range separator.
 *
 * Examples:
 * - "1..10" → min: 1, max: 10
 * - "-5..10" → min: -5, max: 10
 * - "-3..-1" → min: -3, max: -1
 * - "{{min}}..{{max}}" → variables
 */
function parseMinMax(rangeSpec: string): {
	min: NumberOrVariable;
	max: NumberOrVariable;
	originalMinStr: string;
	originalMaxStr: string;
} {
	let minStr = '';
	let maxStr = '';
	let braceCount = 0;
	let foundSeparator = false;

	// Find `..` separator
	for (let i = 0; i < rangeSpec.length - 1; i++) {
		const char = rangeSpec[i];
		const nextChar = rangeSpec[i + 1];

		if (char === '{') braceCount++;
		if (char === '}') braceCount--;

		// Check for `..` separator (not inside variable braces)
		if (char === '.' && nextChar === '.' && braceCount === 0) {
			minStr = rangeSpec.substring(0, i);
			maxStr = rangeSpec.substring(i + 2);
			foundSeparator = true;
			break;
		}
	}

	if (!foundSeparator || !minStr || !maxStr) {
		throw new Error(`Invalid range specification: ${rangeSpec}`);
	}

	return {
		min: parseNumberOrVariable(minStr),
		max: parseNumberOrVariable(maxStr),
		originalMinStr: minStr,
		originalMaxStr: maxStr
	};
}

/**
 * Parse a string as number or variable reference
 *
 * @example Number
 * parseNumberOrVariable('42') → {type:'number',value:42}
 *
 * @example Variable
 * parseNumberOrVariable('{{varName}}') → {type:'variable',name:'varName'}
 */
function parseNumberOrVariable(str: string): NumberOrVariable {
	const trimmed = str.trim();

	// Check if it's a variable (Markdown syntax)
	if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) {
		const varName = trimmed.slice(2, -2);
		return { type: 'variable', name: varName };
	}

	// It's a number
	const num = parseFloat(trimmed);
	if (isNaN(num)) {
		throw new Error(`Invalid number or variable reference: ${str}`);
	}

	return { type: 'number', value: num };
}

/**
 * Parse exclusions: "5,7..9,{{a}},{{b}}..{{c}}"
 */
function parseExclusions(spec: string): Exclusion[] {
	const exclusions: Exclusion[] = [];
	const parts = splitExclusionParts(spec);

	for (const part of parts) {
		const trimmed = part.trim();

		// Variable reference (Markdown) - single variable, not a range
		const varPattern = /^\{\{(\w+)\}\}$/;
		const varMatch = trimmed.match(varPattern);
		if (varMatch && !trimmed.includes('..')) {
			exclusions.push({ type: 'value', value: { type: 'variable', name: varMatch[1] } });
		}
		// Range: detect by trying to parse as range (uses `..` separator)
		else if (trimmed.includes('..')) {
			try {
				const { min, max } = parseMinMax(trimmed);
				exclusions.push({ type: 'range', min, max });
			} catch {
				// If parseMinMax fails, treat as single value
				const value = parseNumberOrVariable(trimmed);
				exclusions.push({ type: 'value', value });
			}
		}
		// Single value
		else {
			const value = parseNumberOrVariable(trimmed);
			exclusions.push({ type: 'value', value });
		}
	}

	return exclusions;
}

/**
 * Split exclusion parts while respecting braces
 *
 * Example: "5,{{a}},{{b}}..{{c}}" → ["5", "{{a}}", "{{b}}..{{c}}"]
 */
function splitExclusionParts(spec: string): string[] {
	const parts: string[] = [];
	let current = '';
	let braceCount = 0;

	for (let i = 0; i < spec.length; i++) {
		const char = spec[i];

		if (char === '{') {
			braceCount++;
		} else if (char === '}') {
			braceCount--;
		}

		if (char === ',' && braceCount === 0) {
			parts.push(current.trim());
			current = '';
		} else {
			current += char;
		}
	}

	if (current) {
		parts.push(current.trim());
	}

	return parts;
}

/**
 * Split string at character, but only at top level (outside braces)
 *
 * @example
 * splitAtTopLevel('1..10!5', '!') → ['1..10', '5']
 * splitAtTopLevel('{{a}}..{{b}}!{{c}}', '!') → ['{{a}}..{{b}}', '{{c}}']
 */
function splitAtTopLevel(str: string, separator: string): [string, string | undefined] {
	let braceCount = 0;
	let separatorIndex = -1;

	for (let i = 0; i < str.length; i++) {
		const char = str[i];

		if (char === '{') braceCount++;
		if (char === '}') braceCount--;

		if (char === separator && braceCount === 0) {
			separatorIndex = i;
			break;
		}
	}

	if (separatorIndex === -1) {
		return [str, undefined];
	}

	return [str.substring(0, separatorIndex), str.substring(separatorIndex + 1)];
}

/**
 * Check if content contains a top-level pipe separator
 *
 * @example
 * hasTopLevelPipe('a|b|c') → true
 * hasTopLevelPipe('{{a|b}}') → false (pipe inside braces)
 * hasTopLevelPipe('1-10') → false
 */
function hasTopLevelPipe(content: string): boolean {
	let braceDepth = 0;
	for (const char of content) {
		if (char === '{') braceDepth++;
		if (char === '}') braceDepth--;
		if (char === '|' && braceDepth === 0) return true;
	}
	return false;
}

/**
 * Split content at top-level separators, respecting nested braces
 *
 * @example
 * splitAtTopLevelMultiple('a|b|c', '|') → ['a', 'b', 'c']
 * splitAtTopLevelMultiple('{{a|x}}|b|{{c|y}}', '|') → ['{{a|x}}', 'b', '{{c|y}}']
 * splitAtTopLevelMultiple('a,b,c', ',') → ['a', 'b', 'c']
 */
function splitAtTopLevelMultiple(content: string, separator: string): string[] {
	const parts: string[] = [];
	let current = '';
	let braceDepth = 0;

	for (const char of content) {
		if (char === '{') braceDepth++;
		if (char === '}') braceDepth--;

		if (char === separator && braceDepth === 0) {
			parts.push(current.trim());
			current = '';
		} else {
			current += char;
		}
	}

	parts.push(current.trim());
	return parts;
}

/**
 * Parse discrete list specification: {{a|b|c}} or {{a|b|c!x,y}}
 *
 * Items and exclusions are stored as raw strings (variable names or literals).
 * Resolution happens at generation time using the variable context.
 *
 * @example
 * parseDiscreteList('rouge|vert|bleu')
 * // → { type: 'discrete-list', items: ['rouge', 'vert', 'bleu'], exclusions: [] }
 *
 * @example With exclusions
 * parseDiscreteList('a|b|c|d!b,d')
 * // → { type: 'discrete-list', items: ['a', 'b', 'c', 'd'], exclusions: ['b', 'd'] }
 *
 * @example With variables
 * parseDiscreteList('{{color1}}|{{color2}}|bleu')
 * // → { type: 'discrete-list', items: ['{{color1}}', '{{color2}}', 'bleu'], exclusions: [] }
 *
 * @returns RandomSpec with discrete-list type, or throws if invalid
 */
function parseDiscreteList(content: string): RandomSpec {
	// Split base items and exclusions
	const [itemsSpec, exclusionSpec] = splitAtTopLevel(content, '!');

	// Split items by pipe
	const rawItems = splitAtTopLevelMultiple(itemsSpec, '|');

	// Filter out empty items
	const items = rawItems.filter((item) => item.trim().length > 0);

	// Validate: must have at least one item
	if (items.length === 0) {
		throw new Error('Discrete list must have at least one item');
	}

	// Parse exclusions if present
	const exclusions = exclusionSpec ? splitAtTopLevelMultiple(exclusionSpec, ',') : [];

	return {
		type: 'discrete-list',
		items,
		exclusions: exclusions.filter((e) => e.trim().length > 0)
	};
}

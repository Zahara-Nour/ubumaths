/**
 * Random Parser - Parse random number specifications
 * ====================================================
 *
 * Parses random number specifications from both syntax flavors:
 * - Questions: {#:1-10}, {#:2.3}, {#:0.5-9.99:0.01}
 * - Markdown: {{random:1-10}}, {{1-10}}, {{2.3}}, {{0.5-9.99:0.01}}
 *
 * Supports:
 * - Integer ranges: {#:1-10} or {{random:1-10}}
 * - Decimal by digits: {#:2.3} or {{random:2.3}}
 * - Decimal ranges with step: {#:0.5-9.99:0.01} or {{random:0.5-9.99:0.01}}
 * - Variable bounds: {#:{@:min}-{@:max}} or {{random:{{min}}-{{max}}}}
 * - Exclusions: {#:1-20!5,7-9} or {{random:1-20!5,7-9}}
 *
 * @module shared/parameterization/parser/random-parser
 */

import type { RandomSpec, Syntax, NumberOrVariable, Exclusion } from '../types';

/**
 * Parse a random specification token
 *
 * Parses all supported random number formats with full support for:
 * - Variable bounds and digit counts
 * - Exclusion patterns (values, ranges, variables)
 * - Multiple decimal formats
 *
 * @param token - Full token string including delimiters
 * @param syntax - Expected syntax (optional, auto-detects if not provided)
 * @returns Parsed RandomSpec, or null if token is not a valid random specification
 *
 * @example Integer range (Questions)
 * ```typescript
 * parseRandomSpec('{#:1-10}', 'questions')
 * // → { type: 'integer', min: {type:'number',value:1}, max: {...,value:10}, exclusions: [] }
 * ```
 *
 * @example Integer range (Markdown)
 * ```typescript
 * parseRandomSpec('{{random:1-10}}', 'markdown')
 * // → { type: 'integer', min: {type:'number',value:1}, max: {...,value:10}, exclusions: [] }
 * ```
 *
 * @example Markdown shorthand
 * ```typescript
 * parseRandomSpec('{{1-10}}', 'markdown')
 * // → { type: 'integer', min: {type:'number',value:1}, max: {...,value:10}, exclusions: [] }
 * ```
 *
 * @example Decimal by digits
 * ```typescript
 * parseRandomSpec('{#:2.3}', 'questions')
 * // → { type: 'decimal-by-digits', digitsBefore: {type:'number',value:2}, digitsAfter: {...,value:3}, exclusions: [] }
 * ```
 *
 * @example Decimal range with step
 * ```typescript
 * parseRandomSpec('{#:0.5-9.99:0.01}', 'questions')
 * // → { type: 'decimal-range', min: {...,value:0.5}, max: {...,value:9.99}, step: 0.01, exclusions: [] }
 * ```
 *
 * @example With exclusions
 * ```typescript
 * parseRandomSpec('{#:1-20!5,7-9}', 'questions')
 * // → { type: 'integer', ..., exclusions: [
 * //      { type: 'value', value: {type:'number',value:5} },
 * //      { type: 'range', min: {type:'number',value:7}, max: {type:'number',value:9} }
 * //    ] }
 * ```
 *
 * @example Variable bounds (Questions)
 * ```typescript
 * parseRandomSpec('{#:{@:min}-{@:max}}', 'questions')
 * // → { type: 'integer', min: {type:'variable',name:'min'}, max: {type:'variable',name:'max'}, exclusions: [] }
 * ```
 *
 * @example Variable bounds (Markdown)
 * ```typescript
 * parseRandomSpec('{{random:{{min}}-{{max}}}}', 'markdown')
 * // → { type: 'integer', min: {type:'variable',name:'min'}, max: {type:'variable',name:'max'}, exclusions: [] }
 * ```
 *
 * @example Variable digits
 * ```typescript
 * parseRandomSpec('{#:{@:before}.{@:after}}', 'questions')
 * // → { type: 'decimal-by-digits', digitsBefore: {type:'variable',name:'before'}, digitsAfter: {type:'variable',name:'after'}, exclusions: [] }
 * ```
 */
export function parseRandomSpec(token: string, syntax?: Syntax): RandomSpec | null {
	// Extract content based on syntax
	let content: string | null = null;
	let detectedSyntax: 'questions' | 'markdown' | null = null;

	// Try Questions syntax: {#:...}
	if (!syntax || syntax === 'questions' || syntax === 'both') {
		if (token.startsWith('{#:') && token.endsWith('}')) {
			content = token.slice(3, -1);
			detectedSyntax = 'questions';
		}
	}

	// Try Markdown syntax: {{random:...}} or {{...}}
	if (!content && (!syntax || syntax === 'markdown' || syntax === 'both')) {
		if (token.startsWith('{{random:') && token.endsWith('}}')) {
			content = token.slice(9, -2);
			detectedSyntax = 'markdown';
		} else if (token.startsWith('{{') && token.endsWith('}}')) {
			// Shorthand: {{1-10}} or {{2.3}}
			content = token.slice(2, -2);
			detectedSyntax = 'markdown';
		}
	}

	if (!content || !detectedSyntax) {
		return null;
	}

	try {
		return parseRandomContent(content, detectedSyntax);
	} catch {
		return null;
	}
}

/**
 * Parse the inner content of a random specification
 */
function parseRandomContent(content: string, syntax: 'questions' | 'markdown'): RandomSpec {
	// Split base and exclusions
	const [baseSpec, exclusionSpec] = splitAtTopLevel(content, '!', syntax);

	// Parse base specification
	let spec: RandomSpec;

	// Check if it's a decimal by digits format (contains . but no -)
	if (baseSpec.includes('.') && !baseSpec.includes('-')) {
		spec = parseDecimalByDigits(baseSpec, syntax);
	} else {
		spec = parseRange(baseSpec, syntax);
	}

	// Parse exclusions if present
	if (exclusionSpec) {
		spec.exclusions = parseExclusions(exclusionSpec, syntax);
	} else {
		spec.exclusions = [];
	}

	return spec;
}

/**
 * Parse decimal format: {#:2.3} or {{2.3}}
 * Or with variables: {#:{@:before}.{@:after}} or {{{{before}}.{{after}}}}
 */
function parseDecimalByDigits(spec: string, syntax: 'questions' | 'markdown'): RandomSpec {
	const [beforeStr, afterStr] = spec.split('.');

	if (!beforeStr || !afterStr) {
		throw new Error(`Invalid decimal specification: ${spec}`);
	}

	return {
		type: 'decimal-by-digits',
		digitsBefore: parseNumberOrVariable(beforeStr, syntax),
		digitsAfter: parseNumberOrVariable(afterStr, syntax),
		exclusions: []
	};
}

/**
 * Parse range format
 * Examples: {#:1-10}, {{random:1-10}}, {#:0.5-9.99:0.01}, {#:{@:min}-{@:max}}
 */
function parseRange(spec: string, syntax: 'questions' | 'markdown'): RandomSpec {
	// Check for step notation (split at top level to avoid splitting inside variables)
	const [rangeSpec, stepStr] = splitAtTopLevel(spec, ':', syntax);

	// Parse min-max
	const { min, max } = parseMinMax(rangeSpec, syntax);

	// Determine if decimal or integer
	const isDecimal =
		stepStr !== undefined || isNumberOrVariableDecimal(min) || isNumberOrVariableDecimal(max);

	if (isDecimal) {
		// Decimal range
		const step = stepStr ? parseFloat(stepStr) : 0.01;
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
 * Check if NumberOrVariable represents a decimal
 */
function isNumberOrVariableDecimal(val: NumberOrVariable): boolean {
	return val.type === 'number' && !Number.isInteger(val.value);
}

/**
 * Parse min-max from range string, handling negative numbers and variables
 *
 * Examples:
 * - "1-10" → min: 1, max: 10
 * - "-5-10" → min: -5, max: 10
 * - "{@:a}-{@:b}" → min: {type:'variable',name:'a'}, max: {...}
 * - "{{min}}-{{max}}" → min: {type:'variable',name:'min'}, max: {...}
 */
function parseMinMax(
	rangeSpec: string,
	syntax: 'questions' | 'markdown'
): { min: NumberOrVariable; max: NumberOrVariable } {
	let minStr = '';
	let maxStr = '';
	let inVariable = false;
	let braceCount = 0;
	let foundSeparator = false;

	for (let i = 0; i < rangeSpec.length; i++) {
		const char = rangeSpec[i];

		// Track braces for variables
		if (char === '{') {
			braceCount++;
			inVariable = true;
		} else if (char === '}') {
			braceCount--;
			if (braceCount === 0) {
				inVariable = false;
			}
		}

		// Check if this is a separator dash (not a negative sign)
		// Only treat as separator if we haven't found one yet
		if (char === '-' && !inVariable && i > 0 && !foundSeparator) {
			// This is the separator
			foundSeparator = true;
			continue;
		}

		// Append to appropriate part
		if (!foundSeparator) {
			minStr += char;
		} else {
			maxStr += char;
		}
	}

	if (!foundSeparator) {
		throw new Error(`Invalid range specification: ${rangeSpec}`);
	}

	return {
		min: parseNumberOrVariable(minStr, syntax),
		max: parseNumberOrVariable(maxStr, syntax)
	};
}

/**
 * Parse a string as number or variable reference
 *
 * @example Number
 * parseNumberOrVariable('42', 'questions') → {type:'number',value:42}
 *
 * @example Variable (Questions)
 * parseNumberOrVariable('{@:varName}', 'questions') → {type:'variable',name:'varName'}
 *
 * @example Variable (Markdown)
 * parseNumberOrVariable('{{varName}}', 'markdown') → {type:'variable',name:'varName'}
 */
function parseNumberOrVariable(str: string, syntax: 'questions' | 'markdown'): NumberOrVariable {
	const trimmed = str.trim();

	// Check if it's a variable
	if (syntax === 'questions') {
		if (trimmed.startsWith('{@:') && trimmed.endsWith('}')) {
			const varName = trimmed.slice(3, -1);
			return { type: 'variable', name: varName };
		}
	} else {
		// Markdown syntax
		if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) {
			const varName = trimmed.slice(2, -2);
			return { type: 'variable', name: varName };
		}
	}

	// It's a number
	const num = parseFloat(trimmed);
	if (isNaN(num)) {
		throw new Error(`Invalid number or variable reference: ${str}`);
	}

	return { type: 'number', value: num };
}

/**
 * Parse exclusions: "5,7-9,{@:a},{@:b}-{@:c}" or "5,7-9,{{a}},{{b}}-{{c}}"
 */
function parseExclusions(spec: string, syntax: 'questions' | 'markdown'): Exclusion[] {
	const exclusions: Exclusion[] = [];
	const parts = splitExclusionParts(spec, syntax);

	for (const part of parts) {
		const trimmed = part.trim();

		// Variable reference
		const varPattern = syntax === 'questions' ? /^\{@:(\w+)\}$/ : /^\{\{(\w+)\}\}$/;
		const varMatch = trimmed.match(varPattern);
		if (varMatch && !trimmed.includes('-')) {
			exclusions.push({ type: 'value', value: { type: 'variable', name: varMatch[1] } });
		}
		// Range: detect by trying to parse as range
		else if (trimmed.includes('-')) {
			try {
				const { min, max } = parseMinMax(trimmed, syntax);
				exclusions.push({ type: 'range', min, max });
			} catch {
				// If parseMinMax fails, treat as single value
				const value = parseNumberOrVariable(trimmed, syntax);
				exclusions.push({ type: 'value', value });
			}
		}
		// Single value
		else {
			const value = parseNumberOrVariable(trimmed, syntax);
			exclusions.push({ type: 'value', value });
		}
	}

	return exclusions;
}

/**
 * Split exclusion parts while respecting braces
 *
 * Example: "5,{@:a},{@:b}-{@:c}" → ["5", "{@:a}", "{@:b}-{@:c}"]
 * Example: "5,{{a}},{{b}}-{{c}}" → ["5", "{{a}}", "{{b}}-{{c}}"]
 */
function splitExclusionParts(spec: string, _syntax: 'questions' | 'markdown'): string[] {
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
 * splitAtTopLevel('1-10!5', '!', 'questions') → ['1-10', '5']
 * splitAtTopLevel('{@:a}-{@:b}!{@:c}', '!', 'questions') → ['{@:a}-{@:b}', '{@:c}']
 * splitAtTopLevel('{{a}}-{{b}}!{{c}}', '!', 'markdown') → ['{{a}}-{{b}}', '{{c}}']
 */
function splitAtTopLevel(
	str: string,
	separator: string,
	_syntax: 'questions' | 'markdown'
): [string, string | undefined] {
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

/**
 * Random Expression Parser
 * ========================
 *
 * Parses {#:...} expressions with full support for:
 * - Variable bounds: {#:{@:min}-{@:max}}
 * - Variable digits: {#:{@:before}.{@:after}}
 * - Exclusions: values, ranges, and variables
 * - Decimal steps: {#:0.5-9.99:0.01}
 *
 * @module questions/parser/random-parser
 */

import type { RandomSpec, NumberOrVariable, Exclusion } from '../types';

/**
 * Parse a random expression into a RandomSpec
 *
 * @param expr - Full expression including {#: and }
 * @returns Parsed random specification
 * @throws Error if expression is invalid
 *
 * @example Integer range
 * ```typescript
 * parseRandomExpression('{#:1-10}')
 * // → { type: 'integer', min: 1, max: 10, exclusions: [] }
 * ```
 *
 * @example Variable bounds
 * ```typescript
 * parseRandomExpression('{#:{@:min}-{@:max}}')
 * // → { type: 'integer', min: {type:'variable',name:'min'}, max: {...}, exclusions: [] }
 * ```
 *
 * @example Decimal by digits
 * ```typescript
 * parseRandomExpression('{#:2.3}')
 * // → { type: 'decimal', digitsBefore: 2, digitsAfter: 3, exclusions: [] }
 * ```
 *
 * @example With exclusions
 * ```typescript
 * parseRandomExpression('{#:1-20!5,7-9,{@:a}}')
 * // → { type: 'integer', min: 1, max: 20, exclusions: [...] }
 * ```
 *
 * @example Decimal range with step
 * ```typescript
 * parseRandomExpression('{#:0.5-9.99:0.01}')
 * // → { type: 'decimal', min: 0.5, max: 9.99, step: 0.01, exclusions: [] }
 * ```
 */
export function parseRandomExpression(expr: string): RandomSpec {
	// Remove {#: and }
	if (!expr.startsWith('{#:') || !expr.endsWith('}')) {
		throw new Error(`Invalid random expression: ${expr}`);
	}

	const content = expr.slice(3, -1);

	// Split base and exclusions
	const [baseSpec, exclusionSpec] = splitAtTopLevel(content, '!');

	// Parse base specification
	let spec: RandomSpec;

	// Check if it's a decimal by digits format (contains . but no -)
	if (baseSpec.includes('.') && !baseSpec.includes('-')) {
		spec = parseDecimalByDigits(baseSpec);
	} else {
		spec = parseRange(baseSpec);
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
 * Parse decimal format: {#:2.3} or {#:{@:before}.{@:after}}
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
 * Parse range format: {#:1-10} or {#:{@:min}-{@:max}} or {#:0.5-9.99:0.01}
 */
function parseRange(spec: string): RandomSpec {
	// Check for step notation (split at top level to avoid splitting inside {@:})
	const [rangeSpec, stepStr] = splitAtTopLevel(spec, ':');

	// Parse min-max
	const { min, max } = parseMinMax(rangeSpec);

	// Determine if decimal or integer
	const isDecimal =
		stepStr !== undefined || isNumberOrVariableDecimal(min) || isNumberOrVariableDecimal(max);

	if (isDecimal) {
		// Decimal range with step
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
 * - "1-{@:max}" → min: 1, max: {type:'variable',name:'max'}
 */
function parseMinMax(rangeSpec: string): { min: NumberOrVariable; max: NumberOrVariable } {
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
		min: parseNumberOrVariable(minStr),
		max: parseNumberOrVariable(maxStr)
	};
}

/**
 * Parse a string as number or variable reference
 *
 * @example Number
 * parseNumberOrVariable('42') → { type: 'number', value: 42 }
 *
 * @example Variable
 * parseNumberOrVariable('{@:varName}') → { type: 'variable', name: 'varName' }
 */
export function parseNumberOrVariable(str: string): NumberOrVariable {
	const trimmed = str.trim();

	// Check if it's a variable
	if (trimmed.startsWith('{@:') && trimmed.endsWith('}')) {
		const varName = trimmed.slice(3, -1);
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
 * Parse exclusions: "5,7-9,{@:a},{@:b}-{@:c}"
 */
function parseExclusions(spec: string): Exclusion[] {
	const exclusions: Exclusion[] = [];
	const parts = splitExclusionParts(spec);

	for (const part of parts) {
		const trimmed = part.trim();

		// Range: detect by trying to parse as range
		// This handles: 5-7, -10--5, {@:a}-{@:b}, -10-20
		if (
			trimmed.includes('-') &&
			!(
				trimmed.startsWith('{@:') &&
				trimmed.endsWith('}') &&
				trimmed.indexOf('-') === trimmed.lastIndexOf('-')
			)
		) {
			try {
				const { min, max } = parseMinMax(trimmed);
				exclusions.push({ type: 'range', min, max });
			} catch {
				// If parseMinMax fails, treat as single value
				const value = parseNumberOrVariable(trimmed);
				exclusions.push({ type: 'value', value });
			}
		}
		// Single value: 5, -3, or {@:name}
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
 * Example: "5,{@:a},{@:b}-{@:c}" → ["5", "{@:a}", "{@:b}-{@:c}"]
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
 * splitAtTopLevel('1-10!5', '!') → ['1-10', '5']
 * splitAtTopLevel('{@:a}-{@:b}!{@:c}', '!') → ['{@:a}-{@:b}', '{@:c}']
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

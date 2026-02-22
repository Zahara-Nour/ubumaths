/**
 * Variable Resolver - Resolve variable definitions
 * =================================================
 *
 * Resolves variables using a 3-stage pipeline:
 * 1. Replace variable references {{var}} -> resolved value
 * 2. Generate random numbers {{random:1..10}} -> actual number
 * 3. Evaluate expressions {{eval:a+b}} -> calculated result
 *
 * Variables are resolved in declaration order, allowing later
 * variables to reference earlier ones.
 *
 * @module ubumark/parameterization/resolver/variable-resolver
 */

import type { Variable, ResolvedVariable } from '../../types';
import type { DisplayOptions } from '../display-options';
import { resolveDisplayOptions } from '../display-options';
import { applyDisplayTransforms, canTransform } from '../expression-transforms';
import { tokenize } from '../parser/tokenizer';
import { parseVariableReference } from '../parser/variable-parser';
import { parseRandomSpec } from '../parser/random-parser';
import { parseEvalExpressionWithModifiers } from '../parser/eval-parser';
import { normalizeExpression } from '../parser/expression-normalizer';
import { generateRandomNumber } from './random-generator';
import { parseCustom } from '$lib/mathAST/parser/custom';
import { parseLatex } from '$lib/mathAST/parser';
import { substitute, evaluateAstWithModifiers } from '$lib/mathAST/eval';
import type { EvalBindings } from '$lib/mathAST/eval';
import { toFrenchDecimal } from '$lib/utils/french-math';

// ============================================================================
// REMOVE SPACES (French digit grouping prevention)
// ============================================================================

/**
 * Prevent French digit grouping on a LaTeX value.
 *
 * Problem: generators (latex-generator, typst-generator) call toFrenchDecimal()
 * on all math content, turning 12345 → 12\,345. For exercises where students must
 * add digit grouping themselves, we need to prevent this.
 *
 * Solution: insert empty LaTeX groups {} between consecutive digits.
 * toFrenchDecimal's regex /(\d+)/g then sees only single-digit matches,
 * which are too short (< 4 digits) to trigger grouping.
 * {} renders as nothing in LaTeX, so the visual output is unchanged.
 *
 * Steps:
 * 1. Pre-apply toFrenchDecimal with formatSpaces:false to convert decimal
 *    points to French commas ({,}) without adding digit grouping.
 *    This is necessary because the {} insertion would otherwise prevent
 *    the generator from recognizing decimal numbers (3.14 → 3{}.{}1{}4).
 * 2. Insert {} between every pair of consecutive digits.
 *
 * @example
 * applyRemoveSpaces("12345")     → "1{}2{}3{}4{}5"
 * applyRemoveSpaces("3.14")      → "3{,}1{}4"        (decimal → {,}, then {} between digits)
 * applyRemoveSpaces("12345.678") → "1{}2{}3{}4{}5{,}6{}7{}8"
 */
export function applyRemoveSpaces(latex: string): string {
	// Step 1: convert decimal points to French commas (but no digit grouping)
	const withFrenchComma = toFrenchDecimal(latex, { formatSpaces: false });
	// Step 2: break consecutive digit sequences with empty LaTeX groups
	return withFrenchComma.replace(/(\d)(?=\d)/g, '$1{}');
}

/**
 * Resolve all variables using 3-stage pipeline
 *
 * Process:
 * 1. For each variable in order:
 *    a. Replace variable references with resolved values
 *    b. Generate random numbers with optional seed
 *    c. Evaluate mathematical expressions
 * 2. Build array of resolved variables
 * 3. Return resolved variables for use in text resolution
 *
 * @param variables - Variable definitions to resolve
 * @param seed - Optional seed for reproducible random generation
 * @returns Array of resolved variables in declaration order
 * @throws Error if circular dependency or undefined reference detected
 *
 * @example Simple variables
 * ```typescript
 * resolveVariables([
 *   { name: 'a', expression: '5' },
 *   { name: 'b', expression: '10' }
 * ])
 * // -> [{ name: 'a', value: '5' }, { name: 'b', value: '10' }]
 * ```
 *
 * @example Variable references
 * ```typescript
 * resolveVariables([
 *   { name: 'a', expression: '5' },
 *   { name: 'b', expression: '{{a}}' }
 * ])
 * // -> [{ name: 'a', value: '5' }, { name: 'b', value: '5' }]
 * ```
 *
 * @example Random numbers
 * ```typescript
 * resolveVariables([
 *   { name: 'rand', expression: '{{random:1..10}}' }
 * ], 12345)
 * // -> [{ name: 'rand', value: '7' }] (deterministic with seed)
 * ```
 *
 * @example Eval expressions
 * ```typescript
 * resolveVariables([
 *   { name: 'a', expression: '5' },
 *   { name: 'b', expression: '10' },
 *   { name: 'sum', expression: '{{eval:a+b}}' }
 * ])
 * // -> [{ name: 'a', value: '5' }, { name: 'b', value: '10' }, { name: 'sum', value: '15' }]
 * ```
 *
 * @example Complex pipeline
 * ```typescript
 * resolveVariables([
 *   { name: 'min', expression: '1' },
 *   { name: 'max', expression: '10' },
 *   { name: 'a', expression: '{{random:{{min}}..{{max}}}}' },
 *   { name: 'b', expression: '{{random:{{min}}..{{max}}!{{a}}}}' },
 *   { name: 'sum', expression: '{{eval:a+b}}' }
 * ], 12345)
 * // -> All variables resolved with random values and calculated sum
 * ```
 */
export function resolveVariables(
	variables: Variable[],
	seed?: number,
	templateDisplayDefaults?: DisplayOptions
): ResolvedVariable[] {
	if (!variables || variables.length === 0) {
		return [];
	}

	const resolvedVariables: ResolvedVariable[] = [];

	for (let i = 0; i < variables.length; i++) {
		const variable = variables[i];
		try {
			// Use a unique seed for each variable to ensure different random values
			// Multiply by a large prime to spread seeds apart and avoid collisions
			const variableSeed = seed !== undefined ? seed + i * 7919 : undefined;
			const resolvedValue = resolveExpression(variable.expression, resolvedVariables, variableSeed);

			// Build the resolved variable
			const resolved: ResolvedVariable = {
				name: variable.name,
				value: resolvedValue
			};

			// Apply display transforms if variable or template has displayOptions
			if (variable.displayOptions || templateDisplayDefaults) {
				const displayOptions = resolveDisplayOptions(
					templateDisplayDefaults,
					variable.displayOptions
				);

				let displayValue = resolvedValue;
				let changed = false;

				// Apply structural transforms (shuffle, removeNullTerms, etc.)
				const hasActiveTransforms =
					displayOptions.shuffleTerms ||
					displayOptions.shuffleFactors ||
					displayOptions.shuffleTermsAndFactors ||
					displayOptions.shallowShuffleTerms ||
					displayOptions.shallowShuffleFactors ||
					displayOptions.removeNullTerms ||
					displayOptions.removeUnnecessaryBrackets;

				if (hasActiveTransforms && canTransform(resolvedValue)) {
					displayValue = applyDisplayTransforms(resolvedValue, displayOptions);
					changed = displayValue !== resolvedValue;
				}

				// Apply removeSpaces: prevent French digit grouping by inserting {}
				if (displayOptions.removeSpaces) {
					displayValue = applyRemoveSpaces(displayValue);
					changed = displayValue !== resolvedValue;
				}

				if (changed) {
					resolved.displayValue = displayValue;
				}
			}

			resolvedVariables.push(resolved);
		} catch (error) {
			throw new Error(
				`Failed to resolve variable "${variable.name}": ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	return resolvedVariables;
}

/**
 * Resolve a single variable expression using 3-stage pipeline
 *
 * This function is exported for use by Questions feature for ContentField resolution.
 * It resolves a single expression (not a variable definition) through the full pipeline.
 *
 * @param expression - Variable expression string
 * @param alreadyResolved - Variables already resolved
 * @param seed - Optional seed for random generation
 * @returns Resolved value as string
 */
export function resolveExpression(
	expression: string,
	alreadyResolved: ResolvedVariable[],
	seed: number | undefined,
	options?: { useDisplayValue?: boolean }
): string {
	// Check if this is an explicit text literal (text:...) BEFORE normalization
	// Text literals should NOT have variable substitution applied
	const isTextLiteral = expression.trim().startsWith('text:');

	// Normalize simplified syntax to legacy {{...}} syntax
	let result = normalizeExpression(expression);

	// Text literals: return as-is without any substitution or LaTeX conversion
	if (isTextLiteral) {
		return result;
	}

	// STAGE 0: If no {{...}} tokens, apply bare variable name substitution
	// This allows expressions like "a^b*a^c" to work without explicit {{}}
	if (!result.includes('{{')) {
		for (const resolvedVar of alreadyResolved) {
			// Use word boundary to avoid partial replacements
			// e.g., don't replace 'a' in 'tan' or 'max'
			const regex = new RegExp(`\\b${resolvedVar.name}\\b`, 'g');
			result = result.replace(regex, resolvedVar.value);
		}
		return result;
	}

	// STAGE 1: Replace variable references {{name}}
	const variableTokens = tokenize(result).filter((t) => t.type === 'variable');

	// Replace from end to start to preserve positions
	for (let i = variableTokens.length - 1; i >= 0; i--) {
		const token = variableTokens[i];
		const varName = parseVariableReference(token.content);
		if (!varName) continue;

		const resolvedVar = alreadyResolved.find((v) => v.name === varName);
		if (!resolvedVar) {
			throw new Error(`Variable "${varName}" not found or not yet resolved`);
		}

		const substitution =
			options?.useDisplayValue && resolvedVar.displayValue
				? resolvedVar.displayValue
				: resolvedVar.value;
		result = result.slice(0, token.start) + substitution + result.slice(token.end);
	}

	// STAGE 2: Generate random numbers {{random:...}} or {{...}}
	const randomTokens = tokenize(result).filter((t) => t.type === 'random');

	// Replace from end to start to preserve positions
	for (let i = randomTokens.length - 1; i >= 0; i--) {
		const token = randomTokens[i];
		try {
			const spec = parseRandomSpec(token.content);
			if (!spec) {
				throw new Error(`Failed to parse random spec: ${token.content}`);
			}
			const generatedValue = generateRandomNumber(
				spec,
				alreadyResolved,
				seed,
				// Resolve sub-expressions in discrete list items (e.g., "1..9" in "0|1..9")
				(subExpr) => resolveExpression(subExpr, alreadyResolved, seed)
			);
			result = result.slice(0, token.start) + String(generatedValue) + result.slice(token.end);
		} catch (error) {
			throw new Error(
				`Failed to generate random number in expression "${token.content}": ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	// STAGE 2.5: Generate n-digit numbers {{digits:...}}
	const digitsTokens = tokenize(result).filter((t) => t.type === 'digits');

	// Replace from end to start to preserve positions
	for (let i = digitsTokens.length - 1; i >= 0; i--) {
		const token = digitsTokens[i];
		try {
			const generatedValue = generateDigitsNumber(token.inner, alreadyResolved, seed);
			result = result.slice(0, token.start) + String(generatedValue) + result.slice(token.end);
		} catch (error) {
			throw new Error(
				`Failed to generate digits number in expression "${token.content}": ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	// STAGE 3: Evaluate {{eval:...}} expressions (with optional modifiers)
	// Uses AST-based pipeline: parseCustom -> substitute -> evaluate
	// This handles implicit multiplication (e.g., 2k → 2*k) correctly.
	const evalTokens = tokenize(result).filter((t) => t.type === 'eval');

	// Replace from end to start to preserve positions
	for (let i = evalTokens.length - 1; i >= 0; i--) {
		const token = evalTokens[i];
		try {
			const parsed = parseEvalExpressionWithModifiers(token.content);
			if (!parsed) {
				throw new Error(`Failed to parse eval expression: ${token.content}`);
			}

			// Resolve {{var}} tokens in the expression string before AST parsing
			let exprToParse = parsed.expression;
			const varTokensInEval = tokenize(parsed.expression).filter((t) => t.type === 'variable');
			if (varTokensInEval.length > 0) {
				for (let j = varTokensInEval.length - 1; j >= 0; j--) {
					const varToken = varTokensInEval[j];
					const varName = parseVariableReference(varToken.content);
					if (!varName) continue;

					const resolvedVar = alreadyResolved.find((v) => v.name === varName);
					if (!resolvedVar) {
						throw new Error(`Variable "${varName}" not found in eval expression`);
					}

					exprToParse =
						exprToParse.slice(0, varToken.start) +
						resolvedVar.value +
						exprToParse.slice(varToken.end);
				}
			}

			// Replace multi-character variable names via regex before AST parsing
			// (parseCustom treats 'expression1' as e*x*p*r*e*s*s*i*o*n*1)
			// Sort by name length descending to avoid partial replacements
			const multiCharVars = alreadyResolved
				.filter((rv) => rv.name.length > 1)
				.sort((a, b) => b.name.length - a.name.length);
			for (const rv of multiCharVars) {
				const regex = new RegExp(`\\b${rv.name}\\b`, 'g');
				exprToParse = exprToParse.replace(regex, rv.value);
			}

			// Parse expression: use LaTeX parser for backslash commands, custom parser otherwise
			// Custom parser handles implicit multiplication (2k → 2*k)
			const hasLatex = exprToParse.includes('\\');
			const ast = hasLatex ? parseLatex(exprToParse) : parseCustom(exprToParse);

			// Build bindings from single-letter variables for AST substitution
			const bindings: EvalBindings = {};
			for (const rv of alreadyResolved) {
				if (rv.name.length === 1) {
					const num = Number(rv.value);
					bindings[rv.name] = Number.isFinite(num) ? num : rv.value;
				}
			}

			// Substitute variables in AST and evaluate
			const substituted = substitute(ast, bindings);
			const evaluatedValue = evaluateAstWithModifiers(substituted, parsed.modifiers);
			result = result.slice(0, token.start) + String(evaluatedValue) + result.slice(token.end);
		} catch (error) {
			throw new Error(
				`Failed to evaluate expression "${token.content}": ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	return result;
}

/**
 * Generate a number from a digits specification
 *
 * Supports two modes:
 * 1. N-digit integers: digits:2 → 10-99, digits:1..3 → 1-999
 * 2. Decimal by digits: digits:2.3 → XX.XXX (2 integer digits, 3 decimal digits)
 *
 * @param spec - Digits specification:
 *   - "1" (1 digit integer: 1-9)
 *   - "2" (2 digit integer: 10-99)
 *   - "1..3" (1 to 3 digit integer: 1-999)
 *   - "a..b" (integer with variable bounds)
 *   - "2.3" (decimal: 2 integer digits, 3 decimal digits)
 *   - "a.b" (decimal with variable digit counts)
 * @param alreadyResolved - Variables already resolved for variable lookups
 * @param seed - Optional seed for reproducible random generation
 * @returns Generated number as string (to preserve decimal formatting)
 *
 * @example Integer specs
 * generateDigitsNumber('1', [], 12345)  // "7" (1-9)
 * generateDigitsNumber('2', [], 12345)  // "45" (10-99)
 * generateDigitsNumber('1..3', [], 12345)  // "123" (1-999)
 *
 * @example Decimal specs
 * generateDigitsNumber('2.3', [], 12345)  // "45.123"
 * generateDigitsNumber('1.2', [], 12345)  // "7.42"
 */
function generateDigitsNumber(
	spec: string,
	alreadyResolved: ResolvedVariable[],
	seed: number | undefined
): string {
	// Check for decimal-by-digits format: X.Y (single dot, not double dot ..)
	// Must distinguish "2.3" (decimal) from "1..3" (integer range)
	const hasDoubleDot = spec.includes('..');
	const singleDotMatch = !hasDoubleDot && spec.match(/^([^.]+)\.([^.]+)$/);

	if (singleDotMatch) {
		// Decimal by digits format: "2.3" or "a.b"
		const beforeStr = singleDotMatch[1].trim();
		const afterStr = singleDotMatch[2].trim();

		const digitsBefore = resolveDigitValue(beforeStr, alreadyResolved);
		const digitsAfter = resolveDigitValue(afterStr, alreadyResolved);

		return generateDecimalByDigits(digitsBefore, digitsAfter, seed);
	}

	// Integer mode: "2", "1..3", "a..b"
	let minDigits: number;
	let maxDigits: number;

	// Check for range separator (..)
	const rangeSeparatorIndex = spec.indexOf('..');
	if (rangeSeparatorIndex !== -1) {
		// Range: "1..3" or "a..b" or "{{min}}..{{max}}"
		const minStr = spec.substring(0, rangeSeparatorIndex).trim();
		const maxStr = spec.substring(rangeSeparatorIndex + 2).trim();

		minDigits = resolveDigitValue(minStr, alreadyResolved);
		maxDigits = resolveDigitValue(maxStr, alreadyResolved);
	} else {
		// Single value: "1", "2", "a"
		const digits = resolveDigitValue(spec.trim(), alreadyResolved);
		minDigits = digits;
		maxDigits = digits;
	}

	// Validate
	if (minDigits < 0 || maxDigits < 0) {
		throw new Error(`Digit count must be non-negative: ${spec}`);
	}
	if (minDigits > maxDigits) {
		throw new Error(`Invalid digits range: min (${minDigits}) > max (${maxDigits})`);
	}

	// Calculate min and max values for the digit range
	// For n digits: min = 10^(n-1), max = 10^n - 1
	// Special case: 0 digits means 0
	// Special case: 1 digit means 1-9 (not 0)
	const minValue = minDigits === 0 ? 0 : Math.pow(10, minDigits - 1);
	const maxValue = Math.pow(10, maxDigits) - 1;

	// Adjust minValue for single digit to exclude 0
	const adjustedMin = minDigits === 1 ? 1 : minValue;

	// Generate random number in range
	const range = maxValue - adjustedMin + 1;

	// Use seeded random if seed provided
	let randomValue: number;
	if (seed !== undefined) {
		// Simple LCG for seeded random
		const a = 1103515245;
		const c = 12345;
		const m = 2147483648;
		const seededRandom = ((a * seed + c) % m) / m;
		randomValue = Math.floor(seededRandom * range) + adjustedMin;
	} else {
		randomValue = Math.floor(Math.random() * range) + adjustedMin;
	}

	return String(randomValue);
}

/**
 * Generate a decimal number with specified digit counts
 *
 * @param digitsBefore - Number of digits before decimal point (0 = "0.xxx")
 * @param digitsAfter - Number of digits after decimal point
 * @param seed - Optional seed for reproducible random generation
 * @returns Formatted decimal string (e.g., "45.123")
 */
function generateDecimalByDigits(
	digitsBefore: number,
	digitsAfter: number,
	seed: number | undefined
): string {
	if (digitsBefore < 0 || digitsAfter < 0) {
		throw new Error(`Digit counts must be non-negative: ${digitsBefore}.${digitsAfter}`);
	}

	// Generate integer part
	let integerPart: number;
	if (digitsBefore === 0) {
		integerPart = 0;
	} else {
		const minInt = digitsBefore === 1 ? 1 : Math.pow(10, digitsBefore - 1);
		const maxInt = Math.pow(10, digitsBefore) - 1;
		const rangeInt = maxInt - minInt + 1;

		if (seed !== undefined) {
			const a = 1103515245;
			const c = 12345;
			const m = 2147483648;
			const seededRandom = ((a * seed + c) % m) / m;
			integerPart = Math.floor(seededRandom * rangeInt) + minInt;
		} else {
			integerPart = Math.floor(Math.random() * rangeInt) + minInt;
		}
	}

	// Generate decimal part
	let decimalPart: number;
	if (digitsAfter === 0) {
		return String(integerPart);
	} else {
		const minDec = 0;
		const maxDec = Math.pow(10, digitsAfter) - 1;
		const rangeDec = maxDec - minDec + 1;

		// Use different seed for decimal part to avoid correlation
		const decimalSeed = seed !== undefined ? seed + 7919 : undefined;
		if (decimalSeed !== undefined) {
			const a = 1103515245;
			const c = 12345;
			const m = 2147483648;
			const seededRandom = ((a * decimalSeed + c) % m) / m;
			decimalPart = Math.floor(seededRandom * rangeDec) + minDec;
		} else {
			decimalPart = Math.floor(Math.random() * rangeDec) + minDec;
		}
	}

	// Format with leading zeros for decimal part
	const decimalStr = String(decimalPart).padStart(digitsAfter, '0');
	return `${integerPart}.${decimalStr}`;
}

/**
 * Resolve a digit value from string (number literal or variable reference)
 *
 * @param str - Value string: "1", "a", "{{min}}"
 * @param alreadyResolved - Variables to look up
 * @returns Resolved numeric value
 */
function resolveDigitValue(str: string, alreadyResolved: ResolvedVariable[]): number {
	// Case 1: Explicit variable syntax {{varName}}
	if (str.startsWith('{{') && str.endsWith('}}')) {
		const varName = str.slice(2, -2);
		const resolvedVar = alreadyResolved.find((v) => v.name === varName);
		if (!resolvedVar) {
			throw new Error(`Variable "${varName}" not found in digits specification`);
		}
		const num = parseInt(resolvedVar.value, 10);
		if (isNaN(num)) {
			throw new Error(`Variable "${varName}" has non-numeric value: ${resolvedVar.value}`);
		}
		return num;
	}

	// Case 2: Numeric literal
	const num = parseInt(str, 10);
	if (!isNaN(num)) {
		return num;
	}

	// Case 3: Bare variable name (starts with letter or underscore)
	if (/^[a-zA-Z_]\w*$/.test(str)) {
		const resolvedVar = alreadyResolved.find((v) => v.name === str);
		if (!resolvedVar) {
			throw new Error(`Variable "${str}" not found in digits specification`);
		}
		const varNum = parseInt(resolvedVar.value, 10);
		if (isNaN(varNum)) {
			throw new Error(`Variable "${str}" has non-numeric value: ${resolvedVar.value}`);
		}
		return varNum;
	}

	throw new Error(`Invalid digit value: ${str}`);
}

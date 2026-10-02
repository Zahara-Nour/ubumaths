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
import { randomInt, type RandomSource } from '$lib/utils/random';
import { parseCustom } from '$lib/mathAST/parser/custom';
import { parseLatex } from '$lib/mathAST/parser';
import {
	substitute,
	evaluateAstWithModifiers,
	evalResultToCustom,
	getVariables
} from '$lib/mathAST/eval';
import type { BindingValue } from '$lib/mathAST/eval';
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
 * Valeur non numérique d'une variable d'une lettre, liée dans un calcul : une formule en
 * syntaxe maison (`2+3-mod(9+2+2, 3)`) est lue par parseCustom — `substitute` lirait la
 * chaîne en LaTeX et échouerait. Une valeur LaTeX (`\\dfrac{9}{7}`) reste une chaîne.
 */
function toBinding(value: string): BindingValue {
	// LaTeX, ou une seule lettre (`e` deviendrait la constante d'Euler) : chaîne, comme avant
	if (value.includes('\\') || /^\s*[a-zA-Z]\s*$/.test(value)) return value;
	try {
		return parseCustom(value);
	} catch {
		return value;
	}
}

/**
 * Remplace les noms de variables nus (`c*b*a`) en UN seul passage : une valeur substituée
 * n'est jamais relue. Sinon la lettre tirée « b » (a = « b ») deviendrait la valeur de la
 * variable `b` : « 6 × 2 × 2 » au lieu de « 6 × 2 × b ». Les bornes de mot évitent de
 * toucher le `a` de `tan` ou de `max` ; les noms longs passent avant les courts.
 */
function substituteBareNames(text: string, resolved: ResolvedVariable[]): string {
	if (resolved.length === 0) return text;
	const values = new Map(resolved.map((v) => [v.name, v.value]));
	const names = [...values.keys()].sort((a, b) => b.length - a.length);
	const regex = new RegExp(`\\b(?:${names.join('|')})\\b`, 'g');
	return text.replace(regex, (name) => values.get(name) ?? name);
}

/**
 * Liaisons des variables d'une lettre pour un calcul. Une lettre qui est la VALEUR tirée
 * d'une variable (a = « b ») et que l'auteur n'a pas écrite dans ce calcul n'est pas liée :
 * dans `{{eval:{{expression1}}}}` avec expression1 = « 6*2*b », le `b` est l'inconnue, pas
 * la variable `b`. Une lettre écrite par l'auteur (`{{eval:b*c}}`) reste liée.
 */
function singleLetterBindings(
	authorExpression: string,
	resolved: ResolvedVariable[]
): Record<string, BindingValue> {
	const authorLetters = lettersWrittenBy(authorExpression, resolved);
	const drawn = new Set(resolved.map((v) => v.value.trim()).filter((v) => /^[a-zA-Z]$/.test(v)));
	const bindings: Record<string, BindingValue> = {};
	for (const rv of resolved) {
		if (rv.name.length !== 1) continue;
		if (drawn.has(rv.name) && !authorLetters.has(rv.name)) continue;
		const num = Number(rv.value);
		bindings[rv.name] = Number.isFinite(num) ? num : toBinding(rv.value);
	}
	return withForwardReferences(bindings, drawn);
}

/**
 * Une valeur liée peut citer une variable d'une lettre déclarée APRÈS elle (`k = 2*y`,
 * `y = 5`) : on la résout ici, jusqu'au bout, pour que le calcul lui-même se fasse en un seul
 * passage. Les lettres tirées (a = « b ») y restent des inconnues : la valeur de a n'est
 * jamais relue comme la variable `b`.
 */
function withForwardReferences(
	bindings: Record<string, BindingValue>,
	drawn: ReadonlySet<string>
): Record<string, BindingValue> {
	const inner = Object.fromEntries(Object.entries(bindings).filter(([name]) => !drawn.has(name)));
	const resolved: Record<string, BindingValue> = {};
	for (const [name, value] of Object.entries(bindings)) {
		resolved[name] = typeof value === 'object' ? substitute(value, inner) : value;
	}
	return resolved;
}

/** Lettres écrites par l'auteur dans un calcul, hors `{{var}}` et noms longs substitués */
function lettersWrittenBy(expression: string, resolved: ResolvedVariable[]): Set<string> {
	let text = expression;
	for (const token of tokenize(text).reverse()) {
		text = text.slice(0, token.start) + ' 1 ' + text.slice(token.end);
	}
	const longNames = resolved.filter((v) => v.name.length > 1).map((v) => v.name);
	if (longNames.length > 0) {
		text = text.replace(new RegExp(`\\b(?:${longNames.join('|')})\\b`, 'g'), ' 1 ');
	}
	try {
		return getVariables(text.includes('\\') ? parseLatex(text) : parseCustom(text));
	} catch {
		// Illisible : toutes les lettres, comme avant (liées)
		return new Set(text.match(/[a-zA-Z]/g) ?? []);
	}
}

/**
 * Lettres venues des VARIABLES CITÉES par ce calcul : `a` vaut « x » (tirée dans `$l{x;y;z}`),
 * ou `expression1` vaut « x*3*4 ». Le calcul littéral n'est ouvert que pour elles : une lettre
 * tapée dans le calcul lui-même (`{{eval:2*x}}` au lieu de `{{p}}`) reste une erreur. `e` et
 * `i` (constantes) sont exclues.
 */
function drawnLetters(resolved: ResolvedVariable[], referenced: ReadonlySet<string>): Set<string> {
	const letters = new Set<string>();
	for (const variable of resolved) {
		if (!referenced.has(variable.name)) continue;
		for (const letter of lettersOf(variable.value)) {
			if (letter !== 'e' && letter !== 'i') letters.add(letter);
		}
	}
	return letters;
}

/** Lettres (variables mathématiques) d'une valeur : `x*3*4` → x ; `\\dfrac{x}{2}` → x */
function lettersOf(value: string): Set<string> {
	const text = value.trim();
	if (/^[a-zA-Z]$/.test(text)) return new Set([text]);
	if (!/[a-zA-Z]/.test(text)) return new Set();
	// Un mot de plusieurs lettres (unité `cm`, `mm`, texte) : pas du calcul littéral
	const withoutFunctions = text.replace(/\\?(?:sqrt|ln|exp|log|sin|cos|tan|abs)\b/g, '');
	if (/[a-zA-Z]{2,}/.test(withoutFunctions.replace(/\\[a-zA-Z]+/g, ''))) return new Set();
	try {
		return getVariables(text.includes('\\') ? parseLatex(text) : parseCustom(text));
	} catch {
		return new Set();
	}
}

/**
 * Wrap a value being string-substituted into an `{{eval:...}}` expression in
 * `{}` so it parses as a single grouped operand. This preserves the implied
 * grouping of negative or compound values: `{{a}}^2` with a=-5 becomes
 * `{-5}^2` = (-5)^2 = 25, not `-5^2` = -(5^2) = -25. Braces are grouping for
 * both `parseCustom` and `parseLatex` and are transparent for plain operands.
 *
 * A value that is a bare operator is left untouched: a variable can resolve to
 * `+`/`-` from a discrete list and be used as the operator itself, e.g.
 * `{{eval:5{{op}}3}}` — wrapping it (`5{+}3`) would break parsing.
 */
export function braceWrap(value: string): string {
	if (/^\s*[+\-*/^]\s*$/.test(value)) return value;
	// Un résultat exact (`\dfrac{9}{7}`) repasse en syntaxe maison : sinon tout le calcul
	// part dans parseLatex, qui ne lit ni `2{…}` ni `sqrt(…)`
	return `{${evalResultToCustom(value)}}`;
}

/**
 * Resolve all variables using 3-stage pipeline
 *
 * Process:
 * 1. For each variable in order:
 *    a. Replace variable references with resolved values
 *    b. Generate random numbers, drawn in order from the random source
 *    c. Evaluate mathematical expressions
 * 2. Build array of resolved variables
 * 3. Return resolved variables for use in text resolution
 *
 * @param variables - Variable definitions to resolve
 * @param random - Source de hasard de l'instance, consommée dans l'ordre de déclaration
 *   (`createRandomSource(seed)` pour un tirage reproductible), Math.random par défaut
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
 * ], createRandomSource(12345))
 * // -> [{ name: 'rand', value: '7' }] (reproducible with the same seed)
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
 * ], createRandomSource(12345))
 * // -> All variables resolved with random values and calculated sum
 * ```
 */
export function resolveVariables(
	variables: Variable[],
	random: RandomSource = Math.random,
	templateDisplayDefaults?: DisplayOptions
): ResolvedVariable[] {
	if (!variables || variables.length === 0) {
		return [];
	}

	const resolvedVariables: ResolvedVariable[] = [];

	for (let i = 0; i < variables.length; i++) {
		const variable = variables[i];
		try {
			// Une seule source pour toutes les variables : chaque tirage la fait avancer
			const resolvedValue = resolveExpression(variable.expression, resolvedVariables, random);

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
					displayValue = applyDisplayTransforms(resolvedValue, displayOptions, random);
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
 * @param random - Source de hasard de l'instance (consommée), Math.random par défaut
 * @returns Resolved value as string
 */
export function resolveExpression(
	expression: string,
	alreadyResolved: ResolvedVariable[],
	random: RandomSource = Math.random,
	options?: {
		useDisplayValue?: boolean;
		/**
		 * Contenu markdown (énoncé, corrigé) et non expression de variable : pas de
		 * normalisation de la syntaxe simplifiée, qui lisait les « | » d'un tableau
		 * comme une liste de tirage et enveloppait tout le texte dans {{…}}
		 */
		markdown?: boolean;
	}
): string {
	// Check if this is an explicit text literal (text:...) BEFORE normalization
	// Text literals should NOT have variable substitution applied
	const isTextLiteral = !options?.markdown && expression.trim().startsWith('text:');

	// Normalize simplified syntax to legacy {{...}} syntax
	let result = options?.markdown ? expression : normalizeExpression(expression);

	// Text literals: return as-is without any substitution or LaTeX conversion
	if (isTextLiteral) {
		return result;
	}

	// STAGE 0: If no {{...}} tokens, apply bare variable name substitution
	// This allows expressions like "a^b*a^c" to work without explicit {{}}
	if (!result.includes('{{')) {
		return substituteBareNames(result, alreadyResolved);
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

	// STAGE 1.5: Resolve embedded {{eval:...}} tokens before random/digits processing.
	// The tokenizer groups nested {{}} as a single outer token, so Stage 3 would never
	// see an {{eval:...}} inside a {{random:...}}. This step scans the raw string to
	// find and evaluate innermost {{eval:...}} tokens at any nesting level.
	result = resolveEmbeddedEvals(result, alreadyResolved);

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
				random,
				// Resolve sub-expressions in discrete list items (e.g., "1..9" in "0|1..9"),
				// en poursuivant la même source
				(subExpr) => resolveExpression(subExpr, alreadyResolved, random)
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
			const generatedValue = generateDigitsNumber(token.inner, alreadyResolved, random);
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
			const referenced = new Set<string>();
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
					referenced.add(varName);

					// Wrap the substituted value in `{}` so it parses as a single
					// grouped operand. Without this, a negative value loses its
					// implied grouping: `{{a}}^2` with a=-5 would become `-5^2` =
					// -(5^2) = -25 instead of (-5)^2 = 25 (unary minus binds looser
					// than `^`). Braces are grouping for both parseCustom and
					// parseLatex, and are transparent for non-negative operands.
					exprToParse =
						exprToParse.slice(0, varToken.start) +
						braceWrap(resolvedVar.value) +
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
				if (regex.test(exprToParse)) referenced.add(rv.name);
				exprToParse = exprToParse.replace(regex, () => braceWrap(rv.value));
			}

			// Parse expression: use LaTeX parser for backslash commands, custom parser otherwise
			// Custom parser handles implicit multiplication (2k → 2*k)
			const hasLatex = exprToParse.includes('\\');
			const ast = hasLatex ? parseLatex(exprToParse) : parseCustom(exprToParse);

			// Build bindings from single-letter variables for AST substitution
			const bindings = singleLetterBindings(parsed.expression, alreadyResolved);

			// Substitute variables in AST and evaluate
			for (const name of getVariables(ast)) referenced.add(name);
			const substituted = substitute(ast, bindings, { maxIterations: 1 });
			const evaluatedValue = evaluateAstWithModifiers(
				substituted,
				parsed.modifiers,
				drawnLetters(alreadyResolved, referenced)
			);
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
 * @param random - Source de hasard de l'instance (consommée)
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
	random: RandomSource
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

		return generateDecimalByDigits(digitsBefore, digitsAfter, random);
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

	return String(randomInt(adjustedMin, maxValue, random));
}

/**
 * Generate a decimal number with specified digit counts
 *
 * @param digitsBefore - Number of digits before decimal point (0 = "0.xxx")
 * @param digitsAfter - Number of digits after decimal point
 * @param random - Source de hasard de l'instance (consommée : partie entière, puis décimale)
 * @returns Formatted decimal string (e.g., "45.123")
 */
function generateDecimalByDigits(
	digitsBefore: number,
	digitsAfter: number,
	random: RandomSource
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
		integerPart = randomInt(minInt, maxInt, random);
	}

	// Generate decimal part
	let decimalPart: number;
	if (digitsAfter === 0) {
		return String(integerPart);
	} else {
		decimalPart = randomInt(0, Math.pow(10, digitsAfter) - 1, random);
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

// ============================================================================
// EMBEDDED EVAL RESOLUTION
// ============================================================================

/**
 * Resolve {{eval:...}} tokens embedded at any nesting level in the string.
 *
 * The tokenizer groups nested {{}} into a single outer token, so a top-level
 * Stage 3 pass cannot see an {{eval:...}} that sits inside a {{random:...}}.
 * This function scans the raw string for `{{eval:` markers, finds the matching
 * closing braces via brace counting, and evaluates the innermost evals first.
 *
 * Only resolves eval tokens whose inner content does NOT itself contain
 * `{{eval:` — this guarantees we resolve from the inside out.
 * The outer loop repeats until no more embedded evals remain.
 *
 * @param text - The expression string (after Stage 1 variable resolution)
 * @param alreadyResolved - Variables already resolved
 * @returns The string with all embedded {{eval:...}} tokens resolved
 */
function resolveEmbeddedEvals(text: string, alreadyResolved: ResolvedVariable[]): string {
	let result = text;
	let iterations = 0;
	const MAX_ITERATIONS = 20;

	while (result.includes('{{eval:') && iterations < MAX_ITERATIONS) {
		iterations++;
		let changed = false;

		// Collect all innermost {{eval:...}} tokens (those without nested {{eval:)
		const positions: Array<{ start: number; end: number }> = [];
		let searchFrom = 0;

		while (searchFrom < result.length) {
			const idx = result.indexOf('{{eval:', searchFrom);
			if (idx === -1) break;

			// Find matching closing braces via brace counting
			let braceCount = 0;
			let i = idx;
			while (i < result.length) {
				if (result[i] === '{') braceCount++;
				else if (result[i] === '}') braceCount--;
				i++;
				if (braceCount === 0) break;
			}

			if (braceCount !== 0) {
				// Unmatched braces — skip
				searchFrom = idx + 7;
				continue;
			}

			const inner = result.substring(idx + 7, i - 2); // content between {{eval: and }}
			// Only process innermost evals (no nested {{eval: inside)
			if (!inner.includes('{{eval:')) {
				positions.push({ start: idx, end: i });
			}

			searchFrom = i;
		}

		if (positions.length === 0) break;

		// Resolve from right to left to preserve positions
		for (let p = positions.length - 1; p >= 0; p--) {
			const { start, end } = positions[p];
			const evalToken = result.substring(start, end);

			const evaluated = evaluateSingleEval(evalToken, alreadyResolved);
			if (evaluated !== null) {
				result = result.substring(0, start) + evaluated + result.substring(end);
				changed = true;
			}
		}

		if (!changed) break;
	}

	return result;
}

/**
 * Evaluate a single {{eval:...}} token string.
 *
 * Reuses the same logic as Stage 3: resolve inner {{var}} references,
 * substitute multi-char and single-char variables, parse AST, evaluate.
 *
 * @returns The evaluated value as string, or null if evaluation fails
 */
function evaluateSingleEval(evalToken: string, alreadyResolved: ResolvedVariable[]): string | null {
	const parsed = parseEvalExpressionWithModifiers(evalToken);
	if (!parsed) return null;

	let exprToParse = parsed.expression;
	const referenced = new Set<string>();

	// Resolve {{var}} tokens in the expression
	const varTokensInEval = tokenize(parsed.expression).filter((t) => t.type === 'variable');
	for (let j = varTokensInEval.length - 1; j >= 0; j--) {
		const varToken = varTokensInEval[j];
		const varName = parseVariableReference(varToken.content);
		if (!varName) continue;

		const resolvedVar = alreadyResolved.find((v) => v.name === varName);
		if (!resolvedVar) return null; // Can't resolve yet — leave for Stage 3
		referenced.add(varName);

		// Wrap in `{}` to preserve grouping for negative values — see Stage 3.
		exprToParse =
			exprToParse.slice(0, varToken.start) +
			braceWrap(resolvedVar.value) +
			exprToParse.slice(varToken.end);
	}

	// Replace multi-character variable names via regex before AST parsing
	const multiCharVars = alreadyResolved
		.filter((rv) => rv.name.length > 1)
		.sort((a, b) => b.name.length - a.name.length);
	for (const rv of multiCharVars) {
		const regex = new RegExp(`\\b${rv.name}\\b`, 'g');
		if (regex.test(exprToParse)) referenced.add(rv.name);
		exprToParse = exprToParse.replace(regex, () => braceWrap(rv.value));
	}

	// Parse and evaluate
	const hasLatex = exprToParse.includes('\\');
	const ast = hasLatex ? parseLatex(exprToParse) : parseCustom(exprToParse);

	const bindings = singleLetterBindings(parsed.expression, alreadyResolved);

	for (const name of getVariables(ast)) referenced.add(name);
	const substituted = substitute(ast, bindings, { maxIterations: 1 });
	const evaluatedValue = evaluateAstWithModifiers(
		substituted,
		parsed.modifiers,
		drawnLetters(alreadyResolved, referenced)
	);
	return String(evaluatedValue);
}

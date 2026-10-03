/**
 * Validation Rule Evaluator
 * =========================
 *
 * Evaluates typed ValidationRule against student answers.
 * Used for testAnswers questions where the correct answer
 * depends on generated values (not hardcoded).
 *
 * @module questions/validation-rule-evaluator
 */

import type {
	ValidationRule,
	DivisorRule,
	MultipleRule,
	RangeRule,
	EquationRootRule,
	EquivalenceRule,
	PredicateRule,
	CustomExpressionRule
} from './types';
import { evaluateExpression, areEquivalent, type AnswerAssumptions } from '$lib/math';
import type { GenericFunctionConfig } from '$lib/mathAST/parser';
import { numbersAreClose } from '$lib/mathAST/common/constants';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Context for evaluation (resolved variable values)
 */
export interface EvaluationContext {
	/** Resolved variables from question generation */
	variables: Record<string, number | string>;
	/** Student's answer as string */
	answer: string;
	/** Numeric answer (parsed) if applicable */
	numericAnswer?: number;
	/** Hypothèses de l'énoncé (ADR 0012), transmises à la comparaison symbolique */
	assumptions?: AnswerAssumptions;
	/** Fonctions déclarées par le modèle (`P'(2)`), transmises à la comparaison symbolique */
	genericFunctions?: GenericFunctionConfig;
}

/**
 * Evaluation result
 */
export interface EvaluationResult {
	/** Whether the answer satisfies the rule */
	valid: boolean;
	/** Reason if invalid */
	reason?: string;
	/** Additional debug info */
	debug?: Record<string, unknown>;
}

// ============================================================================
// MAIN EVALUATOR
// ============================================================================

/**
 * Budget d'horloge pour la comparaison symbolique d'une réponse d'élève.
 *
 * Ce module tourne dans le navigateur de l'élève, et `areEquivalent` est
 * synchrone : sans borne, une réponse pathologique gèle l'onglet. Mesuré, tas
 * plafonné à 700 Mo, une réponse `(x+y+z+w+a+b+c+d+e+f+g)^11` comparée à
 * `(x+y+z+w+a+b+c+d+e+f)^10` TUE le processus sans budget, et rend la main en
 * un demi-seconde avec.
 *
 * Même valeur que `validateAlgebraic` dans `answer-validator.ts` : c'est le
 * même geste, la correction d'une réponse, et deux budgets différents pour le
 * même geste ne se justifieraient pas.
 *
 * ⚠️ **Tout budget crée une bande où une réponse VRAIE est comptée fausse**, et
 * celle-ci ne fait pas exception. Frontière mesurée, tas à 700 Mo, sur
 * `(v₁+…+vₙ)^d` comparé à la même somme écrite à l'envers :
 *
 * | variables | degré | sans budget      | avec 500 ms       |
 * | --------- | ----- | ---------------- | ----------------- |
 * | 6         | 10    | 252 ms → `true`  | 242 ms → `true`   |
 * | 6         | 12    | 1343 ms → `true` | 642 ms → **`false`** |
 *
 * `(x+y+z+w+a+b)^12` fait dix-huit caractères de LaTeX et bascule. C'est le
 * prix du budget, pas un défaut : sans lui, l'onglet de l'élève meurt. Mais si
 * une plainte arrive un jour sur une bonne réponse comptée fausse, c'est ici
 * qu'il faut regarder, et c'est le seuil qu'il faut remonter.
 */
const EQUIVALENCE_BUDGET_MS = 500;

/**
 * Messages destinés à l'ÉLÈVE : la raison d'un refus devient le feedback de la
 * case (cf. `evaluateValidationRules` dans `answer-validator.ts`). En français,
 * et sans jamais révéler la réponse attendue. Le détail technique reste dans
 * `debug`.
 */
const RULE_MESSAGES = {
	notANumber: 'Ta réponse doit être un nombre.',
	zeroDivisor: "0 n'est pas un diviseur.",
	nonIntegerDivisor: (a: number) =>
		`${fr(a)} n'est pas un nombre entier : un diviseur est un entier.`,
	notADivisor: (a: number, n: number) => `${fr(a)} n'est pas un diviseur de ${fr(n)}.`,
	zeroBase: 'Erreur de configuration de la question : la base d’un multiple ne peut pas être 0.',
	notAMultiple: (a: number, b: number) => `${fr(a)} n'est pas un multiple de ${fr(b)}.`,
	outOfRange: (a: number, min: number, max: number, inclusive: boolean) =>
		`${fr(a)} n'est pas ${inclusive ? '' : 'strictement '}compris entre ${fr(min)} et ${fr(max)}.`,
	notARoot: (a: number) => `${fr(a)} n'est pas solution de l'équation.`,
	rootUnevaluable: "Impossible de vérifier ta réponse dans l'équation.",
	notEquivalent: "Ta réponse n'est pas égale à la valeur attendue.",
	customFailed: 'Ta réponse ne satisfait pas les critères demandés.',
	customUnevaluable: 'Impossible de vérifier ta réponse.'
} as const;

/** Fin de phrase de chaque prédicat : « 9 n'est pas un nombre premier. » */
const PREDICATE_MESSAGES: Record<PredicateRule['predicate'], string> = {
	isPrime: 'un nombre premier',
	isComposite: 'un nombre composé',
	isEven: 'un nombre pair',
	isOdd: 'un nombre impair',
	isPositive: 'strictement positif',
	isNegative: 'strictement négatif',
	isInteger: 'un nombre entier'
};

/** Nombre écrit à la française pour un message : `2.5` → `2,5` */
function fr(value: number): string {
	return String(value).replace('.', ',');
}

/**
 * Evaluate a validation rule against a student answer
 *
 * @param rule - The validation rule to evaluate
 * @param context - Evaluation context with variables and answer
 * @returns Evaluation result with validity and reason
 *
 * @example Divisor rule
 * ```typescript
 * const result = evaluateRule(
 *   { type: 'divisor', dividend: '{{n}}' },
 *   { variables: { n: 12 }, answer: '3' }
 * );
 * // result.valid === true (3 divides 12)
 * ```
 *
 * @example Predicate rule
 * ```typescript
 * const result = evaluateRule(
 *   { type: 'predicate', predicate: 'isPrime' },
 *   { variables: {}, answer: '7' }
 * );
 * // result.valid === true (7 is prime)
 * ```
 */
export function evaluateRule(rule: ValidationRule, context: EvaluationContext): EvaluationResult {
	switch (rule.type) {
		case 'divisor':
			return evaluateDivisorRule(rule, context);
		case 'multiple':
			return evaluateMultipleRule(rule, context);
		case 'range':
			return evaluateRangeRule(rule, context);
		case 'equation_root':
			return evaluateEquationRootRule(rule, context);
		case 'equivalent':
			return evaluateEquivalenceRule(rule, context);
		case 'predicate':
			return evaluatePredicateRule(rule, context);
		case 'custom':
			return evaluateCustomRule(rule, context);
	}
}

/**
 * Evaluate multiple validation rules (all must pass)
 *
 * @param rules - Array of validation rules
 * @param context - Evaluation context
 * @returns Combined result (valid only if all rules pass)
 */
export function evaluateRules(
	rules: ValidationRule[],
	context: EvaluationContext
): EvaluationResult {
	if (rules.length === 0) {
		return { valid: true };
	}

	const results = rules.map((rule) => evaluateRule(rule, context));
	const failedResults = results.filter((r) => !r.valid);

	if (failedResults.length === 0) {
		return { valid: true };
	}

	return {
		valid: false,
		reason: failedResults.map((r) => r.reason).join('; '),
		debug: { individualResults: results }
	};
}

// ============================================================================
// INDIVIDUAL RULE EVALUATORS
// ============================================================================

/**
 * Evaluate divisor rule: answer must divide dividend evenly
 */
function evaluateDivisorRule(rule: DivisorRule, ctx: EvaluationContext): EvaluationResult {
	const dividend = resolveExpression(rule.dividend, ctx.variables);
	const answer = ctx.numericAnswer ?? parseFloat(ctx.answer);

	if (isNaN(answer)) {
		return { valid: false, reason: RULE_MESSAGES.notANumber };
	}

	if (answer === 0) {
		return { valid: false, reason: RULE_MESSAGES.zeroDivisor };
	}

	if (!Number.isInteger(answer)) {
		return { valid: false, reason: RULE_MESSAGES.nonIntegerDivisor(answer) };
	}

	const valid = dividend % answer === 0;
	return {
		valid,
		reason: valid ? undefined : RULE_MESSAGES.notADivisor(answer, dividend),
		debug: { dividend, answer }
	};
}

/**
 * Evaluate multiple rule: answer must be a multiple of base
 */
function evaluateMultipleRule(rule: MultipleRule, ctx: EvaluationContext): EvaluationResult {
	const base = resolveExpression(rule.base, ctx.variables);
	const answer = ctx.numericAnswer ?? parseFloat(ctx.answer);

	if (isNaN(answer)) {
		return { valid: false, reason: RULE_MESSAGES.notANumber };
	}

	if (base === 0) {
		return { valid: false, reason: RULE_MESSAGES.zeroBase };
	}

	const valid = answer % base === 0;
	return {
		valid,
		reason: valid ? undefined : RULE_MESSAGES.notAMultiple(answer, base),
		debug: { base, answer }
	};
}

/**
 * Evaluate range rule: answer must be within [min, max]
 */
function evaluateRangeRule(rule: RangeRule, ctx: EvaluationContext): EvaluationResult {
	const min = resolveExpression(rule.min, ctx.variables);
	const max = resolveExpression(rule.max, ctx.variables);
	const answer = ctx.numericAnswer ?? parseFloat(ctx.answer);

	if (isNaN(answer)) {
		return { valid: false, reason: RULE_MESSAGES.notANumber };
	}

	const inclusive = rule.inclusive !== false; // default true

	let valid: boolean;
	if (inclusive) {
		valid = answer >= min && answer <= max;
	} else {
		valid = answer > min && answer < max;
	}

	return {
		valid,
		reason: valid ? undefined : RULE_MESSAGES.outOfRange(answer, min, max, inclusive),
		debug: { min, max, answer, inclusive }
	};
}

/**
 * Evaluate equation root rule: answer must be a root of the equation
 *
 * Strategy: Substitute answer for variable and check if equation equals zero
 */
function evaluateEquationRootRule(
	rule: EquationRootRule,
	ctx: EvaluationContext
): EvaluationResult {
	const variable = rule.variable || 'x';
	const answer = ctx.numericAnswer ?? parseFloat(ctx.answer);

	if (isNaN(answer)) {
		return { valid: false, reason: RULE_MESSAGES.notANumber };
	}

	// Resolve variables in the equation first
	const equation = resolveVariablesInExpression(rule.equation, ctx.variables);

	// Parse equation: "left = right" or just "expression = 0"
	const parts = equation.split('=').map((s) => s.trim());

	let leftExpr: string;
	let rightExpr: string;

	if (parts.length === 2) {
		leftExpr = parts[0];
		rightExpr = parts[1];
	} else {
		// Assume "expression = 0"
		leftExpr = equation;
		rightExpr = '0';
	}

	// Substitute the variable with the answer
	const substitutedLeft = substituteVariable(leftExpr, variable, answer);
	const substitutedRight = substituteVariable(rightExpr, variable, answer);

	try {
		// Evaluate both sides
		const leftValue = evaluateSafeExpression(substitutedLeft);
		const rightValue = evaluateSafeExpression(substitutedRight);

		// Check if left equals right (with tolerance for floating point)
		const tolerance = 1e-9;
		const valid = Math.abs(leftValue - rightValue) < tolerance;

		return {
			valid,
			reason: valid ? undefined : RULE_MESSAGES.notARoot(answer),
			debug: {
				equation: rule.equation,
				variable,
				answer,
				leftValue,
				rightValue,
				difference: Math.abs(leftValue - rightValue)
			}
		};
	} catch (error) {
		return {
			valid: false,
			reason: RULE_MESSAGES.rootUnevaluable,
			debug: {
				equation: rule.equation,
				substitutedLeft,
				substitutedRight,
				error: error instanceof Error ? error.message : String(error)
			}
		};
	}
}

/**
 * Evaluate equivalence rule: answer must be equivalent to expression
 */
function evaluateEquivalenceRule(rule: EquivalenceRule, ctx: EvaluationContext): EvaluationResult {
	// Resolve variables in the expression
	const resolvedExpr = resolveVariablesInExpression(rule.expression, ctx.variables);

	try {
		// First try numeric comparison
		const expected = evaluateSafeExpression(resolvedExpr);
		const answer = ctx.numericAnswer ?? parseFloat(ctx.answer);

		if (!isNaN(expected) && !isNaN(answer)) {
			// Tolérance relative : une absolue (1e-10) jugeait 10⁻¹² égal à 0
			const valid = numbersAreClose(expected, answer);
			return {
				valid,
				reason: valid ? undefined : RULE_MESSAGES.notEquivalent,
				debug: { expected, answer, difference: Math.abs(expected - answer) }
			};
		}

		// Fall back to symbolic equivalence check
		const valid = areEquivalent(ctx.answer, resolvedExpr, {
			timeoutMs: EQUIVALENCE_BUDGET_MS,
			assumptions: ctx.assumptions,
			genericFunctions: ctx.genericFunctions
		});
		return {
			valid,
			reason: valid ? undefined : RULE_MESSAGES.notEquivalent,
			debug: { expression: resolvedExpr, answer: ctx.answer }
		};
	} catch {
		// If evaluation fails, try symbolic comparison
		const valid = areEquivalent(ctx.answer, resolvedExpr, {
			timeoutMs: EQUIVALENCE_BUDGET_MS,
			assumptions: ctx.assumptions,
			genericFunctions: ctx.genericFunctions
		});
		return {
			valid,
			reason: valid ? undefined : RULE_MESSAGES.notEquivalent,
			debug: { expression: resolvedExpr, answer: ctx.answer }
		};
	}
}

/**
 * Evaluate predicate rule: answer must satisfy the predicate
 */
function evaluatePredicateRule(rule: PredicateRule, ctx: EvaluationContext): EvaluationResult {
	const answer = ctx.numericAnswer ?? parseFloat(ctx.answer);

	if (isNaN(answer)) {
		return { valid: false, reason: RULE_MESSAGES.notANumber };
	}

	let valid: boolean;

	switch (rule.predicate) {
		case 'isPrime':
			valid = isPrime(answer);
			break;
		case 'isComposite':
			valid = isComposite(answer);
			break;
		case 'isEven':
			valid = isEven(answer);
			break;
		case 'isOdd':
			valid = isOdd(answer);
			break;
		case 'isPositive':
			valid = answer > 0;
			break;
		case 'isNegative':
			valid = answer < 0;
			break;
		case 'isInteger':
			valid = Number.isInteger(answer);
			break;
	}

	return {
		valid,
		reason: valid ? undefined : `${fr(answer)} n'est pas ${PREDICATE_MESSAGES[rule.predicate]}.`,
		debug: { predicate: rule.predicate, answer }
	};
}

/**
 * Evaluate custom expression rule (legacy fallback)
 *
 * Supports common patterns:
 * - gcd(answer, n) > 1
 * - answer % n == 0
 * - Comparison operators (==, !=, <, >, <=, >=)
 */
function evaluateCustomRule(rule: CustomExpressionRule, ctx: EvaluationContext): EvaluationResult {
	// Resolve variables first
	let expression = resolveVariablesInExpression(rule.expression, ctx.variables);

	// Substitute 'answer' placeholder with actual answer
	const answer = ctx.numericAnswer ?? parseFloat(ctx.answer);
	if (!isNaN(answer)) {
		expression = substituteVariable(expression, 'answer', answer);
	}

	try {
		const result = evaluateCustomExpression(expression);
		return {
			valid: result,
			// La description, écrite par l'auteur, prime ; à défaut, message générique
			reason: result ? undefined : rule.description || RULE_MESSAGES.customFailed,
			debug: { expression: rule.expression, resolved: expression }
		};
	} catch (error) {
		return {
			valid: false,
			reason: RULE_MESSAGES.customUnevaluable,
			debug: {
				expression: rule.expression,
				error: error instanceof Error ? error.message : String(error)
			}
		};
	}
}

// ============================================================================
// HELPER FUNCTIONS - EXPRESSION RESOLUTION
// ============================================================================

/**
 * Resolve a single expression to a number
 *
 * Handles:
 * - Variable references: {{varName}}
 * - Direct numbers
 * - Mathematical expressions via ComputeEngine
 */
function resolveExpression(expr: string, variables: Record<string, number | string>): number {
	// First resolve variable references
	const resolved = resolveVariablesInExpression(expr, variables);

	// Try to parse as number first
	const num = parseFloat(resolved);
	if (!isNaN(num) && resolved.trim() === String(num)) {
		return num;
	}

	// Evaluate as expression using ComputeEngine
	return evaluateSafeExpression(resolved);
}

/**
 * Resolve variable references in an expression string
 *
 * Replaces {{varName}} with the corresponding variable value
 */
function resolveVariablesInExpression(
	expr: string,
	variables: Record<string, number | string>
): string {
	let resolved = expr;

	// Replace {{varName}} patterns
	for (const [name, value] of Object.entries(variables)) {
		const pattern = new RegExp(`\\{\\{${name}\\}\\}`, 'g');
		resolved = resolved.replace(pattern, String(value));
	}

	return resolved;
}

/**
 * Substitute a variable in an expression with a value
 *
 * Uses word boundary matching to avoid partial replacements
 * (e.g., don't replace 'x' in 'max')
 *
 * Wraps negative values in parentheses to ensure correct parsing
 * (e.g., x^2 with x=-2 becomes (-2)^2, not -2^2)
 */
function substituteVariable(expr: string, variable: string, value: number): string {
	// Use word boundary to avoid partial replacements
	const pattern = new RegExp(`\\b${variable}\\b`, 'g');
	// Wrap negative numbers in parentheses to avoid precedence issues
	const valueStr = value < 0 ? `(${value})` : String(value);
	return expr.replace(pattern, valueStr);
}

/**
 * Safely evaluate a mathematical expression
 *
 * Uses ComputeEngine for safe evaluation (no eval())
 */
function evaluateSafeExpression(expr: string): number {
	const result = evaluateExpression(expr);
	if (typeof result === 'number') {
		return result;
	}
	// Try to parse string result as number
	const num = parseFloat(result);
	if (!isNaN(num)) {
		return num;
	}
	throw new Error(`Expression "${expr}" did not evaluate to a number: ${result}`);
}

/**
 * Evaluate a custom boolean expression
 *
 * Supports comparison operators and common math functions
 */
function evaluateCustomExpression(expr: string): boolean {
	// Handle comparison operators
	const comparisonMatch = expr.match(/^(.+?)\s*(==|!=|<=|>=|<|>)\s*(.+)$/);

	if (comparisonMatch) {
		const [, leftStr, operator, rightStr] = comparisonMatch;
		const left = evaluateCustomSubExpression(leftStr.trim());
		const right = evaluateCustomSubExpression(rightStr.trim());

		switch (operator) {
			case '==':
				return Math.abs(left - right) < 1e-10;
			case '!=':
				return Math.abs(left - right) >= 1e-10;
			case '<':
				return left < right;
			case '>':
				return left > right;
			case '<=':
				return left <= right;
			case '>=':
				return left >= right;
		}
	}

	// Try to evaluate as boolean-like expression
	// If result is non-zero, treat as true
	const result = evaluateCustomSubExpression(expr);
	return result !== 0;
}

/**
 * Evaluate a sub-expression that may contain custom functions
 */
function evaluateCustomSubExpression(expr: string): number {
	// Handle gcd function
	const gcdMatch = expr.match(/gcd\s*\(\s*(.+?)\s*,\s*(.+?)\s*\)/i);
	if (gcdMatch) {
		const a = evaluateCustomSubExpression(gcdMatch[1]);
		const b = evaluateCustomSubExpression(gcdMatch[2]);
		return gcd(Math.abs(Math.round(a)), Math.abs(Math.round(b)));
	}

	// Handle lcm function
	const lcmMatch = expr.match(/lcm\s*\(\s*(.+?)\s*,\s*(.+?)\s*\)/i);
	if (lcmMatch) {
		const a = evaluateCustomSubExpression(lcmMatch[1]);
		const b = evaluateCustomSubExpression(lcmMatch[2]);
		return lcm(Math.abs(Math.round(a)), Math.abs(Math.round(b)));
	}

	// Handle abs function
	const absMatch = expr.match(/abs\s*\(\s*(.+?)\s*\)/i);
	if (absMatch) {
		return Math.abs(evaluateCustomSubExpression(absMatch[1]));
	}

	// Handle modulo operator
	if (expr.includes('%')) {
		const parts = expr.split('%');
		if (parts.length === 2) {
			const a = evaluateCustomSubExpression(parts[0].trim());
			const b = evaluateCustomSubExpression(parts[1].trim());
			return a % b;
		}
	}

	// Default: use safe expression evaluator
	return evaluateSafeExpression(expr);
}

// ============================================================================
// HELPER FUNCTIONS - NUMBER THEORY
// ============================================================================

/**
 * Check if a number is prime
 */
function isPrime(n: number): boolean {
	if (!Number.isInteger(n) || n < 2) return false;
	if (n === 2) return true;
	if (n % 2 === 0) return false;

	const sqrt = Math.sqrt(n);
	for (let i = 3; i <= sqrt; i += 2) {
		if (n % i === 0) return false;
	}
	return true;
}

/**
 * Check if a number is composite (not prime and > 1)
 */
function isComposite(n: number): boolean {
	if (!Number.isInteger(n) || n <= 1) return false;
	return !isPrime(n);
}

/**
 * Check if a number is even
 */
function isEven(n: number): boolean {
	if (!Number.isInteger(n)) return false;
	return n % 2 === 0;
}

/**
 * Check if a number is odd
 */
function isOdd(n: number): boolean {
	if (!Number.isInteger(n)) return false;
	return n % 2 !== 0;
}

/**
 * Calculate greatest common divisor (Euclidean algorithm)
 */
function gcd(a: number, b: number): number {
	if (b === 0) return a;
	return gcd(b, a % b);
}

/**
 * Calculate least common multiple
 */
function lcm(a: number, b: number): number {
	if (a === 0 || b === 0) return 0;
	return Math.abs(a * b) / gcd(a, b);
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Create an evaluation context from resolved variables
 */
export function createEvaluationContext(
	resolvedVariables: Array<{ name: string; value: string }>,
	answer: string
): EvaluationContext {
	const variables: Record<string, number | string> = {};

	for (const { name, value } of resolvedVariables) {
		// Try to parse as number
		const num = parseFloat(value);
		variables[name] = isNaN(num) ? value : num;
	}

	// Parse answer as number if possible
	const numericAnswer = parseFloat(answer);

	return {
		variables,
		answer,
		numericAnswer: isNaN(numericAnswer) ? undefined : numericAnswer
	};
}

/**
 * Export number theory functions for use in tests or other modules
 */
export const numberTheory = {
	isPrime,
	isComposite,
	isEven,
	isOdd,
	gcd,
	lcm
};

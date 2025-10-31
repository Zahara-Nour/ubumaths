/**
 * Challenge Variables System
 * ===========================
 *
 * Enables dynamic variable generation and evaluation in game challenges.
 *
 * Features:
 * - Random number generation within configurable ranges
 * - Expression evaluation with variable substitution
 * - Support for complex mathematical operations
 * - Multiple validation strategies (numeric with tolerance, string, array, object)
 *
 * Variable Definition Types:
 * - random: Generate random integer/decimal within min/max range
 * - expression: Evaluate mathematical expression using other variables
 *
 * Answer Types:
 * - number: Numeric answer (supports tolerance)
 * - string: Text answer (case-insensitive)
 * - array: Array of values
 * - expression: Mathematical expression to evaluate
 *
 * Usage Example:
 * ```ts
 * const challenge = {
 *   variables: {
 *     a: { type: 'random', min: 1, max: 10 },
 *     b: { type: 'random', min: 1, max: 10 },
 *     sum: { type: 'expression', expression: '{a} + {b}' }
 *   },
 *   answer: { type: 'expression', value: '{sum}' }
 * };
 *
 * const result = generateChallengeVariables(challenge);
 * // result.variables = { a: 7, b: 3, sum: 10 }
 * // result.correct_answer = 10
 * ```
 */

import type { Challenge, VariableDefinition, AnswerDefinition } from '$lib/types/game';

/**
 * Generate random number within range
 */
function generateRandomValue(min: number, max: number, decimals: number = 0): number {
	const value = Math.random() * (max - min) + min;
	return decimals > 0 ? parseFloat(value.toFixed(decimals)) : Math.floor(value);
}

/**
 * Evaluate mathematical expression with variables
 * Supports basic arithmetic: +, -, *, /, ^, sqrt, parentheses
 */
function evaluateExpression(expression: string, variables: Record<string, number>): number {
	// Replace variables
	let expr = expression;
	for (const [varName, value] of Object.entries(variables)) {
		const regex = new RegExp(`\\{${varName}\\}`, 'g');
		expr = expr.replace(regex, String(value));
	}

	// Replace sqrt(x) with Math.sqrt(x)
	expr = expr.replace(/sqrt\s*\(/g, 'Math.sqrt(');

	// Replace ^ with ** for exponentiation
	expr = expr.replace(/\^/g, '**');

	// Evaluate safely using Function constructor
	try {
		const fn = new Function('return ' + expr);
		const result = fn();
		return typeof result === 'number' ? result : NaN;
	} catch (error) {
		console.error('Error evaluating expression:', expression, error);
		return NaN;
	}
}

/**
 * Evaluate answer definition (can be number, string, array, or expression)
 */
function evaluateAnswer(
	answerDef: AnswerDefinition | undefined,
	variables: Record<string, number>
): unknown {
	if (!answerDef) {
		return null;
	}

	switch (answerDef.type) {
		case 'number':
			return typeof answerDef.value === 'number' ? answerDef.value : null;

		case 'string':
			return typeof answerDef.value === 'string' ? answerDef.value : null;

		case 'array':
			if (!Array.isArray(answerDef.value)) {
				return null;
			}
			// Recursively evaluate each element
			return (answerDef.value as AnswerDefinition[]).map((item) => evaluateAnswer(item, variables));

		case 'expression':
			if (typeof answerDef.value !== 'string') {
				return null;
			}
			return evaluateExpression(answerDef.value, variables);

		default:
			// Direct value
			return answerDef;
	}
}

/**
 * Generate all variables for a challenge
 * @param challenge - Challenge definition with variables
 * @returns Object containing challenge, variables, expressions, and correct answer
 */
export function generateChallengeVariables(challenge: Challenge): {
	challenge: Challenge;
	variables: Record<string, number>;
	expressions: Record<string, string>;
	correct_answer: unknown;
} {
	const variables: Record<string, number> = {};
	const expressions: Record<string, string> = {};

	if (!challenge.variables) {
		return {
			challenge,
			variables,
			expressions,
			correct_answer: evaluateAnswer(challenge.answer, variables)
		};
	}

	// Generate random variables first
	for (const [varName, rawVarDef] of Object.entries(challenge.variables)) {
		const varDef = rawVarDef as VariableDefinition;
		if (varDef.type === 'random') {
			variables[varName] = generateRandomValue(
				(varDef.min as number) ?? 0,
				(varDef.max as number) ?? 10,
				(varDef.decimals as number) ?? 0
			);
		}
	}

	// Evaluate expression variables (depends on random variables)
	for (const [varName, rawVarDef] of Object.entries(challenge.variables)) {
		const varDef = rawVarDef as VariableDefinition;
		if (varDef.type === 'expression') {
			if (varDef.expression) {
				// Evaluate the expression with current variables
				variables[varName] = evaluateExpression(varDef.expression, variables);
				// Store expression (don't evaluate, used for display)
				expressions[varName] = interpolateExpression(varDef.expression, variables);
			}
		}
	}

	// Evaluate correct answer
	const correctAnswer = evaluateAnswer(challenge.answer, variables);

	return {
		challenge,
		variables,
		expressions,
		correct_answer: correctAnswer
	};
}

/**
 * Replace variable placeholders in text with their values
 * @param text - Text with {variable} placeholders
 * @param variables - Variable name -> value mapping
 * @returns Text with variables replaced
 */
export function interpolateVariables(text: string, variables: Record<string, number>): string {
	return text.replace(/\{(\w+)\}/g, (match, varName) => {
		if (varName in variables) {
			return String(variables[varName]);
		}
		return match;
	});
}

/**
 * Get variable value or expression display
 * @param varName - Variable name
 * @param variables - Variable values
 * @param expressions - Expression strings (for display)
 * @returns Value or expression to display
 */
export function getVariableDisplay(
	varName: string,
	variables: Record<string, number>,
	expressions: Record<string, string>
): string {
	// If it's an expression variable, show the expression
	if (varName in expressions) {
		return expressions[varName];
	}

	// Otherwise show the value
	if (varName in variables) {
		return String(variables[varName]);
	}

	return `{${varName}}`;
}

/**
 * Interpolate expressions for display (shows the expression with values, not result)
 * Example: "{a} + {b}" with a=5, b=3 becomes "5 + 3"
 */
export function interpolateExpression(
	expression: string,
	variables: Record<string, number>
): string {
	return expression.replace(/\{(\w+)\}/g, (match, varName) => {
		if (varName in variables) {
			const value = variables[varName];
			return String(value);
		}
		return match;
	});
}

/**
 * Validate student answer against correct answer
 * @param studentAnswer - Student's submitted answer
 * @param correctAnswer - Correct answer
 * @param tolerance - Numerical tolerance for floating point comparison
 * @returns True if answer is correct
 */
export function validateAnswer(
	studentAnswer: unknown,
	correctAnswer: unknown,
	tolerance: number = 0.01
): boolean {
	// Handle null/undefined
	if (studentAnswer === null || studentAnswer === undefined) {
		return false;
	}

	if (correctAnswer === null || correctAnswer === undefined) {
		return false;
	}

	// Try to parse student answer if it's a string that looks like a number
	let parsedStudentAnswer = studentAnswer;
	if (typeof studentAnswer === 'string' && /^-?\d+\.?\d*$/.test(studentAnswer.trim())) {
		parsedStudentAnswer = parseFloat(studentAnswer);
	}

	// Numeric comparison with tolerance
	if (typeof correctAnswer === 'number') {
		if (typeof parsedStudentAnswer === 'number') {
			const diff = Math.abs(parsedStudentAnswer - correctAnswer);
			const result = diff <= tolerance;
			return result;
		} else {
			return false;
		}
	}

	// Array comparison
	if (Array.isArray(correctAnswer) && Array.isArray(parsedStudentAnswer)) {
		if (correctAnswer.length !== parsedStudentAnswer.length) {
			return false;
		}
		for (let i = 0; i < correctAnswer.length; i++) {
			if (!validateAnswer(parsedStudentAnswer[i], correctAnswer[i], tolerance)) {
				return false;
			}
		}
		return true;
	}

	// String comparison (case-insensitive, trimmed)
	if (typeof correctAnswer === 'string') {
		const studentStr = String(parsedStudentAnswer).trim().toLowerCase();
		const correctStr = correctAnswer.trim().toLowerCase();
		const result = correctStr === studentStr;
		return result;
	}

	// Object comparison
	if (typeof correctAnswer === 'object' && typeof parsedStudentAnswer === 'object') {
		const result = JSON.stringify(parsedStudentAnswer) === JSON.stringify(correctAnswer);
		return result;
	}

	// Direct comparison
	const result = parsedStudentAnswer === correctAnswer;
	return result;
}

/**
 * Format tolerance for display
 * @param tolerance - Numerical tolerance
 * @returns Human-readable tolerance string
 */
export function formatTolerance(tolerance: number): string {
	if (tolerance === 0) {
		return 'exacte';
	}
	return `±${tolerance}`;
}

/**
 * Check if a variable definition requires other variables
 */
export function hasVariableDependencies(varDef: VariableDefinition): boolean {
	if (varDef.type === 'expression' && varDef.expression) {
		return /\{\w+\}/.test(varDef.expression);
	}
	return false;
}

/**
 * Extract variable names from expression
 */
export function extractVariableNames(expression: string): string[] {
	const matches = expression.matchAll(/\{(\w+)\}/g);
	return Array.from(matches, (m) => m[1]);
}

/**
 * Validate variable dependencies (check for cycles and missing variables)
 */
export function validateVariableDependencies(variables: Record<string, VariableDefinition>): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	for (const [varName, varDef] of Object.entries(variables)) {
		if (varDef.type === 'expression' && varDef.expression) {
			const deps = extractVariableNames(varDef.expression);

			for (const dep of deps) {
				// Check if dependency exists
				if (!(dep in variables)) {
					errors.push(`Variable '${varName}' depends on undefined variable '${dep}'`);
				}

				// Check for direct self-reference
				if (dep === varName) {
					errors.push(`Variable '${varName}' cannot reference itself`);
				}

				// Check if dependency is also an expression (potential cycle)
				if (dep in variables && variables[dep].type === 'expression') {
					// Could implement more sophisticated cycle detection here
					// For now, just warn
					errors.push(
						`Variable '${varName}' depends on expression variable '${dep}' (potential cycle risk)`
					);
				}
			}
		}
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Generate a complete challenge instance with variables and correct answer
 * Alias for generateChallengeVariables for backward compatibility
 */
export function generateChallengeInstance(challenge: Challenge): {
	challenge: Challenge;
	variables: Record<string, number>;
	expressions: Record<string, string>;
	correct_answer: unknown;
} {
	return generateChallengeVariables(challenge);
}

/**
 * Interpolate question text with variable values
 * Replaces {variable} placeholders with their values
 */
export function interpolateQuestion(question: string, variables: Record<string, number>): string {
	return interpolateVariables(question, variables);
}

/**
 * Format an answer value for display
 * Handles numbers, strings, and arrays
 */
export function formatAnswer(answer: unknown): string {
	if (answer === null || answer === undefined) {
		return '-';
	}

	if (typeof answer === 'number') {
		// Format numbers with up to 4 decimal places, remove trailing zeros
		return answer.toFixed(4).replace(/\.?0+$/, '');
	}

	if (typeof answer === 'string') {
		return answer;
	}

	if (Array.isArray(answer)) {
		return answer.map(formatAnswer).join(', ');
	}

	// For objects, convert to JSON
	return JSON.stringify(answer);
}

// Challenge variable generation and evaluation
// Ported from original Navadra challenge.js
// Author: Claude Code
// Date: 2025-10-15

import { create, all, type MathJsInstance } from 'mathjs';
import type {
	GameChallenge,
	ChallengeInstance,
	ChallengeVariables,
	ChallengeAnswer
} from '$lib/types/game';

// Create Math.js instance
const math = create(all) as MathJsInstance;

// Add custom functions used in original Navadra challenges
math.import(
	{
		// Random integer between min and max (inclusive of min, exclusive of max)
		randomInt: (min: number, max: number) => {
			return Math.floor(Math.random() * (max - min)) + min;
		},

		// Pick random element from array
		pickRandom: (arr: any[]) => {
			return arr[Math.floor(Math.random() * arr.length)];
		},

		// Check if arrays are different
		different: (arr1: any[], ...otherArrays: any[][]) => {
			const str1 = JSON.stringify(arr1);
			for (const otherArr of otherArrays) {
				if (JSON.stringify(otherArr) === str1) {
					return false;
				}
			}
			return true;
		},

		// Greatest common divisor
		pgcd: (a: number, b: number) => {
			a = Math.abs(Math.floor(a));
			b = Math.abs(Math.floor(b));
			while (b !== 0) {
				const temp = b;
				b = a % b;
				a = temp;
			}
			return a;
		},

		// Least common multiple
		ppcm: (a: number, b: number) => {
			return Math.abs(Math.floor((a * b) / math.evaluate('pgcd(a, b)', { a, b })));
		},

		// Shuffle array
		shuffle: (arr: any[]) => {
			const shuffled = [...arr];
			for (let i = shuffled.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
			}
			return shuffled;
		},

		// Range function
		range: (start: number, end: number, step: number = 1) => {
			const result = [];
			for (let i = start; i < end; i += step) {
				result.push(i);
			}
			return result;
		}
	},
	{ override: true }
);

/**
 * Generate a challenge instance with randomized variables
 * @param challenge - The challenge definition
 * @returns Challenge instance with evaluated variables
 */
export function generateChallengeInstance(challenge: GameChallenge): ChallengeInstance {
	const variables: Record<string, any> = {};
	const expressions: Record<string, string> = {};

	// Sort variables by dependency order
	const sortedVarNames = topologicalSort(challenge.variables);

	// Evaluate each variable
	for (const varName of sortedVarNames) {
		const varDef = challenge.variables[varName];

		if (varDef.value !== undefined) {
			// Evaluate value with Math.js
			try {
				const evaluated = evaluateWithContext(varDef.value, variables);
				variables[varName] = evaluated;
			} catch (error) {
				console.error(`Failed to evaluate variable ${varName}:`, error);
				variables[varName] = null;
			}
		} else if (varDef.expression !== undefined) {
			// Store expression (don't evaluate, used for display)
			expressions[varName] = interpolateExpression(varDef.expression, variables);
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
 * Evaluate a Math.js expression with variable context
 * @param expr - Expression string
 * @param context - Variable values
 * @returns Evaluated result
 */
function evaluateWithContext(expr: string, context: Record<string, any>): any {
	// Replace variable references {varName} with actual values
	const interpolated = expr.replace(/\{(\w+)\}/g, (_, varName) => {
		if (context[varName] !== undefined) {
			// If it's a string or array, return as-is
			if (typeof context[varName] === 'string') {
				return `"${context[varName]}"`;
			}
			if (Array.isArray(context[varName])) {
				return JSON.stringify(context[varName]);
			}
			return String(context[varName]);
		}
		return varName;
	});

	try {
		return math.evaluate(interpolated, context);
	} catch (error) {
		console.error('Failed to evaluate expression:', expr, error);
		return null;
	}
}

/**
 * Interpolate expression with variable values
 * @param expr - Expression template
 * @param variables - Variable values
 * @returns Interpolated expression
 */
function interpolateExpression(expr: string, variables: Record<string, any>): string {
	return expr.replace(/\{(\w+)\}/g, (_, varName) => {
		return variables[varName] !== undefined ? String(variables[varName]) : `{${varName}}`;
	});
}

/**
 * Topological sort of variables by dependencies
 * @param variables - Variable definitions
 * @returns Sorted variable names
 */
function topologicalSort(variables: ChallengeVariables): string[] {
	const graph: Record<string, string[]> = {};
	const inDegree: Record<string, number> = {};

	// Build dependency graph
	for (const varName in variables) {
		graph[varName] = [];
		inDegree[varName] = 0;
	}

	for (const varName in variables) {
		const varDef = variables[varName];
		const expr = varDef.value || varDef.expression || '';

		// Find variable references {otherVar}
		const matches = expr.match(/\{(\w+)\}/g);
		if (matches) {
			for (const match of matches) {
				const depVar = match.slice(1, -1); // Remove { }
				if (graph[depVar]) {
					graph[depVar].push(varName);
					inDegree[varName]++;
				}
			}
		}
	}

	// Kahn's algorithm for topological sort
	const queue: string[] = [];
	const result: string[] = [];

	// Start with variables that have no dependencies
	for (const varName in inDegree) {
		if (inDegree[varName] === 0) {
			queue.push(varName);
		}
	}

	while (queue.length > 0) {
		const varName = queue.shift()!;
		result.push(varName);

		for (const neighbor of graph[varName]) {
			inDegree[neighbor]--;
			if (inDegree[neighbor] === 0) {
				queue.push(neighbor);
			}
		}
	}

	return result;
}

/**
 * Evaluate the correct answer
 * @param answerDef - Answer definition
 * @param variables - Variable values
 * @returns Evaluated answer
 */
function evaluateAnswer(answerDef: ChallengeAnswer, variables: Record<string, any>): any {
	if (answerDef.value !== undefined) {
		if (typeof answerDef.value === 'string') {
			// Evaluate string expression
			return evaluateWithContext(answerDef.value, variables);
		}
		return answerDef.value;
	}

	return null;
}

/**
 * Interpolate question text with variable values
 * @param question - Question template
 * @param variables - Variable values
 * @returns Interpolated question HTML
 */
export function interpolateQuestion(question: string, variables: Record<string, any>): string {
	return question.replace(/\{(\w+)\}/g, (match, varName) => {
		if (variables[varName] !== undefined) {
			const value = variables[varName];

			// Format arrays nicely
			if (Array.isArray(value)) {
				return value.join(', ');
			}

			// Format numbers
			if (typeof value === 'number') {
				return String(value);
			}

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
	studentAnswer: any,
	correctAnswer: any,
	tolerance: number = 0.01
): boolean {
	// Handle null/undefined
	if (studentAnswer === null || studentAnswer === undefined) {
		return false;
	}

	// Numeric comparison with tolerance
	if (typeof correctAnswer === 'number' && typeof studentAnswer === 'number') {
		return Math.abs(studentAnswer - correctAnswer) <= tolerance;
	}

	// Array comparison
	if (Array.isArray(correctAnswer) && Array.isArray(studentAnswer)) {
		if (correctAnswer.length !== studentAnswer.length) {
			return false;
		}
		for (let i = 0; i < correctAnswer.length; i++) {
			if (!validateAnswer(studentAnswer[i], correctAnswer[i], tolerance)) {
				return false;
			}
		}
		return true;
	}

	// String comparison (case-insensitive, trimmed)
	if (typeof correctAnswer === 'string' && typeof studentAnswer === 'string') {
		return correctAnswer.trim().toLowerCase() === studentAnswer.trim().toLowerCase();
	}

	// Object comparison
	if (typeof correctAnswer === 'object' && typeof studentAnswer === 'object') {
		return JSON.stringify(correctAnswer) === JSON.stringify(studentAnswer);
	}

	// Direct comparison
	return studentAnswer === correctAnswer;
}

/**
 * Format answer for display
 * @param answer - Answer value
 * @returns Formatted string
 */
export function formatAnswer(answer: any): string {
	if (Array.isArray(answer)) {
		return answer.join(', ');
	}

	if (typeof answer === 'number') {
		// Round to 2 decimal places if needed
		return answer % 1 === 0 ? String(answer) : answer.toFixed(2);
	}

	return String(answer);
}

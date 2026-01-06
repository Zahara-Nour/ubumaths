/**
 * Step Generator
 *
 * Generates pedagogical step-by-step explanations for mathematical calculations.
 * Adapts detail level based on school level (primaire, college, lycee, superieur).
 *
 * @module mathAST/step-generator
 */

import { z } from 'zod';
import type { MathNode } from '../types';
import type {
	StepGenerationResult,
	StepGeneratorConfig,
	CalculationStep,
	SchoolLevel
} from './types';
import { DEFAULT_CONFIG } from './types';
import { generateStepsForNode } from './arithmetic-steps';
import { toLatex } from '../index';
import { evaluate } from '../eval/evaluate';

/**
 * Zod schema for validating step generator config
 */
const StepGeneratorConfigSchema = z.object({
	level: z.enum(['primaire', 'college', 'lycee', 'superieur']),
	maxSteps: z.number().int().positive().max(100).optional(),
	includeSubSteps: z.boolean().optional()
});

// Re-export types
export type { StepGenerationResult, StepGeneratorConfig, CalculationStep, SchoolLevel };
export { DEFAULT_CONFIG };

/**
 * Generate step-by-step calculation for an AST node.
 *
 * @param ast - The MathAST node to generate steps for
 * @param config - Configuration options (optional)
 * @returns Step generation result with all steps
 *
 * @example
 * ```typescript
 * import { generateSteps } from '$lib/mathAST/step-generator';
 * import { parseLatex } from '$lib/mathAST/parser';
 *
 * const ast = parseLatex('2 + 3 * 4');
 * const result = generateSteps(ast, { level: 'college' });
 *
 * // result.steps = [
 * //   { index: 1, description: 'Multiplication', expression: '3 × 4 = 12' },
 * //   { index: 2, description: 'Addition', expression: '2 + 12 = 14' }
 * // ]
 * ```
 */
export function generateSteps(
	ast: MathNode,
	config: Partial<StepGeneratorConfig> = {}
): StepGenerationResult {
	// Validate configuration
	const validation = StepGeneratorConfigSchema.partial().safeParse(config);
	if (!validation.success) {
		throw new Error(`Invalid step generator config: ${validation.error.issues[0].message}`);
	}

	const fullConfig: StepGeneratorConfig = { ...DEFAULT_CONFIG, ...validation.data };

	// Generate the original expression in LaTeX
	const original = toLatex(ast);

	// Evaluate the final result
	let result: string;
	try {
		const evalResult = evaluate(ast);
		result = toLatex(evalResult);
	} catch {
		result = original;
	}

	// Generate steps
	const { steps } = generateStepsForNode(ast, fullConfig.level, 1);

	// Limit steps if configured
	const limitedSteps =
		fullConfig.maxSteps && steps.length > fullConfig.maxSteps
			? steps.slice(0, fullConfig.maxSteps)
			: steps;

	return {
		original,
		result,
		steps: limitedSteps,
		level: fullConfig.level
	};
}

/**
 * Check if an AST node can have steps generated for it.
 *
 * Simple expressions (just a number or variable) don't need steps.
 *
 * @param ast - The MathAST node to check
 * @returns True if steps can be generated
 */
export function canGenerateSteps(ast: MathNode): boolean {
	// Simple values don't need steps
	if (ast.type === 'number' || ast.type === 'variable') {
		return false;
	}

	// Check if it's evaluable (has no unbound variables)
	try {
		evaluate(ast);
		return true;
	} catch {
		// If it contains variables, we can still show symbolic steps
		return hasOperations(ast);
	}
}

/**
 * Check if an AST has any operations (not just a value)
 */
function hasOperations(ast: MathNode): boolean {
	switch (ast.type) {
		case 'number':
		case 'variable':
		case 'symbol':
			return false;
		case 'addition':
		case 'subtraction':
		case 'multiplication':
		case 'division':
		case 'superscript':
		case 'function':
			return true;
		case 'opposite':
			return hasOperations(ast.operand);
		case 'delimiter':
			return hasOperations(ast.content);
		default:
			return true;
	}
}

/**
 * Get a suggested school level based on AST complexity.
 *
 * @param ast - The MathAST node to analyze
 * @returns Suggested school level
 */
export function suggestLevel(ast: MathNode): SchoolLevel {
	const complexity = getComplexity(ast);

	if (complexity <= 2) return 'primaire';
	if (complexity <= 5) return 'college';
	if (complexity <= 12) return 'lycee';
	return 'superieur';
}

/**
 * Calculate complexity score for an AST
 */
function getComplexity(ast: MathNode): number {
	switch (ast.type) {
		case 'number':
		case 'variable':
		case 'symbol':
			return 0;
		case 'addition':
		case 'subtraction':
			return 1 + getComplexity(ast.left) + getComplexity(ast.right);
		case 'multiplication':
			return 2 + getComplexity(ast.left) + getComplexity(ast.right);
		case 'division':
			return 2 + getComplexity(ast.numerator) + getComplexity(ast.denominator);
		case 'superscript':
			return 3 + getComplexity(ast.base) + getComplexity(ast.superscript);
		case 'function':
			return 3 + ast.args.reduce((sum, arg) => sum + getComplexity(arg), 0);
		case 'opposite':
			return 1 + getComplexity(ast.operand);
		case 'delimiter':
			return getComplexity(ast.content);
		default:
			return 1;
	}
}

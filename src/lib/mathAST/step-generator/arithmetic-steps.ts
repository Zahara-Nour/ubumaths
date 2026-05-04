/**
 * Arithmetic Step Generator
 *
 * Generates step-by-step explanations for arithmetic operations.
 * Adapts detail level based on school level.
 *
 * MVP refactor (Phase 3) — sub-calculation values delegate to
 * `evaluate(node, { mode: 'exact' })` and are rendered via `toLatex`. The
 * previous local `evaluateNumeric` / `formatNumber` doublon has been removed.
 * Results are now exact (BigInt rationals, simplified radicals, …) instead of
 * lossy floats: `1/3 + 1/6` displays as `\dfrac{1}{2}` rather than `0.5`.
 */

import type { MathNode } from '../types';
import type { CalculationStep, SchoolLevel } from './types';
import { toLatex } from '../index';
import { evaluate } from '../eval/evaluate';
import { isEvalValue } from '../eval/types';
import {
	isVariable,
	isAddition,
	isSubtraction,
	isMultiplication,
	isDivision,
	isSuperscript,
	isFunction,
	isOpposite,
	isDelimiter,
	isNumber
} from '../guards';

/**
 * Operation descriptions in French by school level
 */
const DESCRIPTIONS: Record<SchoolLevel, Record<string, string>> = {
	primaire: {
		add: 'On additionne',
		subtract: 'On soustrait',
		multiply: 'On multiplie',
		divide: 'On divise',
		power: 'On calcule la puissance',
		simplify: 'On simplifie',
		evaluate: 'On calcule'
	},
	college: {
		add: 'Addition',
		subtract: 'Soustraction',
		multiply: 'Multiplication',
		divide: 'Division',
		power: 'Puissance',
		simplify: 'Simplification',
		evaluate: 'Évaluation'
	},
	lycee: {
		add: 'Somme',
		subtract: 'Différence',
		multiply: 'Produit',
		divide: 'Quotient',
		power: 'Exponentiation',
		simplify: 'Réduction',
		evaluate: 'Calcul'
	},
	superieur: {
		add: '+',
		subtract: '−',
		multiply: '×',
		divide: '÷',
		power: '^',
		simplify: '→',
		evaluate: '='
	}
};

/**
 * Get description for an operation at a given school level
 */
function getDescription(op: string, level: SchoolLevel): string {
	return DESCRIPTIONS[level][op] || op;
}

/**
 * Evaluate a node to its exact form via the central `evaluate()` and return
 * the resulting `MathNode`, or `null` when the expression cannot be reduced
 * to a value (free variables, indeterminate forms, domain errors).
 *
 * Replaces the previous `evaluateNumeric` doublon: gives exact rational
 * arithmetic, exact radicals, and avoids float precision drift.
 */
function evaluateToNode(node: MathNode): MathNode | null {
	const result = evaluate(node, { mode: 'exact' });
	if (!isEvalValue(result)) return null;
	return result.node;
}

/**
 * Check if a node is a simple numeric value (no further evaluation needed).
 */
function isNumericValue(node: MathNode | undefined): boolean {
	if (!node) return false;
	if (isNumber(node)) return true;
	if (isOpposite(node) && node.operand && isNumber(node.operand)) return true;
	if (isDelimiter(node) && node.content) return isNumericValue(node.content);
	return false;
}

/**
 * Generate steps for a binary operation
 */
function generateBinarySteps(
	node: MathNode,
	left: MathNode,
	right: MathNode,
	opType: string,
	level: SchoolLevel,
	stepIndex: number
): { steps: CalculationStep[]; nextIndex: number } {
	const steps: CalculationStep[] = [];
	let currentIndex = stepIndex;

	// Get exact values via evaluate(mode: 'exact')
	const leftNode = evaluateToNode(left);
	const rightNode = evaluateToNode(right);
	const resultNode = evaluateToNode(node);

	if (leftNode !== null && rightNode !== null && resultNode !== null) {
		const leftLatex = toLatex(leftNode);
		const rightLatex = toLatex(rightNode);
		const resultLatex = toLatex(resultNode);

		let description: string;
		let expression: string;
		let explanation: string | undefined;

		switch (opType) {
			case 'add':
				description = getDescription('add', level);
				expression = `${leftLatex} + ${rightLatex} = ${resultLatex}`;
				if (level === 'primaire') {
					explanation = `On ajoute ${rightLatex} à ${leftLatex}`;
				}
				break;
			case 'subtract':
				description = getDescription('subtract', level);
				expression = `${leftLatex} - ${rightLatex} = ${resultLatex}`;
				if (level === 'primaire') {
					explanation = `On enlève ${rightLatex} de ${leftLatex}`;
				}
				break;
			case 'multiply':
				description = getDescription('multiply', level);
				expression = `${leftLatex} \\times ${rightLatex} = ${resultLatex}`;
				if (level === 'primaire') {
					explanation = `${leftLatex} fois ${rightLatex}`;
				}
				break;
			case 'divide':
				description = getDescription('divide', level);
				expression = `${leftLatex} \\div ${rightLatex} = ${resultLatex}`;
				if (level === 'primaire') {
					explanation = `On partage ${leftLatex} en ${rightLatex} parts égales`;
				}
				break;
			default:
				description = getDescription('evaluate', level);
				expression = `${toLatex(node)} = ${resultLatex}`;
		}

		steps.push({
			index: currentIndex++,
			description,
			expression,
			explanation,
			ast: node
		});
	}

	return { steps, nextIndex: currentIndex };
}

/**
 * Generate steps for power operation
 */
function generatePowerSteps(
	node: MathNode & { type: 'superscript' },
	level: SchoolLevel,
	stepIndex: number
): { steps: CalculationStep[]; nextIndex: number } {
	const steps: CalculationStep[] = [];
	let currentIndex = stepIndex;

	const baseNode = evaluateToNode(node.base);
	const expNode = evaluateToNode(node.superscript);
	const resultNode = evaluateToNode(node);

	if (baseNode !== null && expNode !== null && resultNode !== null) {
		const baseLatex = toLatex(baseNode);
		const expLatex = toLatex(expNode);
		const resultLatex = toLatex(resultNode);

		let explanation: string | undefined;
		if (level === 'primaire' || level === 'college') {
			// Show repeated multiplication for small positive integer exponents
			if (isNumber(expNode)) {
				const expInt = Number(expNode.value);
				if (Number.isInteger(expInt) && expInt > 0 && expInt <= 5) {
					const factors = Array(expInt).fill(baseLatex).join(' \\times ');
					explanation = `${baseLatex}^{${expLatex}} = ${factors}`;
				}
			}
		}

		steps.push({
			index: currentIndex++,
			description: getDescription('power', level),
			expression: `${baseLatex}^{${expLatex}} = ${resultLatex}`,
			explanation,
			ast: node
		});
	}

	return { steps, nextIndex: currentIndex };
}

/**
 * Generate steps for function evaluation
 */
function generateFunctionSteps(
	node: MathNode & { type: 'function' },
	level: SchoolLevel,
	stepIndex: number
): { steps: CalculationStep[]; nextIndex: number } {
	const steps: CalculationStep[] = [];
	let currentIndex = stepIndex;

	if (node.args.length === 1) {
		const argNode = evaluateToNode(node.args[0]);
		const resultNode = evaluateToNode(node);

		if (argNode !== null && resultNode !== null) {
			const argLatex = toLatex(argNode);
			const resultLatex = toLatex(resultNode);

			steps.push({
				index: currentIndex++,
				description: `${node.name}`,
				expression: `\\${node.name}(${argLatex}) = ${resultLatex}`,
				ast: node
			});
		}
	}

	// Suppress unused-variable warning (level is part of API for future use)
	void level;

	return { steps, nextIndex: currentIndex };
}

/**
 * Recursively generate steps for an AST node
 */
export function generateStepsForNode(
	node: MathNode,
	level: SchoolLevel,
	startIndex: number = 1
): { steps: CalculationStep[]; nextIndex: number } {
	const allSteps: CalculationStep[] = [];
	let currentIndex = startIndex;

	// Skip simple values
	if (isNumericValue(node) || isVariable(node)) {
		return { steps: [], nextIndex: currentIndex };
	}

	// Process children first (for complex expressions)
	if (isAddition(node) || isSubtraction(node)) {
		// Process left operand
		if (!isNumericValue(node.left)) {
			const leftResult = generateStepsForNode(node.left, level, currentIndex);
			allSteps.push(...leftResult.steps);
			currentIndex = leftResult.nextIndex;
		}

		// Process right operand
		if (!isNumericValue(node.right)) {
			const rightResult = generateStepsForNode(node.right, level, currentIndex);
			allSteps.push(...rightResult.steps);
			currentIndex = rightResult.nextIndex;
		}

		// Generate step for this operation
		const opType = isAddition(node) ? 'add' : 'subtract';
		const opResult = generateBinarySteps(node, node.left, node.right, opType, level, currentIndex);
		allSteps.push(...opResult.steps);
		currentIndex = opResult.nextIndex;
	} else if (isMultiplication(node)) {
		// Process left operand
		if (!isNumericValue(node.left)) {
			const leftResult = generateStepsForNode(node.left, level, currentIndex);
			allSteps.push(...leftResult.steps);
			currentIndex = leftResult.nextIndex;
		}

		// Process right operand
		if (!isNumericValue(node.right)) {
			const rightResult = generateStepsForNode(node.right, level, currentIndex);
			allSteps.push(...rightResult.steps);
			currentIndex = rightResult.nextIndex;
		}

		// Generate step for this operation
		const opResult = generateBinarySteps(
			node,
			node.left,
			node.right,
			'multiply',
			level,
			currentIndex
		);
		allSteps.push(...opResult.steps);
		currentIndex = opResult.nextIndex;
	} else if (isDivision(node)) {
		// Process numerator
		if (!isNumericValue(node.numerator)) {
			const numResult = generateStepsForNode(node.numerator, level, currentIndex);
			allSteps.push(...numResult.steps);
			currentIndex = numResult.nextIndex;
		}

		// Process denominator
		if (!isNumericValue(node.denominator)) {
			const denResult = generateStepsForNode(node.denominator, level, currentIndex);
			allSteps.push(...denResult.steps);
			currentIndex = denResult.nextIndex;
		}

		// Generate step for this operation
		const opResult = generateBinarySteps(
			node,
			node.numerator,
			node.denominator,
			'divide',
			level,
			currentIndex
		);
		allSteps.push(...opResult.steps);
		currentIndex = opResult.nextIndex;
	} else if (isSuperscript(node)) {
		// Process base if complex
		if (!isNumericValue(node.base)) {
			const baseResult = generateStepsForNode(node.base, level, currentIndex);
			allSteps.push(...baseResult.steps);
			currentIndex = baseResult.nextIndex;
		}

		// Generate power step
		const powerResult = generatePowerSteps(node, level, currentIndex);
		allSteps.push(...powerResult.steps);
		currentIndex = powerResult.nextIndex;
	} else if (isFunction(node)) {
		// Process arguments if complex
		for (const arg of node.args) {
			if (!isNumericValue(arg)) {
				const argResult = generateStepsForNode(arg, level, currentIndex);
				allSteps.push(...argResult.steps);
				currentIndex = argResult.nextIndex;
			}
		}

		// Generate function step
		const funcResult = generateFunctionSteps(node, level, currentIndex);
		allSteps.push(...funcResult.steps);
		currentIndex = funcResult.nextIndex;
	} else if (isDelimiter(node)) {
		// Process content
		const contentResult = generateStepsForNode(node.content, level, currentIndex);
		allSteps.push(...contentResult.steps);
		currentIndex = contentResult.nextIndex;
	} else if (isOpposite(node)) {
		// Process operand
		const argResult = generateStepsForNode(node.operand, level, currentIndex);
		allSteps.push(...argResult.steps);
		currentIndex = argResult.nextIndex;
	}

	return { steps: allSteps, nextIndex: currentIndex };
}

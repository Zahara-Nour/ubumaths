/**
 * Arithmetic Step Generator
 *
 * Generates step-by-step explanations for arithmetic operations.
 * Adapts detail level based on school level.
 */

import type { MathNode } from '../types';
import type { CalculationStep, SchoolLevel } from './types';
import { toLatex } from '../index';
import {
	isNumber,
	isVariable,
	isAddition,
	isSubtraction,
	isMultiplication,
	isDivision,
	isSuperscript,
	isFunction,
	isOpposite,
	isDelimiter
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
 * Evaluate a simple numeric expression
 */
function evaluateNumeric(node: MathNode): number | null {
	if (isNumber(node)) {
		return parseFloat(node.value);
	}

	if (isOpposite(node)) {
		const inner = evaluateNumeric(node.operand);
		return inner !== null ? -inner : null;
	}

	if (isDelimiter(node)) {
		return evaluateNumeric(node.content);
	}

	if (isAddition(node)) {
		const left = evaluateNumeric(node.left);
		const right = evaluateNumeric(node.right);
		if (left !== null && right !== null) return left + right;
	}

	if (isSubtraction(node)) {
		const left = evaluateNumeric(node.left);
		const right = evaluateNumeric(node.right);
		if (left !== null && right !== null) return left - right;
	}

	if (isMultiplication(node)) {
		const left = evaluateNumeric(node.left);
		const right = evaluateNumeric(node.right);
		if (left !== null && right !== null) return left * right;
	}

	if (isDivision(node)) {
		const left = evaluateNumeric(node.numerator);
		const right = evaluateNumeric(node.denominator);
		if (left !== null && right !== null && right !== 0) return left / right;
	}

	if (isSuperscript(node)) {
		const base = evaluateNumeric(node.base);
		const exp = evaluateNumeric(node.superscript);
		if (base !== null && exp !== null) return Math.pow(base, exp);
	}

	if (isFunction(node) && node.args.length === 1) {
		const arg = evaluateNumeric(node.args[0]);
		if (arg === null) return null;

		switch (node.name) {
			case 'sin':
				return Math.sin(arg);
			case 'cos':
				return Math.cos(arg);
			case 'tan':
				return Math.tan(arg);
			case 'sqrt':
				return arg >= 0 ? Math.sqrt(arg) : null;
			case 'abs':
				return Math.abs(arg);
			case 'ln':
				return arg > 0 ? Math.log(arg) : null;
			case 'log':
				return arg > 0 ? Math.log10(arg) : null;
			case 'exp':
				return Math.exp(arg);
		}
	}

	return null;
}

/**
 * Check if a node is a simple numeric value
 */
function isNumericValue(node: MathNode | undefined): boolean {
	if (!node) return false;
	if (isNumber(node)) return true;
	if (isOpposite(node) && node.operand && isNumber(node.operand)) return true;
	if (isDelimiter(node) && node.content) return isNumericValue(node.content);
	return false;
}

/**
 * Format a number for display
 */
function formatNumber(n: number): string {
	if (Number.isInteger(n)) return n.toString();
	// Round to reasonable precision
	const rounded = Math.round(n * 1000000) / 1000000;
	return rounded.toString();
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

	// Get numeric values
	const leftVal = evaluateNumeric(left);
	const rightVal = evaluateNumeric(right);
	const resultVal = evaluateNumeric(node);

	if (leftVal !== null && rightVal !== null && resultVal !== null) {
		const leftStr = formatNumber(leftVal);
		const rightStr = formatNumber(rightVal);
		const resultStr = formatNumber(resultVal);

		let description: string;
		let expression: string;
		let explanation: string | undefined;

		switch (opType) {
			case 'add':
				description = getDescription('add', level);
				expression = `${leftStr} + ${rightStr} = ${resultStr}`;
				if (level === 'primaire') {
					explanation = `On ajoute ${rightStr} à ${leftStr}`;
				}
				break;
			case 'subtract':
				description = getDescription('subtract', level);
				expression = `${leftStr} - ${rightStr} = ${resultStr}`;
				if (level === 'primaire') {
					explanation = `On enlève ${rightStr} de ${leftStr}`;
				}
				break;
			case 'multiply':
				description = getDescription('multiply', level);
				expression = `${leftStr} \\times ${rightStr} = ${resultStr}`;
				if (level === 'primaire') {
					explanation = `${leftStr} fois ${rightStr}`;
				}
				break;
			case 'divide':
				description = getDescription('divide', level);
				expression = `${leftStr} \\div ${rightStr} = ${resultStr}`;
				if (level === 'primaire') {
					explanation = `On partage ${leftStr} en ${rightStr} parts égales`;
				}
				break;
			default:
				description = getDescription('evaluate', level);
				expression = `${toLatex(node)} = ${resultStr}`;
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

	const baseVal = evaluateNumeric(node.base);
	const expVal = evaluateNumeric(node.superscript);
	const resultVal = evaluateNumeric(node);

	if (baseVal !== null && expVal !== null && resultVal !== null) {
		const baseStr = formatNumber(baseVal);
		const expStr = formatNumber(expVal);
		const resultStr = formatNumber(resultVal);

		let explanation: string | undefined;
		if (level === 'primaire' || level === 'college') {
			if (Number.isInteger(expVal) && expVal > 0 && expVal <= 5) {
				const factors = Array(expVal).fill(baseStr).join(' \\times ');
				explanation = `${baseStr}^{${expStr}} = ${factors}`;
			}
		}

		steps.push({
			index: currentIndex++,
			description: getDescription('power', level),
			expression: `${baseStr}^{${expStr}} = ${resultStr}`,
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
		const argVal = evaluateNumeric(node.args[0]);
		const resultVal = evaluateNumeric(node);

		if (argVal !== null && resultVal !== null) {
			const argStr = formatNumber(argVal);
			const resultStr = formatNumber(resultVal);

			steps.push({
				index: currentIndex++,
				description: `${node.name}`,
				expression: `\\${node.name}(${argStr}) = ${resultStr}`,
				ast: node
			});
		}
	}

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

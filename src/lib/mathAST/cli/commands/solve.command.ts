/**
 * Solve Command
 *
 * Solves equations symbolically with step-by-step solutions.
 * Supports linear, quadratic, and transcendental equations.
 *
 * Syntax: .solve equation [variable]
 * - .solve 2x + 4 = 0        -> x = -2
 * - .solve x^2 - 4x + 3 = 0  -> x = 1, x = 3
 * - .solve ln(x) = 0         -> x = 1
 *
 * Options:
 * - --verbose or -v: Show detailed steps
 * - --quiet or -q: Show only result
 */

import { BaseCommand, type OptionDefinition } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import { toCustom } from '../../custom-generator';
import { parse } from '../core/pipeline';
import { solve, type SolvingVerbosity, SolveError } from '../../solve';
import { isRelation, isMultiplication, isOpposite, isVariable, isNumber } from '../../guards';
import type { MathNode, RelationNode } from '../../types';
import { simplify } from '../../normal';
import { number, opposite, add, implicitMultiply } from '../../factory';

import { flattenSumShallow, unflattenSum } from '../../flatten';
import { getVariables } from '../../eval/substitute';
import { evaluate } from '../../eval/evaluate';

/**
 * Negate a math node, properly handling double negatives.
 * For numbers like -4, returns 4 (not --4).
 */
function negate(node: MathNode): MathNode {
	// If it's a number, negate the string value directly
	if (isNumber(node)) {
		const val = node.value;
		if (val.startsWith('-')) {
			return number(val.slice(1)); // -4 -> 4
		} else {
			return number('-' + val); // 4 -> -4
		}
	}
	// If it's already an opposite, return the inner operand
	if (isOpposite(node)) {
		return node.operand;
	}
	// Otherwise wrap in opposite
	return opposite(node);
}

/**
 * Evaluate an expression numerically if possible, otherwise simplify.
 * Returns the evaluated node (e.g., 1+4 -> 5).
 */
function evalSimplify(node: MathNode): MathNode {
	try {
		const result = evaluate(node);
		if (result.exact && result.node) {
			return result.node;
		}
	} catch {
		// Evaluation failed (e.g., contains variables), fall back to simplify
	}
	return simplify(node);
}

// =============================================================================
// Pedagogical Step Types
// =============================================================================

interface PedagogicalStep {
	/** Description of the operation */
	description: string;
	/** Equation with operation applied (before simplification) */
	transformation: string;
	/** Simplified result */
	result: string;
}

// =============================================================================
// Linear Equation Pedagogical Steps
// =============================================================================

/**
 * Extract coefficient from a multiplication term like 3x or -2x.
 * Returns the coefficient (e.g., 3, -2) or null if not a simple multiplication.
 */
function extractCoefficientFromTerm(term: MathNode, variable: string): MathNode | null {
	// Case: just the variable x -> coefficient is 1
	if (isVariable(term) && term.name === variable) {
		return number('1');
	}

	// Case: -x -> coefficient is -1
	if (isOpposite(term)) {
		const inner = term.operand;
		if (isVariable(inner) && inner.name === variable) {
			return number('-1');
		}
		// Case: -(3x) -> coefficient is -3
		const innerCoeff = extractCoefficientFromTerm(inner, variable);
		if (innerCoeff) {
			return opposite(innerCoeff);
		}
	}

	// Case: multiplication (3x, 3*x, etc.)
	if (isMultiplication(term)) {
		const { left, right } = term;
		// Check if one side is the variable
		if (isVariable(right) && right.name === variable) {
			return left;
		}
		if (isVariable(left) && left.name === variable) {
			return right;
		}
	}

	return null;
}

/**
 * Extract coefficient and constant from a linear expression ax + b.
 * Returns { a, b } where expr = ax + b.
 */
function extractLinearParts(expr: MathNode, variable: string): { a: MathNode; b: MathNode } | null {
	const flatSum = flattenSumShallow(expr);
	const coefficients: MathNode[] = [];
	const constantTerms: MathNode[] = [];

	for (const { sign, term } of flatSum) {
		const signedTerm = sign === '-' ? opposite(term) : term;
		const vars = getVariables(signedTerm);

		if (vars.has(variable)) {
			// This term contains the variable - extract coefficient
			const coeff = extractCoefficientFromTerm(signedTerm, variable);
			if (coeff) {
				coefficients.push(coeff);
			}
		} else {
			// Constant term
			constantTerms.push(signedTerm);
		}
	}

	// Sum all coefficients
	let a: MathNode =
		coefficients.length === 0
			? number('0')
			: coefficients.length === 1
				? coefficients[0]
				: coefficients.reduce((acc, c) => add(acc, c));
	a = simplify(a);

	// Sum all constants
	const b =
		constantTerms.length === 0
			? number('0')
			: constantTerms.length === 1
				? constantTerms[0]
				: unflattenSum(constantTerms.map((t) => ({ sign: '+' as const, term: t })))!;

	return { a, b: simplify(b) };
}

/**
 * Generate pedagogical steps for a linear equation.
 * Input: ax + b = c (where lhs = ax + b, rhs = c)
 */
function generateLinearPedagogicalSteps(
	equation: RelationNode,
	variable: string,
	solutionValue: MathNode
): PedagogicalStep[] {
	const steps: PedagogicalStep[] = [];
	const lhs = equation.left;
	const rhs = equation.right;

	// Extract ax + b from lhs
	const parts = extractLinearParts(lhs, variable);
	if (!parts) return steps;

	const { a, b } = parts;
	const aStr = toCustom(a);
	const bSimplified = simplify(b);

	// Current state: lhs = rhs
	let currentLhs = lhs;
	let currentRhs = rhs;

	// Step 1: Add/subtract constant to isolate variable term
	// If b != 0, we need to eliminate it
	const bIsZero = toCustom(bSimplified) === '0';

	if (!bIsZero) {
		// Determine if we add or subtract
		// If b is negative (e.g., -4), we add |b| (add 4)
		// If b is positive (e.g., +4), we subtract b (subtract 4)
		const bStr = toCustom(bSimplified);
		const isNegative = bStr.startsWith('-');

		let operationDesc: string;
		let transformLhs: string;
		let transformRhs: string;

		if (isNegative) {
			// b is negative, so we add |b|
			const absB = negate(bSimplified);
			const absBStr = toCustom(absB);
			operationDesc = `On ajoute ${absBStr} aux deux membres`;
			transformLhs = `${toCustom(currentLhs)} + ${absBStr}`;
			transformRhs = `${toCustom(currentRhs)} + ${absBStr}`;
		} else {
			// b is positive, so we subtract b
			operationDesc = `On soustrait ${bStr} aux deux membres`;
			transformLhs = `${toCustom(currentLhs)} - ${bStr}`;
			transformRhs = `${toCustom(currentRhs)} - ${bStr}`;
		}

		// Compute simplified result: ax = c - b (evaluate numerically if pure numbers)
		const newRhs = evalSimplify(add(currentRhs, negate(bSimplified)));
		const varNode: MathNode = { type: 'variable', name: variable };
		const newLhs = toCustom(simplify(a)) === '1' ? varNode : implicitMultiply(a, varNode);

		steps.push({
			description: operationDesc,
			transformation: `${transformLhs} = ${transformRhs}`,
			result: `${toCustom(simplify(newLhs))} = ${toCustom(newRhs)}`
		});

		currentLhs = newLhs;
		currentRhs = newRhs;
	}

	// Step 2: Divide by coefficient if a != 1
	const aIsOne = toCustom(simplify(a)) === '1';

	if (!aIsOne) {
		const operationDesc = `On divise les deux membres par ${aStr}`;
		const transformLhs = `${toCustom(currentLhs)}/${aStr}`;
		const transformRhs = `${toCustom(currentRhs)}/${aStr}`;

		steps.push({
			description: operationDesc,
			transformation: `${transformLhs} = ${transformRhs}`,
			result: `${variable} = ${toCustom(solutionValue)}`
		});
	}

	return steps;
}

// =============================================================================
// Solve Command
// =============================================================================

/**
 * Solve command - solves equations symbolically.
 *
 * Parses the input equation and computes its solutions
 * with step-by-step explanations in French.
 *
 * @example
 * ```
 * > .solve 2x + 4 = 0
 * Equation lineaire: 2x + 4 = 0
 * Solution: x = -2
 *
 * > .solve x^2 - 5x + 6 = 0 --verbose
 * Equation quadratique: x^2 - 5x + 6 = 0
 * Coefficients: a = 1, b = -5, c = 6
 * Discriminant: Delta = 25 - 24 = 1 > 0
 * Deux solutions reelles distinctes
 * x_1 = (5 - 1) / 2 = 2
 * x_2 = (5 + 1) / 2 = 3
 * ```
 */
export class SolveCommand extends BaseCommand {
	readonly name = 'solve';
	readonly aliases = ['s', 'resoudre'] as const;
	readonly description = 'Solve equation: .solve equation [variable] [--verbose|-v] [--quiet|-q]';
	readonly usage = 'solve <equation> [variable] [options]';
	readonly requiresAst = false;

	override getOptionDefinitions(): readonly OptionDefinition[] {
		return [
			{ flag: '--verbose', description: 'Show detailed steps' },
			{ flag: '-v', description: 'Short for --verbose' },
			{ flag: '--quiet', description: 'Show only the result' },
			{ flag: '-q', description: 'Short for --quiet' }
		];
	}

	execute(ctx: CommandContext): CommandResult {
		const { input, verbosity } = this.parseOptions(ctx);

		if (!input) {
			return {
				success: false,
				output: '',
				error: {
					code: 'PARSE_ERROR',
					message: 'No equation to solve. Usage: .solve <equation> [variable]'
				}
			};
		}

		// Parse input to extract equation and optional variable
		const { expression, variable } = this.parseInput(input);

		// Parse the expression with state-aware parser options
		const parserOptions = ctx.evalState ? { evalState: ctx.evalState } : undefined;
		const parseResult = parse(expression, parserOptions);

		if (parseResult.errors.length > 0 || !parseResult.ast) {
			const errorMsg = parseResult.errors[0]?.message ?? 'Failed to parse equation';
			return {
				success: false,
				output: '',
				error: { code: 'PARSE_ERROR', message: errorMsg }
			};
		}

		// Verify it's an equation (relation with =)
		if (!isRelation(parseResult.ast) || parseResult.ast.relation !== '=') {
			return {
				success: false,
				output: '',
				error: {
					code: 'PARSE_ERROR',
					message: "L'entree doit etre une equation (ex: 2x + 3 = 0)"
				}
			};
		}

		try {
			// Solve the equation
			const result = solve(parseResult.ast, {
				variable: variable || undefined,
				verbosity
			});

			// Format output with toggle support
			return this.formatOutputWithToggle(parseResult.ast, result, verbosity, ctx);
		} catch (err) {
			if (err instanceof SolveError) {
				const message = err.details ? `${err.message}: ${err.details}` : err.message;
				return {
					success: false,
					output: '',
					error: { code: 'PARSE_ERROR', message }
				};
			}

			const message = err instanceof Error ? err.message : 'Erreur inconnue lors de la resolution';
			return {
				success: false,
				output: '',
				error: { code: 'UNKNOWN_ERROR', message }
			};
		}
	}

	/**
	 * Parse options from context.
	 */
	private parseOptions(ctx: CommandContext): { input: string; verbosity: SolvingVerbosity } {
		let input = ctx.input.trim();
		let verbosity: SolvingVerbosity = 'summarized';

		// Check for verbose flag
		if (
			ctx.options['verbose'] ||
			ctx.options['v'] ||
			input.includes('--verbose') ||
			input.includes('-v')
		) {
			verbosity = 'detailed';
			input = input.replace(/--verbose|-v/g, '').trim();
		}

		// Check for quiet flag
		if (
			ctx.options['quiet'] ||
			ctx.options['q'] ||
			input.includes('--quiet') ||
			input.includes('-q')
		) {
			verbosity = 'result';
			input = input.replace(/--quiet|-q/g, '').trim();
		}

		return { input, verbosity };
	}

	/**
	 * Parse the input to extract equation and optional variable.
	 */
	private parseInput(input: string): { expression: string; variable: string | null } {
		const trimmed = input.trim();

		// Try to find a trailing variable after the equation
		// Match pattern: equation = ... [variable]
		const match = trimmed.match(/^(.+=.+?)\s+([a-zA-Z_][a-zA-Z0-9_]*)$/);

		if (match) {
			const [, expr, varCandidate] = match;
			// Only treat as variable if it's a simple identifier
			if (expr.trim() && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varCandidate)) {
				return {
					expression: expr.trim(),
					variable: varCandidate
				};
			}
		}

		// Default: entire input is the equation, variable auto-detected
		return {
			expression: trimmed,
			variable: null
		};
	}

	/**
	 * Format output with toggle support (exact/decimal like eval).
	 */
	private formatOutputWithToggle(
		equation: import('../../types').MathNode,
		result: import('../../solve').SolveResult,
		verbosity: SolvingVerbosity,
		ctx: CommandContext
	): CommandResult {
		// Check current mode from eval state
		const currentMode = ctx.evalState?.mode ?? 'exact';
		const eqCustom = toCustom(equation);

		// Header with equation type
		const typeLabels: Record<string, string> = {
			linear: 'lineaire',
			quadratic: 'quadratique',
			polynomial: 'polynomiale',
			exponential: 'exponentielle',
			logarithmic: 'logarithmique',
			trigonometric: 'trigonometrique',
			mixed: 'mixte',
			constant: 'constante',
			unknown: 'inconnue'
		};

		const typeLabel = typeLabels[result.equationType] ?? result.equationType;

		// Build header lines (for detailed/summarized verbosity)
		const headerLines: string[] = [];
		const headerHtmlLines: string[] = [];

		if (verbosity !== 'result') {
			headerLines.push(`Equation ${typeLabel}: ${eqCustom}`);
			headerHtmlLines.push(
				`<span class="text-muted-foreground">Equation ${typeLabel}:</span> <span class="text-cyan-400">${this.escapeHtml(eqCustom)}</span>`
			);
		}

		// Show pedagogical steps for supported equation types
		if (verbosity !== 'result' && result.status === 'unique' && result.solutions.length > 0) {
			const solutionValue = result.solutions[0].value;

			// Generate pedagogical steps based on equation type
			let pedagogicalSteps: PedagogicalStep[] = [];

			if (result.equationType === 'linear' && isRelation(equation)) {
				pedagogicalSteps = generateLinearPedagogicalSteps(
					equation as RelationNode,
					result.variable,
					solutionValue
				);
			}

			// Display pedagogical steps with nice formatting
			if (pedagogicalSteps.length > 0) {
				headerLines.push('');
				headerHtmlLines.push('<br>');

				for (const step of pedagogicalSteps) {
					// Plain text: description: transformation
					//             result
					headerLines.push(`${step.description}: ${step.transformation}`);
					headerLines.push(`    ${step.result}`);

					// HTML: styled output
					headerHtmlLines.push(
						`<br><span class="text-muted-foreground">${this.escapeHtml(step.description)}:</span> ` +
							`<span class="text-cyan-400">${this.escapeHtml(step.transformation)}</span>`
					);
					headerHtmlLines.push(
						`<br><span class="pl-4 text-green-400">${this.escapeHtml(step.result)}</span>`
					);
				}
			}
		}

		// Handle different result statuses
		switch (result.status) {
			case 'unique':
			case 'multiple': {
				// Build exact and decimal solution strings
				const exactSolutions = result.solutions
					.map((sol) => `${result.variable} = ${toCustom(sol.value)}`)
					.join(result.solutions.length > 1 ? ' ou ' : '');

				const decimalSolutions = result.solutions
					.map((sol) => {
						if (sol.approximate !== undefined) {
							return `${result.variable} ≈ ${sol.approximate.toPrecision(6)}`;
						}
						return `${result.variable} = ${toCustom(sol.value)}`;
					})
					.join(result.solutions.length > 1 ? ' ou ' : '');

				// Check if toggle makes sense
				const canToggle = exactSolutions !== decimalSolutions;

				// Build full output strings
				const headerPrefix = headerLines.length > 0 ? headerLines.join('\n') + '\n\n' : '';
				const headerHtmlPrefix =
					headerHtmlLines.length > 0 ? headerHtmlLines.join('') + '<br><br>' : '';

				const exactOutput = headerPrefix + exactSolutions;
				const decimalOutput = headerPrefix + decimalSolutions;

				const exactOutputHtml =
					headerHtmlPrefix +
					`<span class="text-green-400">${this.escapeHtml(exactSolutions)}</span>`;
				const decimalOutputHtml =
					headerHtmlPrefix +
					`<span class="text-green-400">${this.escapeHtml(decimalSolutions)}</span>`;

				// Use current mode to determine initial display
				const useDecimal = currentMode === 'decimal';

				return {
					success: true,
					output: useDecimal ? decimalOutput : exactOutput,
					outputHtml: useDecimal ? decimalOutputHtml : exactOutputHtml,
					ast: result.solutions[0]?.value,
					exactOutput,
					exactOutputHtml,
					decimalOutput,
					decimalOutputHtml,
					canToggle,
					showDecimalInitially: useDecimal
				};
			}

			case 'infinite': {
				const msg = 'Solutions infinies: toute valeur est solution';
				const headerPrefix = headerLines.length > 0 ? headerLines.join('\n') + '\n\n' : '';
				const headerHtmlPrefix =
					headerHtmlLines.length > 0 ? headerHtmlLines.join('') + '<br><br>' : '';

				return {
					success: true,
					output: headerPrefix + msg,
					outputHtml: headerHtmlPrefix + `<span class="text-blue-400">${msg}</span>`
				};
			}

			case 'no-solution': {
				const msg = "Pas de solution: l'equation est contradictoire";
				const headerPrefix = headerLines.length > 0 ? headerLines.join('\n') + '\n\n' : '';
				const headerHtmlPrefix =
					headerHtmlLines.length > 0 ? headerHtmlLines.join('') + '<br><br>' : '';

				return {
					success: true,
					output: headerPrefix + msg,
					outputHtml: headerHtmlPrefix + `<span class="text-red-400">${msg}</span>`
				};
			}

			case 'no-real-solution': {
				const msg = 'Pas de solution reelle';
				const headerPrefix = headerLines.length > 0 ? headerLines.join('\n') + '\n\n' : '';
				const headerHtmlPrefix =
					headerHtmlLines.length > 0 ? headerHtmlLines.join('') + '<br><br>' : '';

				return {
					success: true,
					output: headerPrefix + msg,
					outputHtml: headerHtmlPrefix + `<span class="text-red-400">${msg}</span>`
				};
			}

			default: {
				const msg = result.error ? `Erreur: ${result.error}` : 'Resolution non supportee';
				const headerPrefix = headerLines.length > 0 ? headerLines.join('\n') + '\n\n' : '';
				const headerHtmlPrefix =
					headerHtmlLines.length > 0 ? headerHtmlLines.join('') + '<br><br>' : '';

				return {
					success: true,
					output: headerPrefix + msg,
					outputHtml: headerHtmlPrefix + `<span class="text-yellow-400">${msg}</span>`
				};
			}
		}
	}

	/**
	 * Escape HTML special characters.
	 */
	private escapeHtml(str: string): string {
		return str
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}
}

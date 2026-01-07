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
import { number, opposite, add } from '../../factory';

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

/**
 * Wrap expression in braces if needed for division clarity.
 * Adds {} around expressions that start with - or contain + or -.
 */
function wrapForDivision(expr: string): string {
	// Needs braces if:
	// - starts with minus sign
	// - contains + or - operators (not at start)
	const needsBraces = expr.startsWith('-') || /[+-]/.test(expr.slice(1));
	return needsBraces ? `{${expr}}` : expr;
}

/**
 * Result of formatting all pedagogical steps with global alignment.
 */
interface GlobalAlignedSteps {
	/** Formatted header line (Equation type: ...) */
	headerText: string;
	headerHtml: string;
	/** Formatted step lines */
	textLines: string[];
	htmlLines: string[];
}

/**
 * Format header and all pedagogical steps with globally aligned = signs.
 * All = signs (including header) are vertically aligned.
 * Padding is added AFTER the colon, BEFORE the equation.
 */
function formatAllStepsGloballyAligned(
	headerPrefix: string, // e.g., "Equation lineaire"
	headerEquation: string, // e.g., "-3x+4=1"
	steps: PedagogicalStep[],
	escapeHtml: (s: string) => string
): GlobalAlignedSteps {
	// Find position of = in each line to determine max
	const getEqIndex = (s: string) => s.indexOf('=');

	// Format header equation with spaces around = (e.g., "-3x+4=1" -> "-3x+4 = 1")
	const formattedHeaderEq = headerEquation.replace(/=/, ' = ');

	// Calculate = position for header: "Equation lineaire: -3x+4 = 1"
	const headerEqIndex = getEqIndex(formattedHeaderEq);
	const headerDescLen = headerPrefix.length + 2; // +2 for ": "
	let maxEqPos = headerEqIndex !== -1 ? headerDescLen + headerEqIndex : 0;

	// Calculate = position for each transformation line
	for (const step of steps) {
		const eqIndex = getEqIndex(step.transformation);
		if (eqIndex !== -1) {
			const descLen = step.description.length + 2; // +2 for ": "
			maxEqPos = Math.max(maxEqPos, descLen + eqIndex);
		}
	}

	// Format header with padding AFTER colon, BEFORE equation
	let headerText: string;
	let headerHtml: string;
	if (headerEqIndex !== -1) {
		const headerPadding = maxEqPos - headerDescLen - headerEqIndex;
		const paddingStr = ' '.repeat(Math.max(0, headerPadding));
		const htmlPadding = '&nbsp;'.repeat(Math.max(0, headerPadding));
		headerText = `${headerPrefix}: ${paddingStr}${formattedHeaderEq}`;
		headerHtml =
			`<span class="text-muted-foreground">${escapeHtml(headerPrefix)}:</span> ` +
			`${htmlPadding}<span class="text-cyan-400">${escapeHtml(formattedHeaderEq)}</span>`;
	} else {
		headerText = `${headerPrefix}: ${formattedHeaderEq}`;
		headerHtml =
			`<span class="text-muted-foreground">${escapeHtml(headerPrefix)}:</span> ` +
			`<span class="text-cyan-400">${escapeHtml(formattedHeaderEq)}</span>`;
	}

	// Format step lines (all equations in cyan for consistency)
	const textLines: string[] = [];
	const htmlLines: string[] = [];

	for (const step of steps) {
		const eqIndexTransform = getEqIndex(step.transformation);
		const eqIndexResult = getEqIndex(step.result);
		const descPrefix = `${step.description}: `;

		if (eqIndexTransform === -1) {
			// No = in transformation, fallback
			textLines.push(`${descPrefix}${step.transformation}`);
			textLines.push(`    ${step.result}`);
			htmlLines.push(
				`<br><span class="text-muted-foreground">${escapeHtml(step.description)}:</span> ` +
					`<span class="text-cyan-400">${escapeHtml(step.transformation)}</span>`
			);
			htmlLines.push(
				`<br><span class="text-cyan-400">&nbsp;&nbsp;&nbsp;&nbsp;${escapeHtml(step.result)}</span>`
			);
			continue;
		}

		// Padding AFTER colon, BEFORE equation (not between left and =)
		const currentEqPos = descPrefix.length + eqIndexTransform;
		const transformPadding = maxEqPos - currentEqPos;
		const paddingStr = ' '.repeat(Math.max(0, transformPadding));
		const htmlPadding = '&nbsp;'.repeat(Math.max(0, transformPadding));

		textLines.push(`${descPrefix}${paddingStr}${step.transformation}`);
		htmlLines.push(
			`<br><span class="text-muted-foreground">${escapeHtml(step.description)}:</span> ` +
				`${htmlPadding}<span class="text-cyan-400">${escapeHtml(step.transformation)}</span>`
		);

		// Format result line - align = to maxEqPos (same cyan color)
		if (eqIndexResult !== -1) {
			const resultPadding = maxEqPos - eqIndexResult;
			const actualResultPadding = Math.max(4, resultPadding);
			const resultPaddingStr = ' '.repeat(actualResultPadding);
			const htmlResultPadding = '&nbsp;'.repeat(actualResultPadding);

			textLines.push(`${resultPaddingStr}${step.result}`);
			htmlLines.push(
				`<br><span class="text-cyan-400">${htmlResultPadding}${escapeHtml(step.result)}</span>`
			);
		} else {
			textLines.push(`    ${step.result}`);
			htmlLines.push(
				`<br><span class="text-cyan-400">&nbsp;&nbsp;&nbsp;&nbsp;${escapeHtml(step.result)}</span>`
			);
		}
	}

	return { headerText, headerHtml, textLines, htmlLines };
}

/**
 * Format header and all pedagogical steps for summarized mode.
 * Shows description + result only (no transformation), with aligned = signs.
 */
function formatStepsSummarized(
	headerPrefix: string,
	headerEquation: string,
	steps: PedagogicalStep[],
	escapeHtml: (s: string) => string
): GlobalAlignedSteps {
	const getEqIndex = (s: string) => s.indexOf('=');

	// Format header equation with spaces around =
	const formattedHeaderEq = headerEquation.replace(/=/, ' = ');

	// Calculate = position for header
	const headerEqIndex = getEqIndex(formattedHeaderEq);
	const headerDescLen = headerPrefix.length + 2; // +2 for ": "
	let maxEqPos = headerEqIndex !== -1 ? headerDescLen + headerEqIndex : 0;

	// Calculate = position for each result line (with arrow prefix "→ ")
	for (const step of steps) {
		const eqIndex = getEqIndex(step.result);
		if (eqIndex !== -1) {
			const descLen = 2 + step.description.length + 2; // "→ " + description + ": "
			maxEqPos = Math.max(maxEqPos, descLen + eqIndex);
		}
	}

	// Format header
	let headerText: string;
	let headerHtml: string;
	if (headerEqIndex !== -1) {
		const headerPadding = maxEqPos - headerDescLen - headerEqIndex;
		const paddingStr = ' '.repeat(Math.max(0, headerPadding));
		const htmlPadding = '&nbsp;'.repeat(Math.max(0, headerPadding));
		headerText = `${headerPrefix}: ${paddingStr}${formattedHeaderEq}`;
		headerHtml =
			`<span class="text-muted-foreground">${escapeHtml(headerPrefix)}:</span> ` +
			`${htmlPadding}<span class="text-cyan-400">${escapeHtml(formattedHeaderEq)}</span>`;
	} else {
		headerText = `${headerPrefix}: ${formattedHeaderEq}`;
		headerHtml =
			`<span class="text-muted-foreground">${escapeHtml(headerPrefix)}:</span> ` +
			`<span class="text-cyan-400">${escapeHtml(formattedHeaderEq)}</span>`;
	}

	// Format step lines (→ description: result)
	const textLines: string[] = [];
	const htmlLines: string[] = [];

	for (const step of steps) {
		const eqIndexResult = getEqIndex(step.result);
		const descPrefix = `→ ${step.description}: `;

		if (eqIndexResult === -1) {
			// No = in result, fallback
			textLines.push(`${descPrefix}${step.result}`);
			htmlLines.push(
				`<br><span class="text-muted-foreground">→ ${escapeHtml(step.description)}:</span> ` +
					`<span class="text-cyan-400">${escapeHtml(step.result)}</span>`
			);
			continue;
		}

		// Align = sign
		const currentEqPos = descPrefix.length + eqIndexResult;
		const padding = maxEqPos - currentEqPos;
		const paddingStr = ' '.repeat(Math.max(0, padding));
		const htmlPadding = '&nbsp;'.repeat(Math.max(0, padding));

		textLines.push(`${descPrefix}${paddingStr}${step.result}`);
		htmlLines.push(
			`<br><span class="text-muted-foreground">→ ${escapeHtml(step.description)}:</span> ` +
				`${htmlPadding}<span class="text-cyan-400">${escapeHtml(step.result)}</span>`
		);
	}

	return { headerText, headerHtml, textLines, htmlLines };
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
 * Handles equations with variables on both sides: a1*x + b1 = a2*x + b2
 */
function generateLinearPedagogicalSteps(
	equation: RelationNode,
	variable: string,
	solutionValue: MathNode
): PedagogicalStep[] {
	const steps: PedagogicalStep[] = [];
	const lhs = equation.left;
	const rhs = equation.right;

	// Extract parts from both sides
	const lhsParts = extractLinearParts(lhs, variable);
	const rhsParts = extractLinearParts(rhs, variable);
	if (!lhsParts || !rhsParts) return steps;

	const { a: a1, b: b1 } = lhsParts; // LHS: a1*x + b1
	const { a: a2, b: b2 } = rhsParts; // RHS: a2*x + b2

	// Track current state as strings for display
	let currentLhsStr = toCustom(lhs);
	let currentRhsStr = toCustom(rhs);

	// Check if RHS has variable terms (a2 != 0)
	const a2Str = toCustom(simplify(a2));
	const hasVarOnRight = a2Str !== '0';

	// Step 1: Move variable terms from RHS to LHS (if any)
	// Subtract a2*x from both sides
	if (hasVarOnRight) {
		const a2Simplified = simplify(a2);
		const a2StrDisplay = toCustom(a2Simplified);
		const isNegative = a2StrDisplay.startsWith('-');

		let operationDesc: string;
		let transformLhs: string;
		let transformRhs: string;

		// Build variable term string for display
		const varTermStr =
			a2StrDisplay === '1'
				? variable
				: a2StrDisplay === '-1'
					? `-${variable}`
					: `${a2StrDisplay}${variable}`;
		const absVarTermStr =
			Math.abs(parseFloat(a2StrDisplay)) === 1
				? variable
				: `${toCustom(negate(a2Simplified))}${variable}`;

		if (isNegative) {
			// a2 is negative, so we add |a2|*x to both sides
			operationDesc = `On ajoute ${absVarTermStr} aux deux membres`;
			transformLhs = `${currentLhsStr} + ${absVarTermStr}`;
			transformRhs = `${currentRhsStr} + ${absVarTermStr}`;
		} else {
			// a2 is positive, so we subtract a2*x from both sides
			operationDesc = `On soustrait ${varTermStr} aux deux membres`;
			transformLhs = `${currentLhsStr} - ${varTermStr}`;
			transformRhs = `${currentRhsStr} - ${varTermStr}`;
		}

		// New coefficient: a1 - a2
		const newA = evalSimplify(add(a1, negate(a2Simplified)));
		const newAStr = toCustom(newA);
		// New LHS: (a1-a2)*x + b1
		const newLhsVarTerm =
			newAStr === '1' ? variable : newAStr === '-1' ? `-${variable}` : `${newAStr}${variable}`;
		const b1Str = toCustom(simplify(b1));
		const newLhsStr =
			b1Str === '0'
				? newLhsVarTerm
				: b1Str.startsWith('-')
					? `${newLhsVarTerm}${b1Str}`
					: `${newLhsVarTerm}+${b1Str}`;
		// New RHS: just b2
		const newRhsStr = toCustom(simplify(b2));

		steps.push({
			description: operationDesc,
			transformation: `${transformLhs} = ${transformRhs}`,
			result: `${newLhsStr} = ${newRhsStr}`
		});

		currentLhsStr = newLhsStr;
		currentRhsStr = newRhsStr;
	}

	// Get updated coefficient and constant after moving variables
	const finalA = hasVarOnRight ? evalSimplify(add(a1, negate(a2))) : simplify(a1);
	const finalB = simplify(b1);
	const finalC = simplify(b2); // RHS constant
	const finalAStr = toCustom(finalA);

	// Step 2: Move constant from LHS to RHS (if any)
	const bStr = toCustom(finalB);
	const bIsZero = bStr === '0';

	if (!bIsZero) {
		const isNegative = bStr.startsWith('-');

		let operationDesc: string;
		let transformLhs: string;
		let transformRhs: string;

		if (isNegative) {
			// b is negative, so we add |b|
			const absB = negate(finalB);
			const absBStr = toCustom(absB);
			operationDesc = `On ajoute ${absBStr} aux deux membres`;
			transformLhs = `${currentLhsStr} + ${absBStr}`;
			transformRhs = `${currentRhsStr} + ${absBStr}`;
		} else {
			// b is positive, so we subtract b
			operationDesc = `On soustrait ${bStr} aux deux membres`;
			transformLhs = `${currentLhsStr} - ${bStr}`;
			transformRhs = `${currentRhsStr} - ${bStr}`;
		}

		// New RHS: finalC - finalB
		const newRhs = evalSimplify(add(finalC, negate(finalB)));
		const newRhsStr = toCustom(newRhs);
		// New LHS: just the variable term
		const newLhsStr =
			finalAStr === '1'
				? variable
				: finalAStr === '-1'
					? `-${variable}`
					: `${finalAStr}${variable}`;

		steps.push({
			description: operationDesc,
			transformation: `${transformLhs} = ${transformRhs}`,
			result: `${newLhsStr} = ${newRhsStr}`
		});

		currentLhsStr = newLhsStr;
		currentRhsStr = newRhsStr;
	}

	// Step 3: Divide by coefficient if a != 1 and a != -1
	const aIsOne = finalAStr === '1';
	const aIsMinusOne = finalAStr === '-1';

	if (!aIsOne) {
		if (aIsMinusOne) {
			// Multiply both sides by -1
			const operationDesc = `On multiplie les deux membres par -1`;
			const transformLhs = `${wrapForDivision(currentLhsStr)} × (-1)`;
			const transformRhs = `${wrapForDivision(currentRhsStr)} × (-1)`;

			steps.push({
				description: operationDesc,
				transformation: `${transformLhs} = ${transformRhs}`,
				result: `${variable} = ${toCustom(solutionValue)}`
			});
		} else {
			const operationDesc = `On divise les deux membres par ${finalAStr}`;
			// Wrap in braces if needed to avoid ambiguity
			const transformLhs = `${wrapForDivision(currentLhsStr)}/${wrapForDivision(finalAStr)}`;
			const transformRhs = `${wrapForDivision(currentRhsStr)}/${wrapForDivision(finalAStr)}`;

			steps.push({
				description: operationDesc,
				transformation: `${transformLhs} = ${transformRhs}`,
				result: `${variable} = ${toCustom(solutionValue)}`
			});
		}
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
		const headerPrefix = `Equation ${typeLabel}`;

		// Build header lines (for detailed/summarized verbosity)
		const headerLines: string[] = [];
		const headerHtmlLines: string[] = [];

		// Generate pedagogical steps for linear equations
		let pedagogicalSteps: PedagogicalStep[] = [];
		if (
			verbosity !== 'result' &&
			result.status === 'unique' &&
			result.solutions.length > 0 &&
			result.equationType === 'linear' &&
			isRelation(equation)
		) {
			const solutionValue = result.solutions[0].value;
			pedagogicalSteps = generateLinearPedagogicalSteps(
				equation as RelationNode,
				result.variable,
				solutionValue
			);
		}

		// Format output based on verbosity
		if (verbosity === 'detailed' && pedagogicalSteps.length > 0) {
			// Detailed: full steps with transformations and aligned equations
			const globalAligned = formatAllStepsGloballyAligned(
				headerPrefix,
				eqCustom,
				pedagogicalSteps,
				this.escapeHtml.bind(this)
			);
			headerLines.push(globalAligned.headerText);
			headerHtmlLines.push(globalAligned.headerHtml);
			headerLines.push(...globalAligned.textLines);
			headerHtmlLines.push(...globalAligned.htmlLines);
		} else if (verbosity === 'summarized' && pedagogicalSteps.length > 0) {
			// Summarized: description + result only (no transformation), with aligned =
			const summarized = formatStepsSummarized(
				headerPrefix,
				eqCustom,
				pedagogicalSteps,
				this.escapeHtml.bind(this)
			);
			headerLines.push(summarized.headerText);
			headerHtmlLines.push(summarized.headerHtml);
			headerLines.push(...summarized.textLines);
			headerHtmlLines.push(...summarized.htmlLines);
		} else if (verbosity !== 'result') {
			// Fallback: just header
			headerLines.push(`${headerPrefix}: ${eqCustom}`);
			headerHtmlLines.push(
				`<span class="text-muted-foreground">${headerPrefix}:</span> <span class="text-cyan-400">${this.escapeHtml(eqCustom)}</span>`
			);
		}

		// Handle different result statuses
		switch (result.status) {
			case 'unique':
			case 'multiple': {
				// Build exact and decimal solution strings
				const exactSolutions = result.solutions
					.map((sol) => `${result.variable} = ${toCustom(sol.value)}`)
					.join(result.solutions.length > 1 ? ' ou ' : '');

				// Check if a fraction has a terminating decimal representation
				// A fraction in lowest terms has terminating decimal iff denominator only has factors 2 and 5
				const hasTerminatingDecimal = (n: bigint, d: bigint): boolean => {
					// Reduce to lowest terms using GCD
					const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? a : gcd(b, a % b));
					const g = gcd(n < 0n ? -n : n, d < 0n ? -d : d);
					let denom = (d < 0n ? -d : d) / g;
					// Remove factors of 2 and 5
					while (denom % 2n === 0n) denom /= 2n;
					while (denom % 5n === 0n) denom /= 5n;
					return denom === 1n;
				};

				// Helper to check if exact value has a terminating decimal
				const isTerminatingDecimal = (evalResult: ReturnType<typeof evaluate>): boolean => {
					if (!evalResult.exact) return false;
					const val = evalResult.value;
					if (typeof val === 'number') return Number.isInteger(val);
					// Handle BigInt fraction { n: bigint, d: bigint }
					if (val && typeof val === 'object' && 'n' in val && 'd' in val) {
						return hasTerminatingDecimal(val.n as bigint, val.d as bigint);
					}
					return false;
				};

				// Check if any solution benefits from showing a decimal approximation
				// True if the exact form is not a simple number (contains /, sqrt, etc.)
				const hasUsefulApproximate = result.solutions.some((sol) => {
					if (sol.approximate === undefined) return false;
					const exactStr = toCustom(sol.value);
					// If exact string is a simple number (parses cleanly), no toggle needed
					const exactNum = parseFloat(exactStr);
					if (!isNaN(exactNum) && exactStr === exactNum.toString()) {
						return false; // exact is already a simple decimal/integer
					}
					return true; // exact contains fraction, sqrt, or other non-decimal representation
				});

				// Format decimal solutions - use = for terminating decimals, ≈ for approximations
				const decimalSolutions = hasUsefulApproximate
					? result.solutions
							.map((sol) => {
								if (sol.approximate !== undefined) {
									// Check if this specific solution has terminating decimal
									let isExact = false;
									try {
										const evalResult = evaluate(sol.value);
										isExact = isTerminatingDecimal(evalResult);
									} catch {
										// Evaluation failed
									}
									// Format without trailing zeros
									const formatted = sol.approximate.toString();
									const symbol = isExact ? '=' : '≈';
									return `${result.variable} ${symbol} ${formatted}`;
								}
								return `${result.variable} = ${toCustom(sol.value)}`;
							})
							.join(result.solutions.length > 1 ? ' ou ' : '')
					: exactSolutions;

				// Only toggle if decimal provides different/useful info
				const canToggle = hasUsefulApproximate;

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

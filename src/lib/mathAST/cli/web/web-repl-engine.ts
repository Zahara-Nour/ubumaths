/**
 * Web REPL Engine
 *
 * Browser-compatible REPL execution engine. Reuses the CLI command registry
 * and parsing pipeline but adapts output for HTML display.
 */

import type { MathNode, RelationNode } from '../../types';
import type { CommandContext, ErrorCode } from '../types';
import { CommandRegistry, parse, createEvalState, bindingsToRecord, setBinding } from '../core';
import { hideIndexedNames } from '../../common/indexed-names';
import { createFunctionBinding, getFunctionNames, getFunction } from '../core/eval-state';
import type { EvalState } from '../core';
import type { PipelineOptions } from '../core/pipeline';
import { createDefaultRegistry } from '../commands';
import type { ReplExecutionResult, WebFunctionInfo } from './types';
import { formatErrorHtml, formatInputErrorHtml, formatTreeHtml } from './output-formatter-web';
import {
	toCustom,
	getVariables,
	hasAllBindings,
	evaluate,
	substitute,
	substituteFunction,
	toLatex
} from '../../index';
import type { FunctionBindings } from '../../eval/function-bindings';
import { evaluateNodeToApproximatedNumber } from '../../eval/evaluate';
import { normalFormsEquivalent } from '../../normal';
import { equivalenceForms } from '../../normal/normalize';
import type { EvalValue, ComplexValueResult, EvalResult } from '../../eval/types';
import {
	computeQuantity,
	convertQuantity,
	type QuantityAnswer,
	type QuantityOutcome
} from '../quantities';
import { displayUnitsInLatex } from '../../units/display';
import { isBoolean, isLogical, isLogicalNot, isRelation, isUnit, isVariable } from '../../guards';
import { relation } from '../../factory';
import { summarizeList, summarizeTable } from '../../../statistics/describe';
import { formatSummary } from '../../../statistics/format';
import {
	bivariateFit,
	invalidValueReason,
	readExactValue,
	toSafeNumber
} from '../../../statistics/bivariate';
import { roundFraction } from '../../../statistics/rounding';
import type { Fraction } from '../../../statistics/fraction';
import {
	changeDomainProblem,
	decimalFit,
	readVariableChange,
	squaredSign,
	transformValue,
	VARIABLE_CHANGE_LIST,
	type VariableChange
} from '../../../statistics/variable-change';
import {
	changedEquations,
	changedPredictionLines,
	changeText,
	decimalCorrelationText,
	exactCorrelationText,
	exactPredictionLines,
	related,
	scatterDecimal,
	scatterEquation,
	scatterNumber,
	shortestDecimal,
	type ScatterPrediction
} from '../../../ubumark/utils/scatter-lines';
import { STAT_TEXT } from '../../../ubumark/utils/stat-chart-text';
import { STAT_CHART_LIMITS } from '../../../ubumark/types/stat-chart';
import {
	MAX_EXACT_CHARACTERS,
	estimatedExactDigits,
	exactCharacters,
	isTooLongToCompute,
	productValue
} from '../exact-size';
import { rationalToNode } from '../../common/numeric';
import { boundedComparison } from '../bounded-comparison';
import { withFrenchErrors } from './french-errors';
import {
	approximateDigitsOf,
	approximateLatexOf,
	approximationNode,
	approximationText,
	isWrittenNumber,
	type ApproximateDigits
} from '../approximation';
import { hasDecimalLiteral } from '../../tidy/decimal';
import { tidy } from '../../tidy';
import { mapNode } from '../../transforms';

// =============================================================================
// Constants
// =============================================================================

/** `.ajustement` rounds to the thousandth, like a ```nuage block by default (Q173) */
const LINREG_PLACES = 3;

// =============================================================================
// Web REPL Engine
// =============================================================================

/**
 * Le pendant d'un calcul pour le bouton ≈ de l'atelier : sa valeur approchée
 * en mode exact, sa valeur exacte en mode décimal (décisions de David,
 * 2026-10-11). Rien quand les deux écritures ne diffèrent pas.
 */
function approximationFields(
	mode: string,
	exact: MathNode,
	canToggle: boolean,
	digits: ApproximateDigits | null,
	keptWriting: boolean
): { approximateLatex?: string; exactLatex?: string } {
	// L'arrondi déjà lu par la console : le relire coûtait autant que le calcul exact
	const approximate = isWrittenNumber(exact) || digits === null ? null : approximateLatexOf(digits);
	if (mode === 'exact') {
		return approximate === null ? {} : { approximateLatex: approximate };
	}
	// En mode décimal, la ligne montre déjà la valeur décimale : le bouton rend
	// l'exacte, sauf si c'est un nombre déjà écrit (« ≈ 3 » vaut 3)
	// … écrite par `tidy`, comme la ligne en mode exact : π/3, pas ⅓ π (revue du lot B) —
	// sauf une écriture gardée, que `tidy` développerait (`(1+1/1000)^{1000}`)
	return canToggle && approximate !== null
		? { exactLatex: toLatex(keptWriting ? exact : tidy(exact)) }
		: {};
}

/**
 * Un résultat exact mis au propre pour l'écrire (π/3, √2/2) : la forme de
 * calcul d'`evaluate` (« coefficient × π ») passée par `tidy` — sauf avec une
 * variable ou un décimal, que `tidy` simplifierait ou réécrirait en fraction
 * (même règle que l'écran de l'atelier, `render.ts`).
 */
function readableExact(node: MathNode): MathNode {
	if (getVariables(node).size > 0 || hasDecimalLiteral(node)) return node;
	try {
		return tidy(node);
	} catch {
		return node;
	}
}

/**
 * La longueur réelle d'un résultat exact calculé, s'il dépasse 1 000 caractères ; `null` sinon
 * (un booléen, une erreur, un résultat lisible).
 */
function measuredTooLong(result: EvalResult, expanded: MathNode): number | null {
	if (result.status !== 'value' || result.node.type === 'boolean') return null;
	const length = exactCharacters(expanded, toCustom(result.node));
	return length > MAX_EXACT_CHARACTERS ? length : null;
}

/** Les fonctions de l'utilisateur remplacées par leur définition (l'expression telle quelle sinon). */
function withFunctionsExpanded(node: MathNode, functions: FunctionBindings | undefined): MathNode {
	if (functions === undefined) return node;
	try {
		return substituteFunction(node, functions);
	} catch {
		return node;
	}
}

/**
 * L'écriture tapée, pour le texte d'un résultat exact trop long : une division tapée
 * `1/1000` est une division EN LIGNE, que `toCustom` écrit `1:/1000` — juste et relisible,
 * mais l'élève a tapé `/`. Même valeur, écrite comme tapée.
 */
function typedWriting(node: MathNode): MathNode {
	return mapNode(node, (n) =>
		n.type === 'division' && n.displayStyle === 'inline' ? { ...n, displayStyle: 'fraction' } : n
	);
}

/**
 * La valeur que « Garder » range en mode décimal : la pleine précision du moteur,
 * sauf si son flottant est sorti de sa plage — `e^{1000}` y vaut Infinity et
 * `10^{-400}` 0, alors que l'écran montre 1,9701 × 10⁴³⁴ et 1 × 10⁻⁴⁰⁰ (revue) :
 * on range alors le résultat exact.
 */
function keptValue(
	decimalResult: EvalResult,
	digits: ApproximateDigits,
	exact: MathNode
): MathNode {
	if (decimalResult.status !== 'value' || typeof decimalResult.value !== 'number') return exact;
	const value = decimalResult.value;
	const outOfRange = !Number.isFinite(value) || (value === 0 && digits.digits !== '0');
	return outOfRange ? exact : decimalResult.node;
}

/**
 * Browser-safe REPL execution engine.
 *
 * Handles:
 * - Dot-commands (e.g., .help, .tree, .simplify)
 * - Expression parsing and display
 * - Equivalence checking (expr1 === expr2)
 *
 * Returns results with both plain text and HTML formatting.
 *
 * @example
 * ```typescript
 * const engine = new WebReplEngine();
 *
 * // Execute an expression
 * const result = engine.execute('x^2 + 1');
 * console.log(result.output); // Plain text
 * element.innerHTML = result.outputHtml; // HTML display
 *
 * // Execute a command
 * const treeResult = engine.execute('.tree');
 * console.log(treeResult.ast); // Access AST
 * ```
 */
export class WebReplEngine {
	private registry: CommandRegistry;
	private lastAst: MathNode | undefined;
	private evalState: EvalState;
	/** La dernière grandeur calculée, exacte : celle que `.convert` reprend. */
	private lastQuantity: MathNode | null = null;
	/** Ce que l'élève a vu de `lastQuantity` (une durée composée), pour `.convert` */
	private lastWritten: QuantityAnswer | undefined = undefined;

	constructor() {
		this.registry = createDefaultRegistry();
		this.evalState = createEvalState();
	}

	// ===========================================================================
	// Public API
	// ===========================================================================

	/**
	 * Execute a REPL input (command or expression).
	 *
	 * @param input - The input string to execute
	 * @returns Execution result with output, AST, and metadata
	 */
	execute(input: string): ReplExecutionResult {
		// Les messages d'erreur en français, à la sortie : les parseurs et le moteur répondent en
		// anglais (« Unexpected token: EOF ») — 2026-10-12
		return withFrenchErrors(this.executeInput(input));
	}

	private executeInput(input: string): ReplExecutionResult {
		const trimmedInput = input.trim();

		if (!trimmedInput) {
			return {
				success: true,
				output: ''
			};
		}

		// Handle dot-commands
		if (trimmedInput.startsWith('.')) {
			return this.executeCommand(trimmedInput);
		}

		// Check for inline assignment syntax: "x := 5" or "x <- 5"
		// Supports both := (CAS-style) and <- (R/algo-style)
		const assignmentMatch = trimmedInput.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*(:=|<-)\s*(.+)$/);
		if (assignmentMatch) {
			return this.executeInlineAssignment(assignmentMatch[1], assignmentMatch[3]);
		}

		// Check for function definition syntax: "f(x) := x^2" or "f(x) <- x^2"
		// Also handles multi-parameter: "f(x, y) := x + y"
		const funcDefMatch = trimmedInput.match(
			/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)\s*\)\s*(:=|<-)\s*(.+)$/
		);
		if (funcDefMatch) {
			const funcName = funcDefMatch[1];
			const params = funcDefMatch[2].split(',').map((p) => p.trim());
			const bodyExpr = funcDefMatch[4];
			return this.executeInlineFunctionDefinition(funcName, params, bodyExpr);
		}

		// Handle equality/equivalence syntax: expr1 = expr2
		// Matches = not preceded by <, >, !, :, = and not followed by =, >
		if (/(?<![<>!=:])=(?![=>])/.test(trimmedInput)) {
			return this.executeEquality(trimmedInput);
		}

		// Handle regular expression
		return this.executeExpression(trimmedInput);
	}

	/**
	 * Get the current evaluation state.
	 *
	 * @returns Current evaluation state with bindings and mode
	 */
	getEvalState(): EvalState {
		return this.evalState;
	}

	/**
	 * Get all registered commands for help/autocomplete.
	 *
	 * @returns Array of command metadata
	 */
	getCommands(): ReadonlyArray<{
		name: string;
		aliases: readonly string[];
		description: string;
	}> {
		return this.registry.all().map((cmd) => ({
			name: cmd.name,
			aliases: cmd.aliases,
			description: cmd.description
		}));
	}

	/**
	 * Get all user-defined functions for display in UI components.
	 *
	 * Returns function information including name, parameters, expression,
	 * and optional derivative/inverse expressions as custom syntax strings.
	 *
	 * @returns Array of function information objects
	 *
	 * @example
	 * ```typescript
	 * const engine = new WebReplEngine();
	 * engine.execute('.def f(x) = x^2');
	 * engine.execute('.def-deriv f 2*x');
	 *
	 * const functions = engine.getFunctions();
	 * // [{ name: 'f', parameters: ['x'], expression: 'x^2', derivative: '2*x' }]
	 * ```
	 */
	getFunctions(): WebFunctionInfo[] {
		const functionNames = getFunctionNames(this.evalState);
		return functionNames.map((name) => {
			const def = getFunction(this.evalState, name);
			if (!def) {
				// Should not happen, but handle gracefully
				return {
					name,
					parameters: [],
					expression: ''
				};
			}

			return {
				name,
				parameters: def.parameters,
				expression: toCustom(def.expression),
				derivative: def.derivative ? toCustom(def.derivative) : undefined,
				inverse: def.inverse ? toCustom(def.inverse) : undefined
			};
		});
	}

	/**
	 * Get the current evaluation state.
	 *
	 * Provides direct access to the internal state for advanced use cases.
	 * Use getFunctions() for a safer, formatted view of function definitions.
	 *
	 * @returns Current evaluation state with bindings, functions, and mode
	 */
	getState(): EvalState {
		return this.evalState;
	}

	// ===========================================================================
	// Private Execution Handlers
	// ===========================================================================

	/**
	 * Execute a dot-command (e.g., .help, .tree).
	 */
	private executeCommand(input: string): ReplExecutionResult {
		const parts = input.slice(1).split(/\s+/);
		const cmdName = parts[0].toLowerCase();
		const args = parts.slice(1).join(' ').trim();

		// Evaluation mode shortcuts: .exact and .decimal
		if (cmdName === 'exact') {
			this.evalState.mode = 'exact';
			return {
				success: true,
				output: 'Mode: exact',
				outputHtml: 'Mode: <span class="text-green-400">exact</span>'
			};
		}
		if (cmdName === 'decimal') {
			this.evalState.mode = 'decimal';
			return {
				success: true,
				output: 'Mode: decimal',
				outputHtml: 'Mode: <span class="text-yellow-400">decimal</span>'
			};
		}

		// Handle .convert command
		if (cmdName === 'convert') {
			return this.executeConvertCommand(args);
		}

		// Handle .stats command
		if (cmdName === 'stats') {
			return this.executeStatsCommand(args);
		}

		// Handle .linreg command
		if (cmdName === 'linreg') {
			return this.executeLinregCommand(args);
		}

		// Look up command in registry
		const command = this.registry.get(cmdName);
		if (!command) {
			return {
				success: false,
				output: `Unknown command: ${cmdName}\nType .help for available commands`,
				outputHtml: formatErrorHtml({
					code: 'UNKNOWN_COMMAND',
					message: `Unknown command: ${cmdName}`,
					suggestion: 'Type .help for available commands'
				}),
				error: {
					code: 'UNKNOWN_COMMAND',
					message: `Unknown command: ${cmdName}`
				}
			};
		}

		// Handle command with arguments
		let ast = this.lastAst;
		let cmdInput = args;

		if (args) {
			// For equiv command, handle specially (may have two expressions or compare with lastAst)
			if (cmdName === 'equiv' || cmdName === 'eq' || cmdName === 'equivalent') {
				const ctx: CommandContext = {
					ast: this.lastAst,
					input: args,
					format: 'latex',
					options: {},
					isRepl: true,
					evalState: this.evalState
				};
				const result = command.execute(ctx);
				return this.commandResultToReplResult(result);
			}

			// For other commands, parse the argument as an expression
			const parseResult = parse(args, this.parseOptions());

			if (parseResult.ast) {
				ast = parseResult.ast;
				cmdInput = args;
			} else if (parseResult.errors.length > 0) {
				// ⚠️ Un argument qui ne se lit pas comme une expression n'est une
				// erreur que pour les commandes qui ont BESOIN de l'arbre.
				//
				// Celles qui relisent `ctx.input` (`requiresAst === false`) attendent
				// souvent autre chose derrière l'expression : `.taylor expr ordre
				// [centre]`, `.integrate expr ; t a b`, `.solve --verbose …`. Les
				// parser en bloc les tuait sur leur premier nombre, sans qu'elles
				// soient jamais appelées.
				if (command.requiresAst !== false) {
					const error = parseResult.errors[0];
					return {
						success: false,
						output: error.message,
						outputHtml: formatErrorHtml(error),
						error: {
							code: error.code,
							message: error.message,
							position: error.position
						}
					};
				}
				// `ast` reste indéfini : l'élève a fourni des arguments, ce n'est donc
				// pas le cas « reprends la dernière expression ».
				ast = undefined;
				cmdInput = args;
			}
		}

		// Build context for command execution
		const ctx: CommandContext = {
			ast,
			input: cmdInput,
			format: 'latex',
			options: {},
			isRepl: true,
			evalState: this.evalState
		};

		const result = command.execute(ctx);
		return this.commandResultToReplResult(result, ast);
	}

	/**
	 * Execute inline variable assignment: "x := 5" or "x <- 5"
	 * Parses the value and stores it in evalState.bindings.
	 */
	private executeInlineAssignment(varName: string, valueExpr: string): ReplExecutionResult {
		const parseResult = parse(valueExpr, this.parseOptions());

		if (parseResult.errors.length > 0 || !parseResult.ast) {
			const error = parseResult.errors[0];
			let outputHtml: string;

			if (error?.position !== undefined) {
				outputHtml = formatInputErrorHtml(valueExpr, error.position, error.message);
			} else {
				outputHtml = formatErrorHtml(
					error || { code: 'PARSE_ERROR', message: 'Failed to parse expression' }
				);
			}

			return {
				success: false,
				output: error?.message || 'Failed to parse expression',
				outputHtml,
				error: {
					code: error?.code || 'PARSE_ERROR',
					message: error?.message || 'Failed to parse expression',
					position: error?.position
				}
			};
		}

		// Store the binding
		setBinding(this.evalState, varName, parseResult.ast);
		this.lastAst = parseResult.ast;

		// Format output
		const valueStr = toCustom(parseResult.ast);
		const output = `${varName} = ${valueStr}`;
		const outputHtml = `<strong>${this.escapeHtml(varName)}</strong> = <span class="text-cyan-400">${this.escapeHtml(valueStr)}</span>`;

		return {
			success: true,
			output,
			outputHtml,
			ast: parseResult.ast
		};
	}

	/**
	 * Execute inline function definition: "f(x) := x^2" or "f(x) <- x^2"
	 * Parses the body expression and stores it in evalState.functions.
	 */
	private executeInlineFunctionDefinition(
		funcName: string,
		parameters: string[],
		bodyExpr: string
	): ReplExecutionResult {
		const parseResult = parse(bodyExpr, this.parseOptions());

		if (parseResult.errors.length > 0 || !parseResult.ast) {
			const error = parseResult.errors[0];
			let outputHtml: string;

			if (error?.position !== undefined) {
				outputHtml = formatInputErrorHtml(bodyExpr, error.position, error.message);
			} else {
				outputHtml = formatErrorHtml(
					error || { code: 'PARSE_ERROR', message: 'Failed to parse expression' }
				);
			}

			return {
				success: false,
				output: error?.message || 'Failed to parse expression',
				outputHtml,
				error: {
					code: error?.code || 'PARSE_ERROR',
					message: error?.message || 'Failed to parse expression',
					position: error?.position
				}
			};
		}

		// Par `createFunctionBinding` : le nom entre dans `functionNames`, et
		// `k(x) := x+1` puis `k(1)` se calcule (revue)
		createFunctionBinding(this.evalState, funcName, parameters, parseResult.ast);
		this.lastAst = parseResult.ast;

		// Format output
		const paramsStr = parameters.join(', ');
		const bodyStr = toCustom(parseResult.ast);
		const output = `${funcName}(${paramsStr}) = ${bodyStr}`;
		const outputHtml = `<strong>${this.escapeHtml(funcName)}</strong>(${this.escapeHtml(paramsStr)}) = <span class="text-cyan-400">${this.escapeHtml(bodyStr)}</span>`;

		return {
			success: true,
			output,
			outputHtml,
			ast: parseResult.ast
		};
	}

	/**
	 * Execute equality check: expr1 = expr2
	 * Tests if two expressions are algebraically equivalent.
	 */
	private executeEquality(input: string): ReplExecutionResult {
		// Split by standalone = (not <=, >=, !=, :=, =>)
		// Use the same regex pattern to find and split
		const equalityRegex = /(?<![<>!=:])=(?![=>])/;
		const parts = input.split(equalityRegex);

		// Une chaîne (`2 = 2 = 2`, `1 < 2 = 2`) : lue en entier, maillon par maillon. Coupée au
		// `=`, elle comparait un booléen à un nombre et répondait `false` (revue, 2026-10-12)
		if (parts.length > 2 && parts.every((part) => part.trim() !== '')) {
			return this.executeExpression(input);
		}

		if (parts.length !== 2) {
			return {
				success: false,
				output: 'Syntaxe invalide. Utilisez: expr1 = expr2',
				outputHtml: formatErrorHtml({
					code: 'PARSE_ERROR',
					message: 'Syntaxe invalide. Utilisez: expr1 = expr2'
				}),
				error: {
					code: 'PARSE_ERROR',
					message: 'Syntaxe invalide. Utilisez: expr1 = expr2'
				}
			};
		}

		const expr1Str = parts[0].trim();
		const expr2Str = parts[1].trim();

		if (!expr1Str || !expr2Str) {
			return {
				success: false,
				output: 'Les deux expressions sont requises',
				outputHtml: formatErrorHtml({
					code: 'PARSE_ERROR',
					message: 'Les deux expressions sont requises'
				}),
				error: {
					code: 'PARSE_ERROR',
					message: 'Les deux expressions sont requises'
				}
			};
		}

		// Parse both expressions
		const result1 = parse(expr1Str, this.parseOptions());
		const result2 = parse(expr2Str, this.parseOptions());

		if (!result1.ast) {
			const error = result1.errors[0];
			return {
				success: false,
				output: `Erreur dans l'expression 1: ${error?.message || 'parse error'}`,
				outputHtml: formatErrorHtml({
					code: 'PARSE_ERROR',
					message: `Erreur dans l'expression 1: ${error?.message || 'parse error'}`
				}),
				error: {
					code: 'PARSE_ERROR',
					message: error?.message || 'parse error'
				}
			};
		}

		if (!result2.ast) {
			const error = result2.errors[0];
			return {
				success: false,
				output: `Erreur dans l'expression 2: ${error?.message || 'parse error'}`,
				outputHtml: formatErrorHtml({
					code: 'PARSE_ERROR',
					message: `Erreur dans l'expression 2: ${error?.message || 'parse error'}`
				}),
				error: {
					code: 'PARSE_ERROR',
					message: error?.message || 'parse error'
				}
			};
		}

		// … ou d'une expression logique (`2 > 1 && 3 = 3`) : lue en entier
		if (
			[result1.ast, result2.ast].some(
				(ast) => isRelation(ast) || isLogical(ast) || isLogicalNot(ast)
			)
		) {
			return this.executeExpression(input);
		}

		// Substitute bound variables before comparison
		const bindings = bindingsToRecord(this.evalState.bindings);
		let substituted1 =
			Object.keys(bindings).length > 0 ? substitute(result1.ast, bindings) : result1.ast;
		let substituted2 =
			Object.keys(bindings).length > 0 ? substitute(result2.ast, bindings) : result2.ast;

		// Le plafond de calcul, membre par membre (`boundedComparison`) :
		// `2^{30000000}/2^{29999999} = 2` prenait 3,5 s, et
		// `(1+1/100000)^{100000}×(1+1/100000)^{-100000} = 1` plus de 300 s
		try {
			const bounded = boundedComparison(
				relation(
					'=',
					withFunctionsExpanded(substituted1, this.evalState.functions),
					withFunctionsExpanded(substituted2, this.evalState.functions)
				)
			);
			if (bounded !== null && isBoolean(bounded)) return this.createEqualityResult(bounded.value);
			if (bounded !== null && isRelation(bounded)) {
				substituted1 = bounded.left;
				substituted2 = bounded.right;
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Erreur lors de la comparaison';
			return {
				success: false,
				output: message,
				outputHtml: formatErrorHtml({ code: 'PARSE_ERROR', message }),
				error: { code: 'PARSE_ERROR', message }
			};
		}

		// Try numeric evaluation first if both sides can be fully evaluated
		try {
			const exactResult1 = evaluate(substituted1, {
				mode: 'exact',
				functions: this.evalState.functions
			});
			const exactResult2 = evaluate(substituted2, {
				mode: 'exact',
				functions: this.evalState.functions
			});

			// If both evaluate to numbers, compare them
			if (
				exactResult1.status === 'value' &&
				exactResult2.status === 'value' &&
				exactResult1.node.type === 'number' &&
				exactResult2.node.type === 'number'
			) {
				// Compare the values (handle both Rational and number)
				const val1 = this.getNumericValue(exactResult1.value);
				const val2 = this.getNumericValue(exactResult2.value);
				const isEqual = val1 === val2;
				return this.createEqualityResult(isEqual);
			}
		} catch {
			// Numeric evaluation failed, fall through to algebraic comparison
		}

		// Comparaison algébrique par la forme d'équivalence (ADR 0006) : `normalize`
		// seul ignore les identités lourdes (`sin²x + cos²x = 1` répondait `false`)
		try {
			const [form1, form2] = equivalenceForms(substituted1, substituted2);
			const isEquivalent = normalFormsEquivalent(form1, form2);

			return this.createEqualityResult(isEquivalent);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Erreur lors de la comparaison';
			return {
				success: false,
				output: message,
				outputHtml: formatErrorHtml({ code: 'PARSE_ERROR', message }),
				error: { code: 'PARSE_ERROR', message }
			};
		}
	}

	/**
	 * Create result for equality check.
	 */
	private createEqualityResult(isEqual: boolean): ReplExecutionResult {
		const resultStr = isEqual ? 'true' : 'false';
		const colorClass = isEqual ? 'text-green-400' : 'text-red-400';

		return {
			success: true,
			output: resultStr,
			outputHtml: `<span class="${colorClass} font-bold">${resultStr}</span>`
		};
	}

	/**
	 * Les options de lecture d'une saisie : l'état — ses fonctions liées se
	 * lisent comme des fonctions, quel que soit leur nom (`k(0)` restait `k(0)`,
	 * 2026-10-13). Le format est toujours détecté : la bascule du mode de saisie
	 * (`.latex` / `.custom` / `.auto` sans argument) servait `/cas`, retirée.
	 */
	private parseOptions(): PipelineOptions {
		return { evalState: this.evalState };
	}

	/**
	 * Parse and display a mathematical expression.
	 * If the expression contains variables and all are bound, auto-evaluates it.
	 */
	private executeExpression(input: string): ReplExecutionResult {
		const result = parse(input, this.parseOptions());

		// Display any errors
		if (result.errors.length > 0) {
			const error = result.errors[0];
			let outputHtml: string;

			if (error.position !== undefined) {
				outputHtml = formatInputErrorHtml(input, error.position, error.message);
			} else {
				outputHtml = formatErrorHtml(error);
			}

			return {
				success: false,
				output: error.message,
				outputHtml,
				error: {
					code: error.code,
					message: error.message,
					position: error.position
				}
			};
		}

		// Handle missing AST (shouldn't happen if no errors, but defensive)
		if (!result.ast) {
			const errorMsg = 'Failed to parse expression';
			return {
				success: false,
				output: errorMsg,
				outputHtml: formatErrorHtml({
					code: 'PARSE_ERROR',
					message: errorMsg
				}),
				error: {
					code: 'PARSE_ERROR',
					message: errorMsg
				}
			};
		}

		// Update last AST
		this.lastAst = result.ast;

		// Check if input is a single variable name that matches a defined function
		if (isVariable(result.ast)) {
			const funcDef = this.evalState.functions[result.ast.name];
			if (funcDef) {
				return this.createFunctionInfoResult(result.ast.name, funcDef);
			}
		}

		// Check if expression has variables and all are bound - auto-evaluate
		const bindings = bindingsToRecord(this.evalState.bindings);
		// `a_1` se nomme en entier, comme dans `getMissingBindings` (« variables: a_1 »)
		const variables = getVariables(hideIndexedNames(result.ast).node);

		// Auto-evaluate when:
		// 1. All variables are bound (if any), OR
		// 2. No variables and expression is evaluable (like sqrt(2))
		const canAutoEvaluate = variables.size === 0 || hasAllBindings(result.ast, bindings);

		if (canAutoEvaluate) {
			// Auto-evaluate since all variables are bound (or no variables)
			return this.createAutoEvaluationResult(result.ast);
		}

		// Expression has unbound variables - show simple output
		return this.createExpressionDisplayResult(result.ast, variables);
	}

	/**
	 * Create a simple display result for expressions with unbound variables.
	 */
	private createExpressionDisplayResult(
		ast: MathNode,
		unboundVars: Set<string>
	): ReplExecutionResult {
		const exprStr = toCustom(ast);
		const varList = [...unboundVars].sort().join(', ');

		const output = `${exprStr}  (variables: ${varList})`;
		const outputHtml = `<span class="text-cyan-400">${this.escapeHtml(exprStr)}</span> <span class="text-muted-foreground">(variables: ${this.escapeHtml(varList)})</span>`;

		return {
			success: true,
			output,
			outputHtml,
			ast
		};
	}

	/**
	 * Create auto-evaluation result for an expression with all variables bound.
	 * Computes both exact and decimal representations for toggle support.
	 */
	/** Une chaîne `a < b < c` : le premier maillon faux ou en erreur, sinon le dernier (vrai). */
	private chainResult(chain: RelationNode): ReplExecutionResult {
		const links: MathNode[] = [];
		let node: MathNode = chain;
		while (isRelation(node) && isRelation(node.left)) {
			links.unshift(relation(node.relation, node.left.right, node.right));
			node = node.left;
		}
		links.unshift(node);
		const results = links.map((link) => this.createAutoEvaluationResult(link));
		return results.find((result) => !result.success || result.output !== 'true') ?? results[0];
	}

	private createAutoEvaluationResult(ast: MathNode): ReplExecutionResult {
		try {
			const bindings = bindingsToRecord(this.evalState.bindings);
			const variables = getVariables(ast);

			// Substitute variables
			const substituted = substitute(ast, bindings);

			// Check if expression contains units
			const hasUnits = this.expressionHasUnits(substituted);

			// Une chaîne de grandeurs (`5[m] < 6[m] < 7[m]`) : maillon par maillon, chacun par le
			// chemin des grandeurs — en entier, le premier maillon (un booléen) était comparé à une
			// longueur (revue, 2026-10-12)
			if (hasUnits && isRelation(substituted) && isRelation(substituted.left)) {
				return this.chainResult(substituted);
			}

			if (hasUnits) {
				// Une grandeur : calculée par `tidy`, unité écrite d'abord (lot A)
				return this.quantityResult(
					computeQuantity(substituted, this.evalState.mode === 'decimal' ? 'decimal' : 'exact')
				);
			}

			// Un résultat exact trop long garde son écriture (option A de David,
			// 2026-10-12). Au-delà de 20 000 caractères PRÉVUS, rien n'est calculé : le
			// calcul figeait la page — 13 s pour les 80 003 caractères de
			// `(1+1/10000)^10000`, plus de 200 s pour n = 100 000
			// … prévu sur les fonctions de l'utilisateur DÉVELOPPÉES : `u(100000)` avec
			// `u(n) = (1+1/n)^n` (la suite de limite e) échappait au garde-fou (revue)
			const expanded = withFunctionsExpanded(substituted, this.evalState.functions);
			const tooLongToCompute = isTooLongToCompute(expanded);
			// … sauf un produit de puissances, calculé sur ses facteurs compensés
			// (`10^{60000}/10^{59990}` = 10¹⁰ ; le moteur, puissance par puissance, mettait
			// 305 s pour `(1+1/100000)^{100000}×(1+1/100000)^{-100000}` = 1)
			const byFactors = tooLongToCompute ? productValue(expanded) : null;
			const factorsNode = byFactors === null ? null : rationalToNode(byFactors);
			const notComputed =
				tooLongToCompute && factorsNode === null ? estimatedExactDigits(expanded) : null;
			// Le calcul exact, UNE fois : le test du booléen le refaisait en entier. Une
			// comparaison passe par le même plafond, membre par membre (`boundedComparison` :
			// `1.0001^{30000} > 20` prenait 16,7 s)
			const computed: EvalResult =
				factorsNode !== null
					? { status: 'value', value: factorsNode, node: factorsNode, exact: true }
					: notComputed === null
						? evaluate(boundedComparison(expanded) ?? substituted, {
								mode: 'exact',
								functions: this.evalState.functions
							})
						: { status: 'value', value: expanded, node: expanded, exact: true };
			// En deçà, la règle des 1 000 caractères se lit sur le résultat calculé : la
			// prévision ignorait une base irrationnelle (`\sqrt{2}^{100000}`, 15 052
			// caractères affichés) et les simplifications (`10^{600}×10^{-598}` = 100)
			const tooLong = notComputed ?? measuredTooLong(computed, expanded);
			const exactResult: EvalResult =
				tooLong === null || notComputed !== null
					? computed
					: { status: 'value', value: expanded, node: expanded, exact: true };

			// Boolean result: colored output, no exact/decimal toggle
			if (exactResult.status === 'value' && exactResult.node.type === 'boolean') {
				const boolValue = exactResult.value as boolean;
				const resultStr = String(boolValue);
				const colorClass = boolValue ? 'text-green-400' : 'text-red-400';
				let outputHtml = `<span class="${colorClass} font-bold">${resultStr}</span>`;

				// Add bindings info if variables were substituted
				if (variables.size > 0) {
					const bindingsList: string[] = [];
					for (const varName of variables) {
						const value = this.evalState.bindings.get(varName);
						if (value) {
							bindingsList.push(`${varName}=${toCustom(value)}`);
						}
					}
					const bindingsStr = bindingsList.join(', ');
					outputHtml += `<span class="text-muted-foreground text-xs ml-2">[${this.escapeHtml(bindingsStr)}]</span>`;
				}

				return {
					success: true,
					output: resultStr,
					outputHtml,
					ast: exactResult.node
				};
			}

			// Evaluate in BOTH modes to enable toggle
			// Pass user-defined functions from evalState
			const decimalResult = evaluate(substituted, {
				mode: 'decimal',
				functions: this.evalState.functions
			});
			this.lastQuantity = null; // Un nombre : plus de grandeur à convertir
			this.lastWritten = undefined;

			// Non-value result (indeterminate / unevaluable): surface via the catch
			if (exactResult.status !== 'value') {
				throw new Error(
					exactResult.status === 'indeterminate'
						? `Indeterminate form: ${exactResult.form}`
						: exactResult.reason
				);
			}
			// Format exact result — mis au propre comme à l'écran : `\pi/3`, pas la
			// forme de calcul `{1/3}\pi` d'`evaluate`
			const exactStr = toCustom(
				tooLong === null ? readableExact(exactResult.node) : typedWriting(expanded)
			);
			const exactOutput = exactStr;
			const exactOutputHtml = `<span class="text-cyan-400">${this.escapeHtml(exactStr)}</span>`;

			// Format decimal result — la règle du bouton ≈ (décision Q3 de David) :
			// 4 décimales, `≈` seulement si c'est arrondi (avant : 15 chiffres, `≈ 3`) ;
			// hors de [10⁻⁶ ; 10⁹[, la notation scientifique, lue sur la fraction exacte
			// (décisions a, b, c, 2026-10-12 — avant : le flottant du moteur, `e+30`, et
			// 2⁶⁴ écrit `18446744073709552000`, chiffres faux, sans ≈).
			// Le calcul décimal du moteur ne sert plus qu'à une valeur sans écriture
			// décimale (non réelle) et à « Garder » : au-delà du plafond des puissances
			// exactes, il refuse honnêtement, et la valeur se lit sur le résultat exact
			// … lue sur le résultat CALCULÉ, même gardé : `\sqrt{2}^{100000}` n'a pas de valeur
			// approchée tapé tel quel (√2 y entre par son flottant, dont la puissance déborde)
			const digits = approximateDigitsOf(
				computed.status === 'value' ? computed.node : exactResult.node
			);
			const currentMode = this.evalState.mode;
			let decimal: { readonly str: string; readonly exact: boolean } | null = null;
			if (digits !== null) {
				decimal = { str: approximationText(digits), exact: digits.exact };
			} else if (decimalResult.status === 'value') {
				decimal = {
					str: toCustom(decimalResult.node),
					exact: decimalResult.exact || isWrittenNumber(exactResult.node)
				};
			} else if (currentMode === 'decimal' || tooLong !== null) {
				// Une écriture gardée sans aucune valeur est une erreur (`(1/0)^{2000}`), pas un
				// résultat (revue)
				throw new Error(
					decimalResult.status === 'indeterminate'
						? `Indeterminate form: ${decimalResult.form}`
						: decimalResult.reason
				);
			}
			// Sans écriture décimale, le mode exact montre quand même son résultat (revue :
			// `e^{-5000}+1` échouait en mode exact parce que le calcul décimal refusait)
			const decimalOutput =
				decimal === null ? undefined : `${decimal.exact ? '' : '≈ '}${decimal.str}`;
			const decimalOutputHtml =
				decimal === null
					? undefined
					: decimal.exact
						? `<span class="text-cyan-400">${this.escapeHtml(decimal.str)}</span>`
						: `<span class="text-muted-foreground">≈</span> <span class="text-cyan-400">${this.escapeHtml(decimal.str)}</span>`;

			// Determine if toggle makes sense (results are different)
			const canToggle = decimal !== null && exactStr !== decimal.str;

			// Use current mode to determine primary output (le mode décimal a une
			// écriture décimale : sinon il a levé plus haut)
			const output =
				currentMode === 'exact' || decimalOutput === undefined ? exactOutput : decimalOutput;
			let outputHtml =
				currentMode === 'exact' || decimalOutputHtml === undefined
					? exactOutputHtml
					: decimalOutputHtml;

			// Add bindings info if variables were substituted
			if (variables.size > 0) {
				const bindingsList: string[] = [];
				for (const varName of variables) {
					const value = this.evalState.bindings.get(varName);
					if (value) {
						bindingsList.push(`${varName}=${toCustom(value)}`);
					}
				}
				const bindingsStr = bindingsList.join(', ');
				outputHtml += `<span class="text-muted-foreground text-xs ml-2">[${this.escapeHtml(bindingsStr)}]</span>`;
			}

			return {
				success: true,
				output,
				outputHtml,
				// En mode décimal, l'arbre affiché porte la valeur arrondie ; « Garder »
				// range la valeur pleine précision (`quantityAst`)
				ast:
					currentMode === 'exact'
						? exactResult.node
						: digits === null
							? decimalResult.status === 'value'
								? decimalResult.node
								: exactResult.node
							: approximationNode(digits),
				...(currentMode === 'decimal' &&
					digits !== null && { quantityAst: keptValue(decimalResult, digits, exactResult.node) }),
				...approximationFields(currentMode, exactResult.node, canToggle, digits, tooLong !== null),
				...(tooLong !== null && { exactTooLong: Math.round(tooLong) })
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error during evaluation';
			return {
				success: false,
				output: `Erreur de calcul : ${message}`,
				outputHtml: formatErrorHtml({
					code: 'PARSE_ERROR',
					message: `Erreur de calcul : ${message}`
				}),
				error: {
					code: 'PARSE_ERROR',
					message
				}
			};
		}
	}

	/** `.convert` : la dernière grandeur exprimée dans une autre unité, exactement. */
	private executeConvertCommand(targetUnitStr: string): ReplExecutionResult {
		const mode = this.evalState.mode === 'decimal' ? 'decimal' : 'exact';
		return this.quantityResult(
			convertQuantity(this.lastQuantity, targetUnitStr, mode, this.lastWritten)
		);
	}

	/** La réponse de la console pour un calcul ou une conversion de grandeurs. */
	private quantityResult(outcome: QuantityOutcome): ReplExecutionResult {
		if (outcome.ok === false) {
			return {
				success: false,
				output: outcome.message,
				outputHtml: formatErrorHtml({ code: 'QUANTITY_ERROR', message: outcome.message }),
				error: { code: 'QUANTITY_ERROR', message: outcome.message }
			};
		}
		// Les unités se sont simplifiées : un calcul de nombres comme un autre
		if (outcome.ok === 'plain') {
			this.lastQuantity = null;
			this.lastWritten = undefined;
			return this.createAutoEvaluationResult(outcome.node);
		}
		this.lastQuantity = outcome.quantity;
		this.lastWritten = outcome.written;
		const html = (text: string) => `<span class="text-cyan-400">${this.escapeHtml(text)}</span>`;
		const approximate =
			outcome.approximate === null
				? undefined
				: displayUnitsInLatex(
						outcome.approximate.type === 'relation'
							? toLatex(outcome.approximate)
							: `\\approx ${toLatex(outcome.approximate)}`
					);
		return {
			success: true,
			output: outcome.answer.text,
			outputHtml: html(outcome.answer.text),
			ast: outcome.answer.node,
			...(outcome.quantity !== null &&
				outcome.quantity !== outcome.answer.node && { quantityAst: outcome.quantity }),
			// Le bouton ≈ de l'atelier (#1086), écrit pour l'affichage
			...(approximate !== undefined && { approximateLatex: approximate })
		};
	}

	// ===========================================================================
	// Unit-Aware Evaluation Helpers
	// ===========================================================================

	/**
	 * Check if an expression contains any unit nodes.
	 */
	private expressionHasUnits(node: MathNode): boolean {
		if (isUnit(node)) {
			return true;
		}

		// Check children based on node type
		switch (node.type) {
			case 'addition':
			case 'subtraction':
			case 'multiplication':
				return this.expressionHasUnits(node.left) || this.expressionHasUnits(node.right);
			case 'division':
				return this.expressionHasUnits(node.numerator) || this.expressionHasUnits(node.denominator);
			case 'superscript':
				return this.expressionHasUnits(node.base) || this.expressionHasUnits(node.superscript);
			case 'subscript':
				return this.expressionHasUnits(node.base) || this.expressionHasUnits(node.subscript);
			case 'opposite':
			case 'positive':
				return this.expressionHasUnits(node.operand);
			case 'delimiter':
				return this.expressionHasUnits(node.content);
			case 'function':
				return node.args.some((arg) => this.expressionHasUnits(arg));
			case 'relation':
				return this.expressionHasUnits(node.left) || this.expressionHasUnits(node.right);
			case 'composition':
				return this.expressionHasUnits(node.outer) || this.expressionHasUnits(node.inner);
			default:
				return false;
		}
	}

	/**
	 * Create display result for a function lookup.
	 * When user types just a function name, show its definition.
	 */
	private createFunctionInfoResult(
		funcName: string,
		funcDef: {
			parameters: readonly string[];
			expression: MathNode;
			derivative?: MathNode;
			inverse?: MathNode;
		}
	): ReplExecutionResult {
		const paramsStr = funcDef.parameters.join(', ');
		const bodyStr = toCustom(funcDef.expression);
		const signature = `${funcName}(${paramsStr})`;

		// Build output lines
		const lines: string[] = [`Fonction: ${signature} = ${bodyStr}`];

		if (funcDef.derivative) {
			const derivStr = toCustom(funcDef.derivative);
			lines.push(`Derivee: ${funcName}'(${paramsStr}) = ${derivStr}`);
		}

		if (funcDef.inverse) {
			const invStr = toCustom(funcDef.inverse);
			lines.push(`Inverse: ${funcName}^{-1}(${paramsStr}) = ${invStr}`);
		}

		const output = lines.join('\n');

		// Build HTML output
		const htmlLines: string[] = [
			`<span class="text-muted-foreground">Fonction:</span> <strong>${this.escapeHtml(signature)}</strong> = <span class="text-cyan-400">${this.escapeHtml(bodyStr)}</span>`
		];

		if (funcDef.derivative) {
			const derivStr = toCustom(funcDef.derivative);
			htmlLines.push(
				`<span class="text-muted-foreground">Derivee:</span> ${this.escapeHtml(funcName)}'(${this.escapeHtml(paramsStr)}) = <span class="text-cyan-400">${this.escapeHtml(derivStr)}</span>`
			);
		}

		if (funcDef.inverse) {
			const invStr = toCustom(funcDef.inverse);
			htmlLines.push(
				`<span class="text-muted-foreground">Inverse:</span> ${this.escapeHtml(funcName)}⁻¹(${this.escapeHtml(paramsStr)}) = <span class="text-cyan-400">${this.escapeHtml(invStr)}</span>`
			);
		}

		const outputHtml = htmlLines.join('<br>');

		return {
			success: true,
			output,
			outputHtml,
			ast: funcDef.expression
		};
	}

	// ===========================================================================
	// Helper Methods
	// ===========================================================================

	/**
	 * Type guard for complex value.
	 */
	private isComplexValue(value: EvalValue): value is ComplexValueResult {
		return typeof value === 'object' && 'real' in value && 'imag' in value;
	}

	/**
	 * Type guard for MathNode value.
	 */
	private isMathNodeValue(value: EvalValue): value is MathNode {
		return typeof value === 'object' && 'type' in value;
	}

	/**
	 * Extract numeric value from MathNode, number, or ComplexValueResult.
	 * Throws if value is complex with non-zero imaginary part.
	 */
	private getNumericValue(value: EvalValue): number {
		if (typeof value === 'number') return value;
		if (typeof value === 'boolean') {
			throw new Error('Cannot convert boolean to number');
		}
		if (this.isComplexValue(value)) {
			if (value.imag !== 0) {
				throw new Error('Cannot convert complex number to real number');
			}
			return value.real;
		}
		// MathNode - evaluate to number
		return evaluateNodeToApproximatedNumber(value);
	}

	/**
	 * Type guard to check if an object is error-like (has code and/or message).
	 */
	private isErrorLike(e: unknown): e is { code?: string; message?: string } {
		return typeof e === 'object' && e !== null;
	}

	/**
	 * Strip ANSI escape codes from text.
	 * Handles color codes, styling codes, and cursor movement codes.
	 */
	private stripAnsi(text: string): string {
		// eslint-disable-next-line no-control-regex
		return text.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
	}

	/**
	 * Escape HTML special characters to prevent XSS.
	 */
	private escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;')
			.replace(/`/g, '&#96;');
	}

	/**
	 * Convert CommandResult to ReplExecutionResult.
	 *
	 * Adapts the CLI command result format to the web REPL format,
	 * adding HTML formatting and preserving AST.
	 */
	private commandResultToReplResult(
		cmdResult: {
			output: string;
			success: boolean;
			error?: unknown;
			ast?: MathNode;
			latex?: string;
			outputHtml?: string;
			approximateLatex?: string;
		},
		ast?: MathNode
	): ReplExecutionResult {
		if (!cmdResult.success && cmdResult.error) {
			// Use type guard instead of assertion
			const errorObj = this.isErrorLike(cmdResult.error) ? cmdResult.error : null;
			const errorCode = (errorObj?.code as string) || 'UNKNOWN_ERROR';
			const errorMessage = errorObj?.message || cmdResult.output;

			return {
				success: false,
				output: cmdResult.output,
				outputHtml: formatErrorHtml({ code: errorCode as ErrorCode, message: errorMessage }),
				error: {
					code: errorCode,
					message: errorMessage
				}
			};
		}

		// Use provided HTML output if available (e.g., from help command)
		if (cmdResult.outputHtml) {
			return {
				success: true,
				output: cmdResult.output,
				outputHtml: cmdResult.outputHtml,
				ast: cmdResult.ast || ast,
				...(cmdResult.latex !== undefined && { latex: cmdResult.latex }),
				...(cmdResult.approximateLatex !== undefined && {
					approximateLatex: cmdResult.approximateLatex
				})
			};
		}

		// Strip ANSI codes from command output (chalk colors from CLI commands)
		const cleanOutput = this.stripAnsi(cmdResult.output);

		// For successful commands, check if output looks like a tree (has box-drawing chars)
		let outputHtml: string;
		if (cleanOutput.includes('├') || cleanOutput.includes('└')) {
			outputHtml = formatTreeHtml(cleanOutput);
		} else {
			// Escape HTML and preserve line breaks
			const lines = cleanOutput.split('\n');
			outputHtml = lines.map((line) => this.escapeHtml(line)).join('<br>');
		}

		return {
			success: true,
			output: cmdResult.output,
			outputHtml,
			ast: cmdResult.ast || ast,
			...(cmdResult.latex !== undefined && { latex: cmdResult.latex }),
			...(cmdResult.approximateLatex !== undefined && {
				approximateLatex: cmdResult.approximateLatex
			})
		};
	}

	// ===========================================================================
	// Statistical Commands
	// ===========================================================================

	/**
	 * Execute the .stats command.
	 *
	 * Usage: .stats 1, 2, 3, 4, 5
	 * Returns: mean, median, stdev, variance, min, max
	 */
	private executeStatsCommand(args: string): ReplExecutionResult {
		if (!args.trim()) {
			return {
				success: false,
				output: 'Usage : .stats 12 ; 15 ; 9 (valeurs : effectifs → .stats 1 ; 2 : 5 ; 8)',
				outputHtml: formatErrorHtml({
					code: 'INVALID_OPTIONS',
					message: 'Usage : .stats 12 ; 15 ; 9',
					suggestion: 'Des effectifs après « : » : .stats 1 ; 2 : 5 ; 8'
				}),
				error: {
					code: 'INVALID_OPTIONS',
					message: 'No data provided'
				}
			};
		}

		// Values, then optionally counts after « : » (`.stats 1 ; 2 ; 3 : 5 ; 8 ; 4`)
		const parts = args.split(':');
		if (parts.length > 2)
			return this.statsFailure('Un seul « : », entre les valeurs et les effectifs');
		// One convention for the whole argument: a « ; » anywhere makes every comma decimal
		const decimalComma = args.includes(';');
		const maybe = parts.map((part) => parseStatsNumbers(part, decimalComma));
		if (maybe.some((numbers) => numbers === null)) {
			return {
				success: false,
				output:
					'Erreur: certaines valeurs ne sont pas des nombres valides (séparer par « ; » : .stats 12 ; 15 ; 9)',
				outputHtml: formatErrorHtml({
					code: 'PARSE_ERROR',
					message: 'Certaines valeurs ne sont pas des nombres valides',
					suggestion: 'Séparer les valeurs par « ; » : .stats 12 ; 15 ; 9'
				}),
				error: { code: 'PARSE_ERROR', message: 'Invalid numbers in input' }
			};
		}
		const parsed = maybe as number[][];

		// SECURITY: Limit number of values to prevent DoS
		const MAX_STATS_VALUES = 1000;
		if (parsed.some((numbers) => numbers.length > MAX_STATS_VALUES)) {
			return {
				success: false,
				output: `Erreur: trop de valeurs (max: ${MAX_STATS_VALUES})`,
				outputHtml: formatErrorHtml({
					code: 'INVALID_OPTIONS',
					message: `Limite de ${MAX_STATS_VALUES} valeurs depassee`,
					suggestion: 'Reduisez le nombre de valeurs'
				}),
				error: {
					code: 'INVALID_OPTIONS',
					message: `Too many values (max: ${MAX_STATS_VALUES})`
				}
			};
		}

		// `!Number.isFinite`, not `isNaN`: `parseFloat('Infinity')` is not NaN.
		if (!parsed.every((numbers) => numbers.every(Number.isFinite))) {
			return {
				success: false,
				output: 'Erreur: certaines valeurs ne sont pas des nombres valides',
				outputHtml: formatErrorHtml({
					code: 'PARSE_ERROR',
					message: 'Certaines valeurs ne sont pas des nombres valides'
				}),
				error: {
					code: 'PARSE_ERROR',
					message: 'Invalid numbers in input'
				}
			};
		}

		const [values, counts] = parsed;
		if (values.length === 0) {
			return {
				success: false,
				output: 'Erreur: aucune valeur fournie',
				outputHtml: formatErrorHtml({
					code: 'INVALID_OPTIONS',
					message: 'Aucune valeur fournie'
				}),
				error: {
					code: 'INVALID_OPTIONS',
					message: 'No values provided'
				}
			};
		}

		// ⚠️ Computed AND worded by `src/lib/statistics/` — the single source shared
		// with the atelier and the ubumark blocks (French labels, Q38). Population
		// variance (divided by `n`), decided by David on 2026-09-16.
		const summarized =
			counts === undefined
				? summarizeList(values)
				: (() => {
						const table = summarizeTable(values, counts);
						return table === null || !table.ok
							? table
							: { ok: true as const, value: table.value.summary };
					})();
		if (summarized === null || !summarized.ok) {
			return this.statsFailure(
				summarized?.ok === false ? summarized.message : 'Aucune valeur fournie'
			);
		}

		const lines = formatSummary(summarized.value, 'fr');
		return {
			success: true,
			output: lines.join('\n'),
			outputHtml: lines.map((line) => this.escapeHtml(line)).join('<br>')
		};
	}

	/** A `.stats` refusal worded by the statistics module. */
	private statsFailure(message: string): ReplExecutionResult {
		return {
			success: false,
			output: `Erreur: ${message}`,
			outputHtml: formatErrorHtml({ code: 'INVALID_OPTIONS', message }),
			error: { code: 'INVALID_OPTIONS', message }
		};
	}

	/**
	 * Execute the .linreg / .ajustement command (least squares line).
	 *
	 * Usage: .ajustement x1 ; x2 ; x3 : y1 ; y2 ; y3 [; z = ln(y)] [en x = 10] [en y = 7]
	 * Returns: the line, a and b, the mean point G and r — then the predictions,
	 * and with a change of variable the line in z (or t) and the relation
	 * between x and y. ⚠️ Computed AND worded like the ```nuage block (manche 15,
	 * PR c): exact fractions (`statistics/bivariate`), decimals for a change of
	 * variable (`statistics/variable-change`), texts from `ubumark/utils/scatter-lines`.
	 */
	private executeLinregCommand(args: string): ReplExecutionResult {
		const usage = 'Usage: .ajustement x1 ; x2 ; x3 : y1 ; y2 ; y3 [en x = 10]';
		if (!args.includes(':')) {
			return {
				success: false,
				output: usage,
				outputHtml: formatErrorHtml({
					code: 'INVALID_OPTIONS',
					message: usage,
					suggestion:
						'Separez les valeurs X et Y par deux-points (:), les valeurs par « ; », puis la prévision : .ajustement 1 ; 2 ; 3 : 2 ; 4 ; 7 en x = 5'
				}),
				error: {
					code: 'INVALID_OPTIONS',
					message: 'Invalid syntax'
				}
			};
		}
		const read = readLinregArguments(args);
		if (!read.ok) return this.statsFailure(read.message);
		const { xRaw, yRaw, options } = read;

		// SECURITY: Limit number of values to prevent DoS — the block's limit (Q167):
		// exact fractions, 1000 points took ≈ 3 s, synchronously (review)
		const MAX_LINREG_VALUES = STAT_CHART_LIMITS.scatterPoints.max;
		if (xRaw.length > MAX_LINREG_VALUES || yRaw.length > MAX_LINREG_VALUES) {
			return {
				success: false,
				output: `Erreur: trop de valeurs (max: ${MAX_LINREG_VALUES})`,
				outputHtml: formatErrorHtml({
					code: 'INVALID_OPTIONS',
					message: `Limite de ${MAX_LINREG_VALUES} valeurs depassee`,
					suggestion: 'Reduisez le nombre de valeurs'
				}),
				error: {
					code: 'INVALID_OPTIONS',
					message: `Too many values (max: ${MAX_LINREG_VALUES})`
				}
			};
		}

		// Exact values, read like the block (`readExactValue`): `Infinity`, `3abc`,
		// 16 digits or more are refused instead of being half read by `parseFloat`
		const unreadable = [...xRaw, ...yRaw].find((text) => readExactValue(text) === null);
		if (unreadable !== undefined) {
			const reason = invalidValueReason(unreadable);
			return {
				success: false,
				output: `Erreur: certaines valeurs ne sont pas des nombres valides (${reason})`,
				outputHtml: formatErrorHtml({
					code: 'PARSE_ERROR',
					message: 'Certaines valeurs ne sont pas des nombres valides',
					suggestion: reason
				}),
				error: {
					code: 'PARSE_ERROR',
					message: 'Invalid numbers'
				}
			};
		}

		if (xRaw.length !== yRaw.length) {
			return {
				success: false,
				output: `Erreur: nombre de valeurs X (${xRaw.length}) different de Y (${yRaw.length})`,
				outputHtml: formatErrorHtml({
					code: 'INVALID_OPTIONS',
					message: `Nombre de valeurs X (${xRaw.length}) different de Y (${yRaw.length})`
				}),
				error: {
					code: 'INVALID_OPTIONS',
					message: 'X and Y must have same length'
				}
			};
		}

		if (xRaw.length < 2) {
			return {
				success: false,
				output: 'Erreur: au moins 2 points sont necessaires',
				outputHtml: formatErrorHtml({
					code: 'INVALID_OPTIONS',
					message: 'Au moins 2 points sont necessaires pour une regression'
				}),
				error: {
					code: 'INVALID_OPTIONS',
					message: 'Need at least 2 points'
				}
			};
		}

		// Options after « ; »: predictions (`x = 10`, `y = 7`), one change of variable
		const predictions: ScatterPrediction[] = [];
		let change: VariableChange | null = null;
		const MAX_PREDICTIONS = STAT_CHART_LIMITS.scatterPredictions;
		for (const option of options) {
			const prediction = /^([xy])\s*=\s*(.+)$/i.exec(option);
			if (prediction !== null) {
				const value = prediction[2].trim();
				if (readExactValue(value) === null) return this.statsFailure(invalidValueReason(value));
				predictions.push({ axis: prediction[1].toLowerCase() as 'x' | 'y', value });
				if (predictions.length > MAX_PREDICTIONS) {
					return this.statsFailure(`Au plus ${MAX_PREDICTIONS} prévisions`);
				}
				continue;
			}
			const found = readVariableChange(option);
			if (found === null || change !== null) {
				return this.statsFailure(
					found === null
						? `« ${option} » : écrire x = 10, y = 7 ou une des formes ${VARIABLE_CHANGE_LIST}`
						: 'Un seul changement de variable à la fois'
				);
			}
			change = found;
		}
		if (change !== null) {
			const problem = changeDomainProblem(change, change.on === 'x' ? xRaw : yRaw);
			if (problem !== null) return this.statsFailure(problem);
		}

		const xs = xRaw.map((text) => readExactValue(text)!);
		const ys = yRaw.map((text) => readExactValue(text)!);
		const fitted =
			change === null
				? this.exactLinregLines(xs, ys, predictions)
				: this.changedLinregLines(xs, ys, change, predictions);
		if (fitted === null) {
			// Fewer than 2 points was rejected above: only constant X remains — t is
			// constant only if X is, the eight functions are one-to-one on their domain.
			return {
				success: false,
				output: 'Erreur: les valeurs X sont toutes identiques (regression impossible)',
				outputHtml: formatErrorHtml({
					code: 'MATH_ERROR',
					message: 'Les valeurs X sont toutes identiques'
				}),
				error: {
					code: 'MATH_ERROR',
					message: 'X values are constant'
				}
			};
		}

		// French wording (Q38): « ajustement affine », decimal comma. The LaTeX of
		// the equation (`latex` below) keeps the dot, it is rendered, not read.
		const header =
			change === null
				? `Ajustement affine (n = ${xs.length}) :`
				: `Ajustement affine (n = ${xs.length}), changement de variable ${changeText(change)} :`;
		const lines = [header, ...fitted.lines.map((line) => `  ${line}`)];

		return {
			success: true,
			output: lines.join('\n'),
			outputHtml: lines.map((line) => this.escapeHtml(line.trim())).join('<br>'),
			latex: fitted.latex
		};
	}

	/** `.ajustement` without change of variable: exact line, G, r, predictions. */
	private exactLinregLines(
		xs: Fraction[],
		ys: Fraction[],
		predictions: readonly ScatterPrediction[]
	): { lines: string[]; latex: string } | null {
		const fit = bivariateFit(xs, ys);
		if (fit === null) return null;
		const text = STAT_TEXT.fr.scatter;
		const round = (value: Fraction) => scatterNumber(value, LINREG_PLACES, 'fr');
		const lines = [
			scatterEquation(fit, LINREG_PLACES, 'fr'),
			`Coefficient directeur a ${related(round(fit.slope))}`,
			`Ordonnée à l’origine b ${related(round(fit.intercept))}`,
			text.meanLine(text.meanPoint(round(fit.meanX).text, round(fit.meanY).text))
		];
		// r n'existe pas si les ordonnées sont toutes égales
		if (fit.correlation !== null) {
			lines.push(text.correlation(exactCorrelationText(fit.correlation, LINREG_PLACES, 'fr')));
		}
		lines.push(...exactPredictionLines(fit, predictions, LINREG_PLACES, 'fr').lines);
		return { lines, latex: linregLatex('y', 'x', fit.slope, fit.intercept) };
	}

	/** `.ajustement` with a change of variable: line in z (or t), relation, predictions. */
	private changedLinregLines(
		xValues: Fraction[],
		yValues: Fraction[],
		change: VariableChange,
		predictions: readonly ScatterPrediction[]
	): { lines: string[]; latex: string } | null {
		const xs = xValues.map(toSafeNumber);
		const ys = yValues.map(toSafeNumber);
		// The domain was checked above
		const transform = (v: number) => transformValue(change.fn, v)!;
		const us = change.on === 'x' ? xs.map(transform) : xs;
		const vs = change.on === 'y' ? ys.map(transform) : ys;
		const decimal = decimalFit(us, vs);
		if (decimal === null) return null;
		// Interpolation: range of the ORIGINAL x
		const fit = { ...decimal, minX: Math.min(...xs), maxX: Math.max(...xs) };
		const squared = squaredSign(change.on === 'x' ? xs : ys);
		const sign = 'sign' in squared ? squared.sign : 1;

		const text = STAT_TEXT.fr.scatter;
		const round = (value: number) => scatterDecimal(value, LINREG_PLACES, 'fr');
		const { lineEquation, relationText } = changedEquations(change, fit, sign, LINREG_PLACES, 'fr');
		const pair = change.on === 'y' ? 'x ; z' : 't ; y';
		const lines = [
			lineEquation,
			`Coefficient directeur a ${related(round(fit.slope))}`,
			`Ordonnée à l’origine b ${related(round(fit.intercept))}`,
			text.relationLine(relationText),
			text.meanLineOf(pair, text.meanPoint(round(fit.meanX).text, round(fit.meanY).text))
		];
		if (fit.correlation !== null) {
			lines.push(text.correlation(decimalCorrelationText(fit.correlation, LINREG_PLACES, 'fr')));
		}
		lines.push(
			...changedPredictionLines(change, fit, sign, predictions, LINREG_PLACES, 'fr').lines
		);
		const left = change.on === 'y' ? change.variable : 'y';
		const term = change.on === 'x' ? change.variable : 'x';
		return {
			lines,
			latex: linregLatex(left, term, shortestDecimal(fit.slope), shortestDecimal(fit.intercept))
		};
	}
}

/**
 * Numbers of one side of a `.stats` argument, or null if a token is not a plain
 * number. With `decimalComma` (a `;` somewhere in the argument) the comma is
 * DECIMAL — the atelier's convention, `12,5 ; 3`; otherwise the legacy
 * comma-separated form (`12,15,9`).
 *
 * ⚠️ Strict on purpose: `parseFloat` read `1.2,3` as 1.2, `3abc` as 3, and
 * `12 15 9` as 12 — wrong statistics, displayed as a success.
 */
function parseStatsNumbers(part: string, decimalComma: boolean): number[] | null {
	const tokens = (decimalComma ? part.split(';') : part.split(','))
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
	const plain = decimalComma ? /^-?\d+(?:[.,]\d+)?$/ : /^-?\d+(?:\.\d+)?$/;
	if (!tokens.every((token) => plain.test(token))) return null;
	return tokens.map((token) => Number(token.replace(',', '.')));
}

/** A coefficient of `.ajustement` for its LaTeX: rounded once, dot, ASCII minus. */
function linregLatexNumber(value: Fraction): string {
	const { digits, exact } = roundFraction(value, LINREG_PLACES);
	return exact && digits.includes('.') ? digits.replace(/\.?0+$/, '') : digits;
}

/**
 * LaTeX of the fitted line, `y = 0.9x + 0.3`, `z = 0.401x + 0.723` — the form
 * `.linreg` always gave (`y = 2x + 0` included), coefficients now rounded to
 * the thousandth like the text.
 */
function linregLatex(left: string, term: string, slope: Fraction, intercept: Fraction): string {
	const b = linregLatexNumber(intercept);
	const sign = b.startsWith('-') ? '-' : '+';
	return `${left} = ${linregLatexNumber(slope)}${term} ${sign} ${b.replace(/^-/, '')}`;
}

/**
 * Lire l'argument de `.ajustement` (décision de David, 2026-10-08) :
 * `X1 ; X2 … : Y1 ; Y2 … en x = 8` — la virgule est DÉCIMALE, les valeurs se
 * séparent par « ; », les prévisions suivent `en` (ou `pour`), un changement
 * de variable (`z = ln(y)`) se range parmi les « ; » de Y.
 *
 * L'ancienne écriture (`1,2,3 : 4,5,6 ; x = 8`) reste acceptée tant qu'aucune
 * valeur n'est décimale : sinon on ne devine pas, on propose la nouvelle.
 */
function readLinregArguments(
	args: string
):
	{ ok: true; xRaw: string[]; yRaw: string[]; options: string[] } | { ok: false; message: string } {
	const colon = args.indexOf(':');
	const xPart = args.slice(0, colon).trim();
	const rest = args.slice(colon + 1);
	const items = (text: string) =>
		text
			.split(';')
			.map((item) => item.trim())
			.filter((item) => item.length > 0);

	// Ancienne écriture : des virgules entre les X, aucun point-virgule
	if (!xPart.includes(';') && xPart.includes(',')) {
		const [yPart, ...optionTexts] = rest.split(';').map((item) => item.trim());
		const split = (text: string) =>
			text
				.split(',')
				.map((item) => item.trim())
				.filter((item) => item.length > 0);
		const xRaw = split(xPart);
		const yRaw = split(yPart);
		if ([...xRaw, ...yRaw].some((value) => /[.]/.test(value))) {
			const options = optionTexts.filter((option) => option.length > 0);
			const prediction = options.find((option) => /^[xy]\s*=/i.test(option));
			const others = options.filter((option) => option !== prediction);
			const written = (values: string[]) => values.map((v) => v.replace('.', ',')).join(' ; ');
			const proposal =
				`.ajustement ${written(xRaw)} : ${written(yRaw)}` +
				others.map((option) => ` ; ${option}`).join('') +
				(prediction === undefined ? '' : ` en ${prediction}`);
			return {
				ok: false,
				message: `La virgule est décimale : sépare les valeurs par « ; ». ${proposal}`
			};
		}
		return { ok: true, xRaw, yRaw, options: optionTexts.filter((option) => option.length > 0) };
	}

	// Nouvelle écriture : les prévisions après le premier `en` / `pour`
	const keyword = /\s(?:en|pour)\s/i.exec(` ${rest} `);
	const data = keyword === null ? rest : ` ${rest} `.slice(0, keyword.index);
	const predictions =
		keyword === null
			? []
			: ` ${rest} `
					.slice(keyword.index)
					.split(/;|\s(?:en|pour)\s/i)
					.map((item) => item.trim())
					.filter((item) => item.length > 0);
	const yItems = items(data);
	// `z = ln(y)` parmi les Y : un changement de variable, pas une valeur
	const yRaw = yItems.filter((item) => !item.includes('='));
	const options = [...yItems.filter((item) => item.includes('=')), ...predictions];
	return { ok: true, xRaw: items(xPart), yRaw, options };
}

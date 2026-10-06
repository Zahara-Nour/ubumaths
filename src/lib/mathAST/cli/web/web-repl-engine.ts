/**
 * Web REPL Engine
 *
 * Browser-compatible REPL execution engine. Reuses the CLI command registry
 * and parsing pipeline but adapts output for HTML display.
 */

import type { MathNode } from '../../types';
import type { CommandContext, ErrorCode } from '../types';
import { CommandRegistry, parse, createEvalState, bindingsToRecord, setBinding } from '../core';
import { getFunctionNames, getFunction } from '../core/eval-state';
import type { EvalState } from '../core';
import { createDefaultRegistry } from '../commands';
import type {
	ReplExecutionResult,
	ReplInputMode,
	WebFunctionInfo,
	ReplHistoryEntry
} from './types';
import {
	formatErrorHtml,
	formatInputErrorHtml,
	escapeWithLabel,
	formatTreeHtml
} from './output-formatter-web';
import { toCustom, getVariables, hasAllBindings, evaluate, substitute, toLatex } from '../../index';
import { evaluateNodeToApproximatedNumber } from '../../eval/evaluate';
import { normalize, normalFormsEquivalent } from '../../normal';
import { evaluateWithUnits, DimensionalEvaluationError } from '../../eval/evaluate-with-units';
import type {
	EvalResultWithUnit,
	UnitConversionMode,
	EvalValue,
	ComplexValueResult
} from '../../eval/types';
import { isUnit, isVariable } from '../../guards';
import { parse as parseUnit } from '../../units/parser';
import { getConversionFactor } from '../../units/conversion';
import { summarizeList, summarizeTable } from '../../../statistics/describe';
import { formatSummary } from '../../../statistics/format';
import {
	bivariateFit,
	invalidValueReason,
	readExactValue,
	roundFraction,
	toSafeNumber
} from '../../../statistics/bivariate';
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

// =============================================================================
// Constants
// =============================================================================

/** `.ajustement` rounds to the thousandth, like a ```nuage block by default (Q173) */
const LINREG_PLACES = 3;

// =============================================================================
// Web REPL Engine
// =============================================================================

/**
 * Browser-safe REPL execution engine.
 *
 * Handles:
 * - Dot-commands (e.g., .help, .tree, .simplify)
 * - Expression parsing and display
 * - Equivalence checking (expr1 === expr2)
 * - Input mode switching (latex/custom/auto)
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
 *
 * // Change input mode
 * engine.setInputMode('latex');
 * ```
 */
export class WebReplEngine {
	private registry: CommandRegistry;
	private inputMode: ReplInputMode = 'auto';
	private lastAst: MathNode | undefined;
	private evalState: EvalState;
	private unitConversionMode: UnitConversionMode = 'first';
	private lastUnitResult: EvalResultWithUnit | undefined;
	private historyRef: ReadonlyArray<ReplHistoryEntry> = [];

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
	 * Set the input mode for expression parsing.
	 *
	 * @param mode - The input mode to use
	 */
	setInputMode(mode: ReplInputMode): void {
		this.inputMode = mode;
	}

	/**
	 * Get the current input mode.
	 *
	 * @returns Current input mode
	 */
	getInputMode(): ReplInputMode {
		return this.inputMode;
	}

	/**
	 * Get the last successfully parsed AST.
	 *
	 * @returns Last AST, or undefined if no AST available
	 */
	getLastAst(): MathNode | undefined {
		return this.lastAst;
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

	/**
	 * Get the unit conversion mode for unit-aware evaluation.
	 *
	 * @returns Current unit conversion mode ('first', 'si', or 'best')
	 */
	getUnitConversionMode(): UnitConversionMode {
		return this.unitConversionMode;
	}

	/**
	 * Set the unit conversion mode for unit-aware evaluation.
	 *
	 * @param mode - The conversion mode to use:
	 *   - 'first': Convert to the first unit encountered (default)
	 *   - 'si': Normalize to SI base units
	 *   - 'best': Choose the most human-readable unit
	 */
	setUnitConversionMode(mode: UnitConversionMode): void {
		this.unitConversionMode = mode;
	}

	/**
	 * Set the history reference for export functionality.
	 *
	 * Should be called by the REPL store before each execute() call
	 * to keep the engine's view of history up to date.
	 *
	 * @param history - Current history array (newest first)
	 */
	setHistory(history: ReadonlyArray<ReplHistoryEntry>): void {
		this.historyRef = history;
	}

	/**
	 * Get the last unit-aware evaluation result.
	 *
	 * Used by the .convert command to convert the last result to a different unit.
	 *
	 * @returns Last unit evaluation result, or undefined if none
	 */
	getLastUnitResult(): EvalResultWithUnit | undefined {
		return this.lastUnitResult;
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

		// Handle mode toggle commands (not in registry)
		if (cmdName === 'latex') {
			this.inputMode = 'latex';
			return {
				success: true,
				output: 'Input mode: LaTeX',
				outputHtml: escapeWithLabel('Input mode: LaTeX')
			};
		}
		if (cmdName === 'custom') {
			this.inputMode = 'custom';
			return {
				success: true,
				output: 'Input mode: Custom syntax',
				outputHtml: escapeWithLabel('Input mode: Custom syntax')
			};
		}
		if (cmdName === 'auto') {
			this.inputMode = 'auto';
			return {
				success: true,
				output: 'Input mode: Auto-detect',
				outputHtml: escapeWithLabel('Input mode: Auto-detect')
			};
		}

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

		// Handle unit conversion mode commands
		if (cmdName === 'unitmode') {
			const mode = args.toLowerCase();
			if (mode === 'first' || mode === 'si' || mode === 'best') {
				this.unitConversionMode = mode;
				return {
					success: true,
					output: `Unit conversion mode: ${mode}`,
					outputHtml: `Unit conversion mode: <span class="text-blue-400">${mode}</span>`
				};
			}
			return {
				success: false,
				output: 'Usage: .unitmode first|si|best',
				outputHtml: formatErrorHtml({
					code: 'INVALID_OPTIONS',
					message: 'Usage: .unitmode first|si|best'
				}),
				error: {
					code: 'INVALID_OPTIONS',
					message: 'Invalid unit mode. Use: first, si, or best'
				}
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

		// Handle .export command
		if (cmdName === 'export' || cmdName === 'exp') {
			return this.executeExportCommand();
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
					format: this.inputMode === 'auto' ? 'latex' : this.inputMode,
					options: {},
					isRepl: true,
					evalState: this.evalState
				};
				const result = command.execute(ctx);
				return this.commandResultToReplResult(result);
			}

			// For other commands, parse the argument as an expression
			const forceFormat = this.inputMode === 'auto' ? undefined : this.inputMode;
			const parseResult = parse(args, forceFormat ? { forceFormat } : undefined);

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
			format: this.inputMode === 'auto' ? 'latex' : this.inputMode,
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
		const forceFormat = this.inputMode === 'auto' ? undefined : this.inputMode;
		const parseResult = parse(valueExpr, forceFormat ? { forceFormat } : undefined);

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
		const forceFormat = this.inputMode === 'auto' ? undefined : this.inputMode;
		const parseResult = parse(bodyExpr, forceFormat ? { forceFormat } : undefined);

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

		// Store the function definition
		this.evalState.functions[funcName] = {
			parameters,
			expression: parseResult.ast
		};
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
		const forceFormat = this.inputMode === 'auto' ? undefined : this.inputMode;
		const result1 = parse(expr1Str, forceFormat ? { forceFormat } : undefined);
		const result2 = parse(expr2Str, forceFormat ? { forceFormat } : undefined);

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

		// Substitute bound variables before comparison
		const bindings = bindingsToRecord(this.evalState.bindings);
		const substituted1 =
			Object.keys(bindings).length > 0 ? substitute(result1.ast, bindings) : result1.ast;
		const substituted2 =
			Object.keys(bindings).length > 0 ? substitute(result2.ast, bindings) : result2.ast;

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

		// Use algebraic equivalence check
		try {
			const form1 = normalize(substituted1);
			const form2 = normalize(substituted2);
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
	 * Parse and display a mathematical expression.
	 * If the expression contains variables and all are bound, auto-evaluates it.
	 */
	private executeExpression(input: string): ReplExecutionResult {
		// Use forced format if mode is not 'auto'
		const forceFormat = this.inputMode === 'auto' ? undefined : this.inputMode;
		const result = parse(input, forceFormat ? { forceFormat } : undefined);

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
		const variables = getVariables(result.ast);

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
	private createAutoEvaluationResult(ast: MathNode): ReplExecutionResult {
		try {
			const bindings = bindingsToRecord(this.evalState.bindings);
			const variables = getVariables(ast);

			// Substitute variables
			const substituted = substitute(ast, bindings);

			// Check if expression contains units
			const hasUnits = this.expressionHasUnits(substituted);

			if (hasUnits) {
				// Use unit-aware evaluation (keeps detailed output for units)
				return this.createUnitAwareResult(substituted, '');
			}

			// Boolean result: colored output, no exact/decimal toggle
			const boolCheck = evaluate(substituted, {
				mode: 'exact',
				functions: this.evalState.functions
			});
			if (boolCheck.status === 'value' && boolCheck.node.type === 'boolean') {
				const boolValue = boolCheck.value as boolean;
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
					ast: boolCheck.node
				};
			}

			// Evaluate in BOTH modes to enable toggle
			// Pass user-defined functions from evalState
			const exactResult = evaluate(substituted, {
				mode: 'exact',
				functions: this.evalState.functions
			});
			const decimalResult = evaluate(substituted, {
				mode: 'decimal',
				functions: this.evalState.functions
			});
			this.lastUnitResult = undefined; // Clear last unit result

			// Non-value result (indeterminate / unevaluable): surface via the catch
			if (exactResult.status !== 'value') {
				throw new Error(
					exactResult.status === 'indeterminate'
						? `Indeterminate form: ${exactResult.form}`
						: exactResult.reason
				);
			}
			if (decimalResult.status !== 'value') {
				throw new Error(
					decimalResult.status === 'indeterminate'
						? `Indeterminate form: ${decimalResult.form}`
						: decimalResult.reason
				);
			}

			// Format exact result
			const exactStr = toCustom(exactResult.node);
			const exactOutput = exactStr;
			const exactOutputHtml = `<span class="text-cyan-400">${this.escapeHtml(exactStr)}</span>`;

			// Format decimal result
			const decimalStr = toCustom(decimalResult.node);
			const decimalPrefix = decimalResult.exact ? '' : '≈ ';
			const decimalOutput = `${decimalPrefix}${decimalStr}`;
			let decimalOutputHtml: string;
			if (decimalResult.exact) {
				decimalOutputHtml = `<span class="text-cyan-400">${this.escapeHtml(decimalStr)}</span>`;
			} else {
				decimalOutputHtml = `<span class="text-muted-foreground">≈</span> <span class="text-cyan-400">${this.escapeHtml(decimalStr)}</span>`;
			}

			// Determine if toggle makes sense (results are different)
			const canToggle = exactStr !== decimalStr;

			// Use current mode to determine primary output
			const currentMode = this.evalState.mode;
			const output = currentMode === 'exact' ? exactOutput : decimalOutput;
			let outputHtml = currentMode === 'exact' ? exactOutputHtml : decimalOutputHtml;

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
				ast: currentMode === 'exact' ? exactResult.node : decimalResult.node,
				// Toggle support fields
				exactOutput,
				exactOutputHtml,
				decimalOutput,
				decimalOutputHtml,
				canToggle
			};
		} catch (err) {
			// Handle dimensional errors with pedagogical messages
			if (err instanceof DimensionalEvaluationError) {
				return this.createDimensionalErrorResult(err);
			}

			const message = err instanceof Error ? err.message : 'Unknown error during evaluation';
			return {
				success: false,
				output: `Evaluation error: ${message}`,
				outputHtml: formatErrorHtml({
					code: 'PARSE_ERROR',
					message: `Evaluation error: ${message}`
				}),
				error: {
					code: 'PARSE_ERROR',
					message
				}
			};
		}
	}

	/**
	 * Execute the .convert command to convert the last result to a different unit.
	 */
	private executeConvertCommand(targetUnitStr: string): ReplExecutionResult {
		// Check if we have a last unit result
		if (!this.lastUnitResult) {
			return {
				success: false,
				output:
					"Aucune expression avec unites a convertir. Evaluez d'abord une expression avec des unites.",
				outputHtml: formatErrorHtml({
					code: 'NO_AST',
					message: 'Aucune expression avec unites a convertir',
					suggestion: "Evaluez d'abord une expression avec des unites, ex: 5 km + 3000 m"
				}),
				error: {
					code: 'NO_AST',
					message: 'No unit result to convert'
				}
			};
		}

		if (!targetUnitStr.trim()) {
			return {
				success: false,
				output: 'Usage: .convert <unite>\nExemple: .convert m',
				outputHtml: formatErrorHtml({
					code: 'INVALID_OPTIONS',
					message: 'Usage: .convert <unite>',
					suggestion: 'Exemple: .convert m'
				}),
				error: {
					code: 'INVALID_OPTIONS',
					message: 'Target unit is required'
				}
			};
		}

		try {
			// Parse the target unit
			const targetUnit = parseUnit(targetUnitStr.trim());

			if (!targetUnit) {
				return {
					success: false,
					output: `Unite inconnue: ${targetUnitStr}`,
					outputHtml: formatErrorHtml({
						code: 'UNKNOWN_UNIT',
						message: `Unite inconnue: ${targetUnitStr}`,
						suggestion: 'Utilisez un symbole valide comme m, km, s, kg, etc.'
					}),
					error: {
						code: 'UNKNOWN_UNIT',
						message: `Unknown unit: ${targetUnitStr}`
					}
				};
			}

			// Check dimensional compatibility
			const factor = getConversionFactor(this.lastUnitResult.unit, targetUnit);

			if (factor === null) {
				// Incompatible units
				const sourceUnitStr =
					this.lastUnitResult.unit.original || this.formatUnitComponents(this.lastUnitResult.unit);
				return {
					success: false,
					output: `Impossible de convertir ${sourceUnitStr} en ${targetUnitStr}: dimensions incompatibles`,
					outputHtml: formatErrorHtml({
						code: 'DIMENSION_MISMATCH',
						message: `Impossible de convertir ${sourceUnitStr} en ${targetUnitStr}`,
						suggestion:
							'Les unites doivent avoir des dimensions compatibles (ex: longueur vers longueur)'
					}),
					error: {
						code: 'DIMENSION_MISMATCH',
						message: 'Incompatible dimensions'
					}
				};
			}

			// Convert the value
			const sourceValue = this.getNumericValue(this.lastUnitResult.value);

			const convertedValue = sourceValue * factor;
			const resultStr = `${convertedValue} ${targetUnitStr}`;

			// Build output
			const sourceUnitStr =
				this.lastUnitResult.unit.original || this.formatUnitComponents(this.lastUnitResult.unit);
			const lines = [
				`Converted: ${sourceValue} ${sourceUnitStr} → ${resultStr}`,
				`Factor: ${factor}`
			];
			const output = lines.join('\n');

			// HTML output
			const htmlLines = [
				`<strong>Converted:</strong> <span class="text-gray-400">${sourceValue} ${this.escapeHtml(sourceUnitStr)}</span> → <span class="text-cyan-400">${this.escapeHtml(resultStr)}</span>`,
				`<span class="text-gray-400">Factor:</span> ${factor}`
			];
			const outputHtml = htmlLines.join('<br>');

			return {
				success: true,
				output,
				outputHtml
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error during conversion';
			return {
				success: false,
				output: `Conversion error: ${message}`,
				outputHtml: formatErrorHtml({
					code: 'PARSE_ERROR',
					message: `Conversion error: ${message}`
				}),
				error: {
					code: 'PARSE_ERROR',
					message
				}
			};
		}
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
	 * Create evaluation result for expression with units.
	 * Computes both exact and decimal representations for toggle support.
	 */
	private createUnitAwareResult(ast: MathNode, _bindingsStr: string): ReplExecutionResult {
		// Evaluate with units in BOTH modes
		// Pass user-defined functions from evalState
		const exactEvalResult = evaluateWithUnits(ast, {
			mode: 'exact',
			conversionMode: this.unitConversionMode,
			functions: this.evalState.functions
		});
		const decimalEvalResult = evaluateWithUnits(ast, {
			mode: 'decimal',
			conversionMode: this.unitConversionMode,
			functions: this.evalState.functions
		});

		// Store for .convert command (use current mode)
		const currentMode = this.evalState.mode;
		this.lastUnitResult = currentMode === 'exact' ? exactEvalResult : decimalEvalResult;

		// Format unit string (same for both modes)
		const unitStr =
			exactEvalResult.unit.original || this.formatUnitComponents(exactEvalResult.unit);

		// Format exact result - preserve fraction format if Rational
		const exactValueStr = this.formatValueForDisplay(exactEvalResult.value, true);
		const exactResultStr = `${exactValueStr} ${unitStr}`;
		const exactOutput = exactResultStr;
		const exactOutputHtml = `<span class="text-cyan-400">${this.escapeHtml(exactResultStr)}</span>`;

		// Format decimal result - always as decimal number
		const decimalValueNum = this.getNumericValue(decimalEvalResult.value);
		const decimalResultStr = `${decimalValueNum} ${unitStr}`;
		const decimalPrefix = decimalEvalResult.exact ? '' : '≈ ';
		const decimalOutput = `${decimalPrefix}${decimalResultStr}`;
		let decimalOutputHtml: string;
		if (decimalEvalResult.exact) {
			decimalOutputHtml = `<span class="text-cyan-400">${this.escapeHtml(decimalResultStr)}</span>`;
		} else {
			decimalOutputHtml = `<span class="text-muted-foreground">≈</span> <span class="text-cyan-400">${this.escapeHtml(decimalResultStr)}</span>`;
		}

		// Determine if toggle makes sense (results are different)
		const canToggle = exactResultStr !== decimalResultStr;

		// Use current mode to determine primary output
		const output = currentMode === 'exact' ? exactOutput : decimalOutput;
		const outputHtml = currentMode === 'exact' ? exactOutputHtml : decimalOutputHtml;

		return {
			success: true,
			output,
			outputHtml,
			ast: currentMode === 'exact' ? exactEvalResult.node : decimalEvalResult.node,
			// Toggle support fields
			exactOutput,
			exactOutputHtml,
			decimalOutput,
			decimalOutputHtml,
			canToggle
		};
	}

	/**
	 * Format unit components as string (fallback when no original).
	 */
	private formatUnitComponents(unit: { components: ReadonlyMap<string, number> }): string {
		const parts: string[] = [];
		const negativeParts: string[] = [];

		for (const [symbol, exponent] of unit.components) {
			if (exponent > 0) {
				parts.push(exponent === 1 ? symbol : `${symbol}^${exponent}`);
			} else if (exponent < 0) {
				negativeParts.push(exponent === -1 ? symbol : `${symbol}^${-exponent}`);
			}
		}

		if (negativeParts.length === 0) {
			return parts.join('·') || '1';
		}
		if (parts.length === 0) {
			return `1/${negativeParts.join('·')}`;
		}
		return `${parts.join('·')}/${negativeParts.join('·')}`;
	}

	/**
	 * Create pedagogical error result for dimensional errors.
	 */
	private createDimensionalErrorResult(err: DimensionalEvaluationError): ReplExecutionResult {
		const mainMessage = err.message;

		// Build pedagogical suggestions
		const suggestions: string[] = [];
		for (const e of err.errors) {
			if (e.code === 'DIMENSION_MISMATCH') {
				suggestions.push('💡 Verifiez que les unites sont compatibles pour cette operation.');
				suggestions.push(
					'   Par exemple: on peut additionner des metres et des kilometres, mais pas des metres et des secondes.'
				);
			} else if (e.code === 'INCOMPATIBLE_DIMENSIONS') {
				suggestions.push(`💡 ${e.message}`);
			} else {
				suggestions.push(`💡 ${e.message}`);
			}
		}

		const output = [mainMessage, '', ...suggestions].join('\n');

		// HTML output with styling
		const htmlLines = [
			`<span class="text-red-400 font-bold">Erreur dimensionnelle</span>`,
			`<span class="text-red-300">${this.escapeHtml(mainMessage)}</span>`,
			'<br>',
			...suggestions.map((s) => `<span class="text-yellow-400">${this.escapeHtml(s)}</span>`)
		];
		const outputHtml = htmlLines.join('<br>');

		return {
			success: false,
			output,
			outputHtml,
			error: {
				code: 'DIMENSION_ERROR',
				message: mainMessage
			}
		};
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
	 * Format a value for display, preserving exact form if exact mode.
	 *
	 * @param value - EvalValue (MathNode, number, or ComplexValueResult) to format
	 * @param preserveExact - If true, format MathNode as LaTeX instead of decimal
	 */
	private formatValueForDisplay(value: EvalValue, preserveExact: boolean): string {
		if (typeof value === 'number' || typeof value === 'boolean') {
			return String(value);
		}

		// Complex value
		if (this.isComplexValue(value)) {
			const { real, imag } = value;
			if (imag === 0) return String(real);
			if (real === 0) return imag === 1 ? 'i' : imag === -1 ? '-i' : `${imag}i`;
			const sign = imag >= 0 ? '+' : '';
			const imagPart = imag === 1 ? 'i' : imag === -1 ? '-i' : `${imag}i`;
			return `${real}${sign}${imagPart}`;
		}

		// It's a MathNode
		if (preserveExact) {
			// Format as LaTeX for exact representation
			return toLatex(value);
		}

		// Convert to number
		return String(evaluateNodeToApproximatedNumber(value));
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
			outputHtml?: string;
			// Toggle support fields
			exactOutput?: string;
			exactOutputHtml?: string;
			decimalOutput?: string;
			decimalOutputHtml?: string;
			canToggle?: boolean;
			showDecimalInitially?: boolean;
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
				// Pass through toggle fields if present
				exactOutput: cmdResult.exactOutput,
				exactOutputHtml: cmdResult.exactOutputHtml,
				decimalOutput: cmdResult.decimalOutput,
				decimalOutputHtml: cmdResult.decimalOutputHtml,
				canToggle: cmdResult.canToggle,
				showDecimalInitially: cmdResult.showDecimalInitially
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
			// Pass through toggle fields if present
			exactOutput: cmdResult.exactOutput,
			exactOutputHtml: cmdResult.exactOutputHtml,
			decimalOutput: cmdResult.decimalOutput,
			decimalOutputHtml: cmdResult.decimalOutputHtml,
			canToggle: cmdResult.canToggle,
			showDecimalInitially: cmdResult.showDecimalInitially
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
	 * Usage: .ajustement x1,x2,x3 : y1,y2,y3 [; x = 10] [; y = 7] [; z = ln(y)]
	 * Returns: the line, a and b, the mean point G and r — then the predictions,
	 * and with a change of variable the line in z (or t) and the relation
	 * between x and y. ⚠️ Computed AND worded like the ```nuage block (manche 15,
	 * PR c): exact fractions (`statistics/bivariate`), decimals for a change of
	 * variable (`statistics/variable-change`), texts from `ubumark/utils/scatter-lines`.
	 */
	private executeLinregCommand(args: string): ReplExecutionResult {
		const usage = 'Usage: .linreg x1,x2,x3 : y1,y2,y3';
		// Une option vide (« ; » final) ne dit rien : ignorée
		const [data, ...optionTexts] = args.split(';').map((s) => s.trim());
		const options = optionTexts.filter((option) => option.length > 0);
		if (!data.includes(':')) {
			return {
				success: false,
				output: usage,
				outputHtml: formatErrorHtml({
					code: 'INVALID_OPTIONS',
					message: usage,
					suggestion:
						'Separez les valeurs X et Y par deux-points (:), puis les options par « ; » : .ajustement 1,2,3 : 2,4,7 ; x = 5'
				}),
				error: {
					code: 'INVALID_OPTIONS',
					message: 'Invalid syntax'
				}
			};
		}

		const [xPart, yPart] = data.split(':').map((s) => s.trim());

		// Parse X values
		const xRaw = xPart
			.split(',')
			.map((s) => s.trim())
			.filter((s) => s.length > 0);

		// Parse Y values
		const yRaw = yPart
			.split(',')
			.map((s) => s.trim())
			.filter((s) => s.length > 0);

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

	// ===========================================================================
	// Export Command
	// ===========================================================================

	/**
	 * Execute the .export command.
	 *
	 * Exports the REPL history to a JSON file containing input/output pairs.
	 */
	private executeExportCommand(): ReplExecutionResult {
		if (this.historyRef.length === 0) {
			return {
				success: false,
				output: 'Aucun historique a exporter',
				outputHtml: formatErrorHtml({
					code: 'NO_AST',
					message: 'Aucun historique a exporter',
					suggestion: "Executez quelques expressions d'abord"
				}),
				error: {
					code: 'NO_AST',
					message: 'No history to export'
				}
			};
		}

		// Build export data (oldest to newest for chronological order)
		// Strip ANSI codes from output for clean JSON
		const entries = [...this.historyRef]
			.reverse()
			.filter((entry) => !entry.isCommand || !entry.input.startsWith('.export'))
			.map((entry) => ({
				input: entry.input,
				output: this.stripAnsi(entry.result.output)
			}));

		const exportData = {
			exportedAt: new Date().toISOString(),
			entries
		};

		const jsonContent = JSON.stringify(exportData, null, 2);
		const filename = `mathast-session-${Date.now()}.json`;

		return {
			success: true,
			output: `Export: ${entries.length} entrees`,
			outputHtml: `<span class="text-green-400">Export: ${entries.length} entrees</span>`,
			exportData: {
				content: jsonContent,
				filename,
				mimeType: 'application/json'
			}
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

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
import type { ReplExecutionResult, ReplInputMode, WebFunctionInfo } from './types';
import {
	formatErrorHtml,
	formatInputErrorHtml,
	formatSuccessHtml,
	formatTreeHtml
} from './output-formatter-web';
import { toCustom, toLatex, getVariables, hasAllBindings, evaluate, substitute } from '../../index';
import { evaluateWithUnits, DimensionalEvaluationError } from '../../eval/evaluate-with-units';
import type { EvalResultWithUnit, UnitConversionMode } from '../../eval/types';
import { isUnit } from '../../guards';
import { parse as parseUnit } from '../../units/parser';
import { getConversionFactor } from '../../units/conversion';

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

		// Check for inline assignment syntax: "x = 5" or "x=5"
		// But not equivalence syntax (===)
		const assignmentMatch = trimmedInput.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
		if (assignmentMatch && !trimmedInput.includes('===')) {
			return this.executeInlineAssignment(assignmentMatch[1], assignmentMatch[2]);
		}

		// Handle equivalence syntax: expr1 === expr2
		if (trimmedInput.includes('===')) {
			return this.executeEquivalence(trimmedInput);
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
				outputHtml: formatSuccessHtml('Input mode: LaTeX')
			};
		}
		if (cmdName === 'custom') {
			this.inputMode = 'custom';
			return {
				success: true,
				output: 'Input mode: Custom syntax',
				outputHtml: formatSuccessHtml('Input mode: Custom syntax')
			};
		}
		if (cmdName === 'auto') {
			this.inputMode = 'auto';
			return {
				success: true,
				output: 'Input mode: Auto-detect',
				outputHtml: formatSuccessHtml('Input mode: Auto-detect')
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
					outputHtml: formatSuccessHtml(
						`Unit conversion mode: <span class="text-blue-400">${mode}</span>`
					)
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
	 * Execute inline variable assignment: "x = 5" or "x=5"
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
	 * Execute equivalence check: expr1 === expr2
	 */
	private executeEquivalence(input: string): ReplExecutionResult {
		const equivCmd = this.registry.get('equiv');
		if (!equivCmd) {
			return {
				success: false,
				output: 'equiv command not available',
				error: {
					code: 'UNKNOWN_COMMAND',
					message: 'equiv command not available'
				}
			};
		}

		const ctx: CommandContext = {
			ast: undefined,
			input,
			format: this.inputMode === 'auto' ? 'latex' : this.inputMode,
			options: {},
			isRepl: true,
			evalState: this.evalState
		};

		const result = equivCmd.execute(ctx);
		return this.commandResultToReplResult(result);
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

		// Use parse command to display the result (no variables or some unbound)
		const parseCmd = this.registry.get('parse');
		if (parseCmd) {
			const ctx: CommandContext = {
				ast: result.ast,
				input,
				format: result.inputFormat,
				options: {},
				isRepl: true,
				evalState: this.evalState
			};
			const cmdResult = parseCmd.execute(ctx);
			return this.commandResultToReplResult(cmdResult, result.ast);
		}

		// Fallback if parse command not available
		return {
			success: true,
			output: 'Parsed successfully',
			ast: result.ast
		};
	}

	/**
	 * Create auto-evaluation result for an expression with all variables bound.
	 */
	private createAutoEvaluationResult(ast: MathNode): ReplExecutionResult {
		try {
			const bindings = bindingsToRecord(this.evalState.bindings);
			const variables = getVariables(ast);

			// Show which bindings are being used (only if there are variables)
			let bindingsStr = '';
			if (variables.size > 0) {
				const bindingsList: string[] = [];
				for (const varName of variables) {
					const value = this.evalState.bindings.get(varName);
					if (value) {
						bindingsList.push(`${varName}: ${toCustom(value)}`);
					}
				}
				bindingsStr = '{' + bindingsList.join(', ') + '}';
			}

			// Substitute variables
			const substituted = substitute(ast, bindings);

			// Check if expression contains units
			const hasUnits = this.expressionHasUnits(substituted);

			if (hasUnits) {
				// Use unit-aware evaluation
				return this.createUnitAwareResult(substituted, bindingsStr);
			}

			// Evaluate using current mode (no units)
			const evalResult = evaluate(substituted, { mode: this.evalState.mode });
			this.lastUnitResult = undefined; // Clear last unit result

			// Format the result
			const resultStr = toCustom(evalResult.node);
			const latexStr = toLatex(evalResult.node);
			const exactStr = evalResult.exact ? '(exact)' : '(approximate)';

			// Build output
			const lines: string[] = [];
			if (bindingsStr) {
				lines.push(`Evaluating with: ${bindingsStr}`);
			}
			lines.push(`Result: ${resultStr} ${exactStr}`);
			lines.push(`LaTeX:  ${latexStr}`);
			const output = lines.join('\n');

			// Build HTML output
			const exactClass = evalResult.exact ? 'text-green-400' : 'text-yellow-400';
			const htmlLines: string[] = [];
			if (bindingsStr) {
				htmlLines.push(
					`<span class="text-gray-400">Evaluating with:</span> ${this.escapeHtml(bindingsStr)}`
				);
			}
			htmlLines.push(
				`<strong>Result:</strong> <span class="text-cyan-400">${this.escapeHtml(resultStr)}</span> <span class="${exactClass}">${exactStr}</span>`
			);
			htmlLines.push(`<span class="text-gray-400">LaTeX:</span>  ${this.escapeHtml(latexStr)}`);
			const outputHtml = htmlLines.join('<br>');

			return {
				success: true,
				output,
				outputHtml,
				ast: evalResult.node
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
	 */
	private createUnitAwareResult(ast: MathNode, bindingsStr: string): ReplExecutionResult {
		// Evaluate with units
		const evalResult = evaluateWithUnits(ast, {
			mode: this.evalState.mode,
			conversionMode: this.unitConversionMode
		});

		// Store for .convert command
		this.lastUnitResult = evalResult;

		// Format value
		const valueNum = this.getNumericValue(evalResult.value);

		// Format unit string (use original if available)
		const unitStr = evalResult.unit.original || this.formatUnitComponents(evalResult.unit);

		// Format result
		const resultStr = `${valueNum} ${unitStr}`;
		const latexStr = toLatex(evalResult.node);
		const exactStr = evalResult.exact ? '(exact)' : '(approximate)';

		// Build output
		const lines: string[] = [];
		if (bindingsStr) {
			lines.push(`Evaluating with: ${bindingsStr}`);
		}
		lines.push(`Result: ${resultStr} ${exactStr}`);
		lines.push(`LaTeX:  ${latexStr}`);
		lines.push(`Mode:   ${this.unitConversionMode}`);
		const output = lines.join('\n');

		// Build HTML output
		const exactClass = evalResult.exact ? 'text-green-400' : 'text-yellow-400';
		const htmlLines: string[] = [];
		if (bindingsStr) {
			htmlLines.push(
				`<span class="text-gray-400">Evaluating with:</span> ${this.escapeHtml(bindingsStr)}`
			);
		}
		htmlLines.push(
			`<strong>Result:</strong> <span class="text-cyan-400">${this.escapeHtml(resultStr)}</span> <span class="${exactClass}">${exactStr}</span>`
		);
		htmlLines.push(`<span class="text-gray-400">LaTeX:</span>  ${this.escapeHtml(latexStr)}`);
		htmlLines.push(
			`<span class="text-gray-400">Mode:</span>   <span class="text-blue-400">${this.unitConversionMode}</span>`
		);
		const outputHtml = htmlLines.join('<br>');

		return {
			success: true,
			output,
			outputHtml,
			ast: evalResult.node,
			latex: latexStr
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

	// ===========================================================================
	// Helper Methods
	// ===========================================================================

	/**
	 * Extract numeric value from Rational or number.
	 */
	private getNumericValue(value: { n: bigint; d: bigint } | number): number {
		if (typeof value === 'number') return value;
		return Number(value.n) / Number(value.d);
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
		cmdResult: { output: string; success: boolean; error?: unknown; ast?: MathNode },
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
			ast: cmdResult.ast || ast
		};
	}
}

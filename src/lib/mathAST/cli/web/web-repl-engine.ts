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

			// Evaluate using current mode
			const evalResult = evaluate(substituted, { mode: this.evalState.mode });

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

	// ===========================================================================
	// Helper Methods
	// ===========================================================================

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

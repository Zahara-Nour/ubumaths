/**
 * Web REPL Engine
 *
 * Browser-compatible REPL execution engine. Reuses the CLI command registry
 * and parsing pipeline but adapts output for HTML display.
 */

import type { MathNode } from '../../types';
import type { CommandContext } from '../types';
import { CommandRegistry, parse } from '../core';
import { createDefaultRegistry } from '../commands';
import type { ReplExecutionResult, ReplInputMode } from './types';
import {
	formatErrorHtml,
	formatInputErrorHtml,
	formatSuccessHtml,
	formatTreeHtml
} from './output-formatter-web';

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

	constructor() {
		this.registry = createDefaultRegistry();
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
					isRepl: true
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
			isRepl: true
		};

		const result = command.execute(ctx);
		return this.commandResultToReplResult(result, ast);
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
			isRepl: true
		};

		const result = equivCmd.execute(ctx);
		return this.commandResultToReplResult(result);
	}

	/**
	 * Parse and display a mathematical expression.
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

		// Use parse command to display the result
		const parseCmd = this.registry.get('parse');
		if (parseCmd) {
			const ctx: CommandContext = {
				ast: result.ast,
				input,
				format: result.inputFormat,
				options: {},
				isRepl: true
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
			const errorCode = errorObj?.code || 'UNKNOWN_ERROR';
			const errorMessage = errorObj?.message || cmdResult.output;

			return {
				success: false,
				output: cmdResult.output,
				outputHtml: formatErrorHtml({ code: errorCode, message: errorMessage }),
				error: {
					code: errorCode,
					message: errorMessage
				}
			};
		}

		// For successful commands, check if output looks like a tree (has box-drawing chars)
		let outputHtml: string;
		if (cmdResult.output.includes('├') || cmdResult.output.includes('└')) {
			outputHtml = formatTreeHtml(cmdResult.output);
		} else {
			// Escape HTML and preserve line breaks
			const lines = cmdResult.output.split('\n');
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

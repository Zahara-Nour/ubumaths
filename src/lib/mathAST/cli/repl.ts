#!/usr/bin/env node
/**
 * MathAST Interactive REPL
 *
 * Provides an interactive Read-Eval-Print-Loop for parsing and exploring
 * mathematical expressions. Supports dot-commands for REPL operations.
 */

import * as readline from 'readline';
import chalk from 'chalk';
import type { MathNode } from '../types';
import {
	parse,
	formatError,
	formatInputError,
	createEvalState,
	bindingsToRecord,
	setBinding
} from './core';
import type { EvalState } from './core';
import { createDefaultRegistry } from './commands';
import type { CommandContext } from './types';
import { toCustom, toLatex, getVariables, hasAllBindings, evaluate, substitute } from '../index';

// =============================================================================
// REPL State
// =============================================================================

type InputMode = 'latex' | 'custom' | 'auto';

interface ReplState {
	lastAst: MathNode | undefined;
	registry: ReturnType<typeof createDefaultRegistry>;
	inputMode: InputMode;
	evalState: EvalState;
}

// =============================================================================
// REPL Entry Point
// =============================================================================

/**
 * Start the interactive REPL.
 *
 * The REPL provides an interactive environment for:
 * - Parsing LaTeX expressions
 * - Viewing AST trees
 * - Converting between formats
 *
 * Commands start with `.` (e.g., `.help`, `.quit`)
 * Expressions are parsed and displayed automatically.
 *
 * @example
 * ```typescript
 * // Start REPL programmatically
 * startRepl();
 * ```
 */
/**
 * Get the prompt string based on current input mode.
 */
function getPrompt(mode: InputMode): string {
	if (mode === 'auto') {
		return chalk.cyan('math> ');
	}
	return chalk.cyan(`math[${mode}]> `);
}

export function startRepl(): void {
	const state: ReplState = {
		lastAst: undefined,
		registry: createDefaultRegistry(),
		inputMode: 'auto',
		evalState: createEvalState()
	};

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt: getPrompt(state.inputMode)
	});

	// Welcome message
	console.log(chalk.bold('MathAST REPL'));
	console.log('Enter expressions to parse, or use expr1 === expr2 for equivalence.');
	console.log('Commands: .simplify, .normal, .hash, .equiv | .help, .quit');
	console.log('');

	rl.prompt();

	rl.on('line', (line: string) => {
		const input = line.trim();

		if (!input) {
			rl.prompt();
			return;
		}

		if (input.startsWith('.')) {
			handleReplCommand(input, rl, state);
		} else {
			// Check for inline assignment syntax: "x = 5" or "x=5"
			const assignmentMatch = input.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
			if (assignmentMatch && !input.includes('===')) {
				handleInlineAssignment(assignmentMatch[1], assignmentMatch[2], state);
			} else {
				state.lastAst = processExpression(input, state);
			}
		}

		rl.prompt();
	});

	rl.on('close', () => {
		console.log(chalk.gray('\nGoodbye!'));
		process.exit(0);
	});
}

// =============================================================================
// Inline Assignment Handler
// =============================================================================

/**
 * Handle inline variable assignment: "x = 5" or "x=5"
 * Parses the value and stores it in evalState.bindings.
 *
 * @param varName - Variable name
 * @param valueExpr - Expression to assign
 * @param state - Current REPL state
 */
function handleInlineAssignment(varName: string, valueExpr: string, state: ReplState): void {
	const forceFormat = state.inputMode === 'auto' ? undefined : state.inputMode;
	const parseResult = parse(valueExpr, forceFormat ? { forceFormat } : undefined);

	if (parseResult.errors.length > 0 || !parseResult.ast) {
		for (const err of parseResult.errors) {
			if (err.position !== undefined) {
				console.log(formatInputError(valueExpr, err.position, err.message));
			} else {
				console.log(formatError(err));
			}
		}
		return;
	}

	// Store the binding
	setBinding(state.evalState, varName, parseResult.ast);
	state.lastAst = parseResult.ast;

	// Format output
	const valueStr = toCustom(parseResult.ast);
	console.log(chalk.bold(varName) + ' = ' + chalk.cyan(valueStr));
}

// =============================================================================
// Command Handler
// =============================================================================

/**
 * Handle a REPL dot-command (e.g., .help, .quit, .latex, .custom, .auto).
 * Supports passing arguments to commands: .simplify 2x+3x
 */
function handleReplCommand(input: string, rl: readline.Interface, state: ReplState): void {
	const parts = input.slice(1).split(/\s+/);
	const cmdName = parts[0].toLowerCase();
	const args = parts.slice(1).join(' ').trim(); // Get everything after command name

	// Handle quit/exit commands directly
	if (cmdName === 'quit' || cmdName === 'exit' || cmdName === 'q') {
		rl.close();
		return;
	}

	// Handle mode toggle commands
	if (cmdName === 'latex') {
		state.inputMode = 'latex';
		rl.setPrompt(getPrompt(state.inputMode));
		console.log(chalk.cyan('Input mode: LaTeX'));
		return;
	}
	if (cmdName === 'custom') {
		state.inputMode = 'custom';
		rl.setPrompt(getPrompt(state.inputMode));
		console.log(chalk.cyan('Input mode: Custom syntax'));
		return;
	}
	if (cmdName === 'auto') {
		state.inputMode = 'auto';
		rl.setPrompt(getPrompt(state.inputMode));
		console.log(chalk.cyan('Input mode: Auto-detect'));
		return;
	}

	// Look up command in registry
	const command = state.registry.get(cmdName);
	if (!command) {
		console.log(chalk.yellow(`Unknown command: ${cmdName}`));
		console.log(chalk.gray('Type .help for available commands'));
		return;
	}

	// If command has arguments, handle them
	let ast = state.lastAst;
	let cmdInput = args;

	if (args) {
		// For equiv command, handle specially (may have two expressions or compare with lastAst)
		if (cmdName === 'equiv' || cmdName === 'eq' || cmdName === 'equivalent') {
			const ctx: CommandContext = {
				ast: state.lastAst, // Pass lastAst for single-arg case
				input: args,
				format: state.inputMode === 'auto' ? 'latex' : state.inputMode,
				options: {},
				isRepl: true,
				evalState: state.evalState
			};
			const result = command.execute(ctx);
			console.log(result.output);
			return;
		}

		// For other commands, parse the argument as an expression
		const forceFormat = state.inputMode === 'auto' ? undefined : state.inputMode;
		const parseResult = parse(args, forceFormat ? { forceFormat } : undefined);
		if (parseResult.ast) {
			ast = parseResult.ast;
			cmdInput = args;
		} else if (parseResult.errors.length > 0) {
			for (const err of parseResult.errors) {
				console.log(formatError(err));
			}
			return;
		}
	}

	// Build context for command execution
	const ctx: CommandContext = {
		ast,
		input: cmdInput,
		format: state.inputMode === 'auto' ? 'latex' : state.inputMode,
		options: {},
		isRepl: true,
		evalState: state.evalState
	};

	const result = command.execute(ctx);
	console.log(result.output);
}

// =============================================================================
// Expression Processing
// =============================================================================

/**
 * Handle equivalence syntax: expr1 === expr2
 *
 * @param input - The input containing ===
 * @param state - Current REPL state
 */
function handleEquivExpression(input: string, state: ReplState): void {
	const equivCmd = state.registry.get('equiv');
	if (!equivCmd) {
		console.log(chalk.yellow('equiv command not available'));
		return;
	}

	const ctx: CommandContext = {
		ast: undefined,
		input,
		format: state.inputMode === 'auto' ? 'latex' : state.inputMode,
		options: {},
		isRepl: true,
		evalState: state.evalState
	};

	const result = equivCmd.execute(ctx);
	console.log(result.output);
}

/**
 * Parse and display a mathematical expression.
 * If the expression contains variables and all are bound, auto-evaluates it.
 *
 * @param input - The expression to parse
 * @param state - Current REPL state
 * @returns Parsed AST, or undefined on error
 */
function processExpression(input: string, state: ReplState): MathNode | undefined {
	// Check for equivalence syntax: expr1 === expr2
	if (input.includes('===')) {
		handleEquivExpression(input, state);
		return state.lastAst; // Don't update lastAst for equiv
	}

	// Use forced format if mode is not 'auto'
	const forceFormat = state.inputMode === 'auto' ? undefined : state.inputMode;
	const result = parse(input, forceFormat ? { forceFormat } : undefined);

	// Display any errors
	if (result.errors.length > 0) {
		for (const err of result.errors) {
			if (err.position !== undefined) {
				console.log(formatInputError(input, err.position, err.message));
			} else {
				console.log(formatError(err));
			}
		}
		return undefined;
	}

	// Handle missing AST (shouldn't happen if no errors, but defensive)
	if (!result.ast) {
		console.log(chalk.red('Failed to parse expression'));
		return undefined;
	}

	// Check if expression has variables and all are bound - auto-evaluate
	const bindings = bindingsToRecord(state.evalState.bindings);
	const variables = getVariables(result.ast);

	// Auto-evaluate when:
	// 1. All variables are bound (if any), OR
	// 2. No variables and expression is evaluable (like sqrt(2))
	const canAutoEvaluate = variables.size === 0 || hasAllBindings(result.ast, bindings);

	if (canAutoEvaluate) {
		// Auto-evaluate since all variables are bound (or no variables)
		displayAutoEvaluation(result.ast, state);
	} else {
		// Use parse command to display the result (some variables unbound)
		const parseCmd = state.registry.get('parse');
		if (parseCmd) {
			const ctx: CommandContext = {
				ast: result.ast,
				input,
				format: result.inputFormat,
				options: {},
				isRepl: true,
				evalState: state.evalState
			};
			const cmdResult = parseCmd.execute(ctx);
			console.log(cmdResult.output);
		}
	}

	return result.ast;
}

/**
 * Display auto-evaluation result for an expression with all variables bound.
 *
 * @param ast - The AST to evaluate
 * @param state - Current REPL state
 */
function displayAutoEvaluation(ast: MathNode, state: ReplState): void {
	try {
		const bindings = bindingsToRecord(state.evalState.bindings);
		const variables = getVariables(ast);

		// Show which bindings are being used (only if there are variables)
		if (variables.size > 0) {
			const bindingsList: string[] = [];
			for (const varName of variables) {
				const value = state.evalState.bindings.get(varName);
				if (value) {
					bindingsList.push(`${varName}: ${toCustom(value)}`);
				}
			}
			console.log(chalk.dim('Evaluating with:') + ' {' + bindingsList.join(', ') + '}');
		}

		// Substitute variables
		const substituted = substitute(ast, bindings);

		// Evaluate using current mode
		const evalResult = evaluate(substituted, { mode: state.evalState.mode });

		// Format the result
		const resultStr = toCustom(evalResult.node);
		const latexStr = toLatex(evalResult.node);
		const exactStr = evalResult.exact ? chalk.green('(exact)') : chalk.yellow('(approximate)');

		console.log(chalk.bold('Result:') + ' ' + chalk.cyan(resultStr) + ' ' + exactStr);
		console.log(chalk.dim('LaTeX:') + '  ' + latexStr);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error during evaluation';
		console.log(chalk.red('Evaluation error:') + ' ' + message);
	}
}

#!/usr/bin/env node
/**
 * MathAST CLI Entry Point
 *
 * Command-line interface for parsing and transforming mathematical expressions.
 * Uses Commander.js for argument parsing.
 *
 * Usage:
 *   pnpm math                     # Start REPL
 *   pnpm math <expression>        # Parse expression
 *   pnpm math parse <expression>  # Explicit parse
 *   pnpm math tree <expression>   # Show AST tree only
 *   pnpm math latex <expression>  # Show LaTeX output only
 *   pnpm math repl                # Start REPL
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { parse, formatError, formatInputError } from './core';
import { createDefaultRegistry } from './commands';
import { startRepl } from './repl';
import type { CommandContext } from './types';

// =============================================================================
// Type Definitions
// =============================================================================

interface ParseOptions {
	output: string;
	colors: boolean;
	metadata?: boolean;
	format?: 'latex' | 'custom' | 'auto';
}

// =============================================================================
// Program Setup
// =============================================================================

const program = new Command();

program
	.name('math')
	.description('MathAST CLI - Parse and transform mathematical expressions')
	.version('0.1.0');

// =============================================================================
// Commands
// =============================================================================

// Parse command
program
	.command('parse <expression>')
	.alias('p')
	.description('Parse a mathematical expression')
	.option('-o, --output <format>', 'Output format: tree, latex, custom, both', 'both')
	.option('-f, --format <format>', 'Input format: latex, custom, auto', 'auto')
	.option('--no-colors', 'Disable colored output')
	.action((expression: string, options: { output: string; colors: boolean; format?: string }) => {
		handleParse(expression, {
			...options,
			format: (options.format as 'latex' | 'custom' | 'auto') || 'auto'
		});
	});

// Tree command
program
	.command('tree <expression>')
	.alias('t')
	.description('Show AST tree')
	.option('--no-colors', 'Disable colored output')
	.action((expression: string, options: { colors: boolean }) => {
		handleParse(expression, { output: 'tree', colors: options.colors });
	});

// LaTeX command
program
	.command('latex <expression>')
	.alias('l')
	.description('Output LaTeX')
	.option('-f, --format <format>', 'Input format: latex, custom, auto', 'auto')
	.option('--metadata', 'Render metadata')
	.action((expression: string, options: { metadata?: boolean; format?: string }) => {
		handleParse(expression, {
			output: 'latex',
			colors: true,
			metadata: options.metadata,
			format: (options.format as 'latex' | 'custom' | 'auto') || 'auto'
		});
	});

// Custom syntax command
program
	.command('custom <expression>')
	.alias('c')
	.description('Output custom syntax')
	.option('-f, --format <format>', 'Input format: latex, custom, auto', 'auto')
	.option('--metadata', 'Render metadata')
	.action((expression: string, options: { metadata?: boolean; format?: string }) => {
		handleParse(expression, {
			output: 'custom',
			colors: true,
			metadata: options.metadata,
			format: (options.format as 'latex' | 'custom' | 'auto') || 'auto'
		});
	});

// REPL command
program
	.command('repl')
	.description('Start interactive REPL')
	.action(() => {
		startRepl();
	});

// Default: if no command and no args, start REPL
// If args provided without command, treat as parse
program
	.argument('[expression]', 'Expression to parse (starts REPL if omitted)')
	.action((expression?: string) => {
		if (expression) {
			handleParse(expression, { output: 'both', colors: true });
		} else {
			startRepl();
		}
	});

// =============================================================================
// Parse Handler
// =============================================================================

/**
 * Handle expression parsing with the specified output format.
 *
 * @param expression - The expression to parse
 * @param options - Output options
 */
function handleParse(expression: string, options: ParseOptions): void {
	// Map format option to pipeline's forceFormat
	const forceFormat = options.format === 'auto' || !options.format ? undefined : options.format;
	const result = parse(expression, forceFormat ? { forceFormat } : undefined);

	// Display errors and exit
	if (result.errors.length > 0) {
		for (const err of result.errors) {
			if (err.position !== undefined) {
				console.log(formatInputError(expression, err.position, err.message));
			} else {
				console.log(formatError(err));
			}
		}
		process.exit(1);
	}

	// Handle missing AST
	if (!result.ast) {
		console.log(chalk.red('Failed to parse expression'));
		process.exit(1);
	}

	// Get command registry and build context
	const registry = createDefaultRegistry();
	const ctx: CommandContext = {
		ast: result.ast,
		input: expression,
		format: result.inputFormat,
		options: {
			colors: options.colors,
			metadata: options.metadata
		},
		isRepl: false
	};

	// Execute appropriate command based on output format
	switch (options.output) {
		case 'tree': {
			const treeCmd = registry.get('tree');
			if (treeCmd) {
				console.log(treeCmd.execute(ctx).output);
			}
			break;
		}
		case 'latex': {
			const latexCmd = registry.get('latex');
			if (latexCmd) {
				console.log(latexCmd.execute(ctx).output);
			}
			break;
		}
		case 'custom': {
			const customCmd = registry.get('custom');
			if (customCmd) {
				console.log(customCmd.execute(ctx).output);
			}
			break;
		}
		case 'both':
		default: {
			const parseCmd = registry.get('parse');
			if (parseCmd) {
				console.log(parseCmd.execute(ctx).output);
			}
			break;
		}
	}
}

// =============================================================================
// Entry Point
// =============================================================================

program.parse();

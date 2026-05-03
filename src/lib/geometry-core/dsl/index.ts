/**
 * Geometry DSL — French scripting language for geometry figures.
 *
 * Public API:
 * - parseDsl(script) — parse script to AST
 * - interpretDsl(program, figure?) — execute AST to produce Figure
 * - serializeDsl(figure, symbols?, options?) — convert Figure back to script.
 *   Pass `{ angleMode }` from the InterpretResult to preserve unite_angle()
 *   across round-trip.
 * - runDsl(script, figure?) — parse + interpret in one call
 */

// Types
export type { DslProgram, DslStatement, DslExpr, DslDirective } from './types';
export type { Token, TokenType } from './tokens';
export type { SymbolTable, SymbolEntry, SymbolType } from './symbol-table';
export type { InterpretResult, DirectiveHandler, DslStepper } from './interpreter';
export { createStepper } from './interpreter';

// Errors
export { DslParseError } from './errors';
export { DslRuntimeError } from './errors';
export { DslTokenizerError } from './tokenizer';

// Core functions
export { parse as parseDsl } from './parser';
export { interpret as interpretDsl } from './interpreter';
export { serialize as serializeDsl, serializeProgram as serializeDslProgram } from './serializer';

// Convenience: parse + interpret in one call
import { parse } from './parser';
import { interpret } from './interpreter';
import type { InterpretResult, DirectiveHandler } from './interpreter';
import type { Figure } from '../graph/figure';

export function runDsl(
	script: string,
	figure?: Figure,
	onDirective?: DirectiveHandler
): InterpretResult {
	const program = parse(script);
	return interpret(program, figure, onDirective);
}

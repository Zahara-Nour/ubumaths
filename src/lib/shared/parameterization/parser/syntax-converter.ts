/**
 * Syntax Converter - Convert between parameterization syntaxes
 * =============================================================
 *
 * Bidirectional conversion between Questions and Markdown syntax:
 * - Questions → Markdown: {@:var} → {{var}}, {#:1-10} → {{random:1-10}}, {eval:x} → {{eval:x}}
 * - Markdown → Questions: {{var}} → {@:var}, {{random:1-10}} → {#:1-10}, {{eval:x}} → {eval:x}
 *
 * Handles all token types:
 * - Variable references
 * - Random specifications (all formats)
 * - Eval expressions
 *
 * @module shared/parameterization/parser/syntax-converter
 */

import type { Syntax, Token } from '../types';
import { tokenize } from './tokenizer';

/**
 * Convert text from one parameterization syntax to another
 *
 * Performs bidirectional conversion while preserving:
 * - Token semantics (variable, random, eval)
 * - Nested structures (variable bounds in random specs)
 * - Exclusion patterns
 * - All other text content
 *
 * @param text - Text to convert
 * @param from - Source syntax
 * @param to - Target syntax
 * @returns Converted text
 *
 * @example Questions to Markdown (variables)
 * ```typescript
 * convertSyntax('Value is {@:a}', 'questions', 'markdown')
 * // → 'Value is {{a}}'
 * ```
 *
 * @example Questions to Markdown (random)
 * ```typescript
 * convertSyntax('Random: {#:1-10}', 'questions', 'markdown')
 * // → 'Random: {{random:1-10}}'
 * ```
 *
 * @example Questions to Markdown (eval)
 * ```typescript
 * convertSyntax('Result: {eval:a+b}', 'questions', 'markdown')
 * // → 'Result: {{eval:a+b}}'
 * ```
 *
 * @example Markdown to Questions
 * ```typescript
 * convertSyntax('Value is {{a}}', 'markdown', 'questions')
 * // → 'Value is {@:a}'
 * ```
 *
 * @example Complex random with variables (Questions → Markdown)
 * ```typescript
 * convertSyntax('{#:{@:min}-{@:max}!{@:excl}}', 'questions', 'markdown')
 * // → '{{random:{{min}}-{{max}}!{{excl}}}}'
 * ```
 *
 * @example Complex random with variables (Markdown → Questions)
 * ```typescript
 * convertSyntax('{{random:{{min}}-{{max}}}}', 'markdown', 'questions')
 * // → '{#:{@:min}-{@:max}}'
 * ```
 *
 * @example Mixed content
 * ```typescript
 * convertSyntax('Var: {@:a}, Random: {#:1-10}, Eval: {eval:a+5}', 'questions', 'markdown')
 * // → 'Var: {{a}}, Random: {{random:1-10}}, Eval: {{eval:a+5}}'
 * ```
 *
 * @example No-op (same syntax)
 * ```typescript
 * convertSyntax('{{a}}', 'markdown', 'markdown')
 * // → '{{a}}' (unchanged)
 * ```
 */
export function convertSyntax(text: string, from: Syntax, to: Syntax): string {
	// No-op if same syntax or if converting to/from 'both'
	if (from === to || from === 'both' || to === 'both') {
		return text;
	}

	// Tokenize with source syntax
	const tokens = tokenize(text, from);

	// Filter tokens to only those matching the source syntax
	const sourceTokens = tokens.filter((token) => token.syntax === from);

	// Sort by position (descending) to replace from end to start
	// This preserves position indices during replacement
	sourceTokens.sort((a, b) => b.start - a.start);

	// Replace each token with target syntax
	let result = text;
	for (const token of sourceTokens) {
		const replacement = convertToken(token, to);
		result = result.slice(0, token.start) + replacement + result.slice(token.end);
	}

	return result;
}

/**
 * Convert a single token to target syntax
 */
function convertToken(token: Token, targetSyntax: Syntax): string {
	// If target is 'both', keep original
	if (targetSyntax === 'both') {
		return token.content;
	}

	// Determine target syntax (must be questions or markdown at this point)
	const target = targetSyntax as 'questions' | 'markdown';

	// Convert based on token type
	switch (token.type) {
		case 'variable':
			return convertVariableToken(token.inner, target);
		case 'random':
			return convertRandomToken(token.inner, token.syntax, target);
		case 'eval':
			return convertEvalToken(token.inner, target);
	}
}

/**
 * Convert variable token
 *
 * @example Questions → Markdown
 * convertVariableToken('a', 'markdown') → '{{a}}'
 *
 * @example Markdown → Questions
 * convertVariableToken('a', 'questions') → '{@:a}'
 */
function convertVariableToken(varName: string, targetSyntax: 'questions' | 'markdown'): string {
	if (targetSyntax === 'questions') {
		return `{@:${varName}}`;
	} else {
		return `{{${varName}}}`;
	}
}

/**
 * Convert random token
 *
 * Handles nested variable references within random specs
 *
 * @example Questions → Markdown
 * convertRandomToken('1-10', 'questions', 'markdown') → '{{random:1-10}}'
 * convertRandomToken('{@:min}-{@:max}', 'questions', 'markdown') → '{{random:{{min}}-{{max}}}}'
 *
 * @example Markdown → Questions
 * convertRandomToken('1-10', 'markdown', 'questions') → '{#:1-10}'
 * convertRandomToken('{{min}}-{{max}}', 'markdown', 'questions') → '{#:{@:min}-{@:max}}'
 */
function convertRandomToken(
	inner: string,
	sourceSyntax: 'questions' | 'markdown',
	targetSyntax: 'questions' | 'markdown'
): string {
	// Recursively convert variable references within the random spec
	let convertedInner = inner;

	if (sourceSyntax === 'questions' && targetSyntax === 'markdown') {
		// Convert {@:var} → {{var}}
		convertedInner = convertedInner.replace(/\{@:(\w+)\}/g, '{{$1}}');
	} else if (sourceSyntax === 'markdown' && targetSyntax === 'questions') {
		// Convert {{var}} → {@:var}
		convertedInner = convertedInner.replace(/\{\{(\w+)\}\}/g, '{@:$1}');
	}

	// Wrap in appropriate syntax
	if (targetSyntax === 'questions') {
		return `{#:${convertedInner}}`;
	} else {
		return `{{random:${convertedInner}}}`;
	}
}

/**
 * Convert eval token
 *
 * @example Questions → Markdown
 * convertEvalToken('a+b', 'markdown') → '{{eval:a+b}}'
 *
 * @example Markdown → Questions
 * convertEvalToken('a+b', 'questions') → '{eval:a+b}'
 */
function convertEvalToken(expression: string, targetSyntax: 'questions' | 'markdown'): string {
	if (targetSyntax === 'questions') {
		return `{eval:${expression}}`;
	} else {
		return `{{eval:${expression}}}`;
	}
}

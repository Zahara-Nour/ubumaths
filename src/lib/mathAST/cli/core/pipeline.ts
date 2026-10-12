/**
 * Parsing Pipeline
 *
 * Converts input strings to MathAST nodes using the appropriate parser.
 * Handles format detection, parsing, and error collection.
 * Supports state-aware parsing with generic function names from EvalState.
 */

import type { PipelineResult, PipelineError, InputFormat } from '../types';
import type { LatexParserOptions } from '../../parser';
import { parseLatexSafe } from '../../parser';
import { parseCustomSafe } from '../../parser/custom';
import { detectInputFormat } from './input-detector';
import type { EvalState } from './eval-state';

// =============================================================================
// Pipeline Options
// =============================================================================

/**
 * Options for the parsing pipeline
 */
export interface PipelineOptions {
	/** Force a specific input format instead of auto-detecting */
	readonly forceFormat?: InputFormat;
	/** Evaluation state for parser configuration (generic functions) */
	readonly evalState?: EvalState;
}

// =============================================================================
// Parser Options from State
// =============================================================================

/**
 * Get parser options that include generic function names from EvalState.
 *
 * When functions are defined in the REPL (e.g., f(x) = x^2), the parser needs
 * to know these names to correctly parse expressions like f(3) or f'(x).
 *
 * @param state - Optional evaluation state containing function definitions
 * @returns LatexParserOptions configured for the state's functions
 *
 * @example
 * ```typescript
 * // With functions defined
 * const state = createEvalState();
 * createFunctionBinding(state, 'f', ['x'], parseLatex('x^2'));
 *
 * const options = getParserOptions(state);
 * // options = {
 * //   genericFunctions: {
 * //     names: ['f'],
 * //     allowDerivatives: true,
 * //     allowInverse: true,
 * //     allowComposition: true
 * //   }
 * // }
 * ```
 */
export function getParserOptions(state?: EvalState): LatexParserOptions {
	if (!state || state.functionNames.size === 0) {
		return {};
	}

	return {
		genericFunctions: {
			names: [...state.functionNames],
			allowDerivatives: true,
			allowInverse: true
		}
	};
}

// =============================================================================
// Pipeline Implementation
// =============================================================================

/**
 * Parse a mathematical expression into a MathAST node.
 *
 * This is the main entry point for the CLI parsing pipeline. It:
 * 1. Detects or uses the forced input format
 * 2. Routes to the appropriate parser
 * 3. Collects and formats any errors
 *
 * @param input - The mathematical expression to parse
 * @param options - Pipeline options
 * @returns Pipeline result with AST and any errors
 *
 * @example
 * ```typescript
 * // Auto-detect format
 * const result = parse('\\frac{a}{b}');
 *
 * // Force LaTeX format
 * const result = parse('a/b', { forceFormat: 'latex' });
 *
 * // Check for errors
 * if (result.errors.length > 0) {
 *   console.error('Parse errors:', result.errors);
 * }
 * ```
 */
/** Ce qui précède un « non » : le début, `(`, `,`, ou un « et »/« ou » déjà réécrit. */
const BEFORE_NOT = String.raw`(^|[(,]|&&|\|\||\\land|\\lor)(\s*)`;

/** Un « non » tapé `!` ou en toutes lettres, suivi de ce qu'il nie. */
const NOT_SIGN = new RegExp(BEFORE_NOT + String.raw`!(?=\s*[(\w\\])`, 'g');
const NOT_WORD = new RegExp(BEFORE_NOT + String.raw`(?:not|non)(?=\s*\(|\s+)`, 'g');

/** Une comparaison ou un opérateur logique dans l'entrée. */
const LOGICAL_CONTEXT = /[<>=≤≥≠]|\\(?:ne|neq|le|leq|ge|geq|lt|gt|land|lor)(?![a-z])|&&|\s\|\|\s/;

/** « et », « ou » en toutes lettres : entourés d'espaces seulement (`et := 3`, `ou*2` intacts). */
const AND_WORD = /(?<=\s)(?:and|et)(?=\s)/g;
const OR_WORD = /(?<=\s)(?:or|ou)(?=\s)/g;

/**
 * Les opérateurs logiques et d'égalité tapés comme en programmation ou en toutes lettres,
 * réécrits dans la notation du parseur (2026-10-12) : `&&`, ` and `, ` et ` → et ; ` || `,
 * ` or `, ` ou ` → ou ; `!`, `not`, `non` → non ; `==`, `===` → = ; `!=`, `!==` → ≠. Ils
 * répondaient « Unexpected token », ou se lisaient lettre par lettre. Le LaTeX n'a que `\land`,
 * `\lor`, `\lnot`, `\ne` ; il lisait `2 != 3` comme `factorial(2) = 3`.
 *
 * ⚠️ Au plus près, sans rien changer de ce qui se lisait déjà (revue) : `||` et les mots
 * seulement entourés d'espaces (`||-2||` est une norme, `|2||3|` deux valeurs absolues,
 * `et := 3` une variable) ; un « non » seulement en tête, après `(`, `,` ou un « et »/« ou »
 * (`5 !`, `2 + 3 !`, `|-3|!` sont des factorielles) ; aucun mot dans `\text{…}`.
 */
function withLogicOperators(input: string, format: 'latex' | 'custom'): string {
	const latex = format === 'latex';
	const and = latex ? ' \\land ' : ' && ';
	const or = latex ? ' \\lor ' : ' || ';
	const not = latex ? '\\lnot ' : '!';
	let text = input
		.replace(/!==?/g, latex ? ' \\ne ' : '!=')
		.replace(/(?<![=!<>:])={2,3}(?!=)/g, '=')
		.replace(/&&/g, and)
		.replace(/\s\|\|\s/g, or);
	// Les mots et le « non » seulement dans une comparaison ou une expression logique : sans
	// elle, `non + 1`, `x et y` parlent d'une variable (2ᵉ revue)
	if (!LOGICAL_CONTEXT.test(text)) return text;
	if (!/\\(?:text|operatorname)/.test(text)) {
		text = text.replace(AND_WORD, and.trim()).replace(OR_WORD, or.trim());
	}
	text = text.replace(NOT_SIGN, `$1$2${not}`);
	if (!/\\(?:text|operatorname)/.test(text)) text = text.replace(NOT_WORD, `$1$2${not}`);
	return text;
}

export function parse(input: string, options?: PipelineOptions): PipelineResult {
	const trimmedInput = input.trim();

	// Detect or use forced format
	const detection = options?.forceFormat
		? { format: options.forceFormat, confidence: 1 }
		: detectInputFormat(trimmedInput);

	const errors: PipelineError[] = [];

	// Handle unknown format
	if (detection.format === 'unknown') {
		errors.push({
			code: 'UNSUPPORTED_FORMAT',
			message: 'Could not determine input format.',
			suggestion: 'Try using LaTeX syntax, e.g., x^2 + 3x - 5'
		});
		return { errors, inputFormat: detection.format };
	}

	// Parse based on detected format
	if (detection.format === 'custom') {
		const result = parseCustomSafe(withLogicOperators(trimmedInput, 'custom'), {
			mode: 'tolerant'
		});

		// Convert parser errors to pipeline errors
		for (const err of result.errors) {
			errors.push({
				code: 'PARSE_ERROR',
				message: err.message,
				position: err.position
			});
		}

		return {
			ast: result.ast ?? undefined,
			errors,
			inputFormat: detection.format
		};
	}

	// Parse as LaTeX (default)
	// Get parser options from evaluation state (includes generic function names)
	const parserOptions = getParserOptions(options?.evalState);
	const result = parseLatexSafe(withLogicOperators(trimmedInput, 'latex'), {
		mode: 'tolerant',
		...parserOptions
	});

	// Convert parser errors to pipeline errors
	for (const err of result.errors) {
		errors.push({
			code: 'PARSE_ERROR',
			message: err.message,
			position: err.position
		});
	}

	return {
		ast: result.ast ?? undefined,
		errors,
		inputFormat: detection.format
	};
}

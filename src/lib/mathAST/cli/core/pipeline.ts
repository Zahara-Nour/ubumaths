/**
 * Parsing Pipeline
 *
 * Converts input strings to MathAST nodes using the appropriate parser.
 * Handles format detection, parsing, and error collection.
 * Supports state-aware parsing with generic function names from EvalState.
 */

import type { PipelineResult, PipelineError, InputFormat } from '../types';
import type { GenericFunctionConfig, LatexParserOptions } from '../../parser';
import { DEFAULT_GENERIC_FUNCTIONS, parseLatexSafe } from '../../parser';
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

/**
 * Les fonctions que lit le parseur : les noms par défaut (f, g, h…) ET ceux liés
 * dans l'état. Sans état, `undefined` : le défaut du parseur.
 *
 * ⚠️ Les deux parseurs, texte et LaTeX : seul le LaTeX recevait les noms liés,
 * et le moteur ne transmettait pas son état — `.def k(x) = x+1` puis `k(0)`
 * restait `k(0)` (2026-10-13).
 */
function genericFunctionsOf(state?: EvalState): GenericFunctionConfig | undefined {
	const bound = getParserOptions(state).genericFunctions;
	if (!bound) return undefined;
	return {
		...bound,
		names: [...new Set([...DEFAULT_GENERIC_FUNCTIONS.names, ...bound.names])]
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

/** Un « non » devant une parenthèse : `!(…)`, `non(…)`, `not (…)`. */
const NOT_BEFORE_PAREN = new RegExp(BEFORE_NOT + String.raw`(?:!|not|non)(?=\s*\()`, 'g');

/**
 * Un « non » sans parenthèses, suivi de ce qu'il nie : `not 2 > 1`, `! 2 > 1`, `!2 < 1`. Un mot
 * suivi d'un opérateur (`non > 1`) parle d'une variable.
 */
const BARE_NOT = new RegExp(BEFORE_NOT + String.raw`(?:!\s*|\\lnot\s*|(?:not|non)\s+)(?=[\w\\!])`);

/** Une comparaison ou un opérateur logique dans l'entrée (`b && !c`, `b || c` avec b := 2 > 1). */
const LOGICAL_CONTEXT = /[<>=≤≥≠]|\\(?:ne|neq|le|leq|ge|geq|lt|gt|land|lor|lnot)(?![a-z])|&&|\|\|/;

/** « et », « ou » en toutes lettres : entourés d'espaces seulement (`et := 3`, `ou*2` intacts). */
const AND_WORD = /(?<=\s)(?:and|et)(?=\s)/g;
const OR_WORD = /(?<=\s)(?:or|ou)(?=\s)/g;

/** Les barres `|` avant une position : un nombre impair, on est dans une valeur absolue. */
function insideAbsoluteValue(text: string, offset: number): boolean {
	return (text.slice(0, offset).match(/\|/g)?.length ?? 0) % 2 === 1;
}

/**
 * Le « non » sans parenthèses porte sur toute la comparaison qui le suit, jusqu'au prochain
 * « et »/« ou », à une virgule ou à la parenthèse fermante : `not 2 > 1` est non(2 > 1), pas
 * (non 2) > 1 — le « non » du LaTeX lie plus fort que la comparaison.
 */
function withBareNotsWrapped(text: string, not: string, markers: readonly string[]): string {
	let result = text;
	for (let match = BARE_NOT.exec(result); match !== null; match = BARE_NOT.exec(result)) {
		const start = match.index + match[0].length;
		let end = start;
		let depth = 0;
		while (end < result.length) {
			const char = result[end];
			if (depth === 0 && (',;'.includes(char) || markers.some((m) => result.startsWith(m, end)))) {
				break;
			}
			if ('([{'.includes(char)) depth += 1;
			if (')]}'.includes(char)) {
				if (depth === 0) break;
				depth -= 1;
			}
			end += 1;
		}
		const operand = result.slice(start, end).trimEnd();
		const before = match.index + match[1].length + match[2].length;
		// `!!2 > 1`, `\\lnot\\lnot 2 > 1` : le « non » suivant est enveloppé au tour d'après
		result = `${result.slice(0, before)}${not}(${operand})${result.slice(start + operand.length)}`;
	}
	return result;
}

/**
 * Les opérateurs logiques et d'égalité tapés comme en programmation ou en toutes lettres,
 * réécrits dans la notation du parseur (2026-10-12) : `&&`, ` and `, ` et ` → et ; ` || `,
 * ` or `, ` ou ` → ou ; `!`, `not`, `non` → non ; `==`, `===` → = ; `!=`, `!==` → ≠. Ils
 * répondaient « Unexpected token », ou se lisaient lettre par lettre. Le LaTeX n'a que `\land`,
 * `\lor`, `\lnot`, `\ne` ; il lisait `2 != 3` comme `factorial(2) = 3`.
 *
 * ⚠️ Au plus près, sans rien changer de ce qui se lisait déjà (revues) : les mots et le « non »
 * seulement s'il y a une comparaison ou un opérateur logique (`non + 1`, `x et y` parlent de
 * variables ; `b && !c` de booléens) ; `||` et les mots entourés d'espaces, `||` hors d'une
 * valeur absolue (`||-2||`, `| 2 || 3 |`) ; un « non » seulement en tête, après `(`, `,` ou un « et »/« ou » (`5 !`,
 * `|-3|!` sont des factorielles) ; aucun mot dans `\text{…}`.
 */
function withLogicOperators(input: string, format: 'latex' | 'custom'): string {
	const latex = format === 'latex';
	const and = latex ? '\\land' : '&&';
	const or = latex ? '\\lor' : '||';
	const not = latex ? '\\lnot ' : '!';
	let text = input
		.replace(/!==?/g, latex ? ' \\ne ' : '!=')
		.replace(/(?<![=!<>:])={2,3}(?!=)/g, '=')
		.replace(/&&/g, ` ${and} `)
		.replace(/\s\|\|\s/g, (bars, offset: number, whole: string) =>
			insideAbsoluteValue(whole, offset) ? bars : ` ${or} `
		);
	if (!LOGICAL_CONTEXT.test(text)) return text;

	if (!/\\(?:text|operatorname)/.test(text)) {
		text = text.replace(AND_WORD, and).replace(OR_WORD, or);
	}
	text = text.replace(NOT_BEFORE_PAREN, `$1$2${not}`);
	return withBareNotsWrapped(text, not, [and, or]);
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
		const genericFunctions = genericFunctionsOf(options?.evalState);
		const result = parseCustomSafe(withLogicOperators(trimmedInput, 'custom'), {
			mode: 'tolerant',
			...(genericFunctions && { genericFunctions })
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
	// Les noms de fonctions liées dans l'état, en plus des noms par défaut
	const genericFunctions = genericFunctionsOf(options?.evalState);
	const result = parseLatexSafe(withLogicOperators(trimmedInput, 'latex'), {
		mode: 'tolerant',
		...(genericFunctions && { genericFunctions })
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

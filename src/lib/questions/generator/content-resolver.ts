/**
 * Content Resolver
 * ================
 *
 * Resolves markdown templates by replacing variables and generating
 * random values in markdown content.
 *
 * Uses variable-resolver which wraps shared library for full resolution pipeline.
 *
 * Key feature: After variable resolution, content inside $...$ and $$...$$ delimiters
 * is converted from custom mathAST syntax to LaTeX. Content inside ~...~ and ~~...~~
 * remains in custom syntax (for answer comparison, etc.).
 *
 * @module questions/generator/content-resolver
 */

import { evaluateConditionStrict } from './condition-evaluator';
import type { ResolvedVariable } from '../types';
import type { TemplateMarkdown, ResolvedMarkdown } from '$lib/ubumark';
import { resolvedMarkdown } from '$lib/ubumark';
import { resolveVariableExpression } from './variable-resolver';
import { resolveColorReferences } from '../parser/color-parser';
import { parseCustomSafe, toLatex } from '$lib/mathAST';

// ============================================================================
// MATH ZONE CONVERSION
// ============================================================================

/**
 * Regex patterns for math delimiters
 *
 * Important: Process block math ($$...$$) before inline ($...$) to avoid
 * misinterpreting $$ as two inline delimiters.
 */
const MATH_ZONE_REGEX = /\$\$([\s\S]+?)\$\$|\$([^$\n]+)\$/g;

/**
 * Regex to match expression markers at the start of math content.
 */
const EXPR_MARKER_REGEX = /^<<expr:(expression[a-zA-Z0-9]*)>>/;

// Nombres exacts rendus par `{{eval:…}}` : `\dfrac{9}{7}`, `\sqrt{2}`, `\dfrac{\sqrt{3}}{2}`.
// Arguments NUMÉRIQUES seulement : une formule d'auteur (`\dfrac{-b}{2a}`) n'est pas réécrite.
const EXACT_SQRT_REGEX = /\\sqrt\{([\d.\s]+)\}/g;
const EXACT_DFRAC_REGEX =
	/\\dfrac\{((?:[-\d.\s]|sqrt\([\d.\s]+\))+)\}\{((?:[\d.\s]|sqrt\([\d.\s]+\))+)\}/g;

/**
 * Réécrit en syntaxe maison les nombres exacts que `{{eval:…}}` insère en LaTeX
 * (`\dfrac{9}{7}` → `{{9}/{7}}`, `\sqrt{2}` → `sqrt(2)`), pour qu'une formule
 * maison qui les contient reste convertible (`3*\dfrac{9}{7}` → `3 \times \dfrac{9}{7}`).
 */
function exactLatexToCustom(content: string): string {
	let previous: string;
	let result = content;
	do {
		previous = result;
		result = result.replace(EXACT_SQRT_REGEX, 'sqrt($1)').replace(EXACT_DFRAC_REGEX, '{{$1}/{$2}}');
	} while (result !== previous);
	return result;
}

/**
 * Formule maison → LaTeX. Si elle ne se lit pas telle quelle, second essai après
 * réécriture des nombres exacts ; sinon `null` (formule LaTeX, laissée intacte).
 */
function customToLatex(content: string): string | null {
	const direct = parseCustomSafe(content);
	if (direct.ast) return toLatex(direct.ast, { preserveHoles: true });
	if (!content.includes('\\dfrac') && !content.includes('\\sqrt')) return null;
	const rewritten = parseCustomSafe(exactLatexToCustom(content));
	return rewritten.ast ? toLatex(rewritten.ast, { preserveHoles: true }) : null;
}

/**
 * Convert content inside $...$ and $$...$$ from custom syntax to LaTeX
 *
 * After variable resolution, math zones contain custom mathAST syntax.
 * This function converts that syntax to LaTeX for rendering.
 *
 * Handles:
 * - `<<expr:NAME>>` markers: stripped before parsing, re-added after conversion
 * - `?` hole markers: preserved as `?` via toLatex({ preserveHoles: true }).
 *   Without this, the parser would emit \placeholder[N]{} with local 1-based
 *   indices per zone. assignBlankIndices needs raw `?` to assign global 0-based
 *   indices across statement blanks, text blanks, AND expression answerFormats.
 *
 * Note: ~...~ and ~~...~~ zones are NOT converted - they stay in custom
 * syntax for answer comparison and other non-display purposes.
 *
 * @param content - Content with resolved variables
 * @returns Content with math zones converted to LaTeX
 */
function convertMathZonesToLatex(content: string): string {
	let result = content;

	// Helper to convert a single expression, handling markers and ? preservation
	const convertExpression = (expr: string): string => {
		// Check for and strip expression marker <<expr:NAME>>
		let prefix = '';
		let mathContent = expr;
		const markerMatch = mathContent.match(EXPR_MARKER_REGEX);
		if (markerMatch) {
			prefix = markerMatch[0];
			mathContent = mathContent.slice(markerMatch[0].length);
		}

		// preserveHoles: ? stays as ? (not \placeholder[N]{}) for assignBlankIndices
		const latex = customToLatex(mathContent.trim());
		// On parse error, return original (will show error at render time)
		return prefix + (latex ?? mathContent);
	};

	// Blocs `$$…$$` et formules `$…$` en UNE passe : en deux passes, le texte entre deux
	// blocs d'une même ligne (`$$x$$ et $$y$$`) était lu comme une formule `$ et $`
	result = result.replace(MATH_ZONE_REGEX, (_match, block: string | undefined, inline: string) =>
		block !== undefined ? `$$${convertExpression(block)}$$` : `$${convertExpression(inline)}$`
	);

	return result;
}

// ============================================================================
// CONTENT RESOLUTION
// ============================================================================

/**
 * Resolve markdown content by replacing all placeholders with values
 *
 * Pipeline:
 * 1. Replace {{var}}, {{random:...}}, {{eval:...}} with resolved values
 * 2. Resolve color references
 * 3. Convert math zones ($...$, $$...$$) from custom syntax to LaTeX
 *
 * @param markdown - Template markdown containing placeholders
 * @param resolvedVariables - Already resolved variables
 * @param seed - Optional seed for random generation
 * @returns Resolved markdown ready for rendering
 */
export function resolveMarkdownContent(
	markdown: TemplateMarkdown,
	resolvedVariables: ResolvedVariable[],
	seed?: number
): ResolvedMarkdown {
	// Stage 0: conditions sur les variables tirées (`{{if:…}}`) → branche retenue
	const withoutConditionals = resolveVariableConditionals(String(markdown), resolvedVariables);

	// Stage 1: Resolve variables, random expressions, and eval expressions
	// Use displayValue when available (e.g., removeSpaces inserts {} between digits).
	// Sans aucun marqueur `{{…}}`, le résolveur remplacerait les noms de variables écrits
	// en clair (prévu pour `a^b*a^c`) : dans un texte, « Il a gagné » deviendrait « Il 4 gagné »
	let resolvedContent = withoutConditionals.includes('{{')
		? resolveVariableExpression(withoutConditionals, resolvedVariables, seed, {
				useDisplayValue: true
			})
		: withoutConditionals;

	// Stage 2: Resolve color references
	resolvedContent = resolveColorReferences(resolvedContent, seed);

	// Stage 3: Convert math zones ($...$, $$...$$) from custom to LaTeX
	// Note: ~...~ and ~~...~~ remain in custom syntax
	resolvedContent = convertMathZonesToLatex(resolvedContent);

	return resolvedMarkdown(resolvedContent);
}

/**
 * Resolve a string expression (for answers, blanks, etc.)
 *
 * @param expression - Expression string
 * @param resolvedVariables - Already resolved variables
 * @param seed - Optional seed for random generation
 * @returns Resolved string
 */
export function resolveExpression(
	expression: string,
	resolvedVariables: ResolvedVariable[],
	seed?: number
): string {
	// Database now stores pure markdown syntax ({{...}}) directly
	// No conversion needed anymore
	let resolved = resolveVariableExpression(expression, resolvedVariables, seed);
	// Also resolve color references
	resolved = resolveColorReferences(resolved, seed);
	return resolved;
}

/**
 * Insert <<expr:NAME>> markers before expression variable references in template markdown.
 *
 * For each {{expressionNAME}} reference where NAME is in the expressionNames set,
 * inserts `<<expr:NAME>>` before the reference. After variable resolution,
 * this produces `<<expr:NAME>>resolvedValue` in the output.
 *
 * @param content - Template markdown content
 * @param expressionNames - Set of variable names starting with "expression"
 * @returns Modified content with markers inserted
 */
export function insertExpressionMarkers(content: string, expressionNames: Set<string>): string {
	if (expressionNames.size === 0) return content;

	return content.replace(/\{\{(expression[a-zA-Z0-9]*)\}\}/g, (match, name: string) => {
		if (expressionNames.has(name)) {
			return `<<expr:${name}>>${match}`;
		}
		return match;
	});
}

/**
 * Resolve an answerFormat string: variable resolution + LaTeX conversion.
 *
 * The answerFormat can contain variable references (e.g., "{{a}}^?") and
 * custom mathAST syntax. This function:
 * 1. Resolves variables: "{{a}}^?" → "5^?"
 * 2. Converts to LaTeX, preserving ? markers: "5^?" → "5^{?}"
 *
 * The ? markers are preserved for later replacement by assignBlankIndices.
 *
 * @param answerFormat - Answer format template string
 * @param resolvedVariables - Already resolved variables
 * @param seed - Optional seed for random generation
 * @returns Resolved answerFormat in LaTeX with ? markers preserved
 */
export function resolveAnswerFormat(
	answerFormat: string,
	resolvedVariables: ResolvedVariable[],
	seed?: number
): string {
	// Stage 1: Resolve variables and color references
	let resolved = resolveVariableExpression(answerFormat, resolvedVariables, seed);
	resolved = resolveColorReferences(resolved, seed);

	// Stage 2: Convert to LaTeX
	// preserveHoles: ? stays as ? (not \placeholder[N]{}) for assignBlankIndices
	const parseResult = parseCustomSafe(resolved.trim());
	if (parseResult.ast) {
		resolved = toLatex(parseResult.ast, { preserveHoles: true });
	}

	return resolved;
}

/**
 * Convert a resolved expectedAnswer to LaTeX (for flash back display).
 *
 * @param expectedAnswer - Resolved expected answer string (e.g., "5", "10^5")
 * @returns LaTeX string, or undefined if conversion fails
 */
export function convertToLatex(expression: string): string {
	return customToLatex(expression.trim()) ?? expression;
}

/** Fin (exclue) du marqueur `{{if:…}}` ouvert en `start` : accolades équilibrées, -1 sinon */
function conditionalEnd(text: string, start: number): number {
	let depth = 0;
	for (let i = start; i < text.length; i++) {
		if (text[i] === '{') depth++;
		else if (text[i] === '}' && --depth === 0) return i + 1;
	}
	return -1;
}

/**
 * Découpe `condition|alors|sinon` sur les `|` hors accolades (une branche peut contenir du
 * LaTeX) ; `\\left|`, `\\right|` et `\\|` (valeur absolue, norme) ne séparent pas.
 */
function splitConditional(inner: string): string[] {
	const parts: string[] = [];
	let depth = 0;
	let current = '';
	for (const char of inner) {
		if (char === '{') depth++;
		if (char === '}') depth--;
		const isDelimiter = /(?:\\left|\\right|\\)$/.test(current);
		if (char === '|' && depth === 0 && !isDelimiter) {
			parts.push(current);
			current = '';
		} else {
			current += char;
		}
	}
	parts.push(current);
	return parts;
}

/** Mots de la syntaxe des conditions qui ne sont pas des noms de variables */
const CONDITION_KEYWORDS = new Set(['and', 'or', 'not']);

/**
 * La condition ne nomme-t-elle QUE des variables tirées ? (`mod({{a}},2)=0` oui ;
 * `{{answer}}={{a}}`, `isCorrect`, `x=x` non : réponse de l'élève ou inconnue, que le
 * calcul trancherait à tort). Les noms suivis de `(` sont des fonctions.
 */
function isVariableCondition(condition: string, resolvedVariables: ResolvedVariable[]): boolean {
	const names = new Set(resolvedVariables.map((v) => v.name));
	const identifiers = condition
		.replace(/\{\{(\w+)\}\}/g, ' $1 ')
		.match(/[a-zA-Z_]\w*(?!\w*\s*\()/g);
	return (identifiers ?? []).every((id) => names.has(id) || CONDITION_KEYWORDS.has(id));
}

/**
 * `{{if:condition|alors}}` ou `{{if:condition|alors|sinon}}` dont la condition porte sur
 * les VARIABLES tirées (`{{if:mod(a,2)=0|… est pair}}`, repris de TinyMath) : remplacé
 * à la génération par la branche retenue. Une condition illisible avec les variables
 * (`isCorrect`, réponse de l'élève) est laissée telle quelle : le navigateur la résout.
 * Les branches peuvent contenir des accolades (`\\begin{align}`) et d'autres `{{if:…}}`.
 */
export function resolveVariableConditionals(
	text: string,
	resolvedVariables: ResolvedVariable[]
): string {
	let result = '';
	let index = 0;
	while (index < text.length) {
		const start = text.indexOf('{{if:', index);
		const end = start === -1 ? -1 : conditionalEnd(text, start);
		if (end === -1) {
			result += text.slice(index);
			break;
		}
		result += text.slice(index, start);
		const parts = splitConditional(text.slice(start + '{{if:'.length, end - 2));
		let replacement = text.slice(start, end);
		if (
			(parts.length === 2 || parts.length === 3) &&
			isVariableCondition(parts[0], resolvedVariables)
		) {
			try {
				const branch = evaluateConditionStrict(parts[0], resolvedVariables)
					? parts[1]
					: (parts[2] ?? '');
				replacement = resolveVariableConditionals(branch, resolvedVariables);
			} catch {
				// Condition côté élève : conservée
			}
		}
		result += replacement;
		index = end;
	}
	return result;
}

/**
 * Bon choix d'un QCM donné par une condition : `{{if:condition|A|B}}` → A si la
 * condition est vraie pour les variables tirées, B sinon (forme produite depuis
 * le ternaire TinyMath `condition ?? A :: B`). Toute autre valeur est rendue
 * telle quelle.
 */
export function resolveConditionalChoice(
	value: string,
	resolvedVariables: ResolvedVariable[]
): string {
	const match = value.trim().match(/^\{\{if:(.+)\|([^|{}]*)\|([^|{}]*)\}\}$/);
	if (!match) return value;
	const [, condition, whenTrue, whenFalse] = match;
	// L'évaluateur de conditions note l'égalité « = » (comme TinyMath).
	// Condition illisible → erreur (la génération échoue) plutôt qu'un choix B
	// désigné en silence comme bon.
	return evaluateConditionStrict(condition, resolvedVariables) ? whenTrue.trim() : whenFalse.trim();
}

/**
 * Resolve correctChoiceIndex (can be string, array of strings, or undefined for fill_in_blanks)
 *
 * @param solution - correctChoiceIndex from template (expected answer index)
 * @param resolvedVariables - Already resolved variables
 * @param seed - Optional seed for random generation
 * @returns Resolved correctChoiceIndex, or undefined if input is undefined
 */
export function resolveSolution(
	solution: string | string[],
	resolvedVariables: ResolvedVariable[],
	seed?: number
): string | string[];
export function resolveSolution(
	solution: string | string[] | undefined,
	resolvedVariables: ResolvedVariable[],
	seed?: number
): string | string[] | undefined;
export function resolveSolution(
	solution: string | string[] | undefined,
	resolvedVariables: ResolvedVariable[],
	seed?: number
): string | string[] | undefined {
	if (solution === undefined) return undefined;

	if (Array.isArray(solution)) {
		return solution.map((sol) => resolveExpression(sol, resolvedVariables, seed));
	}

	return resolveExpression(solution, resolvedVariables, seed);
}

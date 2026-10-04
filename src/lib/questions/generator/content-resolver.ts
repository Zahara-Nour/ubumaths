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
import { resolveVariableConditionals } from './variable-conditionals';
import type { ResolvedVariable } from '../types';
import type { TemplateMarkdown, ResolvedMarkdown } from '$lib/ubumark';
import { resolvedMarkdown } from '$lib/ubumark';
import { resolveVariableExpression } from './variable-resolver';
import { resolveColorReferences } from '../parser/color-parser';
import type { RandomSource } from '$lib/utils/random';
import { parseCustomSafe, toLatex, type GenericFunctionConfig, type MathNode } from '$lib/mathAST';
import { parse as parseUnit } from '$lib/mathAST/units/parser';
import { cleanCoefficientsAst, latexRelationsToCustom } from '../clean-coefficients';

export { resolveVariableConditionals };

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
 * Nom d'une courbe, d'une droite, d'un plan devant sa formule : `P :`, `(P) :`, `d :`,
 * `\\mathcal{P} :`, `\\Delta :`, `\\mathcal{P}\\colon` (décision de David du 2026-10-04).
 * Une lettre (indice, prime), une lettre calligraphiée ou une commande, éventuellement
 * entre parenthèses.
 */
const FORMULA_NAME_CORE = String.raw`(?:\\math(?:cal|scr|bb|bf|rm|frak)\{[A-Za-z]\}|\\[A-Za-z]+|[A-Za-z]'?)(?:_\{?[A-Za-z0-9]+\}?)?`;
const NAMED_FORMULA_REGEX = new RegExp(
	String.raw`^\s*(\(\s*${FORMULA_NAME_CORE}\s*\)|${FORMULA_NAME_CORE})\s*(:|\\colon)\s*(\S[\s\S]*)$`
);

/**
 * `P : -1x+(0)y+(1)z+(0)=0` nettoyé en `P : -x + z = 0`, le nom gardé tel qu'écrit.
 * Lue d'un bloc, la formule devenait `P : (-1)·x…` (le −1 n'était plus un coefficient
 * de tête), `(P)` perdait ses parenthèses et `\\mathcal{P}` la rendait illisible. Seule
 * une RELATION après le nom est concernée ; rien à nettoyer → `null` (lecture d'un bloc,
 * comme avant).
 */
function cleanNamedFormula(
	content: string,
	genericFunctions?: GenericFunctionConfig
): string | null {
	const match = NAMED_FORMULA_REGEX.exec(content);
	if (!match) return null;
	const [, name, separator, formula] = match;
	const ast =
		parseCustomSafe(formula, { genericFunctions }).ast ??
		parseCustomSafe(latexRelationsToCustom(exactLatexToCustom(formula)), { genericFunctions }).ast;
	if (!ast || ast.type !== 'relation') return null;
	const cleaned = cleanCoefficientsAst(ast);
	if (cleaned === ast) return null;
	return `${name} ${separator} ${toLatex(cleaned, { preserveHoles: true })}`;
}

/**
 * Formule maison → LaTeX. Si elle ne se lit pas telle quelle, second essai après
 * réécriture des nombres exacts ; sinon `null` (formule LaTeX, laissée intacte).
 * `genericFunctions` : fonctions déclarées par le modèle (absent : défauts du parseur).
 * `cleanCoefficients` : option du modèle, `1x-1y+0` → `x-y` (cf. clean-coefficients.ts).
 */
function customToLatex(
	content: string,
	genericFunctions?: GenericFunctionConfig,
	cleanCoefficients = false
): string | null {
	const render = (ast: MathNode) =>
		toLatex(cleanCoefficients ? cleanCoefficientsAst(ast) : ast, { preserveHoles: true });
	// Nom devant la formule (`\\mathcal{P} : …`) : gardé, la formule seule est nettoyée
	const named = cleanCoefficients ? cleanNamedFormula(content, genericFunctions) : null;
	if (named !== null) return named;
	const direct = parseCustomSafe(content, { genericFunctions });
	if (direct.ast) return render(direct.ast);
	if (cleanCoefficients && latexRelationsToCustom(content) !== content) {
		// Inégalité écrite en LaTeX (`x^2+1x\\leqslant2`) : relue en syntaxe maison pour
		// être nettoyée ; rien à nettoyer, le texte d'auteur reste à l'octet près
		const relation = parseCustomSafe(latexRelationsToCustom(exactLatexToCustom(content)), {
			genericFunctions
		});
		if (relation.ast) {
			const cleaned = cleanCoefficientsAst(relation.ast);
			return cleaned === relation.ast ? null : toLatex(cleaned, { preserveHoles: true });
		}
	}
	if (!content.includes('\\dfrac') && !content.includes('\\sqrt')) return null;
	const rewritten = parseCustomSafe(exactLatexToCustom(content), { genericFunctions });
	return rewritten.ast ? render(rewritten.ast) : null;
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
 * @param genericFunctions - Fonctions déclarées par le modèle (absent : défauts du parseur)
 * @param cleanCoefficients - Option du modèle : coefficients nettoyés (`1x` → `x`)
 * @returns Content with math zones converted to LaTeX
 */
function convertMathZonesToLatex(
	content: string,
	genericFunctions?: GenericFunctionConfig,
	cleanCoefficients = false
): string {
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
		const latex = customToLatex(mathContent.trim(), genericFunctions, cleanCoefficients);
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
// GRANDEURS INSÉRÉES (chantier Grandeurs, relecture du lot 4)
// ============================================================================

/** Une grandeur en syntaxe maison : `28[mm]`, `-3[m]`, `5.003[km]` */
const HOUSE_QUANTITY = String.raw`-?\d+(?:\.\d+)?\[[^\[\]\s]+\]`;

/** Une durée écrite par `;hms` : `{2[h]}{15[min]}` (deux ou trois morceaux) */
const HMS_REGEX = new RegExp(
	String.raw`\{(${HOUSE_QUANTITY})\}\{(${HOUSE_QUANTITY})\}(?:\{(${HOUSE_QUANTITY})\})?`,
	'g'
);

/**
 * Une grandeur isolée, pas collée à un mot ni à un autre nombre : ni la fin d'un décimal à
 * virgule (`1,5[m]`), ni celle d'un nombre groupé par `{}` (`12{}345[m]`). L'accolade qui
 * ferme `\begin{align}` n'en est pas une : `\begin{align}4[h] &= …` (relecture #467).
 */
const QUANTITY_REGEX =
	/(?:(?<![\w.,}\]])|(?<=\\begin\{[a-zA-Z*]+\}))(-?\d+(?:\.\d+)?)\[([^[\]\s]+)\]/g;

/**
 * Zones d'un contenu : code (```…```, `…`) et zones maison (`~~…~~`, `~…~`) laissés tels quels,
 * formules `$$…$$`/`$…$` ; le reste est du texte
 */
const ZONE_REGEX = /```[\s\S]*?```|`[^`\n]*`|\$\$[\s\S]+?\$\$|\$[^$\n]+\$|~~[\s\S]+?~~|~[^~\n]+~/g;

/** `28[mm]` → `28~\unit{mm}`, seulement si l'unité existe (un crochet de calcul reste tel quel) */
function quantityToLatex(quantity: string): string {
	return quantity.replace(QUANTITY_REGEX, (match, value: string, unit: string) =>
		parseUnit(unit) === null ? match : `${value}~\\unit{${unit}}`
	);
}

/** Les grandeurs d'un contenu LaTeX : durées composées d'abord, puis grandeurs isolées */
function latexQuantities(latex: string): string {
	const durations = latex.replace(HMS_REGEX, (match, ...parts: Array<string | undefined>) => {
		const pieces = parts.slice(0, 3).filter((p): p is string => typeof p === 'string');
		const converted = pieces.map(quantityToLatex);
		return converted.some((c, i) => c === pieces[i]) ? match : converted.join('~');
	});
	return quantityToLatex(durations);
}

/**
 * Une grandeur insérée dans une formule d'auteur (`$$ 7[mm] \times 4 = 28[mm] $$`, que la
 * conversion maison → LaTeX laisse telle quelle) ou dans le TEXTE (« la réponse est
 * 28[mm] ») s'affichait brute. Formule : `\unit` ; texte : une formule `$…$`. Les zones
 * maison `~…~` restent en syntaxe maison (le rendu les convertit).
 */
function displayQuantities(content: string): string {
	let result = '';
	let last = 0;
	for (const zone of content.matchAll(ZONE_REGEX)) {
		const start = zone.index ?? 0;
		result += textQuantities(content.slice(last, start));
		const text = zone[0];
		result += text.startsWith('$') ? latexQuantities(text) : text;
		last = start + text.length;
	}
	return result + textQuantities(content.slice(last));
}

/** Dans le texte, une grandeur (ou une durée composée) devient une formule */
function textQuantities(text: string): string {
	const durations = text.replace(HMS_REGEX, (match) => {
		const latex = latexQuantities(match);
		return latex === match ? match : `$${latex}$`;
	});
	return durations.replace(QUANTITY_REGEX, (match) => {
		const latex = quantityToLatex(match);
		return latex === match ? match : `$${latex}$`;
	});
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
 * @param random - Source de hasard de l'instance (consommée), Math.random par défaut
 * @param genericFunctions - Fonctions déclarées par le modèle (absent : défauts du parseur)
 * @param cleanCoefficients - Option du modèle : coefficients nettoyés (`1x` → `x`)
 * @returns Resolved markdown ready for rendering
 */
export function resolveMarkdownContent(
	markdown: TemplateMarkdown,
	resolvedVariables: ResolvedVariable[],
	random: RandomSource = Math.random,
	genericFunctions?: GenericFunctionConfig,
	cleanCoefficients = false
): ResolvedMarkdown {
	// Stage 0: conditions sur les variables tirées (`{{if:…}}`) → branche retenue
	const withoutConditionals = resolveVariableConditionals(String(markdown), resolvedVariables);

	// Stage 1: Resolve variables, random expressions, and eval expressions
	// Use displayValue when available (e.g., removeSpaces inserts {} between digits).
	// Sans aucun marqueur `{{…}}`, le résolveur remplacerait les noms de variables écrits
	// en clair (prévu pour `a^b*a^c`) : dans un texte, « Il a gagné » deviendrait « Il 4 gagné »
	let resolvedContent = withoutConditionals.includes('{{')
		? resolveVariableExpression(withoutConditionals, resolvedVariables, random, {
				useDisplayValue: true,
				markdown: true
			})
		: withoutConditionals;

	// Stage 2: Resolve color references
	resolvedContent = resolveColorReferences(resolvedContent, random);

	// Stage 3: Convert math zones ($...$, $$...$$) from custom to LaTeX
	// Note: ~...~ and ~~...~~ remain in custom syntax
	resolvedContent = convertMathZonesToLatex(resolvedContent, genericFunctions, cleanCoefficients);

	// Stage 4: grandeurs restées brutes (formule d'auteur, texte)
	resolvedContent = displayQuantities(resolvedContent);

	return resolvedMarkdown(resolvedContent);
}

/**
 * Resolve a string expression (for answers, blanks, etc.)
 *
 * @param expression - Expression string
 * @param resolvedVariables - Already resolved variables
 * @param random - Source de hasard de l'instance (consommée), Math.random par défaut
 * @returns Resolved string
 */
export function resolveExpression(
	expression: string,
	resolvedVariables: ResolvedVariable[],
	random: RandomSource = Math.random
): string {
	// Database now stores pure markdown syntax ({{...}}) directly
	// No conversion needed anymore
	let resolved = resolveVariableExpression(expression, resolvedVariables, random);
	// Also resolve color references
	resolved = resolveColorReferences(resolved, random);
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
 * @param random - Source de hasard de l'instance (consommée), Math.random par défaut
 * @param genericFunctions - Fonctions déclarées par le modèle (absent : défauts du parseur)
 * @returns Resolved answerFormat in LaTeX with ? markers preserved
 */
export function resolveAnswerFormat(
	answerFormat: string,
	resolvedVariables: ResolvedVariable[],
	random: RandomSource = Math.random,
	genericFunctions?: GenericFunctionConfig
): string {
	// Stage 1: Resolve variables and color references
	let resolved = resolveVariableExpression(answerFormat, resolvedVariables, random);
	resolved = resolveColorReferences(resolved, random);

	// Stage 2: Convert to LaTeX
	// preserveHoles: ? stays as ? (not \placeholder[N]{}) for assignBlankIndices
	const parseResult = parseCustomSafe(resolved.trim(), { genericFunctions });
	if (parseResult.ast) {
		resolved = toLatex(parseResult.ast, { preserveHoles: true });
	}

	return resolved;
}

/**
 * Convert a resolved expectedAnswer to LaTeX (for flash back display).
 *
 * @param expectedAnswer - Resolved expected answer string (e.g., "5", "10^5")
 * @param genericFunctions - Fonctions déclarées par le modèle (absent : défauts du parseur)
 * @param cleanCoefficients - Option du modèle : coefficients nettoyés (`1x` → `x`)
 * @returns LaTeX string, or undefined if conversion fails
 */
export function convertToLatex(
	expression: string,
	genericFunctions?: GenericFunctionConfig,
	cleanCoefficients = false
): string {
	return customToLatex(expression.trim(), genericFunctions, cleanCoefficients) ?? expression;
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
 * @param random - Source de hasard de l'instance (consommée), Math.random par défaut
 * @returns Resolved correctChoiceIndex, or undefined if input is undefined
 */
export function resolveSolution(
	solution: string | string[],
	resolvedVariables: ResolvedVariable[],
	random?: RandomSource
): string | string[];
export function resolveSolution(
	solution: string | string[] | undefined,
	resolvedVariables: ResolvedVariable[],
	random?: RandomSource
): string | string[] | undefined;
export function resolveSolution(
	solution: string | string[] | undefined,
	resolvedVariables: ResolvedVariable[],
	random: RandomSource = Math.random
): string | string[] | undefined {
	if (solution === undefined) return undefined;

	if (Array.isArray(solution)) {
		return solution.map((sol) => resolveExpression(sol, resolvedVariables, random));
	}

	return resolveExpression(solution, resolvedVariables, random);
}

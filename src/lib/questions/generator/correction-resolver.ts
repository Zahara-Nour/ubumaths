/**
 * Correction Resolver
 * ===================
 *
 * Resolves correction placeholders ({{solution}}, {{expression}}, {{answer}}, etc.)
 * in QuestionCorrection templates.
 *
 * Pipeline:
 * 1. Escape client-side placeholders ({{answer}}, {{if:...|...|...}})
 * 2. Pre-process correction syntax ({{solution:N}} → {{solution_N}}, etc.)
 * 3. Build enriched variables (inject pseudo-variables: solution, expression)
 * 4. Resolve via resolveMarkdownContent (variables + colors + LaTeX)
 * 5. Restore escaped client-side placeholders
 *
 * @module questions/generator/correction-resolver
 */

import type { ResolvedVariable, InstanceBlank } from '../types';
import type { TemplateMarkdown, ResolvedMarkdown } from '$lib/ubumark';
import { templateMarkdown, resolvedMarkdown } from '$lib/ubumark';
import { resolveMarkdownContent } from './content-resolver';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Context for correction placeholder resolution.
 * Built from resolved blanks, choices, and variables.
 */
export interface CorrectionContext {
	/** Resolved solution values (from blanks or correct choices) */
	solutions: string[];
	/** Value of the expression variable (if any) */
	expression?: string;
}

// ============================================================================
// ESCAPE / RESTORE CLIENT PLACEHOLDERS
// ============================================================================

// Unique tokens that won't collide with user content
const ANSWER_TOKEN = '\x00__ANSWER__\x00';
const IF_TOKEN_PREFIX = '\x00__IF__';
const IF_TOKEN_SUFFIX = '__FI__\x00';

/**
 * Escape {{answer}} and {{if:...|...|...}} so they survive variable resolution.
 *
 * {{color:...}} survives naturally (tokenizer explicitly skips it at L124).
 * {{answer:N}} does NOT survive: the `:` triggers isRandomShorthand, so we escape it too.
 */
function escapeClientPlaceholders(content: string): {
	escaped: string;
	answerMatches: string[];
	ifMatches: string[];
} {
	const answerMatches: string[] = [];
	const ifMatches: string[] = [];

	// Escape {{answer}} and {{answer:N}} — both crash the tokenizer
	let escaped = content.replace(/\{\{answer(?::\d+)?\}\}/g, (match) => {
		const idx = answerMatches.length;
		answerMatches.push(match);
		return `${ANSWER_TOKEN}${idx}${ANSWER_TOKEN}`;
	});

	// Escape {{if:cond|then}} or {{if:cond|then|else}} — same regex as correction-placeholders.ts
	escaped = escaped.replace(/\{\{if:[^|]+\|[^|}]+(?:\|[^}]+)?\}\}/g, (match) => {
		const idx = ifMatches.length;
		ifMatches.push(match);
		return `${IF_TOKEN_PREFIX}${idx}${IF_TOKEN_SUFFIX}`;
	});

	return { escaped, answerMatches, ifMatches };
}

/**
 * Restore escaped client placeholders after resolution.
 */
function restoreClientPlaceholders(
	content: string,
	answerMatches: string[],
	ifMatches: string[]
): string {
	let result = content;

	// Restore {{answer}} tokens (each token is index-keyed, so .replace() first-occurrence is safe)
	for (let i = 0; i < answerMatches.length; i++) {
		result = result.replace(`${ANSWER_TOKEN}${i}${ANSWER_TOKEN}`, answerMatches[i]);
	}

	// Restore {{if:...}} tokens
	for (let i = 0; i < ifMatches.length; i++) {
		result = result.replace(`${IF_TOKEN_PREFIX}${i}${IF_TOKEN_SUFFIX}`, ifMatches[i]);
	}

	return result;
}

// ============================================================================
// PRE-PROCESSING
// ============================================================================

/**
 * Pre-process correction-specific syntax before variable resolution.
 *
 * - {{solution:N}} → {{solution_N}} (indexed solution)
 * - {{solution:html}} → {{solution}} (html is an alias)
 * - {{expression:raw}} → {{expression}} (raw is an alias)
 */
function preprocessCorrectionSyntax(content: string): string {
	let result = content;

	// {{solution:N}} → {{solution_N}} (N = digits)
	result = result.replace(/\{\{solution:(\d+)\}\}/g, '{{solution_$1}}');

	// {{solution:html}} → {{solution}}
	result = result.replace(/\{\{solution:html\}\}/g, '{{solution}}');

	// {{expression:raw}} → {{expression}}
	result = result.replace(/\{\{expression:raw\}\}/g, '{{expression}}');

	return result;
}

// ============================================================================
// ENRICHED VARIABLES
// ============================================================================

/**
 * Build enriched variables by injecting pseudo-variables (solution, expression)
 * alongside the real resolved variables.
 *
 * Pseudo-variables do NOT replace existing variables with the same name.
 */
function buildEnrichedVariables(
	resolvedVariables: ResolvedVariable[],
	context: CorrectionContext
): ResolvedVariable[] {
	const enriched = [...resolvedVariables];
	const existingNames = new Set(resolvedVariables.map((v) => v.name));

	// Inject solution pseudo-variable (first solution)
	if (!existingNames.has('solution')) {
		enriched.push({
			name: 'solution',
			value: context.solutions[0] ?? ''
		});
	}

	// Inject indexed solution pseudo-variables: solution_0, solution_1, ...
	for (let i = 0; i < context.solutions.length; i++) {
		const name = `solution_${i}`;
		if (!existingNames.has(name)) {
			enriched.push({
				name,
				value: context.solutions[i]
			});
		}
	}

	// Inject expression pseudo-variable (empty string if no expression available)
	if (!existingNames.has('expression')) {
		enriched.push({
			name: 'expression',
			value: context.expression ?? ''
		});
	}

	return enriched;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Build a CorrectionContext from resolved instance data.
 *
 * @param resolvedBlanks - Resolved blanks (fill-in-blanks questions)
 * @param resolvedChoices - Resolved choices (QCM questions)
 * @param correctChoiceIndex - Index/indices of correct choice(s)
 * @param resolvedVariables - All resolved variables
 * @returns CorrectionContext with solutions and expression
 */
export function buildCorrectionContext(
	resolvedBlanks: InstanceBlank[] | undefined,
	resolvedChoices: { content: ResolvedMarkdown; isCorrect: boolean }[] | undefined,
	correctChoiceIndex: string | string[] | undefined,
	resolvedVariables: ResolvedVariable[]
): CorrectionContext {
	let solutions: string[] = [];

	// Build solutions from blanks (fill-in-blanks)
	if (resolvedBlanks && resolvedBlanks.length > 0) {
		solutions = resolvedBlanks.map((b) => b.expectedAnswer);
	}
	// Build solutions from choices (QCM)
	else if (resolvedChoices && correctChoiceIndex !== undefined) {
		const indices = Array.isArray(correctChoiceIndex) ? correctChoiceIndex : [correctChoiceIndex];
		solutions = indices
			.map((idx) => {
				const choiceIndex = parseInt(idx.trim(), 10);
				if (isNaN(choiceIndex)) return '';
				const choice = resolvedChoices[choiceIndex];
				return choice ? String(choice.content) : '';
			})
			.filter((s) => s !== '');
	}

	// Find expression variable
	let expression: string | undefined;
	const exprVar = resolvedVariables.find((v) => v.name === 'expression');
	if (exprVar) {
		expression = exprVar.value;
	} else {
		// Fallback to expression1
		const expr1Var = resolvedVariables.find((v) => v.name === 'expression1');
		if (expr1Var) {
			expression = expr1Var.value;
		}
	}

	return { solutions, expression };
}

/**
 * Resolve a correction template with pseudo-variables.
 *
 * Pipeline:
 * 1. Escape client placeholders ({{answer}}, {{if:...|...|...}})
 * 2. Pre-process syntax ({{solution:N}} → {{solution_N}}, etc.)
 * 3. Enrich variables with pseudo-variables (solution, expression)
 * 4. Resolve via resolveMarkdownContent
 * 5. Restore client placeholders
 *
 * @param template - Correction template markdown
 * @param resolvedVariables - Resolved question variables
 * @param context - Correction context (solutions, expression)
 * @param seed - Optional seed for random generation
 * @returns Resolved markdown with pseudo-variables replaced and client placeholders preserved
 */
export function resolveCorrectionContent(
	template: TemplateMarkdown,
	resolvedVariables: ResolvedVariable[],
	context: CorrectionContext,
	seed?: number
): ResolvedMarkdown {
	// Step 1: Escape client-side placeholders
	const { escaped, answerMatches, ifMatches } = escapeClientPlaceholders(String(template));

	// Step 2: Pre-process correction syntax
	const preprocessed = preprocessCorrectionSyntax(escaped);

	// Step 3: Build enriched variables with pseudo-variables
	const enrichedVariables = buildEnrichedVariables(resolvedVariables, context);

	// Step 4: Resolve via standard pipeline
	const resolved = resolveMarkdownContent(templateMarkdown(preprocessed), enrichedVariables, seed);

	// Step 5: Restore client placeholders
	const restored = restoreClientPlaceholders(String(resolved), answerMatches, ifMatches);

	return resolvedMarkdown(restored);
}

/**
 * Pedagogical Limits — Renderer
 *
 * Converts raw `PedagogicalLimitStep` objects (recorded by `pipeline.ts`)
 * into `RenderedStep` objects with French titles and explanations adapted
 * to a `SchoolLevel`.
 *
 * Behaviour summary :
 *
 * - Throws `PedagogicalLimitNotImplemented`-equivalent at level checks
 *   handled upstream by the pipeline. Here we accept the input level and
 *   bump `primaire`/`college` to `lycee` for vocabulary purposes only —
 *   the pipeline itself refuses those levels at the entry, so this code
 *   path is only hit when the renderer is exercised directly with a step
 *   produced upstream.
 * - Title lookup chain : `TITLES[effective][rule] ?? TITLES.lycee[rule] ?? step.description`
 * - Explanation lookup (verbosity `detailed` only) : same fallback chain in
 *   `EXPLANATIONS`.
 * - LaTeX : 2-line `\begin{aligned}` block highlighting the LHS in blue
 *   (`\textcolor{blue}{\lim_{x \to a^±} f(x)}`) and the RHS as the
 *   transformed expression. Direction-aware (`a^+` / `a^-` / no decoration
 *   for `'both'`).
 * - Recurses into `subSteps` so the consumer sees the full tree. Sub-step
 *   IDs are preserved (no remapping).
 *
 * @module mathAST/pedagogical-limits/renderer
 */

import { toLatex } from '../latex-generator';
import { isAddition, isOpposite, isSubtraction } from '../guards';
import { containsVariable } from '../common/contains-variable';
import type { LimitDirection } from '../limits/types';
import type { MathNode } from '../types';
import type {
	PedagogicalRenderOptions,
	RenderedStep,
	SchoolLevel,
	StepRenderer
} from '../common/step-renderer-base';
import { EXPLANATIONS, TITLES, getDefaultDescription } from './descriptions-fr';
import { FACTORISATION_CLUSTER_RULES } from './types';
import type {
	LimitLine,
	LimitsSchoolLevel,
	PedagogicalLimitRule,
	PedagogicalLimitStep,
	TermLimits
} from './types';

// Sub-rules of the factorisation cluster that operate on a *fragment* of the
// limit expression (numerator or denominator), not the whole limit. Drop the
// `\lim_{...}` decoration on these so the LaTeX is honest about the scope.
//
// Driven by `FACTORISATION_CLUSTER_RULES` minus the parent. Single source of
// truth — adding a new cluster rule in `types.ts` automatically covers the
// renderer side.
const FRAGMENT_RULES: ReadonlySet<PedagogicalLimitRule> = new Set(
	[...FACTORISATION_CLUSTER_RULES].filter((r) => r !== 'simplify-common-factor')
);

// =============================================================================
// Helpers
// =============================================================================

/**
 * Bump primaire/college up to lycée for vocabulary lookup (limits aren't on
 * the syllabus before Tle). The pipeline refuses primaire/college upstream,
 * so this is a defensive default for direct renderer invocations.
 */
function effectiveSchoolLevel(level: SchoolLevel): LimitsSchoolLevel {
	if (level === 'primaire' || level === 'college') return 'lycee';
	return level;
}

/**
 * Decorate the limit subscript with the appropriate sided arrow.
 *
 * - `'left'`  → `x \to a^-`
 * - `'right'` → `x \to a^+`
 * - `'both'`  → `x \to a` (no decoration)
 */
function formatLimitSubscript(
	variable: string,
	approach: MathNode,
	direction: LimitDirection
): string {
	const approachLatex = toLatex(approach);
	if (direction === 'left') return `${variable} \\to ${approachLatex}^-`;
	if (direction === 'right') return `${variable} \\to ${approachLatex}^+`;
	return `${variable} \\to ${approachLatex}`;
}

/**
 * 2-line aligned LaTeX block, mirroring the convention in
 * `pedagogical-arithmetic`/`pedagogical-differentiation`/`pedagogical-integration`.
 *
 * ```
 * \begin{aligned}
 *   & \textcolor{blue}{\lim_{x \to a} f(x)} \\
 *   & = \lim_{x \to a} g(x)   (ou la valeur, quand g ne dépend plus de x)
 * \end{aligned}
 * ```
 *
 * Quand g = f (étape d'annonce), la limite seule, sans 2ᵉ ligne :
 *
 * ```
 * \begin{aligned}
 *   & \textcolor{blue}{\lim_{x \to a} f(x)}
 * \end{aligned}
 * ```
 *
 * The blue highlight wraps the limit on the LHS for readability when the
 * step is rendered alongside neighbours. The RHS is the result of the
 * transformation captured by this step (`step.after` for top-level steps,
 * sub-expression for sub-steps).
 *
 * Sub-steps that operate on a sub-expression (e.g. `factor-numerator` on
 * the numerator of a division) drop the `\lim_{...}` decoration to avoid
 * lying about the scope — they show `before \Rightarrow after` instead.
 */
function formatExpressionLatex(step: PedagogicalLimitStep): string {
	// Sub-steps of a factorisation cluster operate on a fragment, not the
	// whole limit — render them as a transformation arrow rather than a
	// limit identity. Driven by `FRAGMENT_RULES` so V1.1 cluster extensions
	// are picked up automatically.
	if (FRAGMENT_RULES.has(step.rule)) {
		const beforeLatex = toLatex(step.before);
		const afterLatex = toLatex(step.after);
		return (
			`\\begin{aligned}\n` +
			`  & \\textcolor{blue}{${beforeLatex}} \\\\\n` +
			`  & = ${afterLatex}\n` +
			`\\end{aligned}`
		);
	}

	const limitSub = formatLimitSubscript(step.variable, step.approach, step.direction);
	if (step.termLimits) {
		return termLimitsLatex(step.termLimits, limitSub);
	}
	const left = limitLatex(limitSub, step.before);
	const right = rightHandSideLatex(step, limitSub);
	// Étape d'annonce (identification, forme indéterminée, terme dominant,
	// encadrement, comparaison des côtés) : rien ne change, donc pas de « = » —
	// `\\lim f = \\lim f` serait juste mais redondant. Même arbre ⇒ même LaTeX.
	if (right === left) {
		return `\\begin{aligned}\n  & \\textcolor{blue}{${left}}\n\\end{aligned}`;
	}
	return (
		`\\begin{aligned}\n` +
		`  & \\textcolor{blue}{${left}} \\\\\n` +
		`  & = ${right}\n` +
		`\\end{aligned}`
	);
}

/**
 * Limites des termes, une ligne chacune, sans couleur :
 *
 * ```
 * \\begin{aligned}
 *   & \\lim \\dfrac{1}{x} = 0 \\\\
 *   & \\lim \\dfrac{5}{x} = 0 \\\\
 *   & \\text{donc } \\lim \\left( 3 + \\dfrac{1}{x} \\right) = 3 \\\\
 *   & \\text{et } \\lim \\left( 2 - \\dfrac{5}{x} \\right) = 2
 * \\end{aligned}
 * ```
 */
function termLimitsLatex(termLimits: TermLimits, limitSub: string): string {
	const line = (l: LimitLine) => {
		// `\\lim (-x^4)`, jamais `\\lim -x^4`
		const body = isOpposite(l.expression)
			? `\\lim_{${limitSub}} \\left( ${toLatex(l.expression)} \\right)`
			: limitLatex(limitSub, l.expression);
		return `${body} = ${toLatex(l.value)}`;
	};
	const rows = [
		...termLimits.premises.map(line),
		...termLimits.conclusions.map((l, k) => `\\text{${k === 0 ? 'donc' : 'et'} } ${line(l)}`)
	];
	return `\\begin{aligned}\n${rows.map((r) => `  & ${r}`).join(' \\\\\n')}\n\\end{aligned}`;
}

/** `\\lim_{…} f` ; une somme est parenthésée : `\\lim (x + 2)`, jamais lu (lim x) + 2. */
function limitLatex(limitSub: string, expression: MathNode): string {
	const latex = toLatex(expression);
	const isSum = isAddition(expression) || isSubtraction(expression);
	const body = isSum ? `\\left( ${latex} \\right)` : latex;
	return `\\lim_{${limitSub}} ${body}`;
}

/**
 * Membre de droite d'une étape sur la limite entière : tant que l'expression
 * dépend encore de la variable, c'est encore une limite — `\\lim f = \\lim g`,
 * jamais `\\lim f = g(x)` (faux : une limite n'est pas une fonction de x).
 * Une valeur (nombre, ±∞) s'écrit seule : `\\lim f = 3`.
 */
function rightHandSideLatex(step: PedagogicalLimitStep, limitSub: string): string {
	return containsVariable(step.after, step.variable)
		? limitLatex(limitSub, step.after)
		: toLatex(step.after);
}

// =============================================================================
// Renderer
// =============================================================================

export class PedagogicalLimitRenderer implements StepRenderer<
	PedagogicalLimitStep,
	PedagogicalRenderOptions
> {
	render(step: PedagogicalLimitStep, options: PedagogicalRenderOptions): RenderedStep {
		const effective = effectiveSchoolLevel(options.schoolLevel);

		const titleFn = TITLES[effective][step.rule] ?? TITLES.lycee[step.rule];
		const title = titleFn ? titleFn(step) : getDefaultDescription(step);

		const explanationFn =
			options.verbosity === 'detailed'
				? (EXPLANATIONS[effective][step.rule] ?? EXPLANATIONS.lycee[step.rule])
				: undefined;
		const explanation = explanationFn?.(step);

		const subSteps = step.subSteps?.map((s) => this.render(s, options));

		return {
			id: step.id,
			rule: step.rule,
			title,
			...(explanation && { explanation }),
			expressionLatex: formatExpressionLatex(step),
			schoolLevel: effective,
			...(subSteps && subSteps.length > 0 && { subSteps })
		};
	}

	renderAll(
		steps: readonly PedagogicalLimitStep[],
		options: PedagogicalRenderOptions
	): readonly RenderedStep[] {
		// Filter BEFORE rendering so we don't pay the toLatex cost for steps
		// we'll throw away ; also keeps `s.rule` strongly typed as
		// `PedagogicalLimitRule` (no cast needed).
		return steps
			.filter((s) => shouldEmitForVerbosity(s.rule, options))
			.map((s) => this.render(s, options));
	}
}

/**
 * Étapes cachées en mode résumé : l'annonce (`identify-limit`), la forme
 * indéterminée, et, en ±∞, les limites des termes et la limite de la somme /
 * du produit / du quotient — le résumé garde le développement, la
 * factorisation, la simplification et la conclusion (décision de David,
 * 2026-10-12).
 */
const HIDDEN_WHEN_SUMMARIZED: ReadonlySet<PedagogicalLimitRule> = new Set([
	'identify-limit',
	'detect-indeterminate-form',
	'limits-of-terms',
	'apply-sum',
	'apply-product',
	'apply-quotient'
]);

/**
 * Filter rules per verbosity. At `'summarized'`, the informational steps of
 * `HIDDEN_WHEN_SUMMARIZED` are dropped so the trace stays compact. At
 * `'detailed'`, everything is shown.
 *
 * Note : sub-steps are NOT filtered here — only top-level entries. The
 * renderer recurses into sub-steps unconditionally so the parent's
 * `subSteps` list always shows the full sequence.
 */
function shouldEmitForVerbosity(
	rule: PedagogicalLimitRule,
	options: PedagogicalRenderOptions
): boolean {
	if (options.verbosity === 'detailed') return true;
	// summarized : drop purely informational steps
	return !HIDDEN_WHEN_SUMMARIZED.has(rule);
}

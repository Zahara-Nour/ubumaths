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
import type { LimitsSchoolLevel, PedagogicalLimitRule, PedagogicalLimitStep } from './types';

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
 *   & = g(x)
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
	const beforeLatex = toLatex(step.before);
	const afterLatex = toLatex(step.after);

	// Sub-steps of a factorisation cluster operate on a fragment, not the
	// whole limit — render them as a transformation arrow rather than a
	// limit identity. Driven by `FRAGMENT_RULES` so V1.1 cluster extensions
	// are picked up automatically.
	if (FRAGMENT_RULES.has(step.rule)) {
		return (
			`\\begin{aligned}\n` +
			`  & \\textcolor{blue}{${beforeLatex}} \\\\\n` +
			`  & = ${afterLatex}\n` +
			`\\end{aligned}`
		);
	}

	const limitSub = formatLimitSubscript(step.variable, step.approach, step.direction);
	return (
		`\\begin{aligned}\n` +
		`  & \\textcolor{blue}{\\lim_{${limitSub}} ${beforeLatex}} \\\\\n` +
		`  & = ${afterLatex}\n` +
		`\\end{aligned}`
	);
}

// =============================================================================
// Renderer
// =============================================================================

export class PedagogicalLimitRenderer
	implements StepRenderer<PedagogicalLimitStep, PedagogicalRenderOptions>
{
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
 * Filter rules per verbosity. At `'summarized'`, the `identify-limit` and
 * `detect-indeterminate-form` informational steps are dropped so the trace
 * stays compact. At `'detailed'`, everything is shown.
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
	if (rule === 'identify-limit' || rule === 'detect-indeterminate-form') return false;
	return true;
}

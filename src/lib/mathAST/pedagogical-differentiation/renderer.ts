/**
 * Pedagogical Differentiation — Renderer
 *
 * Converts raw `PedagogicalDifferentiationStep` objects (recorded by
 * `pipeline.ts`) into `RenderedStep` objects with French titles and
 * explanations adapted to a `SchoolLevel`.
 *
 * Behaviour summary :
 *
 * - Bumps `primaire` and `college` to `lycee` (differentiation is not on the
 *   syllabus before 1ère).
 * - Title lookup : `TITLES[effective][rule] ?? TITLES.lycee[rule] ?? () => step.description`
 * - Explanation lookup (verbosity `detailed` only) : same fallback chain in
 *   `EXPLANATIONS`.
 * - LaTeX : Lagrange notation. The recorded `before`/`after` are rendered as
 *   `(before)' = after` with the `(before)' ` portion highlighted in blue —
 *   matching the convention used by other pedagogical renderers in this
 *   codebase.
 * - Recurses into `subSteps` so the consumer sees the full tree.
 *
 * Phase 1 : functional baseline (single-line LaTeX).
 * Phase 3 : enhances with `\begin{aligned}` 2-line layout, conditional
 *           highlight of `globalBefore`/`globalAfter`, and locale switching.
 *
 * @module mathAST/pedagogical-differentiation/renderer
 */

import { toLatex } from '../latex-generator';
import type {
	PedagogicalRenderOptions,
	RenderedStep,
	SchoolLevel,
	StepRenderer
} from '../common/step-renderer-base';
import { EXPLANATIONS, TITLES } from './descriptions-fr';
import type { PedagogicalDifferentiationRule, PedagogicalDifferentiationStep } from './types';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Bump primaire/college up to lycee. Differentiation is not on the syllabus
 * before 1ère, so we use lycee vocabulary as a sensible default.
 */
function effectiveSchoolLevel(level: SchoolLevel): SchoolLevel {
	if (level === 'primaire' || level === 'college') return 'lycee';
	return level;
}

function lookupTitle(
	rule: PedagogicalDifferentiationRule,
	effective: SchoolLevel,
	bindings: Record<string, import('../types').MathNode> | undefined,
	fallbackDescription: string
): string {
	const fn = TITLES[effective][rule] ?? TITLES.lycee[rule] ?? ((): string => fallbackDescription);
	return fn(bindings ?? {});
}

function lookupExplanation(
	rule: PedagogicalDifferentiationRule,
	effective: SchoolLevel,
	bindings: Record<string, import('../types').MathNode> | undefined
): string | undefined {
	const fn = EXPLANATIONS[effective][rule] ?? EXPLANATIONS.lycee[rule];
	return fn?.(bindings ?? {});
}

/**
 * LaTeX rendering as a 2-line `\begin{aligned}` block — convention shared
 * with `pedagogical-arithmetic/renderer.ts`:
 *
 * ```
 * \begin{aligned}
 *   & \textcolor{blue}{(before)'} \\
 *   & = after
 * \end{aligned}
 * ```
 *
 * The blue highlight on `(before)'` flags the sub-expression being
 * differentiated. The right-hand side appears on the next line aligned on
 * the equals sign — readable both in inline KaTeX and in larger callouts.
 *
 * Future enhancement (out of V1 scope) : when `step.globalBefore` is set, we
 * could display the parent expression with the sub-tree colored in place
 * (matches the `colorFragmentsInExpression` helper of the arithmetic
 * renderer). Skipped for now to keep this commit minimal.
 */
function formatExpressionLatex(step: PedagogicalDifferentiationStep): string {
	const beforeLatex = toLatex(step.before);
	const afterLatex = toLatex(step.after);
	return (
		`\\begin{aligned}\n` +
		`  & \\textcolor{blue}{(${beforeLatex})'} \\\\\n` +
		`  & = ${afterLatex}\n` +
		`\\end{aligned}`
	);
}

// =============================================================================
// Renderer
// =============================================================================

export class PedagogicalDifferentiationRenderer
	implements StepRenderer<PedagogicalDifferentiationStep, PedagogicalRenderOptions>
{
	render(step: PedagogicalDifferentiationStep, options: PedagogicalRenderOptions): RenderedStep {
		const effective = effectiveSchoolLevel(options.schoolLevel);
		const title = lookupTitle(step.rule, effective, step.bindings, step.description);
		const explanation =
			options.verbosity === 'detailed'
				? lookupExplanation(step.rule, effective, step.bindings)
				: undefined;

		const subSteps = step.subSteps?.map((s) => this.render(s, options));

		return {
			id: step.id,
			rule: step.rule,
			title,
			explanation,
			expressionLatex: formatExpressionLatex(step),
			schoolLevel: effective,
			subSteps: subSteps && subSteps.length > 0 ? subSteps : undefined
		};
	}

	renderAll(
		steps: readonly PedagogicalDifferentiationStep[],
		options: PedagogicalRenderOptions
	): readonly RenderedStep[] {
		return steps.map((s) => this.render(s, options));
	}
}

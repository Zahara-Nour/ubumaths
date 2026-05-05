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
 * - LaTeX : either Lagrange `(before)' = after` (default) or Leibniz
 *   `\frac{d}{dx}(before) = after`, selected via
 *   `DifferentiationRenderOptions.notation`. The highlighted segment
 *   (in blue) wraps the differentiation expression on the LHS in both modes.
 *   TITLES and EXPLANATIONS keep Lagrange wording — this is a V1.1 scope
 *   limitation documented in `docs/wip/differentiation-stepper-progress.md`.
 * - Recurses into `subSteps` so the consumer sees the full tree.
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
// Public option type
// =============================================================================

/**
 * Render-time notation for the differentiation expression.
 *
 * - `'lagrange'` (default) — `(f(x))' = …` ; standard at French lycée.
 * - `'leibniz'`             — `\frac{d}{dx}(f(x)) = …` ; common at supérieur
 *                             and in physics-flavoured contexts.
 *
 * Note : TITLES and EXPLANATIONS in `descriptions-fr.ts` are written with
 * Lagrange wording (e.g. `(uv)' = u'v + uv'`). When `notation: 'leibniz'`
 * is selected, only `expressionLatex` switches representation — titles and
 * explanations keep the Lagrange formulae. Full-Leibniz wording is V2 scope.
 */
export type DifferentiationNotation = 'lagrange' | 'leibniz';

/**
 * Options accepted by `PedagogicalDifferentiationRenderer.render`.
 * Extends the shared `PedagogicalRenderOptions` with the differentiation-only
 * `notation` knob.
 */
export interface DifferentiationRenderOptions extends PedagogicalRenderOptions {
	readonly notation?: DifferentiationNotation;
}

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
 * with `pedagogical-arithmetic/renderer.ts`. Two notations are supported:
 *
 * Lagrange (default) :
 * ```
 * \begin{aligned}
 *   & \textcolor{blue}{(before)'} \\
 *   & = after
 * \end{aligned}
 * ```
 *
 * Leibniz :
 * ```
 * \begin{aligned}
 *   & \textcolor{blue}{\frac{d}{dx}\left(before\right)} \\
 *   & = after
 * \end{aligned}
 * ```
 *
 * The differentiation variable on the Leibniz denominator (`dx`, `dy`, `dt`)
 * is read from `step.variable`.
 */
function formatExpressionLatex(
	step: PedagogicalDifferentiationStep,
	notation: DifferentiationNotation
): string {
	const beforeLatex = toLatex(step.before);
	const afterLatex = toLatex(step.after);
	const lhs =
		notation === 'leibniz'
			? `\\frac{d}{d${step.variable}}\\left(${beforeLatex}\\right)`
			: `(${beforeLatex})'`;
	return (
		`\\begin{aligned}\n` +
		`  & \\textcolor{blue}{${lhs}} \\\\\n` +
		`  & = ${afterLatex}\n` +
		`\\end{aligned}`
	);
}

// =============================================================================
// Renderer
// =============================================================================

export class PedagogicalDifferentiationRenderer
	implements StepRenderer<PedagogicalDifferentiationStep, DifferentiationRenderOptions>
{
	render(
		step: PedagogicalDifferentiationStep,
		options: DifferentiationRenderOptions
	): RenderedStep {
		const effective = effectiveSchoolLevel(options.schoolLevel);
		const notation: DifferentiationNotation = options.notation ?? 'lagrange';
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
			expressionLatex: formatExpressionLatex(step, notation),
			schoolLevel: effective,
			subSteps: subSteps && subSteps.length > 0 ? subSteps : undefined
		};
	}

	renderAll(
		steps: readonly PedagogicalDifferentiationStep[],
		options: DifferentiationRenderOptions
	): readonly RenderedStep[] {
		return steps.map((s) => this.render(s, options));
	}
}

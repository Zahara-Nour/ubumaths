/**
 * Pedagogical Simplify — Renderer.
 *
 * Converts raw `PedagogicalSimplifyStep` objects (recorded by `pipeline.ts`)
 * into `RenderedStep` objects with French titles and explanations adapted
 * to a target `SchoolLevel`.
 *
 * Behaviour summary :
 *
 * - Title lookup : `TITLES[level][rule]` → `TITLES.lycee[rule]` →
 *   `step.description`
 * - Explanation (verbosity `'detailed'` only) : same fallback chain in
 *   `EXPLANATIONS` ; `superieur` is title-only by design.
 * - LaTeX : `\begin{aligned} \textcolor{blue}{globalBefore} &= globalAfter
 *   \end{aligned}` (2-line). Falls back to `before → after` if `global*`
 *   are not populated (handcrafted fixtures).
 * - Recurses into `subSteps` (always empty in V1, present for V2).
 *
 * @module mathAST/pedagogical-simplify/renderer
 */

import { toLatex } from '../latex-generator';
import type {
	PedagogicalRenderOptions,
	RenderedStep,
	StepRenderer
} from '../common/step-renderer-base';
import { lookupExplanation, lookupTitle } from './descriptions-fr';
import type { PedagogicalSimplifyStep } from './types';

// =============================================================================
// LaTeX formatting
// =============================================================================

/**
 * Format the step as a 2-line LaTeX block. The "before" half (highlighted in
 * blue) and the "after" half are wrapped in `\begin{aligned}...\end{aligned}`
 * so they line up vertically. Uses `globalBefore`/`globalAfter` when
 * available so the colored fragment shows the rule's effect IN context.
 */
function formatExpressionLatex(step: PedagogicalSimplifyStep): string {
	const beforeNode = step.globalBefore ?? step.before;
	const afterNode = step.globalAfter ?? step.after;
	const before = toLatex(beforeNode);
	const after = toLatex(afterNode);
	return `\\begin{aligned}\n  \\textcolor{blue}{${before}} & \\\\\n  = ${after}\n\\end{aligned}`;
}

// =============================================================================
// Renderer
// =============================================================================

export class PedagogicalSimplifyRenderer
	implements StepRenderer<PedagogicalSimplifyStep, PedagogicalRenderOptions>
{
	render(step: PedagogicalSimplifyStep, options: PedagogicalRenderOptions): RenderedStep {
		const { schoolLevel, verbosity } = options;
		const title = lookupTitle(schoolLevel, step);
		const explanation = verbosity === 'detailed' ? lookupExplanation(schoolLevel, step) : undefined;
		const expressionLatex = formatExpressionLatex(step);

		const subSteps =
			step.subSteps && step.subSteps.length > 0
				? step.subSteps.map((s) => this.render(s, options))
				: undefined;

		const rendered: RenderedStep = {
			id: step.id,
			rule: step.rule,
			title,
			...(explanation !== undefined && { explanation }),
			expressionLatex,
			schoolLevel,
			...(subSteps && { subSteps })
		};
		return rendered;
	}

	renderAll(
		steps: readonly PedagogicalSimplifyStep[],
		options: PedagogicalRenderOptions
	): readonly RenderedStep[] {
		return steps.map((s) => this.render(s, options));
	}
}

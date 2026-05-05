/**
 * Pedagogical Arithmetic — Renderer (Phase 8)
 *
 * Converts `PedagogicalArithmeticStep[]` into `RenderedStep[]` suitable for
 * UI consumption. Mirrors the conventions of `pedagogical-solve/linear-renderer`
 * with adjustments specific to arithmetic :
 *
 * - Title comes from the rule's per-`SchoolLevel` description (already
 *   resolved by the pipeline ; we re-resolve it via the rule registry to
 *   support late-binding of bindings).
 * - `expressionLatex` uses `\textcolor{blue}{...}` to highlight the part
 *   that changed (`before` is wrapped in blue, then `\Rightarrow`, then
 *   `after`).
 * - `verbosity: 'detailed'` adds an explanation drawn from the rule's
 *   `explanations` map (when present).
 *
 * @module mathAST/pedagogical-arithmetic/renderer
 */

import type {
	PedagogicalRenderOptions,
	RenderedStep,
	StepRenderer
} from '../common/step-renderer-base';
import type { Verbosity } from '../common/verbosity';
import { toLatex } from '../latex-generator';
import { ALL_RULES_BY_NAME } from './pedagogical-rules';
import type { PedagogicalArithmeticRule, PedagogicalArithmeticStep } from './types';

// =============================================================================
// Renderer
// =============================================================================

export class PedagogicalArithmeticRenderer
	implements StepRenderer<PedagogicalArithmeticStep, PedagogicalRenderOptions>
{
	render(step: PedagogicalArithmeticStep, options: PedagogicalRenderOptions): RenderedStep {
		const rule = ALL_RULES_BY_NAME.get(step.rule);
		const title = this.titleFor(rule, step, options);
		const explanation = this.explanationFor(rule, step, options);
		const expressionLatex = this.formatTransformation(step);

		return {
			id: step.id,
			rule: step.rule,
			title,
			...(explanation !== undefined && { explanation }),
			expressionLatex,
			schoolLevel: options.schoolLevel,
			...(step.subSteps &&
				step.subSteps.length > 0 && {
					subSteps: step.subSteps.map((s) => this.render(s, options))
				})
		};
	}

	renderAll(
		steps: readonly PedagogicalArithmeticStep[],
		options: PedagogicalRenderOptions
	): readonly RenderedStep[] {
		return steps.map((s) => this.render(s, options));
	}

	// ---------------------------------------------------------------- privates

	private titleFor(
		rule: PedagogicalArithmeticRule | undefined,
		step: PedagogicalArithmeticStep,
		options: PedagogicalRenderOptions
	): string {
		if (!rule) return step.description;
		const fn =
			rule.descriptions[options.schoolLevel] ?? rule.descriptions.lycee ?? (() => step.description);
		return fn(step.bindings ?? {});
	}

	private explanationFor(
		rule: PedagogicalArithmeticRule | undefined,
		step: PedagogicalArithmeticStep,
		options: PedagogicalRenderOptions
	): string | undefined {
		if (!rule || !rule.explanations) return undefined;
		if (!isDetailedEnough(options.verbosity)) return undefined;
		const fn = rule.explanations[options.schoolLevel] ?? rule.explanations.lycee;
		return fn?.(step.bindings ?? {}) ?? undefined;
	}

	private formatTransformation(step: PedagogicalArithmeticStep): string {
		const beforeLatex = toLatex(step.before);
		const afterLatex = toLatex(step.after);
		return `\\textcolor{blue}{${beforeLatex}} \\quad\\Rightarrow\\quad ${afterLatex}`;
	}
}

// =============================================================================
// Helpers
// =============================================================================

function isDetailedEnough(verbosity: Verbosity): boolean {
	return verbosity === 'detailed';
}

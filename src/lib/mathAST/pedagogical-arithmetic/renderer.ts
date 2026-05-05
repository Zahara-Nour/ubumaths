/**
 * Pedagogical Arithmetic — Renderer (Phase 8)
 *
 * Converts `PedagogicalArithmeticStep[]` into `RenderedStep[]` suitable for
 * UI consumption. Display convention :
 *
 * - **Title** comes from the rule's per-`SchoolLevel` description (resolved
 *   via the rule registry to support late-binding of bindings).
 * - **`expressionLatex`** uses two lines inside `\begin{aligned}` :
 *     ```
 *     <globalBefore with subBefore in \textcolor{blue}{...}>
 *     = <globalAfter>
 *     ```
 *   This mirrors the pattern used in pedagogical-solve and matches what
 *   students see in textbooks : the part being computed is highlighted on
 *   the line being read, and the next line shows the new state of the
 *   calculation.
 * - **Explanation** drawn from the rule's `explanations` map, only when
 *   verbosity is `'detailed'`.
 *
 * @module mathAST/pedagogical-arithmetic/renderer
 */

import type {
	PedagogicalRenderOptions,
	RenderedStep,
	StepRenderer
} from '../common/step-renderer-base';
import type { MathNode } from '../types';
import type { Verbosity } from '../common/verbosity';
import { toCustom } from '../custom-generator';
import { toLatex } from '../latex-generator';
import { nodesEqual } from '../pattern/match';
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

	// ------------------------------------------------------------------ private

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

	/**
	 * Two-line display :
	 *   <globalBefore with subBefore highlighted in \textcolor{blue}{...}>
	 *   = <globalAfter>
	 *
	 * When `globalBefore` / `globalAfter` are missing (e.g. the
	 * `evaluate-final` fallback emits steps with only `before`/`after`),
	 * fall back to a single-line `before \Rightarrow after`.
	 */
	private formatTransformation(step: PedagogicalArithmeticStep): string {
		const globalBefore = step.globalBefore ?? step.before;
		const globalAfter = step.globalAfter ?? step.after;
		const subBefore = step.before;

		const colored = colorFragmentInExpression(globalBefore, subBefore);
		const afterLatex = toLatex(globalAfter);

		return `\\begin{aligned}\n  & ${colored} \\\\\n  & = ${afterLatex}\n\\end{aligned}`;
	}
}

// =============================================================================
// Helpers
// =============================================================================

function isDetailedEnough(verbosity: Verbosity): boolean {
	return verbosity === 'detailed';
}

/**
 * Produce LaTeX of `globalNode` with the sub-tree `fragment` wrapped in
 * `\textcolor{blue}{...}`. Identifies the fragment by structural equality
 * (`nodesEqual`) — necessary because `mapNode` reconstructs sub-trees, so
 * reference equality would fail.
 *
 * Stops at the FIRST occurrence — when the same sub-expression appears
 * twice (e.g. `3 + 3`), only the first instance is highlighted.
 *
 * Falls back to coloring the entire global node if structural traversal
 * cannot locate the fragment (defensive — should not happen in normal
 * operation since `findFirstApplication` always passes the freshly
 * captured sub-tree).
 */
function colorFragmentInExpression(global: MathNode, fragment: MathNode): string {
	if (nodesEqual(global, fragment)) {
		return `\\textcolor{blue}{${toLatex(global)}}`;
	}
	const found = renderWithHighlight(global, fragment);
	if (found.matched) return found.latex;
	return `\\textcolor{blue}{${toLatex(global)}}`;
}

interface HighlightResult {
	readonly latex: string;
	readonly matched: boolean;
}

/**
 * Walk `node` to produce its LaTeX while wrapping `fragment` (matched by
 * reference equality) in `\textcolor{blue}{...}`. The traversal mirrors the
 * structure used by `latex-generator.ts` for the operators we routinely
 * encounter — for any other shape, we delegate to `toLatex` and the
 * fragment, if absent, won't be colored (graceful degradation).
 */
function renderWithHighlight(node: MathNode, fragment: MathNode): HighlightResult {
	if (nodesEqual(node, fragment)) {
		return { latex: `\\textcolor{blue}{${toLatex(node)}}`, matched: true };
	}

	switch (node.type) {
		case 'addition': {
			const l = renderWithHighlight(node.left, fragment);
			const r = renderWithHighlight(node.right, fragment);
			return {
				latex: `${l.latex} + ${r.latex}`,
				matched: l.matched || r.matched
			};
		}
		case 'subtraction': {
			const l = renderWithHighlight(node.left, fragment);
			const r = renderWithHighlight(node.right, fragment);
			return {
				latex: `${l.latex} - ${r.latex}`,
				matched: l.matched || r.matched
			};
		}
		case 'multiplication': {
			const l = renderWithHighlight(node.left, fragment);
			const r = renderWithHighlight(node.right, fragment);
			const op = multiplicationOp(node.displayStyle);
			return {
				latex: `${l.latex}${op}${r.latex}`,
				matched: l.matched || r.matched
			};
		}
		case 'division': {
			const num = renderWithHighlight(node.numerator, fragment);
			const den = renderWithHighlight(node.denominator, fragment);
			if (node.displayStyle === 'fraction') {
				return {
					latex: `\\dfrac{${num.latex}}{${den.latex}}`,
					matched: num.matched || den.matched
				};
			}
			return {
				latex: `${num.latex} \\div ${den.latex}`,
				matched: num.matched || den.matched
			};
		}
		case 'opposite': {
			const inner = renderWithHighlight(node.operand, fragment);
			return { latex: `-${inner.latex}`, matched: inner.matched };
		}
		case 'positive': {
			const inner = renderWithHighlight(node.operand, fragment);
			return { latex: `+${inner.latex}`, matched: inner.matched };
		}
		case 'delimiter': {
			const inner = renderWithHighlight(node.content, fragment);
			return { latex: `\\left(${inner.latex}\\right)`, matched: inner.matched };
		}
		case 'superscript': {
			const base = renderWithHighlight(node.base, fragment);
			const sup = renderWithHighlight(node.superscript, fragment);
			return {
				latex: `${base.latex}^{${sup.latex}}`,
				matched: base.matched || sup.matched
			};
		}
		default:
			// For any other node type, delegate to toLatex without highlighting.
			// The outer caller will fall back to coloring the whole expression
			// when nothing matched.
			return { latex: toLatex(node), matched: false };
	}
}

function multiplicationOp(style: string): string {
	switch (style) {
		case 'cross':
			return ' \\times ';
		case 'dot':
			return ' \\cdot ';
		case 'implicit':
			return ' ';
		default:
			return ' \\times ';
	}
}

// =============================================================================
// Custom-syntax pretty printing (CLI / debug-friendly output)
// =============================================================================

/**
 * Produce the **custom-syntax** version of the transformation. Returns a
 * 2-line string :
 *
 *   <globalBefore with subBefore wrapped in @blue{...}>
 *   = <globalAfter>
 *
 * Implementation : we let `toCustom` produce the canonical custom-syntax
 * form of both the global expression and the sub-tree, then substitute
 * the first occurrence of the sub-tree's text by `@blue{...}`. This keeps
 * the spacing perfectly consistent with the un-highlighted right-hand side
 * (no parallel walker drifting from `toCustom`'s conventions).
 *
 * The `@blue{...}` markers are post-processed into ANSI escape codes by
 * the CLI script ; snapshot tests keep them literal.
 */
export function formatTransformationCustom(step: PedagogicalArithmeticStep): string {
	const globalBefore = step.globalBefore ?? step.before;
	const globalAfter = step.globalAfter ?? step.after;
	const subBefore = step.before;

	const beforeText = toCustom(globalBefore);
	const afterText = toCustom(globalAfter);
	const colored = injectHighlight(beforeText, globalBefore, subBefore);

	return `${colored}\n= ${afterText}`;
}

/**
 * Inject `@blue{...}` around the first occurrence of the fragment's
 * custom-syntax text inside the global expression's text. Uses
 * `nodesEqual` to check the global itself first — if the global is
 * structurally equal to the fragment, the whole expression is highlighted.
 *
 * Falls back to coloring the whole expression when the fragment text
 * cannot be located (defensive).
 */
function injectHighlight(beforeText: string, global: MathNode, fragment: MathNode): string {
	if (nodesEqual(global, fragment)) {
		return `@blue{${beforeText}}`;
	}
	const subText = toCustom(fragment);
	const idx = beforeText.indexOf(subText);
	if (idx < 0) return `@blue{${beforeText}}`;
	return beforeText.slice(0, idx) + `@blue{${subText}}` + beforeText.slice(idx + subText.length);
}

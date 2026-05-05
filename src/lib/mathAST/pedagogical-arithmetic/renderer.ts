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
	 *   <globalBefore with each highlight sub-tree wrapped in \textcolor{blue}{...}>
	 *   = <globalAfter>
	 *
	 * Highlights come from `step.highlightSubTrees` when set (steps that
	 * rewrite multiple sub-trees at once, like `group-multiplications-in-addition`),
	 * else from `[step.before]` (the single fragment that changed).
	 */
	private formatTransformation(step: PedagogicalArithmeticStep): string {
		const globalBefore = step.globalBefore ?? step.before;
		const globalAfter = step.globalAfter ?? step.after;
		const fragments = step.highlightSubTrees ?? [step.before];

		const colored = colorFragmentsInExpression(globalBefore, fragments);
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
 * Produce LaTeX of `globalNode` with EACH `fragment` wrapped in
 * `\textcolor{blue}{...}`. Identifies fragments by structural equality
 * (`nodesEqual`) — necessary because `mapNode` reconstructs sub-trees, so
 * reference equality would fail.
 *
 * Falls back to coloring the entire global node if no fragment can be
 * located (defensive).
 */
function colorFragmentsInExpression(global: MathNode, fragments: readonly MathNode[]): string {
	if (fragments.length === 0) return toLatex(global);
	if (fragments.length === 1 && nodesEqual(global, fragments[0])) {
		return `\\textcolor{blue}{${toLatex(global)}}`;
	}
	const found = renderWithHighlights(global, fragments);
	if (found.matched) return found.latex;
	return `\\textcolor{blue}{${toLatex(global)}}`;
}

interface HighlightResult {
	readonly latex: string;
	readonly matched: boolean;
}

/**
 * Walk `node` to produce its LaTeX while wrapping every node that
 * structurally matches one of `fragments` in `\textcolor{blue}{...}`. The
 * traversal mirrors the structure used by `latex-generator.ts` for the
 * operators we routinely encounter — for any other shape, we delegate to
 * `toLatex` and the fragment(s), if absent, won't be colored (graceful
 * degradation).
 */
function renderWithHighlights(node: MathNode, fragments: readonly MathNode[]): HighlightResult {
	if (fragments.some((f) => nodesEqual(node, f))) {
		return { latex: `\\textcolor{blue}{${toLatex(node)}}`, matched: true };
	}

	switch (node.type) {
		case 'addition': {
			const l = renderWithHighlights(node.left, fragments);
			const r = renderWithHighlights(node.right, fragments);
			return {
				latex: `${l.latex} + ${r.latex}`,
				matched: l.matched || r.matched
			};
		}
		case 'subtraction': {
			const l = renderWithHighlights(node.left, fragments);
			const r = renderWithHighlights(node.right, fragments);
			return {
				latex: `${l.latex} - ${r.latex}`,
				matched: l.matched || r.matched
			};
		}
		case 'multiplication': {
			const l = renderWithHighlights(node.left, fragments);
			const r = renderWithHighlights(node.right, fragments);
			const op = multiplicationOp(node.displayStyle);
			return {
				latex: `${l.latex}${op}${r.latex}`,
				matched: l.matched || r.matched
			};
		}
		case 'division': {
			const num = renderWithHighlights(node.numerator, fragments);
			const den = renderWithHighlights(node.denominator, fragments);
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
			const inner = renderWithHighlights(node.operand, fragments);
			return { latex: `-${inner.latex}`, matched: inner.matched };
		}
		case 'positive': {
			const inner = renderWithHighlights(node.operand, fragments);
			return { latex: `+${inner.latex}`, matched: inner.matched };
		}
		case 'delimiter': {
			const inner = renderWithHighlights(node.content, fragments);
			return { latex: `\\left(${inner.latex}\\right)`, matched: inner.matched };
		}
		case 'superscript': {
			const base = renderWithHighlights(node.base, fragments);
			const sup = renderWithHighlights(node.superscript, fragments);
			return {
				latex: `${base.latex}^{${sup.latex}}`,
				matched: base.matched || sup.matched
			};
		}
		default:
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
	const fragments = step.highlightSubTrees ?? [step.before];

	const beforeText = toCustom(globalBefore);
	const afterText = toCustom(globalAfter);
	const colored = injectHighlights(beforeText, globalBefore, fragments);

	return `${colored}\n= ${afterText}`;
}

/**
 * Inject `@blue{...}` around the first occurrence of EACH fragment's
 * custom-syntax text inside `beforeText`. When `globalBefore` itself
 * structurally matches a (single) fragment, the whole expression is
 * highlighted. Defensive fallback : if no fragment can be located in the
 * text, color the whole expression.
 *
 * Each pass operates on the partially-modified text from previous passes,
 * so every distinct fragment receives its own `@blue{...}` wrapper. The
 * `indexOf` search starts at offset 0 each time but skips over text
 * already inside an `@blue{...}` wrapper, which prevents re-coloring an
 * already-highlighted span when two fragments share a common prefix.
 */
function injectHighlights(
	beforeText: string,
	global: MathNode,
	fragments: readonly MathNode[]
): string {
	if (fragments.length === 0) return beforeText;
	if (fragments.length === 1 && nodesEqual(global, fragments[0])) {
		return `@blue{${beforeText}}`;
	}
	let result = beforeText;
	let anyMatched = false;
	for (const fragment of fragments) {
		const subText = toCustom(fragment);
		const idx = findOutsideWrapper(result, subText);
		if (idx < 0) continue;
		result = result.slice(0, idx) + `@blue{${subText}}` + result.slice(idx + subText.length);
		anyMatched = true;
	}
	return anyMatched ? result : `@blue{${beforeText}}`;
}

/**
 * Find the first occurrence of `needle` in `haystack` that is NOT already
 * inside an `@blue{...}` wrapper. Prevents the multi-fragment loop from
 * re-coloring the same span when two fragments overlap textually.
 */
function findOutsideWrapper(haystack: string, needle: string): number {
	let from = 0;
	while (from <= haystack.length - needle.length) {
		const idx = haystack.indexOf(needle, from);
		if (idx < 0) return -1;
		// Look back for an unmatched `@blue{` before this position
		const opener = haystack.lastIndexOf('@blue{', idx);
		if (opener < 0) return idx;
		const closer = haystack.indexOf('}', opener);
		if (closer < 0 || closer < idx) return idx;
		// The match is inside an existing wrapper — skip past the closer
		from = closer + 1;
	}
	return -1;
}

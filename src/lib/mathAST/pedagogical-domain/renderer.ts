/**
 * Pedagogical Domain — Renderer
 *
 * Converts `EnhancedDomainStep[]` (recorded by `compute.ts` instrumentation)
 * into `RenderedStep[]` with French titles and explanations adapted to a
 * `SchoolLevel`.
 *
 * Format Q4 B (aligned 3-lignes) :
 *
 * ```
 * \begin{aligned}
 *   &\text{Expression : } \sqrt{x-2} \\
 *   &\text{Contrainte : } x - 2 \geq 0 \\
 *   &\text{Domaine : } [2 ; +\infty[
 * \end{aligned}
 * ```
 *
 * The third line (`Domaine`) is omitted when `intermediateDomain` is
 * undefined (fallback 2-lines).
 *
 * Note: this renderer does NOT formally implement
 * `StepRenderer<EnhancedDomainStep, ...>` because `EnhancedDomainStep`
 * does not extend `BaseStep` (no `before`/`after` AST). It exposes the
 * same shape (`render` + `renderAll`) so callers can use it
 * interchangeably with other renderers via duck-typing.
 *
 * @module mathAST/pedagogical-domain/renderer
 */

import { formatInterval } from '../domain';
import type { Domain, EnhancedDomainStep } from '../domain';
import type {
	PedagogicalRenderOptions,
	RenderedStep,
	SchoolLevel
} from '../common/step-renderer-base';
import { EXPLANATIONS, TITLES, getDefaultTitle } from './descriptions-fr';
import type { PedagogicalDomainSchoolLevel } from './types';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Bump primaire/college up to lycée for vocabulary lookup. The dispatcher
 * refuses primaire/college upstream, so this is a defensive default for
 * direct renderer invocations.
 */
function effectiveSchoolLevel(level: SchoolLevel): PedagogicalDomainSchoolLevel {
	if (level === 'primaire' || level === 'college') return 'lycee';
	return level;
}

/**
 * Convert the `formatInterval` Unicode output into LaTeX.
 *
 * `formatInterval` returns French-style notation with Unicode glyphs
 * (`∞`, `ℝ`, `∅`, `≥`, `∪`, `∩`, …). For embedding inside LaTeX inside
 * `\begin{aligned}`, we map those to their LaTeX commands.
 */
function intervalToLatex(domainStr: string): string {
	return domainStr
		.replace(/∞/g, '\\infty')
		.replace(/ℝ/g, '\\mathbb{R}')
		.replace(/∅/g, '\\emptyset')
		.replace(/≤/g, '\\leq')
		.replace(/≥/g, '\\geq')
		.replace(/≠/g, '\\neq')
		.replace(/∪/g, '\\cup')
		.replace(/∩/g, '\\cap')
		.replace(/×/g, '\\times')
		.replace(/π/g, '\\pi');
}

/**
 * Format the LaTeX `\text{Domaine : }` line for a captured intermediateDomain.
 */
function formatDomainLatex(domain: Domain): string {
	return intervalToLatex(formatInterval(domain));
}

/**
 * Build the `\begin{aligned}` block (Q4 B format).
 *
 * - Always shows `Expression` and `Contrainte` lines.
 * - Shows `Domaine` line iff `intermediateDomain` is defined.
 * - Special-cases the `intersection` step: the expression line is omitted
 *   (the constraint here is just the conjunction of previous constraints)
 *   and we display only `Domaine : <final>`.
 */
function formatExpressionLatex(step: EnhancedDomainStep): string {
	if (step.rule === 'intersection') {
		const domainLatex = step.intermediateDomain ? formatDomainLatex(step.intermediateDomain) : '';
		return `\\begin{aligned}\n` + `  &\\text{Domaine : } ${domainLatex}\n` + `\\end{aligned}`;
	}

	if (step.rule === 'universal') {
		return `\\begin{aligned}\n  &\\text{Domaine : } \\mathbb{R}\n\\end{aligned}`;
	}

	if (step.rule === 'empty') {
		return `\\begin{aligned}\n  &\\text{Domaine : } \\emptyset\n\\end{aligned}`;
	}

	const lines = [
		`  &\\text{Expression : } \\textcolor{blue}{${step.expression}} \\\\`,
		`  &\\text{Contrainte : } ${step.constraint}`
	];

	if (step.intermediateDomain) {
		lines[1] += ' \\\\';
		lines.push(`  &\\text{Domaine : } ${formatDomainLatex(step.intermediateDomain)}`);
	}

	return `\\begin{aligned}\n${lines.join('\n')}\n\\end{aligned}`;
}

// =============================================================================
// Renderer
// =============================================================================

export class PedagogicalDomainRenderer {
	render(step: EnhancedDomainStep, options: PedagogicalRenderOptions): RenderedStep {
		const effective = effectiveSchoolLevel(options.schoolLevel);

		const titleFn = TITLES[effective][step.rule] ?? TITLES.lycee[step.rule];
		const title = titleFn ? titleFn(step) : getDefaultTitle(step);

		const explanationFn =
			options.verbosity === 'detailed'
				? (EXPLANATIONS[effective][step.rule] ?? EXPLANATIONS.lycee[step.rule])
				: undefined;
		const explanation = explanationFn?.(step);

		return {
			id: step.id,
			rule: step.rule,
			title,
			...(explanation && { explanation }),
			expressionLatex: formatExpressionLatex(step),
			schoolLevel: effective
		};
	}

	renderAll(
		steps: readonly EnhancedDomainStep[],
		options: PedagogicalRenderOptions
	): readonly RenderedStep[] {
		return steps.map((s) => this.render(s, options));
	}
}

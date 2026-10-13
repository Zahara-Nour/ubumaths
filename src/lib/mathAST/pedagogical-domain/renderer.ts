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
import type {
	Domain,
	EnhancedDomainStep,
	Interval,
	IntervalSet,
	PeriodicExclusion
} from '../domain';
import type { MathNode } from '../types';
import { toLatex } from '../latex-generator';
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
 * Écriture LaTeX d'un domaine, construite depuis sa structure (et non en
 * traduisant l'écriture Unicode de `formatInterval`) :
 *
 * - `]0 ; +\infty[ \cup …`, ℝ entier → `\mathbb{R}`, vide → `\emptyset` ;
 * - singleton → `\left\{0\right\}` ;
 * - points exclus → `\setminus\left\{-\sqrt{2} ; \sqrt{2}\right\}` ;
 * - exclusions périodiques →
 *   `\mathbb{R}\setminus\left\{\frac{\pi}{2}+k\pi,\ k\in\mathbb{Z}\right\}`.
 */
export function domainToLatex(domain: Domain): string {
	switch (domain.kind) {
		case 'universal':
			return '\\mathbb{R}';
		case 'empty':
			return '\\emptyset';
		case 'periodic_exclusion':
			return periodicToLatex(domain);
		case 'interval_set':
			return intervalSetToLatex(domain);
		case 'condition_domain':
			return unicodeToLatex(formatInterval(domain));
	}
}

function intervalSetToLatex(domain: IntervalSet): string {
	const base =
		domain.intervals.length === 0
			? '\\emptyset'
			: domain.intervals.length === 1 && isWholeLine(domain.intervals[0])
				? '\\mathbb{R}'
				: domain.intervals.map(singleIntervalToLatex).join(' \\cup ');
	if (domain.excludedPoints.length === 0) return base;
	const points = domain.excludedPoints.map((p) => valueToLatex(p.value)).join(' ; ');
	return `${base} \\setminus \\left\\{${points}\\right\\}`;
}

function isWholeLine(interval: Interval): boolean {
	return interval.lower.value.type === 'infinity' && interval.upper.value.type === 'infinity';
}

function singleIntervalToLatex(interval: Interval): string {
	const lower = valueToLatex(interval.lower.value);
	const upper = valueToLatex(interval.upper.value);
	const closed = interval.lower.type === 'closed' && interval.upper.type === 'closed';
	// [a ; a] est le singleton {a}
	if (closed && lower === upper) return `\\left\\{${lower}\\right\\}`;
	const left = interval.lower.type === 'closed' ? '[' : ']';
	const right = interval.upper.type === 'closed' ? ']' : '[';
	return `${left}${lower} ; ${upper}${right}`;
}

function periodicToLatex(domain: PeriodicExclusion): string {
	const multiple = periodMultipleToLatex(domain.period);
	const isZeroBase = nodeIsZero(domain.basePoint);
	const points = isZeroBase ? multiple : `${valueToLatex(domain.basePoint)}+${multiple}`;
	return `\\mathbb{R}\\setminus\\left\\{${points},\\ k\\in\\mathbb{Z}\\right\\}`;
}

/** `k` fois la période : `k\pi`, `2k\pi`, `\frac{k\pi}{2}`. */
function periodMultipleToLatex(period: MathNode): string {
	if (period.type === 'division') {
		return `\\frac{${periodMultipleToLatex(period.numerator)}}{${valueToLatex(period.denominator)}}`;
	}
	if (period.type === 'multiplication' && period.left.type === 'number') {
		return `${period.left.value}k${valueToLatex(period.right)}`;
	}
	if (period.type === 'number' && period.value === '1') return 'k';
	return `k${valueToLatex(period)}`;
}

function nodeIsZero(node: MathNode): boolean {
	return node.type === 'number' && Number(node.value) === 0;
}

/** Valeur d'une borne ou d'un point exclu : fractions en `\frac`. */
function valueToLatex(node: MathNode): string {
	switch (node.type) {
		case 'infinity':
			return node.sign === 'positive' ? '+\\infty' : '-\\infty';
		case 'division':
			return `\\frac{${valueToLatex(node.numerator)}}{${valueToLatex(node.denominator)}}`;
		case 'opposite': {
			const operand = valueToLatex(node.operand);
			const isSum = node.operand.type === 'addition' || node.operand.type === 'subtraction';
			return isSum ? `-\\left(${operand}\\right)` : `-${operand}`;
		}
		default:
			return toLatex(node);
	}
}

/**
 * Repli pour les domaines par conditions (rares) : traduction des glyphes
 * Unicode de `formatInterval`.
 */
function unicodeToLatex(domainStr: string): string {
	return domainStr
		.replace(/∞/g, '\\infty')
		.replace(/ℝ/g, '\\mathbb{R}')
		.replace(/ℤ/g, '\\mathbb{Z}')
		.replace(/∅/g, '\\emptyset')
		.replace(/≤/g, '\\leq')
		.replace(/≥/g, '\\geq')
		.replace(/≠/g, '\\neq')
		.replace(/∪/g, '\\cup')
		.replace(/∩/g, '\\cap')
		.replace(/π/g, '\\pi')
		.replace(/√/g, '\\sqrt');
}

/**
 * Format the LaTeX `\text{Domaine : }` line for a captured intermediateDomain.
 */
function formatDomainLatex(domain: Domain): string {
	return domainToLatex(domain);
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

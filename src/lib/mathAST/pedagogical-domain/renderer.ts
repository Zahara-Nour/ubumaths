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
import { compile } from '../eval/compile';
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
	// ]a ; b[ ∪ ]b ; c[ s'écrit ]a ; c[ ∖ {b} : un point exclu, pas une réunion
	const merged: { lower: Interval['lower']; upper: Interval['upper'] }[] = [];
	const excluded: MathNode[] = domain.excludedPoints.map((p) => p.value);
	for (const interval of domain.intervals) {
		const previous = merged[merged.length - 1];
		if (
			previous !== undefined &&
			previous.upper.type === 'open' &&
			interval.lower.type === 'open' &&
			previous.upper.value.type !== 'infinity' &&
			valueToLatex(previous.upper.value) === valueToLatex(interval.lower.value)
		) {
			excluded.push(previous.upper.value);
			merged[merged.length - 1] = { lower: previous.lower, upper: interval.upper };
		} else {
			merged.push({ lower: interval.lower, upper: interval.upper });
		}
	}
	const pieces: Interval[] = merged.map((m) => ({ kind: 'interval', ...m }));
	const base =
		pieces.length === 0
			? '\\emptyset'
			: pieces.length === 1 && isWholeLine(pieces[0])
				? '\\mathbb{R}'
				: pieces.map(singleIntervalToLatex).join(' \\cup ');
	if (excluded.length === 0) return base;
	const points = sortByValue(excluded).map(valueToLatex).join(' ; ');
	return `${base} \\setminus \\left\\{${points}\\right\\}`;
}

/** Points rangés par valeur croissante (ordre d'origine si non évaluables). */
function sortByValue(nodes: readonly MathNode[]): MathNode[] {
	const values = nodes.map(numericValue);
	if (values.some((v) => v === null)) return [...nodes];
	return nodes
		.map((node, i) => ({ node, value: values[i] as number }))
		.sort((x, y) => x.value - y.value)
		.map((x) => x.node);
}

function numericValue(node: MathNode): number | null {
	try {
		const value = compile(node)({});
		return typeof value === 'number' && Number.isFinite(value) ? value : null;
	} catch {
		return null;
	}
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
	const isZeroBase = numericValue(domain.basePoint) === 0;
	const points = isZeroBase ? multiple : `${valueToLatex(domain.basePoint)}+${multiple}`;
	return `\\mathbb{R}\\setminus\\left\\{${points},\\ k\\in\\mathbb{Z}\\right\\}`;
}

/** `k` fois la période : `k`, `2k`, `k\pi`, `2k\pi`, `\frac{k\pi}{2}`, `\frac{k}{2}`. */
function periodMultipleToLatex(period: MathNode): string {
	if (period.type === 'division') {
		return `\\frac{${periodMultipleToLatex(period.numerator)}}{${valueToLatex(period.denominator)}}`;
	}
	if (period.type === 'number') {
		const fraction = decimalFraction(period.value);
		if (fraction !== null) {
			const top = fraction.n === '1' ? 'k' : `${fraction.n}k`;
			return fraction.d === '1' ? top : `\\frac{${top}}{${fraction.d}}`;
		}
		return `${period.value}k`;
	}
	if (period.type === 'multiplication' && period.left.type === 'number') {
		const coefficient = period.left.value === '1' ? '' : period.left.value;
		return `${coefficient}k${valueToLatex(period.right)}`;
	}
	return `k${valueToLatex(period)}`;
}

/**
 * `"0.5"` → 1/2 (positif, réduit) ; `null` si l'écriture n'est pas un décimal
 * positif court (au plus 6 chiffres après la virgule).
 */
function decimalFraction(value: string): { n: string; d: string } | null {
	const match = /^(\d+)(?:\.(\d{1,6}))?$/.exec(value);
	if (!match) return null;
	const decimals = match[2] ?? '';
	let n = BigInt(match[1] + decimals);
	let d = 10n ** BigInt(decimals.length);
	const g = gcd(n, d);
	n /= g;
	d /= g;
	return { n: n.toString(), d: d.toString() };
}

function gcd(a: bigint, b: bigint): bigint {
	return b === 0n ? (a === 0n ? 1n : a) : gcd(b, a % b);
}

/** Valeur d'une borne ou d'un point exclu : fractions en `\frac`. */
function valueToLatex(node: MathNode): string {
	switch (node.type) {
		case 'infinity':
			return node.sign === 'positive' ? '+\\infty' : '-\\infty';
		case 'number': {
			const fraction = decimalFraction(node.value);
			if (fraction === null || fraction.d === '1') return toLatex(node);
			return `\\frac{${fraction.n}}{${fraction.d}}`;
		}
		case 'division':
			return `\\frac{${valueToLatex(node.numerator)}}{${valueToLatex(node.denominator)}}`;
		case 'opposite': {
			const operand = valueToLatex(node.operand);
			return isSum(node.operand) ? `-\\left(${operand}\\right)` : `-${operand}`;
		}
		case 'addition':
			return `${valueToLatex(node.left)}+${valueToLatex(node.right)}`;
		case 'subtraction': {
			const right = valueToLatex(node.right);
			return `${valueToLatex(node.left)}-${isSum(node.right) ? `\\left(${right}\\right)` : right}`;
		}
		case 'multiplication': {
			const left = valueToLatex(node.left);
			const right = valueToLatex(node.right);
			return node.left.type === 'number' && node.right.type !== 'number'
				? `${left}${right}`
				: `${left} \\times ${right}`;
		}
		default:
			return toLatex(node);
	}
}

function isSum(node: MathNode): boolean {
	return node.type === 'addition' || node.type === 'subtraction';
}

/**
 * Repli pour les domaines par conditions (rares) : traduction des glyphes
 * Unicode de `formatInterval`.
 */
function unicodeToLatex(domainStr: string): string {
	return (
		domainStr
			// Points exclus d'abord (avant que ℤ ne devienne `\mathbb{Z}`, dont
			// les accolades casseraient la reconnaissance) : `\ {a ; b}` →
			// `\setminus \left\{a ; b\right\}`
			.replace(/\\ \{([^{}]*)\}/g, '\\setminus \\left\\{$1\\right\\}')
			.replace(/∞/g, '\\infty')
			.replace(/ℝ/g, '\\mathbb{R}')
			.replace(/ℤ/g, '\\mathbb{Z}')
			.replace(/ℕ/g, '\\mathbb{N}')
			.replace(/∅/g, '\\emptyset')
			.replace(/≤/g, '\\leq')
			.replace(/≥/g, '\\geq')
			.replace(/≠/g, '\\neq')
			.replace(/∪/g, '\\cup')
			.replace(/∩/g, '\\cap')
			.replace(/∈/g, '\\in')
			.replace(/·/g, '\\cdot ')
			.replace(/π/g, '\\pi')
			.replace(/√/g, '\\sqrt')
	);
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

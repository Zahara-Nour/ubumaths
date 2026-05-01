/**
 * Heuristic singularity detection for the `integrale()` builtin.
 *
 * V1 emits a console.warn when the integrand contains a suspect subexpression
 * (1/g, tan, ln, sqrt) whose problematic location lies in [a, b]. False
 * positives and negatives are accepted: this is a guidance signal, not a
 * formal verifier (V2 will use mathAST/analysis/continuity for rigorous
 * checks). See `docs/wip/geometry/integrale-study.md` §2.4.
 */

import type { MathNode } from '$lib/mathAST/types';
import type { CompiledFn } from '$lib/mathAST/eval/compile';
import { compile } from '$lib/mathAST/eval/compile';
import { hasVariable } from '$lib/mathAST/eval/substitute';
import { toCustom } from '$lib/mathAST/custom-generator';

export interface SingularityFinding {
	readonly kind: 'division' | 'tan' | 'ln' | 'sqrt';
	readonly description: string;
	readonly approxLocation?: number;
}

const SAMPLE_COUNT = 51;
const ZERO_TOL = 1e-10;

/**
 * Walk the AST and collect every suspect subexpression that depends on `variable`.
 */
function collectCandidates(
	expr: MathNode,
	variable: string,
	out: Array<{ kind: SingularityFinding['kind']; subExpr: MathNode }>
): void {
	switch (expr.type) {
		case 'division':
			if (hasVariable(expr.denominator, variable)) {
				out.push({ kind: 'division', subExpr: expr.denominator });
			}
			collectCandidates(expr.numerator, variable, out);
			collectCandidates(expr.denominator, variable, out);
			return;
		case 'function': {
			const inner = expr.args[0];
			if (inner) {
				if (expr.name === 'tan' && hasVariable(inner, variable)) {
					out.push({ kind: 'tan', subExpr: inner });
				} else if ((expr.name === 'ln' || expr.name === 'log') && hasVariable(inner, variable)) {
					out.push({ kind: 'ln', subExpr: inner });
				} else if (expr.name === 'sqrt' && hasVariable(inner, variable)) {
					out.push({ kind: 'sqrt', subExpr: inner });
				}
			}
			for (const a of expr.args) collectCandidates(a, variable, out);
			return;
		}
		case 'addition':
		case 'subtraction':
		case 'multiplication':
			collectCandidates(expr.left, variable, out);
			collectCandidates(expr.right, variable, out);
			return;
		case 'opposite':
		case 'positive':
			collectCandidates(expr.operand, variable, out);
			return;
		case 'superscript':
			collectCandidates(expr.base, variable, out);
			collectCandidates(expr.superscript, variable, out);
			return;
		case 'subscript':
			collectCandidates(expr.base, variable, out);
			collectCandidates(expr.subscript, variable, out);
			return;
		case 'composition':
			collectCandidates(expr.outer, variable, out);
			collectCandidates(expr.inner, variable, out);
			return;
		case 'delimiter':
			collectCandidates(expr.content, variable, out);
			return;
		default:
			return;
	}
}

/** Sample a compiled function over [a, b], returning {x[], y[]} of finite samples. */
function sample(
	f: CompiledFn,
	variable: string,
	a: number,
	b: number
): { xs: number[]; ys: number[] } {
	const xs: number[] = [];
	const ys: number[] = [];
	const n = SAMPLE_COUNT;
	const step = (b - a) / (n - 1);
	for (let i = 0; i < n; i++) {
		const x = i === n - 1 ? b : a + i * step;
		let y: number;
		try {
			y = f({ [variable]: x });
		} catch {
			continue;
		}
		if (Number.isFinite(y)) {
			xs.push(x);
			ys.push(y);
		}
	}
	return { xs, ys };
}

/** Linear interpolation: x where y crosses target between (x1,y1) and (x2,y2). */
function interp(x1: number, y1: number, x2: number, y2: number, target: number): number {
	const dy = y2 - y1;
	if (Math.abs(dy) < 1e-15) return (x1 + x2) / 2;
	return x1 + ((target - y1) / dy) * (x2 - x1);
}

/** Detect a sign change or near-zero in samples. Returns the approx zero or null. */
function findZero(xs: number[], ys: number[]): number | null {
	for (let i = 0; i < ys.length; i++) {
		if (Math.abs(ys[i]) <= ZERO_TOL) return xs[i];
	}
	for (let i = 1; i < ys.length; i++) {
		if (ys[i - 1] * ys[i] < 0) {
			return interp(xs[i - 1], ys[i - 1], xs[i], ys[i], 0);
		}
	}
	return null;
}

/** Detect a sample that satisfies a predicate; return the first matching x. */
function findFirstWhere(xs: number[], ys: number[], pred: (y: number) => boolean): number | null {
	for (let i = 0; i < ys.length; i++) {
		if (pred(ys[i])) return xs[i];
	}
	return null;
}

/** Detect a tan pole: a consecutive pair straddles (k + 0.5)·π. */
function findTanPole(xs: number[], ys: number[]): number | null {
	const PI = Math.PI;
	for (let i = 1; i < ys.length; i++) {
		// shifted = (g - π/2) / π : poles iff this is an integer.
		const s1 = (ys[i - 1] - PI / 2) / PI;
		const s2 = (ys[i] - PI / 2) / PI;
		if (Math.floor(s1) !== Math.floor(s2)) {
			// Find target integer between s1 and s2.
			const target = Math.max(Math.floor(s1), Math.floor(s2));
			const yTarget = PI / 2 + target * PI;
			return interp(xs[i - 1], ys[i - 1], xs[i], ys[i], yTarget);
		}
	}
	return null;
}

/** Best-effort short label for a subexpression. Long expressions are truncated. */
function shortLabel(expr: MathNode): string {
	let s: string;
	try {
		s = toCustom(expr);
	} catch {
		s = '...';
	}
	if (s.length > 40) s = s.slice(0, 37) + '...';
	return s;
}

/**
 * Find heuristic singularities of `expr` on [a, b].
 *
 * Returns an empty array when `expr` is clean, when bounds are non-finite,
 * or when [a, b] is degenerate. Order of findings is the AST traversal order.
 */
export function findSingularitiesInRange(
	expr: MathNode,
	variable: string,
	a: number,
	b: number
): SingularityFinding[] {
	if (!Number.isFinite(a) || !Number.isFinite(b)) return [];
	if (a === b) return [];
	const lo = Math.min(a, b);
	const hi = Math.max(a, b);

	const candidates: Array<{ kind: SingularityFinding['kind']; subExpr: MathNode }> = [];
	collectCandidates(expr, variable, candidates);
	if (candidates.length === 0) return [];

	const findings: SingularityFinding[] = [];
	for (const cand of candidates) {
		let f: CompiledFn;
		try {
			f = compile(cand.subExpr);
		} catch {
			continue;
		}
		const { xs, ys } = sample(f, variable, lo, hi);
		if (xs.length < 2) continue;
		const label = shortLabel(cand.subExpr);

		switch (cand.kind) {
			case 'division': {
				const x0 = findZero(xs, ys);
				if (x0 !== null) {
					findings.push({
						kind: 'division',
						description: `dénominateur ${label} qui s'annule en x ≈ ${x0.toFixed(3)} ∈ [${a}, ${b}]`,
						approxLocation: x0
					});
				}
				break;
			}
			case 'tan': {
				// ys = values of the argument g, not tan(g) itself.
				const x0 = findTanPole(xs, ys);
				if (x0 !== null) {
					findings.push({
						kind: 'tan',
						description: `tan(${label}) atteint un pôle (π/2 + kπ) en x ≈ ${x0.toFixed(3)}`,
						approxLocation: x0
					});
				}
				break;
			}
			case 'ln': {
				// V2: replace findFirstWhere with a sign-change finder so we
				// also catch g dipping through zero between two sample points.
				const x0 = findFirstWhere(xs, ys, (y) => y <= 0);
				if (x0 !== null) {
					findings.push({
						kind: 'ln',
						description: `ln(${label}) avec argument ≤ 0 sur [${a}, ${b}] (par ex. en x ≈ ${x0.toFixed(3)})`,
						approxLocation: x0
					});
				}
				break;
			}
			case 'sqrt': {
				// V2: same as 'ln' — sign-change detection would catch dips.
				const x0 = findFirstWhere(xs, ys, (y) => y < 0);
				if (x0 !== null) {
					findings.push({
						kind: 'sqrt',
						description: `sqrt(${label}) avec argument < 0 sur [${a}, ${b}] (par ex. en x ≈ ${x0.toFixed(3)})`,
						approxLocation: x0
					});
				}
				break;
			}
		}
	}
	return findings;
}

/** Aggregate findings into a single multi-line warning string. */
export function formatSingularityWarnings(
	findings: SingularityFinding[],
	line?: number,
	builtin: string = 'integrale'
): string {
	if (findings.length === 0) return '';
	const prefix = line !== undefined ? `${builtin} ligne ${line}: ` : `${builtin}: `;
	const header =
		findings.length === 1
			? `${prefix}singularité suspectée — le résultat peut être incorrect.`
			: `${prefix}${findings.length} singularités suspectées — le résultat peut être incorrect.`;
	const body = findings.map((f) => `  • ${f.description}`).join('\n');
	return `${header}\n${body}`;
}

/**
 * Entry point used by the DSL builtin. Emits a single console.warn when at
 * least one finding is detected. Silent otherwise. Bound non-finite values
 * skip detection entirely.
 *
 * `builtin` is the name displayed in the warning prefix (default 'integrale'
 * for V1 backward compat; pass 'aire' from the aire() builtin).
 */
export function warnIfSingularitySuspected(
	expr: MathNode,
	variable: string,
	a: number,
	b: number,
	line?: number,
	builtin: string = 'integrale'
): void {
	if (!Number.isFinite(a) || !Number.isFinite(b)) return;
	const findings = findSingularitiesInRange(expr, variable, a, b);
	if (findings.length === 0) return;
	console.warn(formatSingularityWarnings(findings, line, builtin));
}

/**
 * Pedagogical Limits — Demo helpers.
 *
 * Shared infrastructure used by `demo-cases/*`, the snapshot test in
 * `__tests__/pedagogical-limits-demo.test.ts`, and the CLI in
 * `scripts/pedagogical-limits-demo.ts`. Each `DemoCase` carries a
 * custom-syntax expression and an approach string ; `presentLimit` runs
 * the pedagogical pipeline at every supported school level × verbosity
 * combination and returns a deterministic string.
 *
 * Two output formats:
 * - `'latex'` (default — used by the snapshot test) : LaTeX with
 *   `\textcolor{blue}{\lim_{x \to a} f(x)} = result`. Stable for snapshots,
 *   less readable for terminal eyeballing.
 * - `'custom'` (used by the CLI) : ASCII / Unicode-friendly custom syntax
 *   with `@blue{lim_{x→a} f(x)} = result`. The CLI then post-processes
 *   `@blue{...}` into ANSI escape sequences for highlighted terminals.
 *
 * @module mathAST/pedagogical-limits/demo-helpers
 */

import type { MathNode } from '../types';
import type { LimitDirection } from '../limits/types';
import type { RenderedStep, SchoolLevel } from '../common/step-renderer-base';
import type { Verbosity } from '../common/verbosity';
import { toCustom } from '../custom-generator';
import { toLatex } from '../latex-generator';
import { dispatchPedagogicalLimit } from './dispatch';
import { PedagogicalLimitRenderer } from './renderer';
import { FACTORISATION_CLUSTER_RULES } from './types';
import type { LimitsSchoolLevel, PedagogicalLimitStep } from './types';

// =============================================================================
// Types
// =============================================================================

export interface DemoCase {
	readonly label: string;
	/** Custom-syntax expression of `f(x)` (e.g. `'(x^2-4)/(x-2)'`). */
	readonly expression: string;
	/** Approach point as a custom-syntax string (numeric, `'\\infty'`, `'oo'`, ...). */
	readonly approach: string;
	/** Variable. Default: `'x'`. */
	readonly variable?: string;
	/** Direction. Default: `'both'`. */
	readonly direction?: LimitDirection;
	/** Restrict the demo to specific levels (defaults to lycee + superieur). */
	readonly schoolLevels?: readonly LimitsSchoolLevel[];
}

export interface DemoCategory {
	readonly name: string;
	readonly cases: readonly DemoCase[];
}

/**
 * Output format for the demo presenter.
 *
 * - `'latex'` : aligned `\begin{aligned} … \end{aligned}` blocks with
 *   `\textcolor{blue}{...}` highlights. Stable for snapshot tests.
 * - `'custom'` : compact custom syntax with `@blue{...}` highlights. CLI
 *   converts to ANSI escapes for terminal display.
 */
export type DemoFormat = 'latex' | 'custom';

// =============================================================================
// Defaults
// =============================================================================

const DEFAULT_LEVELS: readonly LimitsSchoolLevel[] = ['lycee', 'superieur'];
const DEFAULT_VERBOSITIES: readonly Verbosity[] = ['summarized', 'detailed'];

const renderer = new PedagogicalLimitRenderer();

// =============================================================================
// Rendering
// =============================================================================

function compressLatex(latex: string): string {
	return latex.replace(/\s*\n\s*/g, ' ').trim();
}

/** Format an approach point as a short string for the lim subscript. */
function approachString(approach: MathNode, format: DemoFormat): string {
	if (approach.type === 'infinity') {
		const sign = approach.sign === 'positive' ? '+∞' : '−∞';
		return format === 'custom' ? sign : approach.sign === 'positive' ? '+\\infty' : '-\\infty';
	}
	return format === 'custom' ? toCustom(approach) : toLatex(approach);
}

/** Compose the limit prefix `lim_{x→a±}` (custom) or `\lim_{x \to a^±}` (latex). */
function limPrefix(
	variable: string,
	approach: MathNode,
	direction: LimitDirection,
	format: DemoFormat
): string {
	const a = approachString(approach, format);
	const sup = direction === 'left' ? '^-' : direction === 'right' ? '^+' : '';
	if (format === 'custom') {
		return `lim_{${variable}→${a}${sup}}`;
	}
	return `\\lim_{${variable} \\to ${a}${sup}}`;
}

/**
 * Format the (before, after) pair of a limit step.
 *
 * - `'latex'` reuses the renderer's already-formatted `expressionLatex`
 *   (compressed to one line) so snapshots remain stable.
 * - `'custom'` builds a fresh `@blue{lim_{x→a} (before)} = after` from the
 *   raw `MathNode` operands via `toCustom` — ASCII-friendly for terminals.
 *   Sub-step rules of the factorisation cluster (`factor-numerator`,
 *   `factor-denominator`) drop the lim wrapper.
 */
function formatStepExpression(
	rendered: RenderedStep,
	raw: PedagogicalLimitStep,
	format: DemoFormat
): string {
	if (format === 'custom') {
		const before = toCustom(raw.before);
		const after = toCustom(raw.after);

		// Sub-step rules operating on a fragment, not the whole limit.
		// Driven by `FACTORISATION_CLUSTER_RULES` minus the parent — same
		// derivation as `FRAGMENT_RULES` in `renderer.ts` (single source of
		// truth, V1.1 cluster extensions auto-covered).
		if (FACTORISATION_CLUSTER_RULES.has(raw.rule) && raw.rule !== 'simplify-common-factor') {
			return `@blue{${before}} = ${after}`;
		}

		const prefix = limPrefix(raw.variable, raw.approach, raw.direction, format);
		return `@blue{${prefix} ${before}} = ${after}`;
	}
	return rendered.expressionLatex ? compressLatex(rendered.expressionLatex) : '';
}

interface IndentInput {
	readonly rendered: RenderedStep;
	readonly raw: PedagogicalLimitStep;
	readonly depth: number;
	readonly format: DemoFormat;
}

function indentStep({ rendered, raw, depth, format }: IndentInput): readonly string[] {
	const pad = '  '.repeat(depth);
	const lines: string[] = [];
	lines.push(`${pad}- [${rendered.rule}] ${rendered.title}`);
	if (rendered.explanation) {
		lines.push(`${pad}  · ${rendered.explanation}`);
	}
	lines.push(`${pad}  ${formatStepExpression(rendered, raw, format)}`);

	if (rendered.subSteps && raw.subSteps) {
		for (let i = 0; i < rendered.subSteps.length; i++) {
			const subRendered = rendered.subSteps[i];
			const subRaw = raw.subSteps[i];
			if (subRaw === undefined) continue;
			lines.push(...indentStep({ rendered: subRendered, raw: subRaw, depth: depth + 1, format }));
		}
	}
	return lines;
}

// `node` may be null when status === 'does-not-exist' (limit gauche ≠ droite).
// Sibling demo helpers in `pedagogical-integration` / `pedagogical-differentiation`
// don't need this guard because their pipelines always produce a non-null
// result ; here we surface the "does not exist" case explicitly.
function formatNode(node: MathNode | null, format: DemoFormat): string {
	if (node === null) return '∅ (does not exist)';
	return format === 'custom' ? toCustom(node) : toLatex(node);
}

/**
 * Render one demo case across every school-level × verbosity combination
 * declared by the case (or the defaults). Returns a deterministic, multi-line
 * string used by the snapshot test and the standalone CLI.
 *
 * Default format (`'latex'`) preserves snapshot stability. Pass `'custom'`
 * for terminal-friendly output.
 *
 * If the pipeline throws `PedagogicalLimitNotImplemented` for a (level,
 * verbosity) combination, the error message is captured inline so the
 * output stays consistent (one block per combination).
 */
export function presentLimit(testCase: DemoCase, format: DemoFormat = 'latex'): string {
	const {
		label,
		expression,
		approach,
		variable = 'x',
		direction = 'both',
		schoolLevels = DEFAULT_LEVELS
	} = testCase;

	const lines: string[] = [];
	const directionSuffix = direction === 'both' ? '' : ` (${direction})`;
	lines.push(`\n###### ${label} ######\n`);
	lines.push(
		`Expression: ${expression}, x → ${approach}${directionSuffix} (variable: ${variable})`
	);
	lines.push('');

	for (const level of schoolLevels) {
		for (const verbosity of DEFAULT_VERBOSITIES) {
			lines.push(`========== ${level.toUpperCase()} (${verbosity}) ==========`);
			try {
				const result = dispatchPedagogicalLimit({
					expression,
					variable,
					approach,
					direction,
					schoolLevel: level,
					verbosity
				});
				const rendered = renderer.renderAll(result.steps, {
					schoolLevel: level,
					verbosity
				});
				for (let i = 0; i < rendered.length; i++) {
					const r = rendered[i];
					const raw = result.steps[i];
					if (raw === undefined) continue;
					lines.push(...indentStep({ rendered: r, raw, depth: 0, format }));
				}
				lines.push(`Status: ${result.status}, Value: ${formatNode(result.value, format)}`);
			} catch (e) {
				lines.push(`(error: ${e instanceof Error ? e.message : String(e)})`);
			}
			lines.push('');
		}
	}
	return lines.join('\n');
}

// Keep `SchoolLevel` re-export for symmetry with the sibling modules.
export type { SchoolLevel };

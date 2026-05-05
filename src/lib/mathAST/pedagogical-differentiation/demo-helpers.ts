/**
 * Pedagogical Differentiation — Demo helpers.
 *
 * Shared infrastructure used by `demo-cases/*`, the snapshot test in
 * `__tests__/pedagogical-differentiation-demo.test.ts`, and the CLI in
 * `scripts/pedagogical-differentiation-demo.ts`. Each `DemoCase` carries a
 * LaTeX expression and a differentiation variable; `presentExpression` runs
 * the pedagogical pipeline at every school level × verbosity combination
 * and returns a deterministic string.
 *
 * Two output formats:
 * - `'latex'` (default — used by the snapshot test) : LaTeX with
 *   `\textcolor{blue}{(before)'} = after`. Stable for snapshots, less
 *   readable for terminal eyeballing.
 * - `'custom'` (used by the CLI) : ASCII / Unicode-friendly custom syntax
 *   with `@blue{(before)'} = after`. The CLI then post-processes
 *   `@blue{...}` into ANSI escape sequences for highlighted terminals.
 *
 * @module mathAST/pedagogical-differentiation/demo-helpers
 */

import type { MathNode } from '../types';
import type { RenderedStep, SchoolLevel } from '../common/step-renderer-base';
import type { Verbosity } from '../common/verbosity';
import { toCustom } from '../custom-generator';
import { toLatex } from '../latex-generator';
import { parseLatex } from '../parser';
import { generatePedagogicalDifferentiationSteps } from './pipeline';
import { PedagogicalDifferentiationRenderer } from './renderer';
import type { PedagogicalDifferentiationStep } from './types';

// =============================================================================
// Types
// =============================================================================

export interface DemoCase {
	readonly label: string;
	/** LaTeX source for the expression to differentiate */
	readonly latex: string;
	/** Differentiation variable. Default: `'x'`. */
	readonly variable?: string;
	/** Restrict the demo to specific levels (defaults to lycee + superieur). */
	readonly schoolLevels?: readonly SchoolLevel[];
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

const DEFAULT_LEVELS: readonly SchoolLevel[] = ['lycee', 'superieur'];
const DEFAULT_VERBOSITIES: readonly Verbosity[] = ['summarized', 'detailed'];

const renderer = new PedagogicalDifferentiationRenderer();

// =============================================================================
// Rendering
// =============================================================================

function compressLatex(latex: string): string {
	return latex.replace(/\s*\n\s*/g, ' ').trim();
}

/**
 * Format the (before, after) pair of a differentiation step.
 *
 * - `'latex'` reuses the renderer's already-formatted `expressionLatex`
 *   (compressed to one line) so snapshots remain stable.
 * - `'custom'` builds a fresh `@blue{(before)'} = after` from the raw
 *   `MathNode` operands via `toCustom` — ASCII-friendly for terminals.
 */
function formatStepExpression(
	rendered: RenderedStep,
	raw: PedagogicalDifferentiationStep,
	format: DemoFormat
): string {
	if (format === 'custom') {
		return `@blue{(${toCustom(raw.before)})'} = ${toCustom(raw.after)}`;
	}
	return rendered.expressionLatex ? compressLatex(rendered.expressionLatex) : '';
}

interface IndentInput {
	readonly rendered: RenderedStep;
	readonly raw: PedagogicalDifferentiationStep;
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

function formatDerivative(node: MathNode, format: DemoFormat): string {
	return format === 'custom' ? toCustom(node) : toLatex(node);
}

/**
 * Render one demo case across every school-level × verbosity combination
 * declared by the case (or the defaults). Returns a deterministic, multi-line
 * string used by the snapshot test and the standalone CLI.
 *
 * Default format (`'latex'`) preserves snapshot stability. Pass `'custom'`
 * for terminal-friendly output.
 */
export function presentExpression(testCase: DemoCase, format: DemoFormat = 'latex'): string {
	const { label, latex, variable = 'x', schoolLevels = DEFAULT_LEVELS } = testCase;
	const node = parseLatex(latex);

	const lines: string[] = [];
	lines.push(`\n###### ${label} ######\n`);
	lines.push(`Expression: ${latex} (variable: ${variable})`);
	lines.push('');

	for (const level of schoolLevels) {
		for (const verbosity of DEFAULT_VERBOSITIES) {
			lines.push(`========== ${level.toUpperCase()} (${verbosity}) ==========`);
			try {
				const result = generatePedagogicalDifferentiationSteps(node, {
					variable,
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
				lines.push(`Result: ${formatDerivative(result.derivative, format)}`);
			} catch (e) {
				lines.push(`(error: ${e instanceof Error ? e.message : String(e)})`);
			}
			lines.push('');
		}
	}
	return lines.join('\n');
}

/**
 * Pedagogical Integration — Demo helpers.
 *
 * Shared infrastructure used by `demo-cases/*`, the snapshot test in
 * `__tests__/pedagogical-integration-demo.test.ts`, and the CLI in
 * `scripts/pedagogical-integration-demo.ts`. Each `DemoCase` carries a LaTeX
 * integrand (and optional definite bounds); `presentIntegral` runs the
 * pedagogical pipeline at every supported school level × verbosity
 * combination and returns a deterministic string.
 *
 * Two output formats:
 * - `'latex'` (default — used by the snapshot test) : LaTeX with
 *   `\textcolor{blue}{\int (before)\,dx} = after`. Stable for snapshots,
 *   less readable for terminal eyeballing.
 * - `'custom'` (used by the CLI) : ASCII / Unicode-friendly custom syntax
 *   with `@blue{∫ (before) dx} = after`. The CLI then post-processes
 *   `@blue{...}` into ANSI escape sequences for highlighted terminals.
 *
 * @module mathAST/pedagogical-integration/demo-helpers
 */

import type { MathNode } from '../types';
import type { RenderedStep, SchoolLevel } from '../common/step-renderer-base';
import type { Verbosity } from '../common/verbosity';
import { toCustom } from '../custom-generator';
import { toLatex } from '../latex-generator';
import { parseLatex } from '../parser';
import { generatePedagogicalIntegrationSteps } from './pipeline';
import { PedagogicalIntegrationRenderer } from './renderer';
import type { IntegrationSchoolLevel, PedagogicalIntegrationStep } from './types';

// =============================================================================
// Types
// =============================================================================

export interface DemoCase {
	readonly label: string;
	/** LaTeX source for the integrand */
	readonly latex: string;
	/** Integration variable. Default: auto-detected. */
	readonly variable?: string;
	/** Optional definite-integral bounds, both as LaTeX strings. */
	readonly definite?: { readonly lower: string; readonly upper: string };
	/** Restrict the demo to specific levels (defaults to lycee + superieur). */
	readonly schoolLevels?: readonly IntegrationSchoolLevel[];
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

const DEFAULT_LEVELS: readonly IntegrationSchoolLevel[] = ['lycee', 'superieur'];
const DEFAULT_VERBOSITIES: readonly Verbosity[] = ['summarized', 'detailed'];

const renderer = new PedagogicalIntegrationRenderer();

// =============================================================================
// Rendering
// =============================================================================

function compressLatex(latex: string): string {
	return latex.replace(/\s*\n\s*/g, ' ').trim();
}

/**
 * Format the (before, after) pair of an integration step.
 *
 * - `'latex'` reuses the renderer's already-formatted `expressionLatex`
 *   (compressed to one line) so snapshots remain stable.
 * - `'custom'` builds a fresh `@blue{∫ (before) dx} = after` from the raw
 *   `MathNode` operands via `toCustom` — ASCII-friendly for terminals.
 */
function formatStepExpression(
	rendered: RenderedStep,
	raw: PedagogicalIntegrationStep,
	format: DemoFormat
): string {
	if (format === 'custom') {
		const dx = ` d${raw.variable}`;
		const lower = raw.definite ? toCustom(raw.definite.lower) : null;
		const upper = raw.definite ? toCustom(raw.definite.upper) : null;
		const integralPrefix =
			raw.definite && lower !== null && upper !== null ? `∫_{${lower}}^{${upper}}` : '∫';

		// Special rule formats — mirror renderer.ts cases that don't use the
		// standard `∫ before dx = after` shape.
		switch (raw.rule) {
			case 'add-constant':
				return `@blue{${toCustom(raw.after)} + C}`;
			case 'identify-integrand':
			case 'identify-definite-integral':
				return `@blue{${integralPrefix} ${toCustom(raw.before)}${dx}}`;
			case 'substitute-bounds': {
				const F = raw.bindings?.primitive ? toCustom(raw.bindings.primitive) : '?';
				return `@blue{[${F}]_{${lower ?? '?'}}^{${upper ?? '?'}}} = ${toCustom(raw.after)}`;
			}
			case 'simplify-bounds-result':
				return `@blue{${toCustom(raw.before)}} = ${toCustom(raw.after)}`;
			case 'apply-fundamental-theorem': {
				const F = raw.bindings?.primitive ? toCustom(raw.bindings.primitive) : toCustom(raw.after);
				return `@blue{${integralPrefix} ${toCustom(raw.before)}${dx}} = [${F}]_{${lower ?? '?'}}^{${upper ?? '?'}}`;
			}
			default:
				return `@blue{${integralPrefix} ${toCustom(raw.before)}${dx}} = ${toCustom(raw.after)}`;
		}
	}
	return rendered.expressionLatex ? compressLatex(rendered.expressionLatex) : '';
}

interface IndentInput {
	readonly rendered: RenderedStep;
	readonly raw: PedagogicalIntegrationStep;
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

function formatNode(node: MathNode, format: DemoFormat): string {
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
export function presentIntegral(testCase: DemoCase, format: DemoFormat = 'latex'): string {
	const { label, latex, variable, definite, schoolLevels = DEFAULT_LEVELS } = testCase;
	const integrand = parseLatex(latex);
	const definiteParsed = definite
		? { lower: parseLatex(definite.lower), upper: parseLatex(definite.upper) }
		: undefined;

	const lines: string[] = [];
	const definiteLabel = definite ? ` from ${definite.lower} to ${definite.upper}` : '';
	lines.push(`\n###### ${label} ######\n`);
	lines.push(`Expression: ${latex}${definiteLabel}` + (variable ? ` (variable: ${variable})` : ''));
	lines.push('');

	for (const level of schoolLevels) {
		for (const verbosity of DEFAULT_VERBOSITIES) {
			lines.push(`========== ${level.toUpperCase()} (${verbosity}) ==========`);
			try {
				const result = generatePedagogicalIntegrationSteps(integrand, {
					level,
					variable,
					verbosity,
					definite: definiteParsed
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
				lines.push(`Antiderivative: ${formatNode(result.antiderivative, format)}`);
				if (result.value) {
					lines.push(`Value: ${formatNode(result.value, format)}`);
				}
			} catch (e) {
				lines.push(`(error: ${e instanceof Error ? e.message : String(e)})`);
			}
			lines.push('');
		}
	}
	return lines.join('\n');
}

// Keep `SchoolLevel` re-export for symmetry with the differentiation module —
// some external callers import the type from here.
export type { SchoolLevel };

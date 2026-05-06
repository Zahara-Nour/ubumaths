/**
 * Pedagogical Simplify — Demo helpers.
 *
 * Shared infrastructure used by `demo-cases/*`, the snapshot test in
 * `__tests__/pedagogical-simplify-demo.test.ts`, and the CLI in
 * `scripts/pedagogical-simplify-demo.ts`. Each `DemoCase` declares a LaTeX
 * input expression, a target intent, and optionally a school level (default
 * lycée). `presentSimplification` runs the pipeline + renderer and returns
 * a deterministic multi-line string suitable for snapshot diffing or
 * terminal display.
 *
 * Two output formats :
 *  - `'latex'` (default) : reuses the renderer's `expressionLatex` (compact
 *    one-line aligned block) ; stable for snapshots.
 *  - `'custom'` : ASCII/Unicode `@blue{before}` = after via `toCustom` ;
 *    the CLI converts `@blue{...}` into ANSI bold-blue at print time.
 *
 * @module mathAST/pedagogical-simplify/demo-helpers
 */

import type { MathNode } from '../types';
import type { RenderedStep, SchoolLevel } from '../common/step-renderer-base';
import type { Verbosity } from '../common/verbosity';
import { toCustom } from '../custom-generator';
import { toLatex } from '../latex-generator';
import { parseLatex } from '../parser';
import { generatePedagogicalSimplifySteps } from './pipeline';
import { PedagogicalSimplifyRenderer } from './renderer';
import {
	PedagogicalSimplifyNotImplemented,
	type PedagogicalSimplifyStep,
	type SimplifyIntent
} from './types';

// =============================================================================
// Types
// =============================================================================

export interface DemoCase {
	readonly label: string;
	/** LaTeX source for the expression to simplify */
	readonly latex: string;
	/** Required — drives rule selection. */
	readonly intent: SimplifyIntent;
	/** Restrict the demo to specific levels (defaults to lycee). */
	readonly schoolLevels?: readonly SchoolLevel[];
}

export interface DemoCategory {
	readonly name: string;
	readonly cases: readonly DemoCase[];
}

export type DemoFormat = 'latex' | 'custom';

// =============================================================================
// Defaults
// =============================================================================

const DEFAULT_LEVELS: readonly SchoolLevel[] = ['lycee'];
const DEFAULT_VERBOSITIES: readonly Verbosity[] = ['detailed'];

const renderer = new PedagogicalSimplifyRenderer();

// =============================================================================
// Rendering helpers
// =============================================================================

function compressLatex(latex: string): string {
	return latex.replace(/\s*\n\s*/g, ' ').trim();
}

function formatStepExpression(
	rendered: RenderedStep,
	raw: PedagogicalSimplifyStep,
	format: DemoFormat
): string {
	if (format === 'custom') {
		const before = raw.globalBefore ?? raw.before;
		const after = raw.globalAfter ?? raw.after;
		return `@blue{${toCustom(before)}} = ${toCustom(after)}`;
	}
	return rendered.expressionLatex ? compressLatex(rendered.expressionLatex) : '';
}

interface IndentInput {
	readonly rendered: RenderedStep;
	readonly raw: PedagogicalSimplifyStep;
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

function formatResult(node: MathNode, format: DemoFormat): string {
	return format === 'custom' ? toCustom(node) : toLatex(node);
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Run one demo case across every school-level × verbosity combination
 * declared by the case (or the defaults). Returns a deterministic
 * multi-line string suitable for `expect(...).toMatchSnapshot()` or
 * console.log.
 *
 * Returns a placeholder string when the pipeline throws
 * `PedagogicalSimplifyNotImplemented` (graceful degradation in V1 — the
 * renderer would never be reached).
 */
export function presentSimplification(demo: DemoCase, format: DemoFormat = 'latex'): string {
	const levels = demo.schoolLevels ?? DEFAULT_LEVELS;
	const lines: string[] = [];
	lines.push(`# ${demo.label} — intent=${demo.intent} — ${demo.latex}`);
	for (const level of levels) {
		for (const verbosity of DEFAULT_VERBOSITIES) {
			lines.push('');
			lines.push(`## ${level} (verbosity=${verbosity})`);
			let node: MathNode;
			try {
				node = parseLatex(demo.latex);
			} catch (e) {
				lines.push(`(parse failed: ${(e as Error).message})`);
				continue;
			}
			let result: { result: MathNode; steps: readonly PedagogicalSimplifyStep[] };
			try {
				result = generatePedagogicalSimplifySteps(node, {
					intent: demo.intent,
					schoolLevel: level,
					verbosity
				});
			} catch (e) {
				if (e instanceof PedagogicalSimplifyNotImplemented) {
					lines.push(`(not implemented: ${e.message})`);
					continue;
				}
				throw e;
			}
			const rendered = renderer.renderAll(result.steps, {
				schoolLevel: level,
				verbosity
			});
			if (rendered.length === 0) {
				lines.push('(no steps — already simplified for this intent)');
			}
			for (let i = 0; i < rendered.length; i++) {
				lines.push(
					...indentStep({
						rendered: rendered[i],
						raw: result.steps[i],
						depth: 0,
						format
					})
				);
			}
			lines.push(`=> ${formatResult(result.result, format)}`);
		}
	}
	return lines.join('\n');
}

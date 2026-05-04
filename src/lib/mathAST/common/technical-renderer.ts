/**
 * Generic Technical Step Renderer
 *
 * Verbose, debug-oriented renderer that dumps every `BaseStep` with its full
 * payload (core fields + spec extras detected via reflection). No school-level
 * adaptation — for that, use a domain-specific PedagogicalRenderer.
 *
 * Behavior:
 * - Always emits `id`, `rule`, `title` (= description), `expressionLatex`.
 * - When `format: 'text'`, additionally emits a `text` dump including extras.
 * - Verbosity is informational and does NOT filter output (filtering is the
 *   step recorder's job, not the renderer's).
 *
 * @module mathAST/common/technical-renderer
 */

import type { MathNode } from '../types';
import { toLatex } from '../latex-generator.js';
import type { BaseStep } from './step-recorder-base';
import type { RenderOptions, RenderedStep, StepRenderer } from './step-renderer-base';

// =============================================================================
// Reflection helpers
// =============================================================================

const CORE_FIELDS: ReadonlySet<string> = new Set([
	'id',
	'rule',
	'description',
	'before',
	'after',
	'verbosityLevel'
]);

/** Discriminator-based detection of MathNode-shaped values. */
function isMathNodeLike(value: unknown): value is MathNode {
	return (
		typeof value === 'object' &&
		value !== null &&
		'type' in value &&
		typeof (value as { type: unknown }).type === 'string'
	);
}

function formatExtraValue(value: unknown): string {
	if (value === null || value === undefined) return String(value);
	if (isMathNodeLike(value)) return toLatex(value);
	if (typeof value === 'object') {
		try {
			return JSON.stringify(value);
		} catch {
			return String(value);
		}
	}
	return String(value);
}

function dumpExtraFields(step: BaseStep): Array<readonly [string, string]> {
	const extras: Array<readonly [string, string]> = [];
	for (const [key, value] of Object.entries(step)) {
		if (CORE_FIELDS.has(key)) continue;
		if (value === undefined) continue;
		extras.push([key, formatExtraValue(value)] as const);
	}
	return extras;
}

function buildTextDump(step: BaseStep, beforeLatex: string, afterLatex: string): string {
	const head = `[${step.id}] ${step.rule}: ${step.description}`;
	const expr = `  ${beforeLatex} \\Rightarrow ${afterLatex}`;
	const extras = dumpExtraFields(step);
	if (extras.length === 0) return `${head}\n${expr}`;
	const extrasStr = extras.map(([k, v]) => `${k}=${v}`).join(', ');
	return `${head}\n${expr}\n  (${extrasStr})`;
}

// =============================================================================
// Renderer
// =============================================================================

/**
 * Generic technical renderer. Works on any `BaseStep` subtype.
 *
 * @example
 * ```typescript
 * const renderer = new GenericTechnicalRenderer<SimplifyStep>();
 * const out = renderer.renderAll(recorder.getSteps(), {
 *   verbosity: 'detailed',
 *   format: 'text'
 * });
 * console.log(out.map((s) => s.text).join('\n'));
 * ```
 */
export class GenericTechnicalRenderer<TStep extends BaseStep>
	implements StepRenderer<TStep, RenderOptions>
{
	render(step: TStep, options: RenderOptions): RenderedStep {
		const beforeLatex = toLatex(step.before);
		const afterLatex = toLatex(step.after);
		const expressionLatex = `${beforeLatex} \\Rightarrow ${afterLatex}`;

		const base: RenderedStep = {
			id: step.id,
			rule: step.rule,
			title: step.description,
			expressionLatex
		};

		if (options.format === 'text') {
			return { ...base, text: buildTextDump(step, beforeLatex, afterLatex) };
		}
		return base;
	}

	renderAll(steps: readonly TStep[], options: RenderOptions): readonly RenderedStep[] {
		return steps.map((step) => this.render(step, options));
	}
}

/**
 * Pedagogical Domain — Demo helpers.
 *
 * Shared infrastructure used by `demo-cases/*`, the snapshot test, and the
 * CLI. Each `DemoCase` carries a LaTeX expression ; `presentDomain` runs
 * the pedagogical pipeline at every supported school level × verbosity
 * combination and returns a deterministic string.
 *
 * Two output formats:
 * - `'latex'` (default — used by the snapshot test): LaTeX with
 *   `\begin{aligned}` blocks. Stable for snapshots, less readable for
 *   terminal eyeballing.
 * - `'custom'` (used by the CLI): ASCII / Unicode-friendly with
 *   `@blue{...}` highlights post-processed by the CLI into ANSI escape
 *   sequences for highlighted terminals.
 *
 * @module mathAST/pedagogical-domain/demo-helpers
 */

import type { Domain, EnhancedDomainStep } from '../domain';
import { formatInterval } from '../domain';
import type { RenderedStep, SchoolLevel } from '../common/step-renderer-base';
import type { Verbosity } from '../common/verbosity';
import { dispatchPedagogicalDomain } from './dispatch';
import { PedagogicalDomainRenderer } from './renderer';
import { PedagogicalDomainNotImplemented, type PedagogicalDomainSchoolLevel } from './types';

// =============================================================================
// Types
// =============================================================================

export interface DemoCase {
	readonly label: string;
	/** LaTeX expression of `f(x)` (e.g. `'\\sqrt{x - 2}'`). */
	readonly expression: string;
	/** Variable. Default: `'x'`. */
	readonly variable?: string;
	/** Restrict the demo to specific levels (defaults to lycee + superieur). */
	readonly schoolLevels?: readonly PedagogicalDomainSchoolLevel[];
}

export interface DemoCategory {
	readonly name: string;
	readonly cases: readonly DemoCase[];
}

export type DemoFormat = 'latex' | 'custom';

// =============================================================================
// Defaults
// =============================================================================

const DEFAULT_LEVELS: readonly PedagogicalDomainSchoolLevel[] = ['lycee', 'superieur'];
const DEFAULT_VERBOSITIES: readonly Verbosity[] = ['summarized', 'detailed'];

const renderer = new PedagogicalDomainRenderer();

// =============================================================================
// Rendering
// =============================================================================

function compressLatex(latex: string): string {
	return latex.replace(/\s*\n\s*/g, ' ').trim();
}

/** Format a Domain as a short Unicode string for the custom format. */
function formatDomainCustom(domain: Domain): string {
	return formatInterval(domain);
}

/**
 * Format the body of a step as a 1-line string.
 *
 * - `'latex'` reuses the renderer's `expressionLatex` (compressed to one
 *   line) so snapshots remain stable.
 * - `'custom'` builds a fresh `@blue{<expression>} ⟹ <constraint>` string.
 *   Sub-rules without expression (intersection, universal) drop the
 *   left-hand side.
 */
function formatStepExpression(
	rendered: RenderedStep,
	raw: EnhancedDomainStep,
	format: DemoFormat
): string {
	if (format === 'custom') {
		if (raw.rule === 'intersection') {
			return `Domaine = ${raw.intermediateDomain ? formatDomainCustom(raw.intermediateDomain) : ''}`;
		}
		if (raw.rule === 'universal') {
			return `Domaine = ℝ`;
		}
		if (raw.rule === 'empty') {
			return `Domaine = ∅`;
		}
		const head = `@blue{${raw.expression}} ⟹ ${raw.constraint}`;
		if (raw.intermediateDomain) {
			return `${head} ⟹ ${formatDomainCustom(raw.intermediateDomain)}`;
		}
		return head;
	}
	return rendered.expressionLatex ? compressLatex(rendered.expressionLatex) : '';
}

function indentStep(
	rendered: RenderedStep,
	raw: EnhancedDomainStep,
	format: DemoFormat
): readonly string[] {
	const lines: string[] = [];
	lines.push(`- [${rendered.rule}] ${rendered.title}`);
	if (rendered.explanation) {
		lines.push(`  · ${rendered.explanation}`);
	}
	lines.push(`  ${formatStepExpression(rendered, raw, format)}`);
	return lines;
}

function formatFinalDomain(domain: Domain, format: DemoFormat): string {
	if (format === 'custom') return formatDomainCustom(domain);
	// LaTeX: reuse the same conversion as the renderer
	return formatInterval(domain);
}

/**
 * Render one demo case across every school-level × verbosity combination
 * declared by the case (or the defaults).
 *
 * If the pipeline throws `PedagogicalDomainNotImplemented`, the error
 * message is captured inline so the output stays consistent (one block per
 * combination).
 */
export function presentDomain(testCase: DemoCase, format: DemoFormat = 'latex'): string {
	const { label, expression, variable = 'x', schoolLevels = DEFAULT_LEVELS } = testCase;

	const lines: string[] = [];
	lines.push(`\n###### ${label} ######\n`);
	lines.push(`Expression: ${expression} (variable: ${variable})`);
	lines.push('');

	for (const level of schoolLevels) {
		for (const verbosity of DEFAULT_VERBOSITIES) {
			lines.push(`========== ${level.toUpperCase()} (${verbosity}) ==========`);
			try {
				const result = dispatchPedagogicalDomain({
					expression,
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
					lines.push(...indentStep(r, raw, format));
				}
				lines.push(`Domaine final: ${formatFinalDomain(result.domain, format)}`);
			} catch (e) {
				if (e instanceof PedagogicalDomainNotImplemented) {
					lines.push(`(refusé: ${e.message})`);
				} else {
					lines.push(`(error: ${e instanceof Error ? e.message : String(e)})`);
				}
			}
			lines.push('');
		}
	}
	return lines.join('\n');
}

export type { SchoolLevel };

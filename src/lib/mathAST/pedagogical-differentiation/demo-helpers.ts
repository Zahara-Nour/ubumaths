/**
 * Pedagogical Differentiation — Demo helpers.
 *
 * Shared infrastructure used by `demo-cases/*` and the snapshot tests in
 * `__tests__/pedagogical-differentiation-demo.test.ts`. Each `DemoCase`
 * carries a LaTeX expression and a differentiation variable; `presentExpression`
 * runs the pedagogical pipeline at every school level × verbosity combination
 * and returns a deterministic string suitable for snapshot comparison.
 *
 * The string format intentionally compresses the aligned LaTeX into a single
 * line per step so snapshots remain compact and readable.
 *
 * @module mathAST/pedagogical-differentiation/demo-helpers
 */

import type { RenderedStep, SchoolLevel } from '../common/step-renderer-base';
import type { Verbosity } from '../common/verbosity';
import { toLatex } from '../latex-generator';
import { parseLatex } from '../parser';
import { generatePedagogicalDifferentiationSteps } from './pipeline';
import { PedagogicalDifferentiationRenderer } from './renderer';

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

function indentRendered(rendered: RenderedStep, depth = 0): readonly string[] {
	const pad = '  '.repeat(depth);
	const lines: string[] = [];
	lines.push(`${pad}- [${rendered.rule}] ${rendered.title}`);
	if (rendered.explanation) {
		lines.push(`${pad}  · ${rendered.explanation}`);
	}
	if (rendered.expressionLatex) {
		lines.push(`${pad}  ${compressLatex(rendered.expressionLatex)}`);
	}
	if (rendered.subSteps) {
		for (const sub of rendered.subSteps) {
			lines.push(...indentRendered(sub, depth + 1));
		}
	}
	return lines;
}

/**
 * Render one demo case across every school-level × verbosity combination
 * declared by the case (or the defaults). Returns a deterministic, multi-line
 * string used by both the snapshot test and the standalone CLI.
 */
export function presentExpression(testCase: DemoCase): string {
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
				for (const step of rendered) {
					lines.push(...indentRendered(step));
				}
				lines.push(`Result: ${toLatex(result.derivative)}`);
			} catch (e) {
				lines.push(`(error: ${e instanceof Error ? e.message : String(e)})`);
			}
			lines.push('');
		}
	}
	return lines.join('\n');
}

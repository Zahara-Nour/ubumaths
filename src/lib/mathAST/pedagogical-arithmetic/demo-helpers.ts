/**
 * Demo Helpers — Pedagogical Arithmetic
 *
 * Shared rendering used by :
 *   - The standalone CLI demo (`scripts/pedagogical-arithmetic-demo.ts`)
 *   - Snapshot tests (`__tests__/pedagogical-arithmetic-demo.test.ts`)
 *
 * Both consumers run the exact same renderer / formatter so the snapshot
 * captures what the user actually sees in the CLI.
 *
 * @module mathAST/pedagogical-arithmetic/demo-helpers
 */

import type { MathNode } from '../types';
import type { SchoolLevel } from '../common/step-renderer-base';
import type { Verbosity } from '../common/verbosity';
import type { PedagogicalTarget } from '../pedagogical-evaluate/types';
import { generatePedagogicalArithmeticSteps } from './pipeline';
import { formatTransformationCustom, PedagogicalArithmeticRenderer } from './renderer';

/**
 * Levels actually displayed by the demo (subset of the full school-level
 * spectrum). The cases in `demo-cases/` may declare wider `schoolLevels`
 * (e.g. `['college', 'lycee', 'superieur']`) — those wider sets describe
 * pedagogical relevance and stay untouched ; the demo intersects them with
 * `DISPLAYED_LEVELS` at render time so the CLI/snapshots focus on the
 * levels we care about right now.
 */
const DISPLAYED_LEVELS: readonly SchoolLevel[] = ['primaire', 'college'];

/** Verbosities to display (subset of the full Verbosity spectrum). */
const DISPLAYED_VERBOSITIES: readonly Verbosity[] = ['detailed'];

/**
 * Output format for the demo presenter :
 *   - `'custom'` (default) : custom-syntax (ASCII Math) — easier to read in
 *     terminals and snapshot tests. Color markers `@blue{...}` are emitted
 *     literally ; the CLI script post-processes them to ANSI codes.
 *   - `'latex'` : raw LaTeX form, useful when reviewing what the UI will
 *     actually render in the browser.
 *   - `'both'` : both formats stacked, for cross-checking.
 */
export type DemoFormat = 'custom' | 'latex' | 'both';

function renderAt(
	node: MathNode,
	level: SchoolLevel,
	verbosity: Verbosity,
	target: PedagogicalTarget | undefined,
	format: DemoFormat
): readonly string[] {
	const result = generatePedagogicalArithmeticSteps(node, {
		schoolLevel: level,
		target,
		verbosity
	});
	const renderer = new PedagogicalArithmeticRenderer();
	const rendered = renderer.renderAll(result.steps, { schoolLevel: level, verbosity });
	const out: string[] = [];
	for (let i = 0; i < rendered.length; i++) {
		const step = rendered[i];
		const sourceStep = result.steps[i];
		out.push(`[${step.id}] ${step.title}`);

		if (verbosity === 'detailed') {
			if (format === 'custom' || format === 'both') {
				const customText = formatTransformationCustom(sourceStep);
				for (const line of customText.split('\n')) out.push(`    │ ${line}`);
			}
			if (format === 'both') {
				out.push(`    ├ (latex)`);
			}
			if ((format === 'latex' || format === 'both') && step.expressionLatex) {
				for (const line of step.expressionLatex.split('\n')) out.push(`    │ ${line}`);
			}
			if (step.explanation) {
				out.push(`    │ (${step.explanation})`);
			}
		}
	}
	if (result.answerFragment) {
		out.push(
			`(answer fragment: ${result.answerFragment.latex} at ${JSON.stringify(
				result.answerFragment.placeholderPath
			)})`
		);
	}
	return out;
}

/**
 * One demo case in the suite. The `label` shows in test names and demo
 * headers ; the `expression` is a `MathNode` produced via the factory.
 */
export interface DemoCase {
	readonly label: string;
	readonly expression: MathNode;
	readonly target?: PedagogicalTarget;
	/** Restrict snapshot to specific levels (defaults to all 4) */
	readonly schoolLevels?: readonly SchoolLevel[];
}

/**
 * A category groups related demo cases. Used by the snapshot test (one
 * `describe()` per category) and by the standalone CLI (filter by
 * category name argument).
 */
export interface DemoCategory {
	readonly name: string;
	readonly cases: readonly DemoCase[];
}

/**
 * Render the full demo for one expression : iterates over each requested
 * `SchoolLevel` and `Verbosity`, producing a stable string used by both
 * the snapshot test and the CLI.
 *
 * @param testCase the case to render
 * @param format which output format(s) to include — defaults to `'custom'`
 *               (lisible). Pass `'both'` for snapshot tests that want to
 *               cover LaTeX too.
 */
export function presentExpression(testCase: DemoCase, format: DemoFormat = 'custom'): string {
	const { label, expression, target } = testCase;
	// Take the case's pedagogical scope (or all levels when unspecified) and
	// intersect it with what the demo currently displays. Cases that declare
	// e.g. `['college', 'lycee']` end up showing only `college`; cases that
	// declare `['primaire', 'college', 'lycee']` show both.
	const caseLevels =
		testCase.schoolLevels ?? (['primaire', 'college', 'lycee', 'superieur'] as const);
	const levels = DISPLAYED_LEVELS.filter((l) => caseLevels.includes(l));

	const lines: string[] = [];
	lines.push(`\n###### ${label} ######\n`);
	if (target) {
		lines.push(`target: ${JSON.stringify(target)}`);
		lines.push('');
	}
	for (const level of levels) {
		for (const verbosity of DISPLAYED_VERBOSITIES) {
			lines.push(`========== ${level.toUpperCase()} (${verbosity}) ==========`);
			lines.push(...renderAt(expression, level, verbosity, target, format));
			lines.push('');
		}
	}
	return lines.join('\n');
}

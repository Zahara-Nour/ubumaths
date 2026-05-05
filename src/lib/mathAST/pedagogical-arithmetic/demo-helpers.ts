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
import { PedagogicalArithmeticRenderer } from './renderer';

const ALL_LEVELS: readonly SchoolLevel[] = ['primaire', 'college', 'lycee', 'superieur'];
const ALL_VERBOSITIES: readonly Verbosity[] = ['summarized', 'detailed'];

function renderAt(
	node: MathNode,
	level: SchoolLevel,
	verbosity: Verbosity,
	target: PedagogicalTarget | undefined
): readonly string[] {
	const result = generatePedagogicalArithmeticSteps(node, {
		schoolLevel: level,
		target,
		verbosity
	});
	const renderer = new PedagogicalArithmeticRenderer();
	const rendered = renderer.renderAll(result.steps, { schoolLevel: level, verbosity });
	const out: string[] = [];
	for (const step of rendered) {
		out.push(`[${step.id}] ${step.title}`);
		if (verbosity === 'detailed' && step.expressionLatex) {
			out.push(`    │ ${step.expressionLatex}`);
		}
		if (verbosity === 'detailed' && step.explanation) {
			out.push(`    │ (${step.explanation})`);
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
 */
export function presentExpression(testCase: DemoCase): string {
	const { label, expression, target } = testCase;
	const levels = testCase.schoolLevels ?? ALL_LEVELS;
	const lines: string[] = [];
	lines.push(`\n###### ${label} ######\n`);
	if (target) {
		lines.push(`target: ${JSON.stringify(target)}`);
		lines.push('');
	}
	for (const level of levels) {
		for (const verbosity of ALL_VERBOSITIES) {
			lines.push(`========== ${level.toUpperCase()} (${verbosity}) ==========`);
			lines.push(...renderAt(expression, level, verbosity, target));
			lines.push('');
		}
	}
	return lines.join('\n');
}

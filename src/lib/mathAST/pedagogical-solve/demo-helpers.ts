/**
 * Demo Helpers — Pedagogical Linear Equations
 *
 * Shared rendering logic used by:
 * - The standalone CLI demo (`scripts/pedagogical-solve-demo.ts`)
 * - The snapshot-comparison test (`__tests__/linear-demo.test.ts`)
 *
 * Producing the exact same string from both ensures the test guards what
 * the user actually sees when running the script.
 *
 * @module mathAST/pedagogical-solve/demo-helpers
 */

import type { RelationNode } from '../types';
import type { Verbosity } from '../common/verbosity';
import { GenericTechnicalRenderer } from '../common/technical-renderer';
import { solve } from '../solve';
import type { SolveStep } from '../solve/types';
import { generateLinearEquationSteps } from './linear';
import { LinearEquationRenderer, formatTransformationLines } from './linear-renderer';
import type { EquationStep, LinearSchoolLevel } from './types';

const allLevels: readonly LinearSchoolLevel[] = ['college', 'lycee', 'superieur'];
const allVerbosities: readonly Verbosity[] = ['summarized', 'detailed'];

function compactTechnical(
	steps: readonly { id: number; rule: string; title: string }[]
): readonly string[] {
	return steps.map((s) => `[${s.id}] ${s.rule}: ${s.title}`);
}

function renderTree(
	steps: readonly EquationStep[],
	level: LinearSchoolLevel,
	verbosity: Verbosity,
	depth: number = 0
): readonly string[] {
	const renderer = new LinearEquationRenderer();
	const out: string[] = [];
	const indent = '    '.repeat(depth);
	for (const s of steps) {
		const r = renderer.render(s, { verbosity, schoolLevel: level });
		out.push(`${indent}[${s.id}] ${r.title}`);
		if (verbosity === 'detailed') {
			const lines = formatTransformationLines(s);
			if (lines !== null) {
				for (const line of lines) out.push(`${indent}    │ ${line}`);
			}
		}
		if (s.subSteps && s.subSteps.length > 0) {
			out.push(...renderTree(s.subSteps, level, verbosity, depth + 1));
		}
	}
	return out;
}

/**
 * Render the full demo for one equation. Includes:
 * - 2 technical views (algorithmic solver, pedagogical pipeline raw)
 * - 3 levels × 2 verbosities (6 pedagogical views)
 *
 * Output format is stable: snapshot tests compare it byte-for-byte.
 */
export function presentEquation(label: string, equation: RelationNode): string {
	const technical = new GenericTechnicalRenderer<EquationStep>();
	const technicalForSolveSteps = new GenericTechnicalRenderer<SolveStep>();

	const lines: string[] = [];
	lines.push(`\n###### ${label} ######\n`);

	const solveResult = solve(equation, { verbosity: 'detailed' });
	const solverTech = technicalForSolveSteps.renderAll(solveResult.steps, {
		verbosity: 'detailed'
	});
	lines.push('========== TECHNIQUE — solveur algorithmique (solve()) ==========');
	lines.push(...compactTechnical(solverTech));
	lines.push('');

	const pedaSteps = generateLinearEquationSteps(equation, { level: 'college' });
	const pedaTech = technical.renderAll(pedaSteps, { verbosity: 'detailed' });
	lines.push('========== TECHNIQUE — pipeline pédagogique (EquationStep) ==========');
	lines.push(...compactTechnical(pedaTech));
	lines.push('');

	for (const level of allLevels) {
		for (const verbosity of allVerbosities) {
			const steps: readonly EquationStep[] = generateLinearEquationSteps(equation, {
				level,
				includeSubSteps: true
			});
			lines.push(`========== ${level.toUpperCase()} (${verbosity}) ==========`);
			lines.push(...renderTree(steps, level, verbosity));
			lines.push('');
		}
	}
	return lines.join('\n');
}

// =============================================================================
// DemoCase type (for use in demo-equations/*)
// =============================================================================

/**
 * One test case in the demo suite. The `label` shows in test names and demo
 * headers; the `equation` is a `RelationNode` produced via the factory.
 */
export interface DemoCase {
	readonly label: string;
	readonly equation: RelationNode;
}

/**
 * A category groups related demo cases (simple, fractions, regroupement…).
 * Used by `linear-demo.test.ts` (one `describe()` per category) and by the
 * standalone CLI (filterable via category name argument).
 */
export interface DemoCategory {
	readonly name: string;
	readonly cases: readonly DemoCase[];
}

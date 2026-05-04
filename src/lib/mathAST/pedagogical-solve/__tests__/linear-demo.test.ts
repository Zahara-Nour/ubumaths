/**
 * Pedagogical Linear Equation Demo
 *
 * Replaces `solve/__tests__/dual-rendering-demo.test.ts` (Phase 4) which
 * mis-classified `solve` as having an algorithmic = pedagogical alignment.
 * The new pedagogical pipeline (`pedagogical-solve/linear`) generates
 * student-facing steps DIRECTLY from the equation, independent of the
 * algorithmic solver.
 *
 * Run with `pnpm test:server <path>` to see the formatted comparison via
 * `console.log` for `2x + 3 = 7` and `3x − 2 = −5x + 7` across the four
 * school levels in both verbosities.
 *
 * @module mathAST/pedagogical-solve/__tests__/linear-demo
 */

import { describe, it, expect } from 'vitest';
import { generateLinearEquationSteps } from '../linear';
import { LinearEquationRenderer } from '../linear-renderer';
import type { EquationStep, LinearSchoolLevel } from '../types';
import type { Verbosity } from '../../common/verbosity';
import type { RelationNode } from '../../types';
import type { RenderedStep } from '../../common/step-renderer-base';
import {
	number,
	variable,
	add,
	subtract,
	implicitMultiply,
	opposite,
	relation
} from '../../factory';
import { solve } from '../../solve';
import type { SolveStep } from '../../solve/types';
import { GenericTechnicalRenderer } from '../../common/technical-renderer';

// Linear pipeline excludes 'primaire' (linear algebra is not in the primary curriculum)
const allLevels: readonly LinearSchoolLevel[] = ['college', 'lycee', 'superieur'];
const allVerbosities: readonly Verbosity[] = ['summarized', 'detailed'];

function renderTree(steps: readonly RenderedStep[], depth: number = 0): readonly string[] {
	const out: string[] = [];
	const indent = '    '.repeat(depth);
	for (const s of steps) {
		out.push(`${indent}[${s.id}] ${s.title}`);
		if (s.explanation) out.push(`${indent}    → ${s.explanation}`);
		if (s.subSteps && s.subSteps.length > 0) {
			out.push(...renderTree(s.subSteps, depth + 1));
		}
	}
	return out;
}

function presentEquation(label: string, equation: RelationNode): string {
	const pedagogical = new LinearEquationRenderer();
	const technical = new GenericTechnicalRenderer<EquationStep>();
	const technicalForSolveSteps = new GenericTechnicalRenderer<SolveStep>();

	const lines: string[] = [];
	lines.push(`\n###### ${label} ######\n`);

	// 1. Technical view: algorithmic solver's recorded steps
	const solveResult = solve(equation, { verbosity: 'detailed' });
	const solverTech = technicalForSolveSteps.renderAll(solveResult.steps, {
		verbosity: 'detailed',
		format: 'text'
	});
	lines.push('========== TECHNIQUE — solveur algorithmique (solve()) ==========');
	for (const s of solverTech) lines.push(s.text ?? `[${s.id}] ${s.title}`);
	lines.push('');

	// 2. Technical view: pedagogical pipeline raw EquationStep[] (max-detail college)
	const pedaSteps = generateLinearEquationSteps(equation, { level: 'college' });
	const pedaTech = technical.renderAll(pedaSteps, { verbosity: 'detailed', format: 'text' });
	lines.push('========== TECHNIQUE — pipeline pédagogique (EquationStep) ==========');
	for (const s of pedaTech) lines.push(s.text ?? `[${s.id}] ${s.title}`);
	lines.push('');

	// 3. Pedagogical views — 4 levels × 2 verbosities
	for (const level of allLevels) {
		for (const verbosity of allVerbosities) {
			const steps: readonly EquationStep[] = generateLinearEquationSteps(equation, {
				level,
				includeSubSteps: true
			});
			const rendered = pedagogical.renderAll(steps, { verbosity, schoolLevel: level });
			lines.push(`========== ${level.toUpperCase()} (${verbosity}) ==========`);
			lines.push(...renderTree(rendered));
			lines.push('');
		}
	}
	return lines.join('\n');
}

describe('Pedagogical linear demo — full output', () => {
	it('presents 2x + 3 = 7 across all 4 levels × 2 verbosities', () => {
		// 2x + 3 = 7
		const equation = relation(
			'=',
			add(implicitMultiply(number('2'), variable('x')), number('3')),
			number('7')
		);
		const presented = presentEquation('2x + 3 = 7', equation);
		console.log(presented);

		// Sanity: each level produces at least one step
		for (const level of allLevels) {
			const steps = generateLinearEquationSteps(equation, { level });
			expect(steps.length).toBeGreaterThan(0);
		}
	});

	it('presents 3x − 2 = −5x + 7 across all 4 levels × 2 verbosities', () => {
		// 3x − 2 = −5x + 7
		const equation = relation(
			'=',
			subtract(implicitMultiply(number('3'), variable('x')), number('2')),
			add(opposite(implicitMultiply(number('5'), variable('x'))), number('7'))
		);
		const presented = presentEquation('3x − 2 = −5x + 7', equation);
		console.log(presented);

		// Sanity: solution is x = 9/8 across all levels
		const renderer = new LinearEquationRenderer();
		for (const level of allLevels) {
			const steps = generateLinearEquationSteps(equation, { level });
			const rendered = renderer.renderAll(steps, { verbosity: 'summarized', schoolLevel: level });
			const flat = collectFlat(rendered);
			const hasSolution = flat.some((r) => r.title.includes('9') && r.title.includes('8'));
			expect(hasSolution).toBe(true);
		}
	});
});

function collectFlat(steps: readonly RenderedStep[]): readonly RenderedStep[] {
	const out: RenderedStep[] = [];
	for (const s of steps) {
		out.push(s);
		if (s.subSteps) out.push(...collectFlat(s.subSteps));
	}
	return out;
}

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
import type { RelationNode, MathNode } from '../../types';
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
import { toLatex } from '../../latex-generator';

// Linear pipeline excludes 'primaire' (linear algebra is not in the primary curriculum)
const allLevels: readonly LinearSchoolLevel[] = ['college', 'lycee', 'superieur'];
const allVerbosities: readonly Verbosity[] = ['summarized', 'detailed'];

/** Plain-text formatter: LaTeX with implicit-multiplication spaces stripped. */
function plain(node: MathNode): string {
	return toLatex(node).replace(/(\d|\})\s+([a-zA-Z\\])/g, '$1$2');
}

/**
 * Pretty-print an equation transformation as multi-line LaTeX using the
 * `aligned` environment. This is the actual LaTeX that goes into the
 * `expressionLatex` field and that MathLive will render as 2 stacked
 * equations aligned on the relation symbol.
 */
function prettyTransformation(before: RelationNode, after: RelationNode): readonly string[] {
	const bL = plain(before.left);
	const bR = plain(before.right);
	const aL = plain(after.left);
	const aR = plain(after.right);
	return [
		'\\begin{aligned}',
		`  ${bL} &${before.relation} ${bR} \\\\`,
		`  ${aL} &${after.relation} ${aR}`,
		'\\end{aligned}'
	];
}

/**
 * Walk the EquationStep[] tree directly so we keep access to the structural
 * `before`/`after` fields for the equation-transformation display. Verbosity
 * controls whether the equation transformations are printed:
 *
 * - `summarized` → titres seuls
 * - `detailed`   → titres + transformations LaTeX (\\begin{aligned} block)
 *
 * Explanations are not surfaced by this terminal demo (the renderer still
 * exposes them in `RenderedStep.explanation` for UI consumers).
 */
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
		if (verbosity === 'detailed' && toLatex(s.before) !== toLatex(s.after)) {
			const lines = prettyTransformation(s.before, s.after);
			for (const line of lines) out.push(`${indent}    │ ${line}`);
		}
		if (s.subSteps && s.subSteps.length > 0) {
			out.push(...renderTree(s.subSteps, level, verbosity, depth + 1));
		}
	}
	return out;
}

/**
 * Compact technical line: `[id] rule: description` only — no LaTeX dump, no
 * reflection-based `(operation=…)` extras. The verbose `format: 'text'` of
 * `GenericTechnicalRenderer` is great for debug, but visually noisy here.
 */
function compactTechnical(
	steps: readonly { id: number; rule: string; title: string }[]
): readonly string[] {
	return steps.map((s) => `[${s.id}] ${s.rule}: ${s.title}`);
}

function presentEquation(label: string, equation: RelationNode): string {
	const technical = new GenericTechnicalRenderer<EquationStep>();
	const technicalForSolveSteps = new GenericTechnicalRenderer<SolveStep>();

	const lines: string[] = [];
	lines.push(`\n###### ${label} ######\n`);

	// 1. Technical view: algorithmic solver's recorded steps (compact)
	const solveResult = solve(equation, { verbosity: 'detailed' });
	const solverTech = technicalForSolveSteps.renderAll(solveResult.steps, {
		verbosity: 'detailed'
	});
	lines.push('========== TECHNIQUE — solveur algorithmique (solve()) ==========');
	lines.push(...compactTechnical(solverTech));
	lines.push('');

	// 2. Technical view: pedagogical pipeline raw EquationStep[] (compact)
	const pedaSteps = generateLinearEquationSteps(equation, { level: 'college' });
	const pedaTech = technical.renderAll(pedaSteps, { verbosity: 'detailed' });
	lines.push('========== TECHNIQUE — pipeline pédagogique (EquationStep) ==========');
	lines.push(...compactTechnical(pedaTech));
	lines.push('');

	// 3. Pedagogical views — 3 levels × 2 verbosities
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

/**
 * Demo Helpers — Pedagogical Quadratic Equations
 *
 * Mirror of `demo-helpers.ts` (linear) for the quadratic pipeline. Shared
 * `DemoCase`/`DemoCategory` types are imported from the linear helpers so a
 * single category shape is used across both pipelines.
 *
 * @module mathAST/pedagogical-solve/demo-helpers-quadratic
 */

import type { RelationNode } from '../types';
import type { Verbosity } from '../common/verbosity';
import { GenericTechnicalRenderer } from '../common/technical-renderer';
import { generateQuadraticEquationSteps, PedagogicalQuadraticNotImplemented } from './quadratic';
import { QuadraticEquationRenderer } from './quadratic-renderer';
import type { EquationStep, QuadraticSchoolLevel } from './types';

export type { DemoCase, DemoCategory } from './demo-helpers';

const allLevels: readonly QuadraticSchoolLevel[] = ['lycee', 'superieur'];
const allVerbosities: readonly Verbosity[] = ['summarized', 'detailed'];

function compactTechnical(
	steps: readonly { id: number; rule: string; title: string }[]
): readonly string[] {
	return steps.map((s) => `[${s.id}] ${s.rule}: ${s.title}`);
}

function renderTree(
	steps: readonly EquationStep[],
	level: QuadraticSchoolLevel,
	verbosity: Verbosity,
	depth: number = 0
): readonly string[] {
	const renderer = new QuadraticEquationRenderer();
	const out: string[] = [];
	const indent = '    '.repeat(depth);
	for (const s of steps) {
		const r = renderer.render(s, { verbosity, schoolLevel: level });
		out.push(`${indent}[${s.id}] ${r.title}`);
		if (verbosity === 'detailed') {
			out.push(`${indent}    │ ${r.expressionLatex}`);
		}
		if (s.subSteps && s.subSteps.length > 0) {
			out.push(...renderTree(s.subSteps, level, verbosity, depth + 1));
		}
	}
	return out;
}

/**
 * Render the full demo for one quadratic equation. Output is stable —
 * snapshot tests compare it byte-for-byte with `presentEquationQuadratic`.
 *
 * Output sections :
 * - 1 technical view (pedagogical pipeline raw, via `GenericTechnicalRenderer`).
 * - 2 levels × 2 verbosities = 4 pedagogical views.
 *
 * If the input is rejected by the V1 quadratic scope (e.g. parametric
 * coefficients), a sentinel `[skip — NotImplemented: …]` block is emitted
 * instead so that the snapshot still captures the scope refusal.
 */
export function presentEquationQuadratic(label: string, equation: RelationNode): string {
	const technical = new GenericTechnicalRenderer<EquationStep>();

	const lines: string[] = [];
	lines.push(`\n###### ${label} ######\n`);

	let pedaSteps: readonly EquationStep[];
	try {
		pedaSteps = generateQuadraticEquationSteps(equation, { level: 'lycee' });
	} catch (err) {
		if (err instanceof PedagogicalQuadraticNotImplemented) {
			lines.push(`[skip — NotImplemented: ${err.reason}]`);
			return lines.join('\n');
		}
		throw err;
	}

	const pedaTech = technical.renderAll(pedaSteps, { verbosity: 'detailed' });
	lines.push('========== TECHNIQUE — pipeline pédagogique (EquationStep) ==========');
	lines.push(...compactTechnical(pedaTech));
	lines.push('');

	for (const level of allLevels) {
		for (const verbosity of allVerbosities) {
			const steps = generateQuadraticEquationSteps(equation, { level });
			lines.push(`========== ${level.toUpperCase()} (${verbosity}) ==========`);
			lines.push(...renderTree(steps, level, verbosity));
			lines.push('');
		}
	}
	return lines.join('\n');
}

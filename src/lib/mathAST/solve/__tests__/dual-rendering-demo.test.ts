/**
 * Dual Rendering Demo
 *
 * Showcases the dual-rendering pattern (single recorder + two renderers) on
 * the canonical equation `2x + 3 = 7`. The same `SolveStep[]` is rendered:
 *
 * 1. **Technically** (`GenericTechnicalRenderer`) — verbose dump for debug.
 * 2. **Pedagogically** (`SolvePedagogicalRenderer`) for three school levels
 *    with different verbosities.
 *
 * Run this test with `pnpm test:server <path>` to see the formatted comparison
 * via `console.log`. Assertions verify that the renderings differ between
 * levels and between technique/pedagogical.
 *
 * @module mathAST/solve/__tests__/dual-rendering-demo
 */

import { describe, it, expect } from 'vitest';
import { solve } from '../solve';
import type { SolveStep } from '../types';
import { number, variable, add, implicitMultiply, relation } from '../../factory';
import { GenericTechnicalRenderer } from '../../common/technical-renderer';
import { SolvePedagogicalRenderer } from '../pedagogical-renderer';

describe('Dual rendering — solve technique vs pédagogique', () => {
	it('solves 2x + 3 = 7 and presents both renderings', () => {
		// Build the equation: 2x + 3 = 7
		const equation = relation(
			'=',
			add(implicitMultiply(number('2'), variable('x')), number('3')),
			number('7')
		);

		// Solve with detailed verbosity so all steps are recorded
		const result = solve(equation, { verbosity: 'detailed' });
		expect(result.steps.length).toBeGreaterThan(0);

		// Same source steps — two renderers
		const technical = new GenericTechnicalRenderer<SolveStep>();
		const pedagogical = new SolvePedagogicalRenderer();

		const techSteps = technical.renderAll(result.steps, {
			verbosity: 'detailed',
			format: 'text'
		});
		const collegeSteps = pedagogical.renderAll(result.steps, {
			verbosity: 'detailed',
			schoolLevel: 'college'
		});
		const lyceeSteps = pedagogical.renderAll(result.steps, {
			verbosity: 'summarized',
			schoolLevel: 'lycee'
		});
		const primaireSteps = pedagogical.renderAll(result.steps, {
			verbosity: 'detailed',
			schoolLevel: 'primaire'
		});

		// Visual comparison — visible in test output
		const lines: string[] = [];
		lines.push('\n========== TECHNIQUE (debug dump) ==========');
		for (const s of techSteps) lines.push(s.text ?? `[${s.id}] ${s.title}`);

		lines.push('\n========== COLLÈGE (detailed) ==========');
		for (const s of collegeSteps) {
			lines.push(`[${s.id}] ${s.title}`);
			if (s.explanation) lines.push(`    → ${s.explanation}`);
		}

		lines.push('\n========== LYCÉE (summarized) ==========');
		for (const s of lyceeSteps) lines.push(`[${s.id}] ${s.title}`);

		lines.push('\n========== PRIMAIRE (detailed) ==========');
		for (const s of primaireSteps) {
			lines.push(`[${s.id}] ${s.title}`);
			if (s.explanation) lines.push(`    → ${s.explanation}`);
		}
		console.log(lines.join('\n'));

		// Same number of rendered steps for each rendering
		expect(techSteps).toHaveLength(result.steps.length);
		expect(collegeSteps).toHaveLength(result.steps.length);
		expect(lyceeSteps).toHaveLength(result.steps.length);
		expect(primaireSteps).toHaveLength(result.steps.length);

		// Source rule keys preserved across renderings
		expect(techSteps.map((s) => s.rule)).toEqual(collegeSteps.map((s) => s.rule));
		expect(techSteps.map((s) => s.rule)).toEqual(lyceeSteps.map((s) => s.rule));

		// Renderings produce different titles between levels (verifies adaptation)
		const collegeTitles = collegeSteps.map((s) => s.title).join('|');
		const lyceeTitles = lyceeSteps.map((s) => s.title).join('|');
		const primaireTitles = primaireSteps.map((s) => s.title).join('|');
		expect(new Set([collegeTitles, lyceeTitles, primaireTitles]).size).toBeGreaterThanOrEqual(2);

		// Verbosity correctly drives explanation inclusion
		const lyceeHasExplanations = lyceeSteps.some((s) => s.explanation !== undefined);
		expect(lyceeHasExplanations).toBe(false); // 'summarized' → no explanations

		// Technical rendering has expressionLatex (LaTeX dump of before ⇒ after)
		expect(techSteps[0].expressionLatex).toBeDefined();
		expect(techSteps[0].expressionLatex).toContain('Rightarrow');

		// Pedagogical rendering is tagged with the active school level
		expect(collegeSteps[0].schoolLevel).toBe('college');
		expect(lyceeSteps[0].schoolLevel).toBe('lycee');
		expect(primaireSteps[0].schoolLevel).toBe('primaire');
	});
});

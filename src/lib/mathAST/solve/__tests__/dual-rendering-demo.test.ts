/**
 * Dual Rendering Demo
 *
 * Showcases the dual-rendering pattern (single recorder + two renderers) on
 * the canonical equation `2x + 3 = 7`. The same `SolveStep[]` is rendered:
 *
 * 1. **Technically** (`GenericTechnicalRenderer`) — verbose dump for debug.
 * 2. **Pedagogically** (`SolvePedagogicalRenderer`) for the four school levels
 *    in BOTH `detailed` and `summarized` verbosities (8 renderings total).
 *
 * Run with `pnpm test:server <path>` to see the formatted comparison via
 * `console.log`.
 *
 * @module mathAST/solve/__tests__/dual-rendering-demo
 */

import { describe, it, expect } from 'vitest';
import { solve } from '../solve';
import type { SolveStep } from '../types';
import type { SchoolLevel } from '../../common/step-renderer-base';
import type { Verbosity } from '../../common/verbosity';
import type { RenderedStep } from '../../common/step-renderer-base';
import { number, variable, add, implicitMultiply, relation } from '../../factory';
import { GenericTechnicalRenderer } from '../../common/technical-renderer';
import { SolvePedagogicalRenderer } from '../pedagogical-renderer';

const allLevels: readonly SchoolLevel[] = ['primaire', 'college', 'lycee', 'superieur'] as const;
const allVerbosities: readonly Verbosity[] = ['summarized', 'detailed'] as const;

function formatPedagogicalSection(
	level: SchoolLevel,
	verbosity: Verbosity,
	steps: readonly RenderedStep[]
): string {
	const header = `========== ${level.toUpperCase()} (${verbosity}) ==========`;
	const body: string[] = [];
	for (const s of steps) {
		body.push(`[${s.id}] ${s.title}`);
		if (s.explanation) body.push(`    → ${s.explanation}`);
	}
	return [header, ...body].join('\n');
}

describe('Dual rendering — solve technique vs pédagogique', () => {
	it('solves 2x + 3 = 7 and presents technique + 4 levels × 2 verbosities', () => {
		// Build the equation: 2x + 3 = 7
		const equation = relation(
			'=',
			add(implicitMultiply(number('2'), variable('x')), number('3')),
			number('7')
		);

		// Solve with detailed verbosity so all steps are recorded
		const result = solve(equation, { verbosity: 'detailed' });
		expect(result.steps.length).toBeGreaterThan(0);

		const technical = new GenericTechnicalRenderer<SolveStep>();
		const pedagogical = new SolvePedagogicalRenderer();

		// Technical (debug dump)
		const techSteps = technical.renderAll(result.steps, {
			verbosity: 'detailed',
			format: 'text'
		});

		// 4 levels × 2 verbosities = 8 pedagogical renderings
		type Key = `${SchoolLevel}-${Verbosity}`;
		const pedaRenderings = new Map<Key, readonly RenderedStep[]>();
		for (const level of allLevels) {
			for (const verbosity of allVerbosities) {
				const out = pedagogical.renderAll(result.steps, { verbosity, schoolLevel: level });
				pedaRenderings.set(`${level}-${verbosity}`, out);
			}
		}

		// Visual output
		const sections: string[] = [];
		sections.push('========== TECHNIQUE (debug dump) ==========');
		for (const s of techSteps) sections.push(s.text ?? `[${s.id}] ${s.title}`);
		sections.push(''); // blank line between blocks

		for (const level of allLevels) {
			for (const verbosity of allVerbosities) {
				const steps = pedaRenderings.get(`${level}-${verbosity}`)!;
				sections.push(formatPedagogicalSection(level, verbosity, steps));
				sections.push('');
			}
		}
		console.log('\n' + sections.join('\n'));

		// Sanity assertions
		expect(techSteps).toHaveLength(result.steps.length);
		for (const [, steps] of pedaRenderings) {
			expect(steps).toHaveLength(result.steps.length);
			expect(steps.map((s) => s.rule)).toEqual(techSteps.map((s) => s.rule));
		}

		// Verbosity invariant: summarized never includes explanations
		for (const level of allLevels) {
			const summarized = pedaRenderings.get(`${level}-summarized`)!;
			expect(summarized.every((s) => s.explanation === undefined)).toBe(true);
		}

		// At least one level/verbosity pair includes an explanation under detailed
		const someDetailedHasExplanation = allLevels.some((level) =>
			pedaRenderings.get(`${level}-detailed`)!.some((s) => s.explanation !== undefined)
		);
		expect(someDetailedHasExplanation).toBe(true);

		// Technical rendering carries expressionLatex
		expect(techSteps[0].expressionLatex).toContain('Rightarrow');

		// SchoolLevel propagated into rendered steps
		for (const level of allLevels) {
			const detailed = pedaRenderings.get(`${level}-detailed`)!;
			expect(detailed[0].schoolLevel).toBe(level);
		}

		// At least 3 distinct title profiles across the 4 levels (vocab adaptation)
		const titleProfiles = new Set(
			allLevels.map((level) =>
				pedaRenderings
					.get(`${level}-detailed`)!
					.map((s) => s.title)
					.join('|')
			)
		);
		expect(titleProfiles.size).toBeGreaterThanOrEqual(3);
	});
});

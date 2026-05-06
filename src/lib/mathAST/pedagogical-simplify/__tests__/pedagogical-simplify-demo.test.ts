/**
 * Phase 4 — Snapshot tests for the demo cases.
 *
 * Runs every (category × case) through `presentSimplification` at lycee
 * level (default) and verifies the output is stable. Multi-level
 * walkthroughs are exercised in `pipeline.test.ts` ; here we lock the
 * end-to-end shape (pipeline + renderer + LaTeX format) per case.
 */

import { describe, it, expect } from 'vitest';
import { ALL_DEMO_CATEGORIES } from '../demo-cases';
import { presentSimplification } from '../demo-helpers';

describe('pedagogical-simplify-demo — snapshots', () => {
	for (const category of ALL_DEMO_CATEGORIES) {
		describe(category.name, () => {
			for (const demo of category.cases) {
				it(`${demo.label}`, () => {
					expect(presentSimplification(demo, 'latex')).toMatchSnapshot();
				});
			}
		});
	}
});

describe('pedagogical-simplify-demo — custom format', () => {
	const sample = ALL_DEMO_CATEGORIES[0].cases[0]; // (x+1)²
	it('produces a different output in custom format', () => {
		const latexOut = presentSimplification(sample, 'latex');
		const customOut = presentSimplification(sample, 'custom');
		expect(latexOut).not.toBe(customOut);
		expect(customOut).toContain('@blue{');
	});
});

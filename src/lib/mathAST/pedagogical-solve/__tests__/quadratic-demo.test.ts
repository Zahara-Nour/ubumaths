/**
 * Pedagogical Quadratic Demo — Snapshot Tests
 *
 * Each category in `demo-equations-quadratic/` produces its own `describe()`
 * block with one snapshot per equation. Snapshots are tagged by category in
 * the single `__snapshots__/quadratic-demo.test.ts.snap` file.
 *
 * Adding a new equation : append to the relevant
 * `demo-equations-quadratic/<category>.ts`. Run
 * `pnpm test:server <path> -u` to update snapshots after intentional changes.
 *
 * @module mathAST/pedagogical-solve/__tests__/quadratic-demo
 */

import { describe, it, expect } from 'vitest';
import { presentEquationQuadratic } from '../demo-helpers-quadratic';
import { ALL_CATEGORIES_QUADRATIC } from '../demo-equations-quadratic';

for (const category of ALL_CATEGORIES_QUADRATIC) {
	describe(`snapshot — ${category.name}`, () => {
		for (const { label, equation } of category.cases) {
			it(`${label}`, () => {
				expect(presentEquationQuadratic(label, equation)).toMatchSnapshot();
			});
		}
	});
}

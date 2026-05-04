/**
 * Pedagogical Linear Demo — Snapshot Tests (Option C)
 *
 * Each category in `demo-equations/` produces its own `describe()` block with
 * one snapshot per equation. Snapshots are tagged by category in the single
 * `__snapshots__/linear-demo.test.ts.snap` file (e.g.
 * `exports['snapshot — fractions > x/2 + 1/3 = 1 1'] = ...`).
 *
 * Adding a new equation : append to the relevant `demo-equations/<category>.ts`.
 * Run `pnpm test:server <path> -u` to update snapshots after intentional changes.
 *
 * @module mathAST/pedagogical-solve/__tests__/linear-demo
 */

import { describe, it, expect } from 'vitest';
import { presentEquation } from '../demo-helpers';
import { ALL_CATEGORIES } from '../demo-equations';

for (const category of ALL_CATEGORIES) {
	describe(`snapshot — ${category.name}`, () => {
		for (const { label, equation } of category.cases) {
			it(`${label}`, () => {
				expect(presentEquation(label, equation)).toMatchSnapshot();
			});
		}
	});
}

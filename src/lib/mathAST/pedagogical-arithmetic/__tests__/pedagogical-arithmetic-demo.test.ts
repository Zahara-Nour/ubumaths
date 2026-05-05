/**
 * Pedagogical Arithmetic — Snapshot Demo Tests
 *
 * Runs each demo case through `presentExpression` and compares the output
 * to the stored snapshot. The same `presentExpression` is used by
 * `scripts/pedagogical-arithmetic-demo.ts`, so this test guards what the
 * CLI shows.
 *
 * To regenerate snapshots after intentional changes :
 *   pnpm test:server -- -u src/lib/mathAST/pedagogical-arithmetic
 */

import { describe, expect, it } from 'vitest';
import { ALL_CATEGORIES } from '../demo-cases';
import { presentExpression } from '../demo-helpers';

for (const category of ALL_CATEGORIES) {
	describe(`snapshot — ${category.name}`, () => {
		it.each(category.cases.map((c) => [c.label, c]))('$0', (_label, testCase) => {
			expect(presentExpression(testCase)).toMatchSnapshot();
		});
	});
}

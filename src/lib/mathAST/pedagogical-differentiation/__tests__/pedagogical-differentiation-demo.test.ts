/**
 * Pedagogical Differentiation — Snapshot Demo Tests.
 *
 * Runs each demo case through `presentExpression` and compares the output
 * to the stored snapshot. The same `presentExpression` powers
 * `scripts/pedagogical-differentiation-demo.ts`, so this test guards what
 * the CLI shows.
 *
 * To regenerate snapshots after intentional changes:
 *   pnpm test:server -u src/lib/mathAST/pedagogical-differentiation
 */

import { describe, expect, it } from 'vitest';
import { ALL_CATEGORIES } from '../demo-cases';
import { presentExpression } from '../demo-helpers';

for (const category of ALL_CATEGORIES) {
	describe(`snapshot — ${category.name}`, () => {
		it.each(category.cases.map((c) => [c.label, c] as const))('%s', (_label, testCase) => {
			expect(presentExpression(testCase)).toMatchSnapshot();
		});
	});
}

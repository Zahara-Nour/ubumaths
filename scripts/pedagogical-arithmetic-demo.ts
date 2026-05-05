/**
 * Pedagogical Arithmetic — CLI Demo
 *
 * Runs `presentExpression` for each registered demo case and prints the
 * result on stdout. The output is the SAME as the snapshot test
 * (`pedagogical-arithmetic-demo.test.ts`).
 *
 * Usage :
 *   pnpm tsx scripts/pedagogical-arithmetic-demo.ts                 # all
 *   pnpm tsx scripts/pedagogical-arithmetic-demo.ts basic fractions # filter
 *
 * @module scripts/pedagogical-arithmetic-demo
 */

import { ALL_CATEGORIES } from '../src/lib/mathAST/pedagogical-arithmetic/demo-cases';
import { presentExpression } from '../src/lib/mathAST/pedagogical-arithmetic/demo-helpers';

const argv = process.argv.slice(2);
const wanted = argv.length > 0 ? new Set(argv) : null;

for (const category of ALL_CATEGORIES) {
	if (wanted && !wanted.has(category.name)) continue;
	console.log(`\n\n============================================================`);
	console.log(`CATEGORY : ${category.name}`);
	console.log(`============================================================`);
	for (const testCase of category.cases) {
		console.log(presentExpression(testCase));
	}
}

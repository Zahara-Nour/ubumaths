#!/usr/bin/env tsx
/**
 * Standalone CLI demo for the pedagogical-solve pipeline.
 *
 * Usage :
 *   pnpm tsx scripts/pedagogical-solve-demo.ts                    # toutes les catégories
 *   pnpm tsx scripts/pedagogical-solve-demo.ts simple             # une catégorie
 *   pnpm tsx scripts/pedagogical-solve-demo.ts simple fractions   # plusieurs
 *
 * Output is identical to the snapshot tests. If this script's output diverges
 * from the snapshot, the test fails — guard rail enforced.
 */

import { presentEquation } from '../src/lib/mathAST/pedagogical-solve/demo-helpers';
import { ALL_CATEGORIES } from '../src/lib/mathAST/pedagogical-solve/demo-equations';

const args = process.argv.slice(2);
const filter = args.length > 0 ? new Set(args) : null;
const validNames = new Set(ALL_CATEGORIES.map((c) => c.name));

if (filter) {
	for (const arg of filter) {
		if (!validNames.has(arg)) {
			console.error(`Unknown category: ${arg}`);
			console.error(`Available: ${[...validNames].join(', ')}`);
			process.exit(1);
		}
	}
}

for (const category of ALL_CATEGORIES) {
	if (filter && !filter.has(category.name)) continue;
	console.log(`\n############### ${category.name.toUpperCase()} ###############`);
	for (const { label, equation } of category.cases) {
		console.log(presentEquation(label, equation));
	}
}

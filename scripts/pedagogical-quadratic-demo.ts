#!/usr/bin/env tsx
/**
 * Standalone CLI demo for the pedagogical quadratic pipeline.
 *
 * Usage :
 *   pnpm tsx scripts/pedagogical-quadratic-demo.ts                          # toutes les catégories
 *   pnpm tsx scripts/pedagogical-quadratic-demo.ts standard-positif         # une catégorie
 *   pnpm tsx scripts/pedagogical-quadratic-demo.ts b-zero c-zero            # plusieurs
 *
 * Output is identical to the snapshot tests. If this script's output diverges
 * from the snapshot, the test fails — guard rail enforced.
 *
 * Categories : standard-positif, standard-double, standard-negatif, b-zero,
 *              c-zero, factorise, non-standard-form.
 */

import { presentEquationQuadratic } from '../src/lib/mathAST/pedagogical-solve/demo-helpers-quadratic';
import { ALL_CATEGORIES_QUADRATIC } from '../src/lib/mathAST/pedagogical-solve/demo-equations-quadratic';

const args = process.argv.slice(2);
const filter = args.length > 0 ? new Set(args) : null;
const validNames = new Set(ALL_CATEGORIES_QUADRATIC.map((c) => c.name));

if (filter) {
	for (const arg of filter) {
		if (!validNames.has(arg)) {
			console.error(`Unknown category: ${arg}`);
			console.error(`Available: ${[...validNames].join(', ')}`);
			process.exit(1);
		}
	}
}

for (const category of ALL_CATEGORIES_QUADRATIC) {
	if (filter && !filter.has(category.name)) continue;
	console.log(`\n############### ${category.name.toUpperCase()} ###############`);
	for (const { label, equation } of category.cases) {
		console.log(presentEquationQuadratic(label, equation));
	}
}

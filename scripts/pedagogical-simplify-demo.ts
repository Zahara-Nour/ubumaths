#!/usr/bin/env tsx
/**
 * Pedagogical Simplify — Standalone CLI demo.
 *
 * Usage:
 *   pnpm tsx scripts/pedagogical-simplify-demo.ts                 # all categories
 *   pnpm tsx scripts/pedagogical-simplify-demo.ts distribution    # one category
 *   pnpm tsx scripts/pedagogical-simplify-demo.ts --latex         # LaTeX format
 *   pnpm tsx scripts/pedagogical-simplify-demo.ts --custom        # default — ASCII
 *
 * Custom format includes `@blue{...}` markers that this script post-
 * processes into ANSI escape sequences for terminals.
 */

import { ALL_DEMO_CATEGORIES } from '../src/lib/mathAST/pedagogical-simplify/demo-cases';
import {
	presentSimplification,
	type DemoFormat
} from '../src/lib/mathAST/pedagogical-simplify/demo-helpers';

// =============================================================================
// ANSI helpers
// =============================================================================

const BLUE = '[1;34m';
const RESET = '[0m';

function ansifyBlueMarkers(s: string): string {
	return s.replace(/@blue\{([^}]*)\}/g, `${BLUE}$1${RESET}`);
}

// =============================================================================
// CLI parsing
// =============================================================================

const args = process.argv.slice(2);
let format: DemoFormat = 'custom';
let categoryFilter: string | undefined;
for (const arg of args) {
	if (arg === '--latex') format = 'latex';
	else if (arg === '--custom') format = 'custom';
	else if (arg.startsWith('-')) {
		console.error(`Unknown flag: ${arg}`);
		process.exit(2);
	} else {
		categoryFilter = arg;
	}
}

// =============================================================================
// Main
// =============================================================================

const categories = categoryFilter
	? ALL_DEMO_CATEGORIES.filter((c) => c.name === categoryFilter)
	: ALL_DEMO_CATEGORIES;

if (categoryFilter && categories.length === 0) {
	const known = ALL_DEMO_CATEGORIES.map((c) => c.name).join(', ');
	console.error(`Unknown category '${categoryFilter}'. Known: ${known}`);
	process.exit(1);
}

for (const category of categories) {
	console.log(`\n=== ${category.name.toUpperCase()} ===`);
	for (const demo of category.cases) {
		const out = presentSimplification(demo, format);
		console.log('\n' + (format === 'custom' ? ansifyBlueMarkers(out) : out));
	}
}

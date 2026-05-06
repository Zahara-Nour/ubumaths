#!/usr/bin/env tsx
/**
 * Standalone CLI demo for the pedagogical-solve inequality pipeline.
 *
 * Usage :
 *   pnpm tsx scripts/pedagogical-inequality-demo.ts                   # tous les cas
 *   pnpm tsx scripts/pedagogical-inequality-demo.ts simple flip       # filtres
 *   pnpm tsx scripts/pedagogical-inequality-demo.ts -v                # verbose
 *   pnpm tsx scripts/pedagogical-inequality-demo.ts -v simple
 *
 * Catégories :
 *   simple    1-5 — linéaire de base sans flip
 *   flip      6-9 — coefficient négatif (changement de sens)
 *   sides     10-12 — x des deux côtés
 *   degen     13-16 — cas dégénérés (a = 0)
 *   noteq     17  — opérateur !=
 */

import { generateLinearInequalitySteps } from '../src/lib/mathAST/pedagogical-solve/linear-inequality';
import {
	LinearEquationRenderer,
	formatTransformationLines
} from '../src/lib/mathAST/pedagogical-solve/linear-renderer';
import { parseLatex } from '../src/lib/mathAST/parser';
import type { RelationNode } from '../src/lib/mathAST/types';
import type { LinearSchoolLevel } from '../src/lib/mathAST/pedagogical-solve/types';

const renderer = new LinearEquationRenderer();

function ineq(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (node.type !== 'relation') throw new Error(`Not a relation: ${latex}`);
	return node;
}

function presentInequality(
	label: string,
	expr: RelationNode,
	level: LinearSchoolLevel,
	verbose: boolean
): string {
	const lines: string[] = [];
	lines.push(`\n###### ${label} (${level}) ######`);

	const steps = generateLinearInequalitySteps(expr, { level });
	const rendered = renderer.renderAll(steps, {
		verbosity: 'detailed',
		schoolLevel: level
	});

	for (const r of rendered) {
		lines.push(`[${r.id}] ${r.title}`);
		if (verbose && r.explanation) lines.push(`    → ${r.explanation}`);
		const tx = formatTransformationLines(steps.find((s) => s.id === r.id)!);
		if (tx) {
			for (const line of tx) lines.push(`    │ ${line}`);
		} else {
			lines.push(`    │ ${r.expressionLatex}`);
		}
	}
	return lines.join('\n');
}

const CASES: readonly { category: string; label: string; latex: string }[] = [
	{ category: 'simple', label: '1.  x + 3 < 5', latex: 'x + 3 < 5' },
	{ category: 'simple', label: '2.  x − 4 ≥ 1', latex: 'x - 4 \\geq 1' },
	{ category: 'simple', label: '3.  2x ≤ 6', latex: '2x \\leq 6' },
	{ category: 'simple', label: '4.  2x + 3 < 7', latex: '2x + 3 < 7' },
	{ category: 'simple', label: '5.  5x − 2 > 8', latex: '5x - 2 > 8' },

	{ category: 'flip', label: '6.  −x < 3', latex: '-x < 3' },
	{ category: 'flip', label: '7.  −2x ≥ 6', latex: '-2x \\geq 6' },
	{ category: 'flip', label: '8.  4 − x > 1', latex: '4 - x > 1' },
	{ category: 'flip', label: '9.  3 − 2x ≤ 11', latex: '3 - 2x \\leq 11' },

	{ category: 'sides', label: '10. 2x + 1 < x + 5', latex: '2x + 1 < x + 5' },
	{ category: 'sides', label: '11. 3x − 2 ≥ x + 4', latex: '3x - 2 \\geq x + 4' },
	{ category: 'sides', label: '12. 5 − x > 2x + 8', latex: '5 - x > 2x + 8' },

	{ category: 'degen', label: '13. 0 < 1', latex: '0 < 1' },
	{ category: 'degen', label: '14. 0 > 1', latex: '0 > 1' },
	{ category: 'degen', label: '15. 2x + 3 < 2x + 7', latex: '2x + 3 < 2x + 7' },
	{ category: 'degen', label: '16. 2x + 7 < 2x + 3', latex: '2x + 7 < 2x + 3' },

	{ category: 'noteq', label: '17. 2x + 3 ≠ 5', latex: '2x + 3 \\neq 5' }
];

const VALID_CATEGORIES = new Set(CASES.map((c) => c.category));

const rawArgs = process.argv.slice(2);
const verbose = rawArgs.includes('-v') || rawArgs.includes('--verbose');
const args = rawArgs.filter((a) => a !== '-v' && a !== '--verbose');
const filter = args.length > 0 ? new Set(args) : null;

if (filter) {
	for (const arg of filter) {
		if (!VALID_CATEGORIES.has(arg)) {
			console.error(`Unknown category: ${arg}`);
			console.error(`Available: ${[...VALID_CATEGORIES].join(', ')}`);
			process.exit(1);
		}
	}
}

for (const { category, label, latex } of CASES) {
	if (filter && !filter.has(category)) continue;
	const expr = ineq(latex);
	console.log(presentInequality(label, expr, 'college', verbose));
	console.log(presentInequality(label, expr, 'lycee', verbose));
}

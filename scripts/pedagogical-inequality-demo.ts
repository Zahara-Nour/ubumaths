#!/usr/bin/env tsx
/**
 * Pedagogical Linear Inequality — CLI Demo
 *
 * Mirrors `scripts/pedagogical-arithmetic-demo.ts` :
 *   - default : custom-syntax with ANSI colors + operator prettification
 *               (`*` → `×`, `<=` → `≤`, etc.) — readable terminal output
 *   - `--latex` flag : LaTeX form
 *   - `--both` flag : both formats stacked
 *
 * Usage :
 *   pnpm tsx scripts/pedagogical-inequality-demo.ts                    # tous (custom)
 *   pnpm tsx scripts/pedagogical-inequality-demo.ts -v simple flip     # filtres
 *   pnpm tsx scripts/pedagogical-inequality-demo.ts --latex            # LaTeX brut
 *   pnpm tsx scripts/pedagogical-inequality-demo.ts --both             # custom + LaTeX
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
	formatTransformationLines,
	formatTransformationCustom
} from '../src/lib/mathAST/pedagogical-solve/linear-renderer';
import { parseLatex } from '../src/lib/mathAST/parser';
import type { RelationNode } from '../src/lib/mathAST/types';
import type { LinearSchoolLevel } from '../src/lib/mathAST/pedagogical-solve/types';

// =============================================================================
// ANSI color conversion + operator prettification (mirrors arithmetic demo)
// =============================================================================

const ANSI_COLOR_MAP: Record<string, string> = {
	blue: '\x1b[34m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	magenta: '\x1b[35m',
	cyan: '\x1b[36m'
};
const ANSI_RESET = '\x1b[0m';
const ANSI_BOLD = '\x1b[1m';

/** Convert `@color{...}` markers into ANSI escape sequences. */
function ansiColorize(text: string): string {
	return text.replace(/@(\w+|#[0-9a-fA-F]{6})\{([^{}]*)\}/g, (_, color, content) => {
		const code = ANSI_COLOR_MAP[color.toLowerCase()] ?? ANSI_COLOR_MAP.blue;
		return `${ANSI_BOLD}${code}${content}${ANSI_RESET}`;
	});
}

/**
 * Cosmetic substitutions for the CLI output :
 *   `*` → `×`, `:/` → `÷`, `<=` → `≤`, `>=` → `≥`, `!=` → `≠`
 *
 * Snapshots use raw custom syntax, so this transformation is CLI-only.
 */
function prettifyOperators(text: string): string {
	return text
		.replace(/<=/g, '≤')
		.replace(/>=/g, '≥')
		.replace(/!=/g, '≠')
		.replace(/:\//g, '÷')
		.replace(/\*/g, '×');
}

// =============================================================================
// Demo cases
// =============================================================================

const renderer = new LinearEquationRenderer();

function ineq(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (node.type !== 'relation') throw new Error(`Not a relation: ${latex}`);
	return node;
}

type DemoFormat = 'custom' | 'latex' | 'both';

function presentInequality(
	label: string,
	expr: RelationNode,
	level: LinearSchoolLevel,
	verbose: boolean,
	format: DemoFormat
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
		const sourceStep = steps.find((s) => s.id === r.id)!;

		if (format === 'custom' || format === 'both') {
			const customText = formatTransformationCustom(sourceStep);
			if (customText !== null) {
				for (const line of customText.split('\n')) lines.push(`    │ ${line}`);
			}
		}
		if (format === 'both') {
			lines.push(`    ├ (latex)`);
		}
		if (format === 'latex' || format === 'both') {
			const latexLines = formatTransformationLines(sourceStep);
			if (latexLines !== null) {
				for (const line of latexLines) lines.push(`    │ ${line}`);
			}
		}

		if (verbose && r.explanation) {
			lines.push(`    │ (${r.explanation})`);
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

const argv = process.argv.slice(2);
let format: DemoFormat = 'custom';
let verbose = false;
const wanted = new Set<string>();
for (const arg of argv) {
	if (arg === '--latex') format = 'latex';
	else if (arg === '--both') format = 'both';
	else if (arg === '--custom') format = 'custom';
	else if (arg === '-v' || arg === '--verbose') verbose = true;
	else wanted.add(arg);
}

for (const w of wanted) {
	if (!VALID_CATEGORIES.has(w)) {
		console.error(`Unknown category: ${w}`);
		console.error(`Available: ${[...VALID_CATEGORIES].join(', ')}`);
		process.exit(1);
	}
}

const isTTY = process.stdout.isTTY === true;
const isCustom = format === 'custom' || format === 'both';

for (const { category, label, latex } of CASES) {
	if (wanted.size > 0 && !wanted.has(category)) continue;
	const expr = ineq(latex);
	for (const level of ['college', 'lycee'] as const) {
		const raw = presentInequality(label, expr, level, verbose, format);
		let out = raw;
		if (isCustom) out = prettifyOperators(out);
		if (isTTY && isCustom) out = ansiColorize(out);
		console.log(out);
	}
}

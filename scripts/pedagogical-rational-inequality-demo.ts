#!/usr/bin/env tsx
/**
 * Pedagogical Rational Inequality — CLI Demo (palier 3)
 *
 * Mirrors `scripts/pedagogical-quadratic-inequality-demo.ts` :
 *   - default : ANSI-highlighted, LaTeX-prettified terminal output
 *   - `--latex` flag : raw LaTeX form
 *   - `-v` flag : show explanations
 *
 * Categories :
 *   simple      P, Q linéaires, formes standard
 *   quad-num    P degré 2 / Q degré 1
 *   quad-denom  P degré 1 / Q degré 2
 *   noteq       opérateur ≠
 *   constP      P constant (1/(x-2) etc.)
 *   non-std     forme non-standard, canonisable
 *
 * Usage :
 *   pnpm tsx scripts/pedagogical-rational-inequality-demo.ts                # all (pretty)
 *   pnpm tsx scripts/pedagogical-rational-inequality-demo.ts simple        # one category
 *   pnpm tsx scripts/pedagogical-rational-inequality-demo.ts -v simple
 *   pnpm tsx scripts/pedagogical-rational-inequality-demo.ts --latex
 */

import { generateInequalitySteps } from '../src/lib/mathAST/pedagogical-solve';
import { QuadraticEquationRenderer } from '../src/lib/mathAST/pedagogical-solve/quadratic-renderer';
import { parseLatex } from '../src/lib/mathAST/parser';
import type { RelationNode } from '../src/lib/mathAST/types';
import type { QuadraticSchoolLevel } from '../src/lib/mathAST/pedagogical-solve/types';

// =============================================================================
// ANSI cosmetics
// =============================================================================

const ANSI_BLUE = '\x1b[34m';
const ANSI_BOLD = '\x1b[1m';
const ANSI_DIM = '\x1b[2m';
const ANSI_RESET = '\x1b[0m';

const isTTY = process.stdout.isTTY === true;

// =============================================================================
// LaTeX → ASCII/Unicode prettifier
// =============================================================================

const LATEX_TO_ASCII: ReadonlyArray<readonly [RegExp, string]> = [
	// Aligned blocks
	[/\\begin\{aligned\}\s*/g, ''],
	[/\s*\\end\{aligned\}/g, ''],
	// Sign-table arrays — keep them readable
	[/\\begin\{array\}\{[^}]*\}[ \t]*/g, '\n'],
	[/[ \t]*\\end\{array\}/g, ''],
	[/[ \t]*\\hline[ \t]*/g, '\n'],
	[/[ \t]*\\\\[ \t]*/g, '\n      '],
	[/[ \t]*&[ \t]*/g, '  '],
	// Operators that share a prefix with shorter ones — match BEFORE \leq/\geq
	[/\\leqslant/g, '≤'],
	[/\\geqslant/g, '≥'],
	// Fractions
	[/\\dfrac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)'],
	[/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)'],
	// Set complement
	[/\\setminus/g, '\\'],
	// Delimiters
	[/\\left/g, ''],
	[/\\right/g, ''],
	// Greek + math symbols
	[/\\pm/g, '±'],
	[/\\cdot/g, '·'],
	[/\\Longleftrightarrow/g, '⇔'],
	[/\\emptyset/g, '∅'],
	[/\\mathbb\{R\}/g, 'ℝ'],
	[/\\cup/g, '∪'],
	[/\\infty/g, '∞'],
	[/\\leq/g, '≤'],
	[/\\geq/g, '≥'],
	[/\\neq/g, '≠'],
	[/\\text\{([^{}]*)\}/g, '$1'],
	[/\\textcolor\{[^{}]*\}\{([^{}]*)\}/g, '$1'],
	// Spacing macros
	[/\\,;\\,/g, ' ; '],
	[/\\,/g, ''],
	[/\\quad/g, '   '],
	[/\\;/g, ' '],
	// Implicit multiplication digit-space-digit → bullet
	[/(\d) (\d)/g, '$1·$2'],
	// Escaped braces
	[/\\\{/g, '{'],
	[/\\\}/g, '}'],
	// Catch-all stray \<word>
	[/\\([a-zA-Z]+)/g, '$1']
];

function prettifyLatexResidue(text: string): string {
	let out = text;
	for (const [pattern, replacement] of LATEX_TO_ASCII) {
		out = out.replace(pattern, replacement);
	}
	return out;
}

function ansiHighlight(text: string): string {
	if (!isTTY) return text;
	return text
		.replace(/^(\[\d+\])/gm, `${ANSI_BOLD}${ANSI_BLUE}$1${ANSI_RESET}`)
		.replace(/^(###### .* ######)/gm, `${ANSI_BOLD}$1${ANSI_RESET}`)
		.replace(/^(={5,}.*={5,})/gm, `${ANSI_DIM}$1${ANSI_RESET}`);
}

// =============================================================================
// Demo cases
// =============================================================================

function ineq(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (node.type !== 'relation') throw new Error(`Not a relation: ${latex}`);
	return node;
}

const CASES: readonly { category: string; label: string; latex: string }[] = [
	// Simple : linear / linear (programme 1ère)
	{ category: 'simple', label: '1.  (x − 1)/(x − 3) < 0', latex: '(x - 1)/(x - 3) < 0' },
	{ category: 'simple', label: '2.  (x − 1)/(x − 3) > 0', latex: '(x - 1)/(x - 3) > 0' },
	{ category: 'simple', label: '3.  (x − 1)/(x − 3) ≤ 0', latex: '(x - 1)/(x - 3) \\leq 0' },
	{ category: 'simple', label: '4.  (x − 1)/(x − 3) ≥ 0', latex: '(x - 1)/(x - 3) \\geq 0' },

	// Constant numerator
	{ category: 'constP', label: '5.  1/(x − 2) < 0', latex: '1/(x - 2) < 0' },
	{ category: 'constP', label: '6.  1/(x − 2) ≥ 0', latex: '1/(x - 2) \\geq 0' },

	// Quadratic numerator
	{ category: 'quad-num', label: '7.  (x² − 4)/(x − 1) < 0', latex: '(x^2 - 4)/(x - 1) < 0' },
	{ category: 'quad-num', label: '8.  (x² + 1)/(x − 3) < 0', latex: '(x^2 + 1)/(x - 3) < 0' },

	// Quadratic denominator
	{ category: 'quad-denom', label: '9.  x/(x² − 1) ≥ 0', latex: 'x/(x^2 - 1) \\geq 0' },

	// Non-standard form (canonisable)
	{ category: 'non-std', label: '10. (x − 1)/(x − 3) < 1', latex: '(x - 1)/(x - 3) < 1' },

	// Operator !=
	{ category: 'noteq', label: '11. (2x + 1)/(x − 1) ≠ 0', latex: '(2x + 1)/(x - 1) \\neq 0' }
];

const VALID_CATEGORIES = new Set(CASES.map((c) => c.category));

// =============================================================================
// Argv parsing
// =============================================================================

const argv = process.argv.slice(2);
let format: 'latex' | 'pretty' = 'pretty';
let verbose = false;
const wanted = new Set<string>();
for (const arg of argv) {
	if (arg === '--latex') format = 'latex';
	else if (arg === '--pretty') format = 'pretty';
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

// =============================================================================
// Render a single inequality
// =============================================================================

const renderer = new QuadraticEquationRenderer();

function present(
	label: string,
	expr: RelationNode,
	level: QuadraticSchoolLevel,
	verboseFlag: boolean
): string {
	const lines: string[] = [];
	lines.push(`\n###### ${label} (${level}) ######`);

	const steps = generateInequalitySteps(expr, { level });
	const rendered = renderer.renderAll(steps, {
		verbosity: 'detailed',
		schoolLevel: level
	});

	for (const r of rendered) {
		lines.push(`[${r.id}] ${r.title}`);
		if (r.expressionLatex) {
			for (const line of r.expressionLatex.split('\n')) {
				lines.push(`    │ ${line}`);
			}
		}
		if (verboseFlag && r.explanation) {
			lines.push(`    │ (${r.explanation})`);
		}
	}
	return lines.join('\n');
}

// =============================================================================
// Main
// =============================================================================

for (const { category, label, latex } of CASES) {
	if (wanted.size > 0 && !wanted.has(category)) continue;
	const expr = ineq(latex);
	for (const level of ['lycee', 'superieur'] as const) {
		const raw = present(label, expr, level, verbose);
		const out = format === 'latex' ? raw : ansiHighlight(prettifyLatexResidue(raw));
		console.log(out);
	}
}

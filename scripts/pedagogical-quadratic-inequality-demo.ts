#!/usr/bin/env tsx
/**
 * Pedagogical Quadratic Inequality — CLI Demo
 *
 * Mirrors `scripts/pedagogical-inequality-demo.ts` and
 * `scripts/pedagogical-quadratic-demo.ts` :
 *   - default : ANSI-highlighted, LaTeX-prettified terminal output
 *   - `--latex` flag : raw LaTeX form
 *
 * Usage :
 *   pnpm tsx scripts/pedagogical-quadratic-inequality-demo.ts                # all (pretty)
 *   pnpm tsx scripts/pedagogical-quadratic-inequality-demo.ts dpos           # one category
 *   pnpm tsx scripts/pedagogical-quadratic-inequality-demo.ts -v dnul        # verbose
 *   pnpm tsx scripts/pedagogical-quadratic-inequality-demo.ts --latex        # raw LaTeX
 *
 * Categories :
 *   dpos    Δ > 0 — two distinct real roots
 *   dnul    Δ = 0 — double root
 *   dneg    Δ < 0 — no real root
 *   neg-a   coefficient a < 0 (signs inverted in the table)
 *   degen   degenerate cases (a = 0 → linear delegation)
 *   noteq   `≠` operator
 */

import { QuadraticEquationRenderer } from '../src/lib/mathAST/pedagogical-solve/quadratic-renderer';
import { parseLatex } from '../src/lib/mathAST/parser';
import type { RelationNode } from '../src/lib/mathAST/types';
import type { QuadraticSchoolLevel } from '../src/lib/mathAST/pedagogical-solve/types';
import { generateInequalitySteps } from '../src/lib/mathAST/pedagogical-solve';
import { LinearEquationRenderer } from '../src/lib/mathAST/pedagogical-solve/linear-renderer';

// =============================================================================
// ANSI cosmetics
// =============================================================================

const ANSI_BLUE = '\x1b[34m';
const ANSI_BOLD = '\x1b[1m';
const ANSI_DIM = '\x1b[2m';
const ANSI_RESET = '\x1b[0m';

const isTTY = process.stdout.isTTY === true;

// =============================================================================
// LaTeX → ASCII/Unicode prettifier (shared style with quadratic-demo)
// =============================================================================

const LATEX_TO_ASCII: ReadonlyArray<readonly [RegExp, string]> = [
	// Aligned blocks — strip wrapper, expand \\ to newline + indent, drop &
	[/\\begin\{aligned\}\s*/g, ''],
	[/\s*\\end\{aligned\}/g, ''],
	// Sign-table arrays — keep them readable. Replace \begin{array}{...} by a
	// header tag, \\ → newline, & → space, then strip \hline.
	[/\\begin\{array\}\{[^}]*\}[ \t]*/g, '\n'],
	[/[ \t]*\\end\{array\}/g, ''],
	[/[ \t]*\\hline[ \t]*/g, '\n'],
	// Inside-array row separators.
	[/[ \t]*\\\\[ \t]*/g, '\n      '],
	[/[ \t]*&[ \t]*/g, '  '],
	// Operators that share a prefix with shorter ones — match BEFORE \leq/\geq.
	[/\\leqslant/g, '≤'],
	[/\\geqslant/g, '≥'],
	// Roots before fractions.
	[/\\sqrt\{([^{}]*)\}/g, '√($1)'],
	// Fractions.
	[/\\dfrac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)'],
	[/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)'],
	// Delimiters.
	[/\\left/g, ''],
	[/\\right/g, ''],
	// Greek + math symbols.
	[/\\Delta/g, 'Δ'],
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
	// \textcolor{COLOR}{CONTENT} — keep CONTENT only.
	[/\\textcolor\{[^{}]*\}\{([^{}]*)\}/g, '$1'],
	// Spacing macros.
	[/\\,;\\,/g, ' ; '],
	[/\\,/g, ''],
	[/\\quad/g, '   '],
	[/\\;/g, ' '],
	// Implicit multiplication digit-space-digit → bullet.
	[/(\d) (\d)/g, '$1·$2'],
	// Escaped braces.
	[/\\\{/g, '{'],
	[/\\\}/g, '}'],
	// Catch-all stray \<word>.
	[/\\([a-zA-Z]+)/g, '$1'],
	// Double-minus collapse.
	[/(\(\s*)--(\d)/g, '$1$2'],
	[/--(\d)/g, '+$1']
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
		.replace(/^(={5,}.*={5,})/gm, `${ANSI_DIM}$1${ANSI_RESET}`)
		.replace(/^(###{5,}.*###{5,})/gm, `${ANSI_BOLD}${ANSI_BLUE}$1${ANSI_RESET}`);
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
	// Δ > 0
	{ category: 'dpos', label: '1.  x² − 5x + 6 < 0', latex: 'x^2 - 5x + 6 < 0' },
	{ category: 'dpos', label: '2.  x² − 5x + 6 > 0', latex: 'x^2 - 5x + 6 > 0' },
	{ category: 'dpos', label: '3.  x² − 5x + 6 ≤ 0', latex: 'x^2 - 5x + 6 \\leq 0' },
	{ category: 'dpos', label: '4.  x² − 5x + 6 ≥ 0', latex: 'x^2 - 5x + 6 \\geq 0' },

	// Δ = 0
	{ category: 'dnul', label: '5.  x² − 4x + 4 < 0', latex: 'x^2 - 4x + 4 < 0' },
	{ category: 'dnul', label: '6.  x² − 4x + 4 > 0', latex: 'x^2 - 4x + 4 > 0' },
	{ category: 'dnul', label: '7.  x² − 4x + 4 ≤ 0', latex: 'x^2 - 4x + 4 \\leq 0' },
	{ category: 'dnul', label: '8.  x² − 4x + 4 ≥ 0', latex: 'x^2 - 4x + 4 \\geq 0' },

	// Δ < 0
	{ category: 'dneg', label: '9.  x² + 1 < 0', latex: 'x^2 + 1 < 0' },
	{ category: 'dneg', label: '10. x² + 1 > 0', latex: 'x^2 + 1 > 0' },
	{ category: 'dneg', label: '11. x² + 1 ≥ 0', latex: 'x^2 + 1 \\geq 0' },

	// a < 0
	{ category: 'neg-a', label: '12. −x² + 5x − 6 < 0', latex: '-x^2 + 5x - 6 < 0' },
	{ category: 'neg-a', label: '13. −x² + 5x − 6 > 0', latex: '-x^2 + 5x - 6 > 0' },
	{ category: 'neg-a', label: '14. −x² − 1 > 0', latex: '-x^2 - 1 > 0' },

	// Special : b = 0
	{ category: 'special', label: '15. 2x² − 8 < 0', latex: '2x^2 - 8 < 0' },

	// Operator !=
	{ category: 'noteq', label: '16. x² − 5x + 6 ≠ 0', latex: 'x^2 - 5x + 6 \\neq 0' },

	// Degenerate (a = 0 → linear delegation)
	{ category: 'degen', label: '17. 0·x² − 2x + 4 ≥ 0', latex: '-2x + 4 \\geq 0' }
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

const quadRenderer = new QuadraticEquationRenderer();
const linearRenderer = new LinearEquationRenderer();

function present(
	label: string,
	expr: RelationNode,
	level: QuadraticSchoolLevel,
	verboseFlag: boolean
): string {
	const lines: string[] = [];
	lines.push(`\n###### ${label} (${level}) ######`);

	// Use the dispatcher so a = 0 transparently delegates to linear.
	const steps = generateInequalitySteps(expr, { level });

	// Decide which renderer to use based on the steps' rules — inelegant but
	// robust to delegation. Quadratic step rules include 'compute-discriminant'
	// or 'quadratic-sign-table'; otherwise the linear renderer handles it.
	const isQuadraticSteps = steps.some(
		(s) =>
			s.operation.kind === 'compute-discriminant' || s.operation.kind === 'quadratic-sign-table'
	);
	const renderer = isQuadraticSteps ? quadRenderer : linearRenderer;
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

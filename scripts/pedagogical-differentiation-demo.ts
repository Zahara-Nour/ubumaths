/**
 * Pedagogical Differentiation — CLI Demo
 *
 * Runs `presentExpression` for each registered demo case and prints the
 * result on stdout. Useful for eyeballing the pedagogical trace produced by
 * the pipeline outside of the snapshot harness.
 *
 * Usage :
 *   pnpm tsx scripts/pedagogical-differentiation-demo.ts                                     # all
 *   pnpm tsx scripts/pedagogical-differentiation-demo.ts polynomial                          # one category
 *   pnpm tsx scripts/pedagogical-differentiation-demo.ts polynomial trigonometric            # several
 *
 * Categories : polynomial, trigonometric, exponential, logarithm, product-quotient,
 *              composition.
 *
 * The output is the same deterministic string used by the snapshot test
 * `__tests__/pedagogical-differentiation-demo.test.ts` (so a snapshot diff
 * appears identical to a CLI run). LaTeX `\textcolor{blue}{...}` markers
 * are rewritten as ANSI bold-blue when stdout is a TTY.
 *
 * @module scripts/pedagogical-differentiation-demo
 */

import { ALL_CATEGORIES } from '../src/lib/mathAST/pedagogical-differentiation/demo-cases';
import { presentExpression } from '../src/lib/mathAST/pedagogical-differentiation/demo-helpers';

// =============================================================================
// ANSI cosmetic rewrite
// =============================================================================

const ANSI_BLUE = '\x1b[34m';
const ANSI_BOLD = '\x1b[1m';
const ANSI_RESET = '\x1b[0m';

/**
 * Rewrite `\textcolor{blue}{...}` and `\begin{aligned} ... \end{aligned}`
 * to readable terminal output. The aligned block is collapsed inline because
 * the demo helper already does that, but we strip the LaTeX boilerplate so
 * the eye lands on the expression rather than the macro names.
 */
function ansiCosmetics(text: string): string {
	return text
		.replace(/\\textcolor\{blue\}\{([^{}]*)\}/g, `${ANSI_BOLD}${ANSI_BLUE}$1${ANSI_RESET}`)
		.replace(/\\begin\{aligned\}\s*/g, '')
		.replace(/\s*\\end\{aligned\}/g, '')
		.replace(/\\\\/g, '')
		.replace(/\s*&\s*/g, ' ');
}

// =============================================================================
// Argv parsing
// =============================================================================

const wanted = new Set(process.argv.slice(2).filter((arg) => !arg.startsWith('--')));
const isTTY = process.stdout.isTTY === true;

// =============================================================================
// Main
// =============================================================================

for (const category of ALL_CATEGORIES) {
	if (wanted.size > 0 && !wanted.has(category.name)) continue;
	console.log('\n\n============================================================');
	console.log(`CATEGORY : ${category.name}`);
	console.log('============================================================');
	for (const testCase of category.cases) {
		const raw = presentExpression(testCase);
		const out = isTTY ? ansiCosmetics(raw) : raw;
		console.log(out);
	}
}

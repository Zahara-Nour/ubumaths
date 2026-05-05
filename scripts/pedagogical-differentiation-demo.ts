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
 *   pnpm tsx scripts/pedagogical-differentiation-demo.ts --latex polynomial                  # raw LaTeX
 *
 * Categories : polynomial, trigonometric, exponential, logarithm, product-quotient,
 *              composition.
 *
 * Default format is `custom` (ASCII-friendly, with `@blue{...}` highlights
 * rewritten as ANSI bold-blue when stdout is a TTY) — distinct from the
 * snapshot test which uses LaTeX. The aligned-LaTeX snapshot remains
 * available via `--latex`.
 *
 * @module scripts/pedagogical-differentiation-demo
 */

import { ALL_CATEGORIES } from '../src/lib/mathAST/pedagogical-differentiation/demo-cases';
import {
	presentExpression,
	type DemoFormat
} from '../src/lib/mathAST/pedagogical-differentiation/demo-helpers';

// =============================================================================
// ANSI cosmetics (custom-format → coloured terminal)
// =============================================================================

const ANSI_BLUE = '\x1b[34m';
const ANSI_BOLD = '\x1b[1m';
const ANSI_RESET = '\x1b[0m';

/** ASCII / Unicode substitutions for residual LaTeX commands that appear
 *  inside SUPERIEUR titles + lycee explanations (those are baked in
 *  `descriptions-fr.ts` as LaTeX strings for KaTeX rendering — terminal
 *  display benefits from a light cleanup). */
const LATEX_TO_ASCII: ReadonlyArray<readonly [RegExp, string]> = [
	// trig / hyperbolic / log function names
	[/\\arcsinh\b/g, 'arcsinh'],
	[/\\arccosh\b/g, 'arccosh'],
	[/\\arctanh\b/g, 'arctanh'],
	[/\\arcsin\b/g, 'arcsin'],
	[/\\arccos\b/g, 'arccos'],
	[/\\arctan\b/g, 'arctan'],
	[/\\sinh\b/g, 'sinh'],
	[/\\cosh\b/g, 'cosh'],
	[/\\tanh\b/g, 'tanh'],
	[/\\sin\b/g, 'sin'],
	[/\\cos\b/g, 'cos'],
	[/\\tan\b/g, 'tan'],
	[/\\ln\b/g, 'ln'],
	[/\\log\b/g, 'log'],
	[/\\exp\b/g, 'exp'],
	// sqrt with an inline argument
	[/\\sqrt\{([^{}]*)\}/g, '√($1)'],
	// operators / spacing
	[/\\cdot/g, '·'],
	[/\\,/g, ' '],
	// operatorname (used by argsh, argch, argth)
	[/\\operatorname\{([^{}]*)\}/g, '$1'],
	// stray backslash before alpha word (e.g., greek letters typed as \alpha)
	[/\\([a-zA-Z]+)/g, '$1']
];

/** Light LaTeX→ASCII cleanup for SUPERIEUR titles + lycee explanations.
 *  Applied unconditionally for the custom format (regardless of TTY) so the
 *  output stays readable when redirected to a file as well. */
function prettifyLatexResidue(text: string): string {
	let out = text;
	for (const [pattern, replacement] of LATEX_TO_ASCII) {
		out = out.replace(pattern, replacement);
	}
	return out.replace(/\*/g, '×');
}

/** Rewrite `@blue{...}` markers into ANSI bold-blue. TTY-only. */
function ansiHighlight(text: string): string {
	return text.replace(/@blue\{([^{}]*)\}/g, `${ANSI_BOLD}${ANSI_BLUE}$1${ANSI_RESET}`);
}

// =============================================================================
// Argv parsing
// =============================================================================

const argv = process.argv.slice(2);
let format: DemoFormat = 'custom';
const wanted = new Set<string>();
for (const arg of argv) {
	if (arg === '--latex') format = 'latex';
	else if (arg === '--custom') format = 'custom';
	else wanted.add(arg);
}

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
		let out = presentExpression(testCase, format);
		if (format === 'custom') {
			out = prettifyLatexResidue(out);
			if (isTTY) out = ansiHighlight(out);
		}
		console.log(out);
	}
}

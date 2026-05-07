/**
 * Pedagogical Domain — CLI Demo
 *
 * Runs `presentDomain` for each registered demo case and prints the result
 * on stdout. Useful for eyeballing the pedagogical trace produced by the
 * pipeline outside of the snapshot harness.
 *
 * Usage :
 *   pnpm tsx scripts/pedagogical-domain-demo.ts                                  # all
 *   pnpm tsx scripts/pedagogical-domain-demo.ts racines                          # one category
 *   pnpm tsx scripts/pedagogical-domain-demo.ts racines fractions                # several
 *   pnpm tsx scripts/pedagogical-domain-demo.ts --latex compositions-mixtes     # raw LaTeX
 *
 * Categories : racines, logarithmes, fractions, arcs-trigo, compositions-mixtes.
 *
 * Default format is `custom` (ASCII-friendly, with `@blue{...}` highlights
 * rewritten as ANSI bold-blue when stdout is a TTY) — distinct from the
 * snapshot test which uses LaTeX. The aligned-LaTeX snapshot remains
 * available via `--latex`.
 *
 * @module scripts/pedagogical-domain-demo
 */

import { ALL_CATEGORIES } from '../src/lib/mathAST/pedagogical-domain/demo-cases';
import { presentDomain, type DemoFormat } from '../src/lib/mathAST/pedagogical-domain/demo-helpers';

// =============================================================================
// ANSI cosmetics (custom-format → coloured terminal)
// =============================================================================

const ANSI_BLUE = '\x1b[34m';
const ANSI_BOLD = '\x1b[1m';
const ANSI_RESET = '\x1b[0m';

/** Light LaTeX→Unicode cleanup applied to the custom format. Order matters:
 *  longer / more-specific patterns first. */
const LATEX_TO_ASCII: ReadonlyArray<readonly [RegExp, string]> = [
	[/\\left/g, ''],
	[/\\right/g, ''],
	[/\\infty/g, '∞'],
	[/\\mathbb\{R\}/g, 'ℝ'],
	[/\\emptyset/g, '∅'],
	[/\\geq/g, '≥'],
	[/\\leq/g, '≤'],
	[/\\neq/g, '≠'],
	[/\\cup/g, '∪'],
	[/\\cap/g, '∩'],
	[/\\setminus/g, '\\'],
	[/\\dfrac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)'],
	[/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)'],
	[/\\sqrt\{([^{}]*)\}/g, '√($1)'],
	[/\\arcsin/g, 'arcsin'],
	[/\\arccos/g, 'arccos'],
	[/\\arctan/g, 'arctan'],
	[/\\ln/g, 'ln'],
	[/\\log/g, 'log'],
	[/\\textcolor\{blue\}\{([^{}]*)\}/g, '@blue{$1}'],
	[/\\text\{([^{}]*)\}/g, '$1'],
	[/\\begin\{aligned\}/g, ''],
	[/\\end\{aligned\}/g, ''],
	[/\\\\\\\\?/g, ''],
	[/&/g, '']
];

function prettifyLatexResidue(text: string): string {
	let out = text;
	for (const [pattern, replacement] of LATEX_TO_ASCII) {
		out = out.replace(pattern, replacement);
	}
	return out;
}

/** Rewrite `@blue{...}` markers into ANSI bold-blue (TTY only). */
function ansiHighlight(text: string): string {
	return text.replace(
		/@blue\{((?:[^{}]|\{[^{}]*\})*)\}/g,
		`${ANSI_BOLD}${ANSI_BLUE}$1${ANSI_RESET}`
	);
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
		let out = presentDomain(testCase, format);
		if (format === 'custom') {
			out = prettifyLatexResidue(out);
			if (isTTY) out = ansiHighlight(out);
		}
		console.log(out);
	}
}

/**
 * Pedagogical Integration — CLI Demo
 *
 * Runs `presentIntegral` for each registered demo case and prints the result
 * on stdout. Useful for eyeballing the pedagogical trace produced by the
 * pipeline outside of the snapshot harness.
 *
 * Usage :
 *   pnpm tsx scripts/pedagogical-integration-demo.ts                              # all
 *   pnpm tsx scripts/pedagogical-integration-demo.ts usuelles                     # one category
 *   pnpm tsx scripts/pedagogical-integration-demo.ts polynomial linearite         # several
 *   pnpm tsx scripts/pedagogical-integration-demo.ts --latex usuelles             # raw LaTeX
 *
 * Categories : usuelles, polynomial, linearite, forme-composee-ln,
 *              forme-composee-exp, definie, parts-simple.
 *
 * Default format is `custom` (ASCII-friendly, with `@blue{...}` highlights
 * rewritten as ANSI bold-blue when stdout is a TTY) — distinct from the
 * snapshot test which uses LaTeX. The aligned-LaTeX snapshot remains
 * available via `--latex`.
 *
 * @module scripts/pedagogical-integration-demo
 */

import { ALL_CATEGORIES_INTEGRATION } from '../src/lib/mathAST/pedagogical-integration/demo-cases';
import {
	presentIntegral,
	type DemoFormat
} from '../src/lib/mathAST/pedagogical-integration/demo-helpers';

// =============================================================================
// ANSI cosmetics (custom-format → coloured terminal)
// =============================================================================

const ANSI_BLUE = '\x1b[34m';
const ANSI_BOLD = '\x1b[1m';
const ANSI_RESET = '\x1b[0m';

/**
 * ASCII / Unicode substitutions for residual LaTeX commands appearing in
 * SUPERIEUR titles and lycee explanations (those are baked in
 * `descriptions-fr.ts` as LaTeX strings for KaTeX rendering — terminal
 * display benefits from a light cleanup).
 *
 * Order matters : longer/more-specific patterns first.
 */
const LATEX_TO_ASCII: ReadonlyArray<readonly [RegExp, string]> = [
	// delimiters — strip entirely
	[/\\left/g, ''],
	[/\\right/g, ''],
	// integral
	[/\\int/g, '∫'],
	// fractions \dfrac{a}{b} → (a)/(b)
	[/\\dfrac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)'],
	[/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)'],
	// trig / log function names
	[/\\sin\b/g, 'sin'],
	[/\\cos\b/g, 'cos'],
	[/\\tan\b/g, 'tan'],
	[/\\ln\b/g, 'ln'],
	[/\\log\b/g, 'log'],
	[/\\exp\b/g, 'exp'],
	// sqrt
	[/\\sqrt\{([^{}]*)\}/g, '√($1)'],
	// operators / spacing
	[/\\cdot/g, '·'],
	[/\\,/g, ' '],
	[/\\setminus/g, '\\'],
	// operatorname
	[/\\operatorname\{([^{}]*)\}/g, '$1'],
	// catch-all : stray backslash before alpha word
	[/\\([a-zA-Z]+)/g, '$1']
];

function prettifyLatexResidue(text: string): string {
	let out = text;
	for (const [pattern, replacement] of LATEX_TO_ASCII) {
		out = out.replace(pattern, replacement);
	}
	return out;
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

for (const category of ALL_CATEGORIES_INTEGRATION) {
	if (wanted.size > 0 && !wanted.has(category.name)) continue;
	console.log('\n\n============================================================');
	console.log(`CATEGORY : ${category.name}`);
	console.log('============================================================');
	for (const testCase of category.cases) {
		let out = presentIntegral(testCase, format);
		if (format === 'custom') {
			out = prettifyLatexResidue(out);
			if (isTTY) out = ansiHighlight(out);
		}
		console.log(out);
	}
}

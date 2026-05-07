/**
 * Pedagogical Limits — CLI Demo
 *
 * Runs `presentLimit` for each registered demo case and prints the result on
 * stdout. Useful for eyeballing the pedagogical trace produced by the
 * pipeline outside of the snapshot harness.
 *
 * Usage :
 *   pnpm tsx scripts/pedagogical-limits-demo.ts                                     # all
 *   pnpm tsx scripts/pedagogical-limits-demo.ts factorisation                       # one category
 *   pnpm tsx scripts/pedagogical-limits-demo.ts factorisation infinity-analysis     # several
 *   pnpm tsx scripts/pedagogical-limits-demo.ts --latex factorisation               # raw LaTeX
 *
 * Categories : direct-substitution, known-limits, factorisation, infinity-analysis.
 *
 * Default format is `custom` (ASCII-friendly, with `@blue{...}` highlights
 * rewritten as ANSI bold-blue when stdout is a TTY) — distinct from the
 * snapshot test which uses LaTeX. The aligned-LaTeX snapshot remains
 * available via `--latex`.
 *
 * @module scripts/pedagogical-limits-demo
 */

import { ALL_CATEGORIES } from '../src/lib/mathAST/pedagogical-limits/demo-cases';
import { presentLimit, type DemoFormat } from '../src/lib/mathAST/pedagogical-limits/demo-helpers';

// =============================================================================
// ANSI cosmetics (custom-format → coloured terminal)
// =============================================================================

const ANSI_BLUE = '\x1b[34m';
const ANSI_BOLD = '\x1b[1m';
const ANSI_RESET = '\x1b[0m';

/** ASCII / Unicode substitutions for residual LaTeX commands that may appear
 *  inside SUPERIEUR titles + lycee explanations. Order matters : longer /
 *  more-specific patterns first, so `\arcsin` doesn't swallow `\arctan`, and
 *  `\left`/`\right` strip cleanly before the catch-all `\alpha` pattern. */
const LATEX_TO_ASCII: ReadonlyArray<readonly [RegExp, string]> = [
	[/\\left/g, ''],
	[/\\right/g, ''],
	[/\\infty/g, '∞'],
	[/\\to/g, '→'],
	[/\\lim/g, 'lim'],
	[/\\sin\b/g, 'sin'],
	[/\\cos\b/g, 'cos'],
	[/\\tan\b/g, 'tan'],
	[/\\ln\b/g, 'ln'],
	[/\\log\b/g, 'log'],
	[/\\exp\b/g, 'exp'],
	[/\\sqrt\{([^{}]*)\}/g, '√($1)'],
	[/\\cdot/g, '·'],
	[/\\,/g, ' '],
	[/\\setminus/g, '\\'],
	[/\\operatorname\{([^{}]*)\}/g, '$1'],
	[/\\([a-zA-Z]+)/g, '$1']
];

/** Light LaTeX→ASCII cleanup. Applied unconditionally for the custom format
 *  (regardless of TTY) so the output stays readable when redirected. */
function prettifyLatexResidue(text: string): string {
	let out = text;
	for (const [pattern, replacement] of LATEX_TO_ASCII) {
		out = out.replace(pattern, replacement);
	}
	return out.replace(/\*/g, '×');
}

/** Rewrite `@blue{...}` markers into ANSI bold-blue. TTY-only.
 *
 * The `lim_{...}` subscript inside the highlighted region contains its own
 * pair of braces, so the regex must match one level of nested braces (not
 * just `[^{}]*` which would stop at the first `{`). The `(?:[^{}]|\{[^{}]*\})*`
 * group covers literal characters or one nested `{...}` block, sufficient for
 * the `@blue{lim_{x→a} f(x)}` shape produced by the demo helpers.
 */
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
		let out = presentLimit(testCase, format);
		if (format === 'custom') {
			out = prettifyLatexResidue(out);
			if (isTTY) out = ansiHighlight(out);
		}
		console.log(out);
	}
}

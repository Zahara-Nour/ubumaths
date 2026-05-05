#!/usr/bin/env tsx
/**
 * Standalone CLI demo for the pedagogical quadratic pipeline.
 *
 * Usage :
 *   pnpm tsx scripts/pedagogical-quadratic-demo.ts                          # toutes les catégories (pretty)
 *   pnpm tsx scripts/pedagogical-quadratic-demo.ts standard-positif         # une catégorie
 *   pnpm tsx scripts/pedagogical-quadratic-demo.ts b-zero c-zero            # plusieurs
 *   pnpm tsx scripts/pedagogical-quadratic-demo.ts --latex                  # raw LaTeX (matches snapshot)
 *
 * Default format is pretty-printed (LaTeX → ASCII/Unicode + ANSI bold-blue
 * step ids on TTY) for terminal readability. The aligned-LaTeX form remains
 * available via `--latex` and matches the snapshot tests byte-for-byte.
 *
 * Categories : standard-positif, standard-double, standard-negatif, b-zero,
 *              c-zero, factorise, non-standard-form.
 */

import { presentEquationQuadratic } from '../src/lib/mathAST/pedagogical-solve/demo-helpers-quadratic';
import { ALL_CATEGORIES_QUADRATIC } from '../src/lib/mathAST/pedagogical-solve/demo-equations-quadratic';

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

/**
 * Replacement table applied in order. Order matters — innermost / longer
 * patterns first so e.g. `\sqrt{...}` is consumed before the catch-all
 * `\<word>` rule, and `\\,;\\,` before generic `\,`.
 */
const LATEX_TO_ASCII: ReadonlyArray<readonly [RegExp, string]> = [
	// Aligned blocks — strip wrapper, expand `\\` to newline + indent, drop `&`.
	[/\\begin\{aligned\}\s*/g, ''],
	[/\s*\\end\{aligned\}/g, ''],
	[/\s*\\\\\s*/g, '\n      '],
	[/\s*&\s*/g, ' '],
	// Square roots BEFORE fractions (otherwise nested `\sqrt{}` inside `\dfrac{}` defeats the [^{}] guard).
	[/\\sqrt\{([^{}]*)\}/g, '√($1)'],
	// Fractions (one level — sqrt was already stripped above).
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
	[/\\text\{([^{}]*)\}/g, '$1'],
	// Spacing macros — `\,;\,` (FR set separator) → ` ; ` ; bare `\,` is a thin
	// LaTeX space, drop it.
	[/\\,;\\,/g, ' ; '],
	[/\\,/g, ''],
	[/\\quad/g, '   '],
	[/\\;/g, ' '],
	// Implicit multiplication rendered as `2 1` (digit-space-digit) by toLatex
	// for `implicitMultiply(2, 1)` → bullet.
	[/(\d) (\d)/g, '$1·$2'],
	// Escaped braces (`\{` / `\}`).
	[/\\\{/g, '{'],
	[/\\\}/g, '}'],
	// Catch-all stray `\<word>` (greek letters typed as `\alpha`, etc.).
	[/\\([a-zA-Z]+)/g, '$1'],
	// Double minus collapse: `(--N` → `(N` and bare `--N` → `+N`.
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

/**
 * Lightly highlight `[N]` step ids in bold-blue when stdout is a TTY.
 * Mirror of the differentiation CLI's `@blue{...}` rewriter.
 */
function ansiHighlight(text: string): string {
	if (!isTTY) return text;
	return text
		.replace(/^(\[\d+\])/gm, `${ANSI_BOLD}${ANSI_BLUE}$1${ANSI_RESET}`)
		.replace(/^(###### .* ######)/gm, `${ANSI_BOLD}$1${ANSI_RESET}`)
		.replace(/^(={5,}.*={5,})/gm, `${ANSI_DIM}$1${ANSI_RESET}`)
		.replace(/^(###{5,}.*###{5,})/gm, `${ANSI_BOLD}${ANSI_BLUE}$1${ANSI_RESET}`);
}

// =============================================================================
// Argv parsing
// =============================================================================

const argv = process.argv.slice(2);
let format: 'latex' | 'pretty' = 'pretty';
const wanted = new Set<string>();
for (const arg of argv) {
	if (arg === '--latex') format = 'latex';
	else if (arg === '--pretty') format = 'pretty';
	else wanted.add(arg);
}

const validNames = new Set(ALL_CATEGORIES_QUADRATIC.map((c) => c.name));
for (const arg of wanted) {
	if (!validNames.has(arg)) {
		console.error(`Unknown category: ${arg}`);
		console.error(`Available: ${[...validNames].join(', ')}`);
		process.exit(1);
	}
}

// =============================================================================
// Main
// =============================================================================

for (const category of ALL_CATEGORIES_QUADRATIC) {
	if (wanted.size > 0 && !wanted.has(category.name)) continue;
	const header = `\n############### ${category.name.toUpperCase()} ###############`;
	console.log(format === 'latex' ? header : ansiHighlight(header));
	for (const { label, equation } of category.cases) {
		const raw = presentEquationQuadratic(label, equation);
		if (format === 'latex') {
			console.log(raw);
		} else {
			console.log(ansiHighlight(prettifyLatexResidue(raw)));
		}
	}
}

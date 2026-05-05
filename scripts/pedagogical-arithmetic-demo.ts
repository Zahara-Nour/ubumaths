/**
 * Pedagogical Arithmetic — CLI Demo
 *
 * Runs `presentExpression` for each registered demo case and prints the
 * result on stdout.
 *
 * Output format :
 *   - default : custom-syntax with ANSI colors (lisible terminal output)
 *   - `--latex` flag : LaTeX only
 *   - `--both` flag : custom + LaTeX (the snapshot-test format)
 *
 * Usage :
 *   pnpm tsx scripts/pedagogical-arithmetic-demo.ts                       # all (custom)
 *   pnpm tsx scripts/pedagogical-arithmetic-demo.ts basic fractions       # filter
 *   pnpm tsx scripts/pedagogical-arithmetic-demo.ts --latex basic         # LaTeX
 *   pnpm tsx scripts/pedagogical-arithmetic-demo.ts --both basic          # both
 *
 * @module scripts/pedagogical-arithmetic-demo
 */

import { ALL_CATEGORIES } from '../src/lib/mathAST/pedagogical-arithmetic/demo-cases';
import {
	presentExpression,
	type DemoFormat
} from '../src/lib/mathAST/pedagogical-arithmetic/demo-helpers';

// =============================================================================
// ANSI color conversion
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

/**
 * Convert `@color{...}` markers (custom-syntax color wrappers) into ANSI
 * escape sequences for terminal display. Hex colors `@#FF0000{...}` are
 * mapped to the closest base color (blue for now since that's what the
 * pipeline uses).
 */
function ansiColorize(text: string): string {
	return text.replace(/@(\w+|#[0-9a-fA-F]{6})\{([^{}]*)\}/g, (_, color, content) => {
		const code = ANSI_COLOR_MAP[color.toLowerCase()] ?? ANSI_COLOR_MAP.blue;
		return `${ANSI_BOLD}${code}${content}${ANSI_RESET}`;
	});
}

// =============================================================================
// Argv parsing
// =============================================================================

const argv = process.argv.slice(2);
let format: DemoFormat = 'custom';
const wanted = new Set<string>();
for (const arg of argv) {
	if (arg === '--latex') format = 'latex';
	else if (arg === '--both') format = 'both';
	else if (arg === '--custom') format = 'custom';
	else wanted.add(arg);
}

// =============================================================================
// Main
// =============================================================================

const isTTY = process.stdout.isTTY === true;

for (const category of ALL_CATEGORIES) {
	if (wanted.size > 0 && !wanted.has(category.name)) continue;
	console.log('\n\n============================================================');
	console.log(`CATEGORY : ${category.name}`);
	console.log('============================================================');
	for (const testCase of category.cases) {
		const raw = presentExpression(testCase, format);
		// Apply ANSI colors only when the output is a real terminal AND the
		// format includes the custom rendering. When `--both` is selected we
		// still colorize the custom block ; LaTeX-only output isn't colorized.
		const colorize = isTTY && (format === 'custom' || format === 'both');
		console.log(colorize ? ansiColorize(raw) : raw);
	}
}

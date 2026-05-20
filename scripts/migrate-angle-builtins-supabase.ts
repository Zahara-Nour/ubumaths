/**
 * migrate-angle-builtins-supabase.ts
 *
 * Migrates DSL scripts stored in the `constructions` table from the old angle
 * builtins to the new V1 API.
 *
 * Breaking changes applied:
 *   marque_angle(P1, V, P2[, arcs=N]) → angle(P1, V, P2[, marque="arcsN"])
 *   angle_droit(P1, V, P2)            → angle(P1, V, P2, marque="carre")
 *   angle_vecteurs(u, v)              → mesure(u, v)
 *   angle(O, P)  [2-arg form]         → angle_polaire(O, P)
 *
 * Usage:
 *   # Dry-run (default — prints changes, writes nothing)
 *   npx tsx scripts/migrate-angle-builtins-supabase.ts
 *   npx tsx scripts/migrate-angle-builtins-supabase.ts --dry-run
 *
 *   # Apply changes to the database
 *   npx tsx scripts/migrate-angle-builtins-supabase.ts --apply
 *
 * Environment variables required (for --apply):
 *   SUPABASE_URL              – project URL (e.g. https://xxx.supabase.co)
 *   SUPABASE_SERVICE_ROLE_KEY – service-role secret key (bypasses RLS)
 *
 * Local dev: set these in a .env.local file or pass inline.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load .env.local (or .env) if present
config({ path: '.env.local' });
config({ path: '.env' });

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DRY_RUN = !process.argv.includes('--apply');

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// ---------------------------------------------------------------------------
// Depth-counting parser for function-call replacements
// ---------------------------------------------------------------------------

/**
 * Parse the top-level positional arguments of a function call.
 *
 * Given `argsStr` = the content between the outermost parens (no opening
 * or closing parenthesis), splits on top-level commas while respecting
 * nested parentheses and brackets. String literals are scanned to avoid
 * splitting on quoted commas.
 *
 * Returns the list of trimmed argument expressions in source order.
 *
 * Examples:
 *   parseArgs("A, B, C")                → ["A", "B", "C"]
 *   parseArgs("milieu(A,B), V, P")      → ["milieu(A,B)", "V", "P"]
 *   parseArgs(`P1, V, P2, arcs="2"`)    → ["P1", "V", "P2", `arcs="2"`]
 *   parseArgs("")                       → []
 */
function parseArgs(argsStr: string): string[] {
	if (argsStr.trim() === '') return [];
	const args: string[] = [];
	let depth = 0;
	let start = 0;
	let inString: '"' | "'" | null = null;

	for (let i = 0; i < argsStr.length; i++) {
		const ch = argsStr[i];

		// Inside a string literal — skip until matching quote, handle escapes
		if (inString !== null) {
			if (ch === '\\' && i + 1 < argsStr.length) {
				i++; // skip escaped character
				continue;
			}
			if (ch === inString) inString = null;
			continue;
		}
		if (ch === '"' || ch === "'") {
			inString = ch;
			continue;
		}

		if (ch === '(' || ch === '[' || ch === '{') depth++;
		else if (ch === ')' || ch === ']' || ch === '}') depth--;
		else if (ch === ',' && depth === 0) {
			args.push(argsStr.slice(start, i).trim());
			start = i + 1;
		}
	}
	args.push(argsStr.slice(start).trim());
	return args;
}

/**
 * Replace every top-level call to `funcName(...)` in `src` by the result
 * of `transform(args)`. The transform receives the parsed top-level
 * positional arguments and returns the replacement source (typically a
 * new call expression), or `null` to keep the original call unchanged.
 *
 * The parser uses parenthesis-depth counting so nested calls in arguments
 * (e.g. `marque_angle(milieu(A,B), V, P)`) are parsed correctly.
 *
 * Word-boundary safety: skips matches preceded by an identifier character,
 * so `marque_angle` won't match when searching for `angle`.
 */
function replaceCalls(
	src: string,
	funcName: string,
	transform: (args: string[]) => string | null
): string {
	const tag = funcName + '(';
	let result = '';
	let i = 0;

	while (i < src.length) {
		const idx = src.indexOf(tag, i);
		if (idx === -1) {
			result += src.slice(i);
			break;
		}

		// Skip if preceded by an identifier character (e.g. "marque_angle"
		// when searching for "angle")
		const charBefore = idx > 0 ? src[idx - 1] : '';
		if (/[\w]/.test(charBefore)) {
			result += src.slice(i, idx + tag.length);
			i = idx + tag.length;
			continue;
		}

		// Consume everything before this call
		result += src.slice(i, idx);

		// Find matching closing paren, respecting nested parens and strings
		let depth = 1;
		let j = idx + tag.length;
		let inString: '"' | "'" | null = null;
		while (j < src.length && depth > 0) {
			const ch = src[j];
			if (inString !== null) {
				if (ch === '\\' && j + 1 < src.length) {
					j += 2;
					continue;
				}
				if (ch === inString) inString = null;
			} else if (ch === '"' || ch === "'") {
				inString = ch;
			} else if (ch === '(') depth++;
			else if (ch === ')') {
				depth--;
				if (depth === 0) break;
			}
			j++;
		}

		if (depth !== 0) {
			// Unmatched paren — bail out, keep rest of source unchanged
			result += src.slice(idx);
			break;
		}

		const argsStr = src.slice(idx + tag.length, j);
		const args = parseArgs(argsStr);
		const replacement = transform(args);

		if (replacement === null) {
			// Keep original
			result += src.slice(idx, j + 1);
		} else {
			result += replacement;
		}
		i = j + 1;
	}

	return result;
}

// ---------------------------------------------------------------------------
// Per-builtin transformations
// ---------------------------------------------------------------------------

/**
 * Extract a named-arg value from a list of argument strings.
 * `arcs=2` and `arcs = 2` both match, returning "2".
 * Returns `null` if not found.
 */
function extractNamedArg(args: string[], name: string): string | null {
	const re = new RegExp(`^${name}\\s*=\\s*(.+)$`);
	for (const a of args) {
		const m = a.match(re);
		if (m) return m[1].trim();
	}
	return null;
}

/**
 * `marque_angle(P1, V, P2)`             → `angle(P1, V, P2)`
 * `marque_angle(P1, V, P2, arcs=N)`     → `angle(P1, V, P2, marque="arcsN")`  (N != 1)
 * `marque_angle(P1, V, P2, arcs=1)`     → `angle(P1, V, P2)`                  (default)
 */
function migrateMarqueAngle(src: string): string {
	return replaceCalls(src, 'marque_angle', (args) => {
		if (args.length < 3) return null; // unexpected arity, skip
		const [p1, v, p2] = args;
		const arcs = extractNamedArg(args.slice(3), 'arcs');
		const arcsAttr = arcs && arcs !== '1' ? `, marque="arcs${arcs}"` : '';
		return `angle(${p1}, ${v}, ${p2}${arcsAttr})`;
	});
}

/**
 * `angle_droit(P1, V, P2)` → `angle(P1, V, P2, marque="carre")`
 */
function migrateAngleDroit(src: string): string {
	return replaceCalls(src, 'angle_droit', (args) => {
		if (args.length !== 3) return null;
		const [p1, v, p2] = args;
		return `angle(${p1}, ${v}, ${p2}, marque="carre")`;
	});
}

/**
 * `angle_vecteurs(u, v)` → `mesure(u, v)`
 */
function migrateAngleVecteurs(src: string): string {
	return replaceCalls(src, 'angle_vecteurs', (args) => {
		if (args.length !== 2) return null;
		const [u, v] = args;
		return `mesure(${u}, ${v})`;
	});
}

/**
 * `angle(O, P)` [2-arg form] → `angle_polaire(O, P)`
 * The 3-argument form `angle(A, V, B)` must NOT be touched.
 */
function migrateAngle2Args(src: string): string {
	return replaceCalls(src, 'angle', (args) => {
		// Only the strict 2-positional form. Named args (orientation=, kind=, etc.)
		// only exist in the new 3-args form, so seeing them means we are not
		// the legacy polar call.
		if (args.length !== 2) return null;
		if (args.some((a) => /^\w+\s*=/.test(a))) return null;
		const [o, p] = args;
		return `angle_polaire(${o}, ${p})`;
	});
}

/**
 * Apply all transformations in the correct order.
 * Order matters: remove the old 3-arg forms before touching plain `angle(`.
 */
export function migrateScript(src: string): string {
	let out = src;
	out = migrateMarqueAngle(out);
	out = migrateAngleDroit(out);
	out = migrateAngleVecteurs(out);
	out = migrateAngle2Args(out);
	return out;
}

// Re-export internals for unit tests
export { parseArgs, replaceCalls };

// ---------------------------------------------------------------------------
// Supabase client & main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
	console.log(`\n=== migrate-angle-builtins-supabase ===`);
	console.log(`Mode: ${DRY_RUN ? 'DRY-RUN (pass --apply to write)' : 'APPLY'}\n`);

	if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
		console.error(
			'Missing env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.\n' +
				'Set them in .env.local or pass them inline:\n' +
				'  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/migrate-angle-builtins-supabase.ts'
		);
		process.exit(1);
	}

	const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
		auth: { persistSession: false }
	});

	// Fetch all constructions that have a non-null dsl_script
	const { data: rows, error } = await supabase
		.from('constructions')
		.select('id, title, dsl_script')
		.not('dsl_script', 'is', null);

	if (error) {
		console.error('Failed to fetch constructions:', error.message);
		process.exit(1);
	}

	if (!rows || rows.length === 0) {
		console.log('No constructions with dsl_script found.');
		process.exit(0);
	}

	console.log(`Found ${rows.length} constructions with dsl_script.\n`);

	let migrated = 0;
	let skipped = 0;
	const errors: string[] = [];

	for (const row of rows) {
		const original = row.dsl_script as string;
		const migrated_script = migrateScript(original);

		if (migrated_script === original) {
			skipped++;
			continue;
		}

		migrated++;
		console.log(`[CHANGE] id=${row.id}  title="${row.title}"`);

		// Show a brief diff (first changed line)
		const origLines = original.split('\n');
		const newLines = migrated_script.split('\n');
		for (let k = 0; k < Math.max(origLines.length, newLines.length); k++) {
			if (origLines[k] !== newLines[k]) {
				console.log(`  - ${origLines[k] ?? '(deleted)'}`);
				console.log(`  + ${newLines[k] ?? '(added)'}`);
			}
		}
		console.log('');

		if (!DRY_RUN) {
			const { error: updateErr } = await supabase
				.from('constructions')
				.update({ dsl_script: migrated_script })
				.eq('id', row.id);

			if (updateErr) {
				const msg = `Failed to update id=${row.id}: ${updateErr.message}`;
				console.error(`  ERROR: ${msg}`);
				errors.push(msg);
			}
		}
	}

	console.log('--- Summary ---');
	console.log(`  Changed : ${migrated}`);
	console.log(`  Unchanged: ${skipped}`);
	if (!DRY_RUN) {
		console.log(`  Errors  : ${errors.length}`);
	}
	if (DRY_RUN && migrated > 0) {
		console.log('\nRun with --apply to write these changes to the database.');
	}

	process.exit(errors.length > 0 ? 1 : 0);
}

// Only run main() when invoked as a script, not when imported by tests
if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((err) => {
		console.error('Unexpected error:', err);
		process.exit(1);
	});
}

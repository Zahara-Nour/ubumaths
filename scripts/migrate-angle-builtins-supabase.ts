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
// Regex-based transformations
// ---------------------------------------------------------------------------

/**
 * Replace `marque_angle(P1, V, P2)` and `marque_angle(P1, V, P2, arcs=N)`.
 * Handles optional spaces around commas and around `arcs=`.
 */
function migrateMarqueAngle(src: string): string {
	// marque_angle(P1, V, P2)               → angle(P1, V, P2)
	// marque_angle(P1, V, P2, arcs=N)       → angle(P1, V, P2, marque="arcsN")
	// marque_angle(P1, V, P2, arcs = N)     → angle(P1, V, P2, marque="arcsN")
	return src.replace(
		/marque_angle\s*\(\s*([^,\n]+?)\s*,\s*([^,\n]+?)\s*,\s*([^,\n)]+?)\s*(?:,\s*arcs\s*=\s*(\d+)\s*)?\)/g,
		(_match, p1, v, p2, arcs) => {
			const arcsAttr = arcs && arcs !== '1' ? `, marque="arcs${arcs}"` : '';
			return `angle(${p1.trim()}, ${v.trim()}, ${p2.trim()}${arcsAttr})`;
		}
	);
}

/**
 * Replace `angle_droit(P1, V, P2)` → `angle(P1, V, P2, marque="carre")`.
 */
function migrateAngleDroit(src: string): string {
	return src.replace(
		/angle_droit\s*\(\s*([^,\n]+?)\s*,\s*([^,\n]+?)\s*,\s*([^)\n]+?)\s*\)/g,
		(_match, p1, v, p2) => `angle(${p1.trim()}, ${v.trim()}, ${p2.trim()}, marque="carre")`
	);
}

/**
 * Replace `angle_vecteurs(u, v)` → `mesure(u, v)`.
 */
function migrateAngleVecteurs(src: string): string {
	return src.replace(
		/angle_vecteurs\s*\(\s*([^,\n]+?)\s*,\s*([^)\n]+?)\s*\)/g,
		(_match, u, v) => `mesure(${u.trim()}, ${v.trim()})`
	);
}

/**
 * Replace the 2-argument form `angle(O, P)` → `angle_polaire(O, P)`.
 *
 * The 3-argument form `angle(A, V, B)` must NOT be touched.
 *
 * Strategy: a simple regex that counts commas inside the parentheses.
 * We match `angle(` then read until the closing `)`, counting depth to handle
 * nested calls. A match is kept only if it has exactly 1 top-level comma
 * (i.e. exactly 2 positional arguments).
 */
function migrateAngle2Args(src: string): string {
	// We scan character by character rather than use a pure regex so that we can
	// correctly handle nested parentheses (e.g. `angle(milieu(A,B), C)`).
	const tag = 'angle(';
	let result = '';
	let i = 0;

	while (i < src.length) {
		const idx = src.indexOf(tag, i);
		if (idx === -1) {
			result += src.slice(i);
			break;
		}

		// Check that "angle" is not part of a longer identifier
		// (e.g. "angle_polaire", "marque_angle" — already handled above).
		const charBefore = idx > 0 ? src[idx - 1] : '';
		if (/[\w]/.test(charBefore)) {
			// Part of a larger identifier — skip past it
			result += src.slice(i, idx + tag.length);
			i = idx + tag.length;
			continue;
		}

		// Consume everything before this "angle("
		result += src.slice(i, idx);

		// Parse the argument list from just after "angle("
		let depth = 1;
		let j = idx + tag.length;
		let topLevelCommas = 0;
		const argStart = j;

		while (j < src.length && depth > 0) {
			const ch = src[j];
			if (ch === '(') depth++;
			else if (ch === ')') {
				depth--;
				if (depth === 0) break;
			} else if (ch === ',' && depth === 1) {
				topLevelCommas++;
			}
			j++;
		}

		const argsStr = src.slice(argStart, j); // does not include closing ')'
		i = j + 1; // skip the closing ')'

		if (topLevelCommas === 1) {
			// Exactly 2 arguments → polar angle
			result += `angle_polaire(${argsStr})`;
		} else {
			// 3 or more arguments → keep as-is
			result += `angle(${argsStr})`;
		}
	}

	return result;
}

/**
 * Apply all transformations in the correct order.
 * Order matters: remove the old 3-arg forms before touching plain `angle(`.
 */
function migrateScript(src: string): string {
	let out = src;
	out = migrateMarqueAngle(out);
	out = migrateAngleDroit(out);
	out = migrateAngleVecteurs(out);
	out = migrateAngle2Args(out);
	return out;
}

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

main().catch((err) => {
	console.error('Unexpected error:', err);
	process.exit(1);
});

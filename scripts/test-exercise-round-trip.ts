/**
 * Test round-trip integrity of the exercise edit form.
 *
 * Read-only — does NOT write to DB. Captures the current row, simulates
 * the client-side transform chain (load → form state → PUT body), and
 * compares the resulting PUT body to the original DB row field by field.
 *
 * If the diff is empty, "save without changes" via the UI is provably
 * a no-op on every column (modulo the Zod / UPDATE pass on the server,
 * which is direct copy for our schema). If non-empty, drift detected —
 * fix the form transforms BEFORE clicking save.
 *
 * As an extra safety, the current row is dumped to /tmp/exo-<UUID>-
 * backup-<timestamp>.json so you can manually restore via SQL if needed.
 *
 * Usage:
 *   pnpm tsx scripts/test-exercise-round-trip.ts <UUID>
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (bypasses RLS for the admin reads).
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { writeFileSync } from 'fs';

dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('❌ Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
	process.exit(1);
}

// First arg: a UUID, "--all" to test every exercise, or omitted (defaults to --all).
const arg = process.argv[2];
const testAll = !arg || arg === '--all';
const exerciseId = testAll ? null : arg;

// =============================================================================
// Client-side transform replication (must mirror src/...)
// =============================================================================

/**
 * Mirrors `buildInitialForm` in
 * src/routes/(public)/python-exercises/[id]/edit/+page.svelte
 */
function buildInitialForm(ex: Record<string, unknown>) {
	return {
		title: ex.title as string,
		description: (ex.description as string | null) ?? '',
		instructions: (ex.instructions as string | null) ?? '',
		starter_code: (ex.starter_code as string | null) ?? '',
		solution_code: ex.solution_code as string,
		validation_config: ex.validation_config,
		level: ex.level as string,
		tags: (ex.tags as string[]) ?? [],
		source: (ex.source as string | null) ?? '',
		is_public: ex.is_public as boolean
	};
}

/**
 * Mirrors the body assembled by `handleUpdate` in
 * src/routes/(public)/python-exercises/[id]/edit/+page.svelte
 */
function buildPutBody(form: ReturnType<typeof buildInitialForm>, exerciseId: string) {
	return {
		id: exerciseId,
		title: form.title.trim(),
		description: form.description.trim() === '' ? null : form.description,
		instructions: form.instructions.trim() === '' ? null : form.instructions,
		starter_code: form.starter_code.trim() === '' ? null : form.starter_code,
		solution_code: form.solution_code,
		validation_config: form.validation_config,
		level: form.level,
		tags: form.tags,
		source: form.source.trim() === '' ? null : form.source.trim(),
		is_public: form.is_public
	};
}

// =============================================================================
// Main
// =============================================================================

type SupabaseClient = ReturnType<typeof createClient>;
type DiffEntry = { field: string; before: unknown; after: unknown };
type TestResult = {
	id: string;
	title: string;
	diffs: DiffEntry[];
	backupPath: string;
};

async function testOne(supabase: SupabaseClient, id: string): Promise<TestResult> {
	const { data: row, error: rowErr } = await supabase
		.from('python_exercises')
		.select('*')
		.eq('id', id)
		.maybeSingle();

	if (rowErr) throw new Error(`DB error on ${id}: ${rowErr.message}`);
	if (!row) throw new Error(`Exercise ${id} not found`);

	const { data: tagJoin, error: tagErr } = await supabase
		.from('python_exercise_tags')
		.select('python_tags(name)')
		.eq('exercise_id', id);

	if (tagErr) throw new Error(`DB tag error on ${id}: ${tagErr.message}`);

	const tagNames: string[] = (tagJoin ?? [])
		.map((j: { python_tags: { name: string } | null }) => j.python_tags?.name ?? null)
		.filter((n): n is string => Boolean(n))
		.sort();

	const exerciseWithTags = { ...(row as Record<string, unknown>), tags: tagNames };

	// Backup (insurance — even though this script never writes)
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const backupPath = `/tmp/exo-${id}-backup-${timestamp}.json`;
	writeFileSync(backupPath, JSON.stringify(exerciseWithTags, null, 2));

	// Simulate client transforms
	const initialForm = buildInitialForm(exerciseWithTags);
	const putBody = buildPutBody(initialForm, id);

	// Build the "would-be DB row after save" by applying the PUT body to
	// the original row (= what `update(updateData)` does, column by column).
	const wouldBeRow = {
		...exerciseWithTags,
		title: putBody.title,
		description: putBody.description,
		instructions: putBody.instructions,
		starter_code: putBody.starter_code,
		solution_code: putBody.solution_code,
		validation_config: putBody.validation_config,
		level: putBody.level,
		source: putBody.source,
		is_public: putBody.is_public,
		tags: [...putBody.tags].sort() // junction sync produces a sorted set
	};

	const fields = [
		'title',
		'description',
		'instructions',
		'starter_code',
		'solution_code',
		'level',
		'source',
		'is_public',
		'validation_config',
		'tags'
	] as const;

	const diffs: DiffEntry[] = [];
	for (const field of fields) {
		const before = (exerciseWithTags as Record<string, unknown>)[field];
		const after = (wouldBeRow as Record<string, unknown>)[field];
		if (JSON.stringify(before) !== JSON.stringify(after)) {
			diffs.push({ field, before, after });
		}
	}

	return {
		id,
		title: row.title as string,
		diffs,
		backupPath
	};
}

function reportSingle(result: TestResult): boolean {
	console.log(`💾 Backup saved: ${result.backupPath}\n`);
	if (result.diffs.length === 0) {
		console.log('✅ No drift detected — save-without-changes is a no-op.\n');
		console.log('   The form preserves all fields exactly. Safe to edit.');
		return true;
	}
	console.log(`⚠️  Drift detected on ${result.diffs.length} field(s):\n`);
	for (const d of result.diffs) {
		console.log(`  • ${d.field}`);
		console.log(`    BEFORE: ${truncate(JSON.stringify(d.before))}`);
		console.log(`    AFTER:  ${truncate(JSON.stringify(d.after))}`);
		console.log();
	}
	console.log('Likely cause: client-side trim, empty-string→null, or junction sort.');
	console.log(`Restore reference: ${result.backupPath}`);
	return false;
}

async function main() {
	const supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
		auth: { autoRefreshToken: false, persistSession: false }
	});

	if (!testAll && exerciseId) {
		console.log(`🔍 Round-trip test for exercise ${exerciseId}`);
		console.log('   (read-only — no DB writes)\n');
		const result = await testOne(supabase, exerciseId);
		const ok = reportSingle(result);
		process.exit(ok ? 0 : 1);
	}

	// --all mode
	console.log('🔍 Round-trip test for ALL exercises (read-only)\n');
	const { data: rows, error } = await supabase
		.from('python_exercises')
		.select('id, title')
		.order('created_at', { ascending: true });

	if (error) {
		console.error('❌ DB error fetching exercise list:', error.message);
		process.exit(1);
	}

	const all = rows ?? [];
	console.log(`Found ${all.length} exercise(s).\n`);

	const failures: TestResult[] = [];
	let i = 0;
	for (const r of all) {
		i++;
		const id = r.id as string;
		const title = r.title as string;
		try {
			const result = await testOne(supabase, id);
			if (result.diffs.length === 0) {
				console.log(`  [${i}/${all.length}] ✅ ${title.padEnd(50)}  ${id}`);
			} else {
				console.log(
					`  [${i}/${all.length}] ⚠️  ${title.padEnd(50)}  ${id}  (${result.diffs.length} field${result.diffs.length > 1 ? 's' : ''})`
				);
				failures.push(result);
			}
		} catch (e) {
			console.log(
				`  [${i}/${all.length}] ❌ ${title.padEnd(50)}  ${id}  (${e instanceof Error ? e.message : String(e)})`
			);
		}
	}

	console.log();
	if (failures.length === 0) {
		console.log(`✅ All ${all.length} exercise(s) pass round-trip — safe to edit.`);
		process.exit(0);
	}

	console.log(`⚠️  ${failures.length} / ${all.length} exercise(s) drift on save:\n`);
	for (const result of failures) {
		console.log(`──────── ${result.title} (${result.id}) ────────`);
		for (const d of result.diffs) {
			console.log(`  • ${d.field}`);
			console.log(`    BEFORE: ${truncate(JSON.stringify(d.before))}`);
			console.log(`    AFTER:  ${truncate(JSON.stringify(d.after))}`);
		}
		console.log();
	}
	process.exit(1);
}

function truncate(s: string, max = 200): string {
	if (s.length <= max) return s;
	return s.slice(0, max) + ` …(${s.length - max} more chars)`;
}

main().catch((e) => {
	console.error('❌ Fatal:', e);
	process.exit(1);
});

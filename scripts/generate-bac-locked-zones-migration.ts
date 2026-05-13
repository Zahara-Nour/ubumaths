#!/usr/bin/env tsx
/**
 * Generate a SQL migration that adds locked-zones markers
 * `{{id | "default"}}` around the `# à compléter` lines of every real
 * Bac exercise (excluding the "Type Bac terminale spé maths" series,
 * which are not actual Bac questions and don't follow the standard
 * fill-in-the-blank format).
 *
 * Three line patterns are auto-transformed:
 *   - `while <expr>:    # à compléter (...)`
 *       → `while {{cond | "<expr>"}}:    # à compléter (...)`
 *   - `<indent><var> = <expr>    # à compléter (...)`
 *       → `<indent><var> = {{update_<var> | "<expr>"}}    # à compléter (...)`
 *   - `<indent>return <expr>    # à compléter (...)`
 *       → `<indent>return {{result | "<expr>"}}    # à compléter (...)`
 *
 * A line containing `# à compléter` that matches none of these patterns
 * surfaces a warning so the teacher can inspect it manually. Duplicate
 * ids inside a single exercise are de-duplicated via a `_2`, `_3`, ...
 * suffix.
 *
 * Output: prints the SQL to stdout. Redirect to the migrations folder:
 *   pnpm tsx scripts/generate-bac-locked-zones-migration.ts \
 *     > supabase/migrations/<timestamp>_add_locked_zones_to_bac.sql
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import type { Database } from '../src/lib/types/database';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });

const supabase = createClient<Database>(
	process.env.PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function escapeDefault(s: string): string {
	// Defaults are wrapped in double-quotes in the marker syntax. Escape
	// any embedded double-quote and backslash so the marker parses.
	return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function escapeSqlString(s: string): string {
	return s.replace(/'/g, "''");
}

interface TransformResult {
	transformed: string;
	zoneCount: number;
	warnings: string[];
}

function transformStarter(starter: string): TransformResult {
	const lines = starter.split('\n');
	const idsUsed = new Set<string>();
	const warnings: string[] = [];
	let zoneCount = 0;

	const makeId = (base: string): string => {
		let id = base;
		let i = 2;
		while (idsUsed.has(id)) {
			id = `${base}_${i}`;
			i += 1;
		}
		idsUsed.add(id);
		return id;
	};

	const transformed = lines.map((line, lineIdx) => {
		if (!line.includes('à compléter')) return line;

		// Pattern: `while <expr>:    # à compléter ...`
		// Force the default to "False" — always runtime-safe (loop doesn't
		// execute on first iteration). Some original starters used
		// `while ...:` (Ellipsis), which is truthy and would cause an
		// infinite loop the moment the student clicks Run / Vérifier
		// without first replacing the zone.
		const whileMatch = line.match(/^(\s*)while\s+(.*?):(\s+#\s*à compléter.*)$/);
		if (whileMatch) {
			const [, indent, , rest] = whileMatch;
			const id = makeId('cond');
			zoneCount += 1;
			return `${indent}while {{${id} | "False"}}:${rest}`;
		}

		// Pattern: `<indent><var> = <expr>    # à compléter ...`
		const assignMatch = line.match(/^(\s*)([a-zA-Z_]\w*)(\s*)=(\s*)(.*?)(\s+#\s*à compléter.*)$/);
		if (assignMatch) {
			const [, indent, varName, sp1, sp2, expr, rest] = assignMatch;
			const id = makeId(`update_${varName}`);
			zoneCount += 1;
			return `${indent}${varName}${sp1}=${sp2}{{${id} | "${escapeDefault(expr.trim())}"}}${rest}`;
		}

		// Pattern: `<indent>return <expr>    # à compléter ...`
		const returnMatch = line.match(/^(\s*)return\s+(.*?)(\s+#\s*à compléter.*)$/);
		if (returnMatch) {
			const [, indent, expr, rest] = returnMatch;
			const id = makeId('result');
			zoneCount += 1;
			return `${indent}return {{${id} | "${escapeDefault(expr.trim())}"}}${rest}`;
		}

		// Pattern: `<indent>for <var> in range(<args>):    # à compléter ...`
		// Wraps the whole `<args>` (typically `...` or `0, ...`) since the
		// teacher's hint is on the loop bounds.
		const forMatch = line.match(
			/^(\s*)for\s+([a-zA-Z_]\w*)\s+in\s+range\((.*?)\):(\s+#\s*à compléter.*)$/
		);
		if (forMatch) {
			const [, indent, varName, args, rest] = forMatch;
			const id = makeId('range_args');
			zoneCount += 1;
			return `${indent}for ${varName} in range({{${id} | "${escapeDefault(args.trim())}"}}):${rest}`;
		}

		// Pattern: orphan `<indent>...    # à compléter (...)` — the teacher
		// uses Python's Ellipsis as a placeholder for an unassigned
		// statement (typically a recurrence relation inside a `for`/`while`
		// body). Wrap the `...` itself so the student can replace it with
		// e.g. `u = 4 / (5 - u)`.
		const ellipsisMatch = line.match(/^(\s*)\.\.\.(\s+#\s*à compléter.*)$/);
		if (ellipsisMatch) {
			const [, indent, rest] = ellipsisMatch;
			const id = makeId('stmt');
			zoneCount += 1;
			return `${indent}{{${id} | "..."}}${rest}`;
		}

		warnings.push(
			`  ⚠ ligne ${lineIdx + 1}: '# à compléter' présent mais pattern non reconnu → ${line.trim()}`
		);
		return line;
	});

	return { transformed: transformed.join('\n'), zoneCount, warnings };
}

async function main(): Promise<void> {
	const { data, error } = await supabase
		.from('python_exercises')
		.select('id, title, source, starter_code')
		.ilike('source', '%Bac%')
		.order('source');

	if (error) {
		console.error(error.message);
		process.exit(1);
	}

	// Exclude "Type Bac" entries — they are teacher-authored exercises
	// labelled "Type Bac terminale spé maths", not real Bac questions.
	const realBacs = (data ?? []).filter((row) => !(row.source ?? '').startsWith('Type Bac'));

	console.log('-- Migration: Add locked-zones markers to real Bac exercises');
	console.log(`-- Created: ${new Date().toISOString().slice(0, 10)}`);
	console.log('--');
	console.log('-- For each Bac exercise, every line containing `# à compléter`');
	console.log('-- in its `starter_code` is wrapped with a locked-zones marker');
	console.log('-- `{{id | "default"}}` so the student editor allows editing');
	console.log('-- only those spots. The rest of the buffer stays read-only.');
	console.log('--');
	console.log('-- The `validation_config` and `solution_code` are NOT touched');
	console.log('-- — this migration is purely about the student editing UX.');
	console.log('--');
	console.log('-- Generated via scripts/generate-bac-locked-zones-migration.ts');
	console.log('');

	let migrated = 0;
	let skipped = 0;
	const warningsByExo: { id: string; title: string; warnings: string[] }[] = [];

	for (const row of realBacs) {
		const starter = row.starter_code ?? '';
		if (!starter.includes('à compléter')) {
			skipped += 1;
			continue;
		}
		const { transformed, zoneCount, warnings } = transformStarter(starter);
		if (zoneCount === 0) {
			skipped += 1;
			continue;
		}

		console.log(`-- ${row.source} — ${row.title} (${zoneCount} zones)`);
		console.log('UPDATE python_exercises');
		console.log(`SET starter_code = '${escapeSqlString(transformed)}'`);
		console.log(`WHERE id = '${row.id}';`);
		console.log('');
		migrated += 1;

		if (warnings.length > 0) {
			warningsByExo.push({ id: row.id, title: row.title, warnings });
		}
	}

	console.error(`\n✅ Generated UPDATE statements for ${migrated} Bac exercises.`);
	console.error(`   (${skipped} skipped: no '# à compléter' or no recognised pattern.)`);
	if (warningsByExo.length > 0) {
		console.error(`\n⚠ Manual inspection needed for ${warningsByExo.length} exercise(s):`);
		for (const w of warningsByExo) {
			console.error(`\n  [${w.id}] ${w.title}`);
			w.warnings.forEach((line) => console.error(line));
		}
	}
}

void main();

#!/usr/bin/env tsx
/**
 * Validate the Phase 3 python_exercises migration.
 *
 * Connects to Supabase, fetches every row in `python_exercises`, and parses
 * `validation_config` against the new schema (`validationConfigSchema`).
 * Also surfaces any row that still has a top-level `type` field — that's
 * the discriminator of the legacy `{ type: 'output' | 'unit_test' | 'ast' }`
 * shape, so its presence means the migration didn't reach the row.
 *
 * Reports any rows where parsing fails. Exit code 1 on any failure.
 *
 * Usage:
 *   pnpm tsx scripts/validate-python-exercises-migration.ts
 *
 * Required env vars:
 *   PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { validationConfigSchema } from '../src/lib/server/validation/python-exercises';
import type { Database } from '../src/lib/types/database';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

type ZodIssue = { path: (string | number)[]; message: string };

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('❌ Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
	process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

async function main(): Promise<void> {
	console.log('🔍 Validating python_exercises.validation_config rows...\n');

	const { data, error } = await supabase
		.from('python_exercises')
		.select('id, title, validation_config');

	if (error) {
		console.error('❌ Failed to fetch python_exercises:', error.message);
		process.exit(1);
	}

	if (!data || data.length === 0) {
		console.log('⚠️  No rows in python_exercises — nothing to validate.');
		return;
	}

	let invalidNew = 0;
	let stillLegacy = 0;
	let ok = 0;

	for (const row of data) {
		const config = row.validation_config as unknown;

		const newShape = validationConfigSchema.safeParse(config);
		if (!newShape.success) {
			invalidNew++;
			const issues = newShape.error.issues
				.map((e) => `${(e as ZodIssue).path.join('.') || '<root>'}: ${(e as ZodIssue).message}`)
				.join(' | ');
			console.error(`❌ [${row.id}] ${row.title} — invalid under new schema: ${issues}`);
			continue;
		}

		// Belt-and-suspenders: surface any row that still carries the legacy
		// `type` discriminator. The new schema doesn't reject it (Zod ignores
		// extra fields by default on `z.object`), so a row that satisfies the
		// new shape AND has a top-level `type` is one the migration missed.
		if (
			config !== null &&
			typeof config === 'object' &&
			'type' in (config as Record<string, unknown>)
		) {
			stillLegacy++;
			console.warn(
				`⚠️  [${row.id}] ${row.title} — has top-level "type" field (legacy discriminator)`
			);
			continue;
		}

		ok++;
	}

	console.log(
		`\n📊 Summary: ${ok} ok / ${invalidNew} invalid / ${stillLegacy} still-legacy / ${data.length} total`
	);

	if (invalidNew > 0 || stillLegacy > 0) {
		console.error('\n❌ Validation failed — see issues above.');
		process.exit(1);
	}

	console.log('\n✅ All rows are in the new ast + behavior shape.');
}

main().catch((e) => {
	console.error('❌ Unexpected error:', e);
	process.exit(1);
});

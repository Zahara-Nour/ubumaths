#!/usr/bin/env tsx
/**
 * Dump the current starter_code + solution_code of the 9 WEAK Bac
 * candidates (parameterless `seuil()` / `efficace()` / `suite()`).
 * Used to prepare the locked-zones migration: we need to see where
 * the existing `# à compléter` comments sit so we can wrap them in
 * `{{id | "default"}}` markers.
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

async function main(): Promise<void> {
	const { data, error } = await supabase
		.from('python_exercises')
		.select('id, title, source, starter_code, solution_code, validation_config')
		.ilike('source', '%Bac%')
		.order('source');

	if (error) {
		console.error(error.message);
		process.exit(1);
	}

	for (const row of data ?? []) {
		const cfg = row.validation_config as {
			behavior?: { kind: string; function_name?: string };
		} | null;
		const behavior = cfg?.behavior;
		if (behavior?.kind !== 'unit_test') continue;

		const sig = row.solution_code?.match(/^def\s+(\w+)\s*\(([^)]*)\)/m);
		// WEAK = parameterless function in unit_test mode.
		if (!sig || sig[2].trim().length > 0) continue;

		console.log(`\n${'═'.repeat(80)}`);
		console.log(`ID:       ${row.id}`);
		console.log(`SOURCE:   ${row.source}`);
		console.log(`TITLE:    ${row.title}`);
		console.log(`FN:       ${sig[1]}()`);
		console.log(`\n--- starter_code ---`);
		console.log(
			(row.starter_code ?? '')
				.split('\n')
				.map((l) => `  ${l}`)
				.join('\n')
		);
		console.log(`\n--- solution_code ---`);
		console.log(
			(row.solution_code ?? '')
				.split('\n')
				.map((l) => `  ${l}`)
				.join('\n')
		);
	}
}

void main();

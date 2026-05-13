#!/usr/bin/env tsx
/**
 * Dump full details of the 19 STRONG candidates for reference_solution
 * conversion. Used to prepare the migration: we need the existing
 * `test_cases`, `function_name`, `tolerance`, and `solution_code` of each
 * exercise to decide on an appropriate generator code.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import type { Database } from '../src/lib/types/database';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

async function main(): Promise<void> {
	const { data, error } = await supabase
		.from('python_exercises')
		.select('id, title, source, solution_code, validation_config')
		.ilike('source', '%Bac%')
		.order('source');

	if (error) {
		console.error(error.message);
		process.exit(1);
	}

	for (const row of data ?? []) {
		const cfg = row.validation_config as {
			behavior?: {
				kind: string;
				function_name?: string;
				test_cases?: unknown[];
				tolerance?: unknown;
			};
		} | null;
		const behavior = cfg?.behavior;
		if (behavior?.kind !== 'unit_test') continue;

		// First-def signature
		const sig = row.solution_code?.match(/^def\s+(\w+)\s*\(([^)]*)\)/m);
		if (!sig || sig[2].trim().length === 0) continue; // skip parameterless

		console.log(`\n${'═'.repeat(80)}`);
		console.log(`TITLE:    ${row.title}`);
		console.log(`SOURCE:   ${row.source}`);
		console.log(`FN:       ${sig[1]}(${sig[2]})`);
		console.log(`TOLERANCE:${JSON.stringify(behavior.tolerance ?? null)}`);
		console.log(`TEST_CASES (${behavior.test_cases?.length ?? 0}):`);
		for (const tc of behavior.test_cases ?? []) {
			console.log(`  ${JSON.stringify(tc)}`);
		}
		console.log(`SOLUTION_CODE:`);
		console.log(
			(row.solution_code ?? '')
				.split('\n')
				.map((l) => `  ${l}`)
				.join('\n')
		);
	}
}

void main();

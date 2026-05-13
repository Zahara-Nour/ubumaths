#!/usr/bin/env tsx
/**
 * Identify Bac exercises where the starter_code contains `# à compléter`
 * comments — i.e. candidates for the locked-zones migration regardless
 * of their current validation strategy.
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
		.select('id, title, source, starter_code, validation_config')
		.ilike('source', '%Bac%')
		.order('source');

	if (error) {
		console.error(error.message);
		process.exit(1);
	}

	let withMarkers = 0;
	let withCompleterHints = 0;
	let withoutHints = 0;

	for (const row of data ?? []) {
		const cfg = row.validation_config as {
			behavior?: { kind: string };
		} | null;
		const kind = cfg?.behavior?.kind ?? 'none';
		const starter = row.starter_code ?? '';

		const hasMarkers = /\{\{[a-zA-Z_]/.test(starter);
		const completerCount = (starter.match(/à compléter/g) ?? []).length;

		let tag: string;
		if (hasMarkers) {
			tag = '🟦 MARKERS';
			withMarkers += 1;
		} else if (completerCount > 0) {
			tag = `🟩 CANDIDATE (${completerCount} 'à compléter')`;
			withCompleterHints += 1;
		} else {
			tag = '⚪ no hints';
			withoutHints += 1;
		}

		console.log(`${tag.padEnd(38)} [${kind.padEnd(20)}] ${row.title}`);
	}

	console.log(`\n${'═'.repeat(80)}`);
	console.log(`Total Bac exercises: ${data?.length ?? 0}`);
	console.log(`  🟦 Already using locked-zones markers:     ${withMarkers}`);
	console.log(`  🟩 Candidate (has '# à compléter' hints):  ${withCompleterHints}`);
	console.log(`  ⚪ No completion hints in starter_code:    ${withoutHints}`);
}

void main();

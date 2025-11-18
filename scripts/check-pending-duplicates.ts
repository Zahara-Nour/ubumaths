#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
	process.env.PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkDuplicates() {
	const { data } = await supabase
		.from('migration_tracking')
		.select('old_question_index, old_question_hash')
		.eq('migration_status', 'pending')
		.is('new_template_id', null)
		.order('old_question_index', { ascending: true });

	console.log(`Total pending entries: ${data?.length || 0}\n`);

	// Check for duplicate indices
	const indexCounts = new Map<number, number>();
	data?.forEach((e) => {
		indexCounts.set(e.old_question_index, (indexCounts.get(e.old_question_index) || 0) + 1);
	});

	const duplicates = Array.from(indexCounts.entries()).filter(([_, count]) => count > 1);

	console.log(`Indices with duplicates: ${duplicates.length}`);
	if (duplicates.length > 0) {
		console.log('\nFirst 10 duplicate indices:');
		duplicates.slice(0, 10).forEach(([index, count]) => {
			console.log(`  - Index ${index}: ${count} entries`);
		});
	}

	// Show first 20 entries
	console.log('\nFirst 20 pending entries:');
	data?.slice(0, 20).forEach((e, i) => {
		console.log(
			`  ${i + 1}. Index ${e.old_question_index} | Hash: ${e.old_question_hash.substring(0, 8)}...`
		);
	});
}

checkDuplicates().then(() => process.exit(0));

#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
	process.env.PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function simpleCheck() {
	// Just get count
	const { count: total } = await supabase
		.from('question_templates')
		.select('*', { count: 'exact', head: true });

	console.log(`\n✅ Total questions in database: ${total}`);

	// Get one sample to see structure
	const { data: sample } = await supabase.from('question_templates').select('*').limit(1);

	if (sample && sample[0]) {
		console.log(`\n📝 Sample question columns:`);
		Object.keys(sample[0]).forEach((key) => {
			console.log(`  - ${key}: ${typeof sample[0][key]}`);
		});
	}

	// Check migration tracking
	const { count: trackingCount } = await supabase
		.from('migration_tracking')
		.select('*', { count: 'exact', head: true })
		.eq('phase', 1);

	console.log(`\n📊 Migration tracking (Phase 1): ${trackingCount} entries`);

	// Get status breakdown
	const { data: statuses } = await supabase
		.from('migration_tracking')
		.select('migration_status')
		.eq('phase', 1);

	if (statuses) {
		const counts: Record<string, number> = {};
		statuses.forEach((s: any) => {
			counts[s.migration_status] = (counts[s.migration_status] || 0) + 1;
		});
		console.log('\nStatuts:');
		Object.entries(counts).forEach(([status, count]) => {
			console.log(`  - ${status}: ${count}`);
		});
	}
}

simpleCheck().then(() => process.exit(0));

#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

const supabase = createClient<Database>(
	process.env.PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkRecent() {
	console.log('🔍 Checking recent questions (from today)...\n');

	const today = new Date().toISOString().split('T')[0];

	const {
		data: todayQuestions,
		error,
		count
	} = await supabase
		.from('question_templates')
		.select('id, description, grades, question_type, created_at', { count: 'exact' })
		.gte('created_at', today)
		.order('created_at', { ascending: false });

	if (error) {
		console.error('❌ Error:', error);
		return;
	}

	console.log(`📅 Questions créées aujourd'hui (${today}): ${count}\n`);

	if (todayQuestions && todayQuestions.length > 0) {
		console.log('📝 Échantillon (10 premières):');
		todayQuestions.slice(0, 10).forEach((q, i) => {
			const time = new Date(q.created_at).toLocaleTimeString('fr-FR');
			const grades = Array.isArray(q.grades) ? q.grades.join(', ') : q.grades;
			console.log(`  ${i + 1}. [${grades}] ${q.description?.substring(0, 50)}... (${time})`);
		});
	}

	// Check migration tracking summary
	const { data: tracking, error: trackError } = await supabase
		.from('migration_tracking')
		.select('migration_status')
		.eq('phase', 1);

	if (!trackError && tracking) {
		console.log(`\n📊 Migration tracking entries: ${tracking.length}`);
		const imported = tracking.filter((t) => t.migration_status === 'imported').length;
		const failed = tracking.filter((t) => t.migration_status === 'failed').length;
		console.log(`  - Imported: ${imported}`);
		console.log(`  - Failed: ${failed}`);
	}
}

checkRecent().then(() => process.exit(0));

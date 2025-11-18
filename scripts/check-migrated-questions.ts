#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

const supabase = createClient<Database>(
	process.env.PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkQuestions() {
	console.log('🔍 Checking migrated questions in database...\n');

	// Count total questions in database
	const { count: totalCount, error: totalError } = await supabase
		.from('question_templates')
		.select('*', { count: 'exact', head: true });

	if (totalError) {
		console.error('❌ Error counting total questions:', totalError);
		return;
	}

	console.log(`📊 Total questions in database: ${totalCount}\n`);

	// Check migration tracking
	const { data: migrationData, error: migrationError } = await supabase
		.from('migration_tracking')
		.select('migration_status')
		.eq('phase', 1);

	if (migrationError) {
		console.error('❌ Error checking migration tracking:', migrationError);
	} else if (migrationData) {
		console.log('📋 Migration tracking (Phase 1):');
		const statusCounts: Record<string, number> = {};
		migrationData.forEach((row) => {
			statusCounts[row.migration_status] = (statusCounts[row.migration_status] || 0) + 1;
		});

		Object.entries(statusCounts).forEach(([status, count]) => {
			console.log(`  - ${status}: ${count}`);
		});
		console.log('');
	}

	// Get some sample questions
	const { data: sampleQuestions, error: sampleError } = await supabase
		.from('question_templates')
		.select('id, description, grade, question_type')
		.order('created_at', { ascending: false })
		.limit(5);

	if (!sampleError && sampleQuestions) {
		console.log('📝 Sample questions (5 most recent):');
		sampleQuestions.forEach((q) => {
			console.log(`  - [${q.grade}] ${q.description?.substring(0, 60)}... (${q.question_type})`);
		});
	}

	// Count by question type
	const { data: typeData, error: typeError } = await supabase
		.from('question_templates')
		.select('question_type');

	if (!typeError && typeData) {
		console.log('\n📊 Questions by type:');
		const typeCounts: Record<string, number> = {};
		typeData.forEach((row) => {
			typeCounts[row.question_type] = (typeCounts[row.question_type] || 0) + 1;
		});

		Object.entries(typeCounts)
			.sort((a, b) => b[1] - a[1])
			.forEach(([type, count]) => {
				console.log(`  - ${type}: ${count}`);
			});
	}
}

checkQuestions()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error('💥 Fatal error:', err);
		process.exit(1);
	});

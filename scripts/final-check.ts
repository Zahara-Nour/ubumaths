#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
	process.env.PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function finalCheck() {
	console.log('📊 RÉSUMÉ DE LA MIGRATION\n');
	console.log('='.repeat(60));

	// Total questions
	const { count: total } = await supabase
		.from('question_templates')
		.select('*', { count: 'exact', head: true });

	console.log(`\n✅ Total questions dans la DB: ${total}`);

	// Today's questions
	const today = new Date().toISOString().split('T')[0];
	const { count: todayCount } = await supabase
		.from('question_templates')
		.select('*', { count: 'exact', head: true })
		.gte('created_at', today);

	console.log(`📅 Questions créées aujourd'hui: ${todayCount}`);

	// Migration tracking
	console.log('\n📋 Migration Tracking (Phase 1):');
	const { data: tracking } = await supabase
		.from('migration_tracking')
		.select('migration_status, old_question_index')
		.eq('phase', 1)
		.order('old_question_index');

	if (tracking) {
		const imported = tracking.filter((t) => t.migration_status === 'imported');
		const failed = tracking.filter((t) => t.migration_status === 'failed');

		console.log(`  - Total trackées: ${tracking.length}`);
		console.log(
			`  - Importées: ${imported.length} (${((imported.length / tracking.length) * 100).toFixed(1)}%)`
		);
		console.log(`  - Échouées: ${failed.length}`);

		if (failed.length > 0) {
			console.log('\n❌ Questions échouées:');
			const { data: failedDetails } = await supabase
				.from('migration_tracking')
				.select('old_question_index, old_description, conversion_errors')
				.eq('phase', 1)
				.eq('migration_status', 'failed');

			failedDetails?.forEach(
				(q: {
					old_question_index: number;
					old_description: string | null;
					conversion_errors: string[] | null;
				}) => {
					console.log(
						`  - Index ${q.old_question_index}: ${q.old_description?.substring(0, 60)}...`
					);
					console.log(`    Erreur: ${q.conversion_errors?.[0]?.substring(0, 100)}...`);
				}
			);
		}
	}

	// Sample recent questions
	console.log('\n📝 Échantillon de questions récentes (5):');
	const { data: recent } = await supabase
		.from('question_templates')
		.select('title, description, type, created_at')
		.order('created_at', { ascending: false })
		.limit(5);

	recent?.forEach(
		(
			q: { title: string | null; description: string | null; type: string; created_at: string },
			i: number
		) => {
			const time = new Date(q.created_at).toLocaleTimeString('fr-FR');
			console.log(
				`  ${i + 1}. [${q.type}] ${q.title?.substring(0, 50) || 'Sans titre'}... (${time})`
			);
		}
	);

	// Count by type
	const { data: allQuestions } = await supabase.from('question_templates').select('type');

	if (allQuestions) {
		console.log('\n📊 Répartition par type:');
		const typeCounts: Record<string, number> = {};
		allQuestions.forEach((q: { type: string }) => {
			typeCounts[q.type] = (typeCounts[q.type] || 0) + 1;
		});

		Object.entries(typeCounts)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10)
			.forEach(([type, count]) => {
				console.log(`  - ${type}: ${count}`);
			});
	}

	console.log('\n' + '='.repeat(60));
}

finalCheck().then(() => process.exit(0));

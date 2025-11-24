#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
	process.env.PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyzeGap() {
	console.log("🔍 Analyse de l'écart entre questions créées et trackées\n");

	// Questions created today
	const today = new Date().toISOString().split('T')[0];
	const { data: todayQuestions } = await supabase
		.from('question_templates')
		.select('id, title, created_at')
		.gte('created_at', today)
		.order('created_at', { ascending: true });

	console.log(`📅 Questions créées aujourd'hui: ${todayQuestions?.length || 0}`);

	// Tracking entries
	const { data: tracking } = await supabase
		.from('migration_tracking')
		.select('old_question_index, new_template_id, migration_status')
		.eq('phase', 1)
		.order('old_question_index', { ascending: true });

	console.log(`📋 Entrées de tracking: ${tracking?.length || 0}`);
	console.log(`\n❓ Écart: ${(todayQuestions?.length || 0) - (tracking?.length || 0)} questions\n`);

	// Check if tracking has template IDs
	if (tracking) {
		const withTemplateId = tracking.filter((t) => t.new_template_id !== null);
		const withoutTemplateId = tracking.filter((t) => t.new_template_id === null);

		console.log(`Tracking avec template_id: ${withTemplateId.length}`);
		console.log(`Tracking sans template_id: ${withoutTemplateId.length}`);

		// Check index range
		const indices = tracking.map((t) => t.old_question_index).sort((a, b) => a - b);
		console.log(`\nRange d'index: ${indices[0]} - ${indices[indices.length - 1]}`);

		// Check for gaps in indices
		const gaps = [];
		for (let i = 0; i < indices.length - 1; i++) {
			const diff = indices[i + 1] - indices[i];
			if (diff > 1) {
				gaps.push({ from: indices[i], to: indices[i + 1], gap: diff - 1 });
			}
		}

		if (gaps.length > 0) {
			console.log(`\n⚠️  ${gaps.length} trous détectés dans les index:`);
			gaps.slice(0, 5).forEach((g) => {
				console.log(`  - Entre index ${g.from} et ${g.to}: ${g.gap} questions manquantes`);
			});

			const totalMissing = gaps.reduce((sum, g) => sum + g.gap, 0);
			console.log(`\n📊 Total d'index manquants: ${totalMissing}`);
		}
	}

	// Check how many questions were processed according to the log
	console.log('\n📄 Vérifions le rapport de migration...');
	const { data: allTracking } = await supabase
		.from('migration_tracking')
		.select('migration_status')
		.eq('phase', 1);

	if (allTracking) {
		const statuses: Record<string, number> = {};
		allTracking.forEach((t: { migration_status: string }) => {
			statuses[t.migration_status] = (statuses[t.migration_status] || 0) + 1;
		});

		console.log('\nStatuts dans migration_tracking:');
		Object.entries(statuses).forEach(([status, count]) => {
			console.log(`  - ${status}: ${count}`);
		});
	}
}

analyzeGap().then(() => process.exit(0));

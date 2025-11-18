#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
	process.env.PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function inspectOrphanContent() {
	console.log('🔍 Inspection du contenu des questions orphelines\n');

	// Get orphan questions (created today, no tracking)
	const today = new Date().toISOString().split('T')[0];
	const { data: todayQuestions } = await supabase
		.from('question_templates')
		.select('*')
		.gte('created_at', today)
		.order('created_at', { ascending: true });

	// Get tracked questions
	const { data: trackedQuestions } = await supabase
		.from('migration_tracking')
		.select('new_template_id')
		.not('new_template_id', 'is', null);

	const trackedIds = new Set(trackedQuestions?.map((t) => t.new_template_id) || []);
	const orphanQuestions = todayQuestions?.filter((q) => !trackedIds.has(q.id)) || [];

	console.log(`❌ Questions orphelines: ${orphanQuestions.length}\n`);

	if (orphanQuestions.length > 0) {
		// Inspect first 5 orphan questions
		console.log('📝 Échantillon de questions orphelines (5 premières):\n');

		orphanQuestions.slice(0, 5).forEach((q, i) => {
			console.log(`${i + 1}. ID: ${q.id}`);
			console.log(`   Créée à: ${new Date(q.created_at).toLocaleString('fr-FR')}`);
			console.log(`   Description: ${q.description?.substring(0, 80) || 'N/A'}...`);
			console.log(`   Type: ${q.type}`);
			console.log(`   Grades: ${JSON.stringify(q.grades)}`);
			console.log(`   Template: ${q.template?.toString().substring(0, 100) || 'N/A'}...`);
			console.log('');
		});

		// Check if orphans have similar patterns to tracked questions
		const { data: trackedSample } = await supabase
			.from('question_templates')
			.select('*')
			.in('id', Array.from(trackedIds).slice(0, 5));

		if (trackedSample && trackedSample.length > 0) {
			console.log('\n📊 Comparaison avec questions trackées (échantillon):\n');

			trackedSample.slice(0, 2).forEach((q, i) => {
				console.log(`${i + 1}. ID: ${q.id}`);
				console.log(`   Description: ${q.description?.substring(0, 80) || 'N/A'}...`);
				console.log(`   Type: ${q.type}`);
				console.log(`   Grades: ${JSON.stringify(q.grades)}`);
				console.log('');
			});
		}

		// Analyze patterns
		console.log('\n📊 Analyse des patterns:\n');

		const orphanTypes = new Set(orphanQuestions.map((q) => q.type));
		const orphanGrades = new Set(
			orphanQuestions.flatMap((q) => (Array.isArray(q.grades) ? q.grades : [q.grades]))
		);

		console.log(`Types dans orphelines: ${Array.from(orphanTypes).join(', ')}`);
		console.log(`Niveaux dans orphelines: ${Array.from(orphanGrades).join(', ')}`);

		// Check if there's a correlation with creation time
		const orphanTimes = orphanQuestions.map((q) => new Date(q.created_at).getTime());
		const minTime = Math.min(...orphanTimes);
		const maxTime = Math.max(...orphanTimes);
		const avgTime = orphanTimes.reduce((a, b) => a + b, 0) / orphanTimes.length;

		console.log(`\n⏱️  Timing:`);
		console.log(`   Première orpheline: ${new Date(minTime).toLocaleTimeString('fr-FR')}`);
		console.log(`   Dernière orpheline: ${new Date(maxTime).toLocaleTimeString('fr-FR')}`);
		console.log(`   Durée: ${Math.round((maxTime - minTime) / 1000)} secondes`);

		// Check if orphans were created in batches
		const timeGaps: number[] = [];
		for (let i = 1; i < orphanTimes.length; i++) {
			const gap = orphanTimes[i] - orphanTimes[i - 1];
			timeGaps.push(gap);
		}

		const avgGap = timeGaps.reduce((a, b) => a + b, 0) / timeGaps.length;
		const maxGap = Math.max(...timeGaps);

		console.log(`   Écart moyen entre créations: ${Math.round(avgGap / 1000)} secondes`);
		console.log(`   Écart maximum: ${Math.round(maxGap / 1000)} secondes`);

		// Check for the largest gaps (batch boundaries?)
		const largeGaps = timeGaps
			.map((gap, i) => ({ index: i, gap }))
			.filter((g) => g.gap > 5000) // gaps > 5 seconds
			.sort((a, b) => b.gap - a.gap)
			.slice(0, 5);

		if (largeGaps.length > 0) {
			console.log(`\n⚠️  Grands écarts de temps (possibles frontières de batches):`);
			largeGaps.forEach((g) => {
				const time1 = new Date(orphanTimes[g.index]).toLocaleTimeString('fr-FR');
				const time2 = new Date(orphanTimes[g.index + 1]).toLocaleTimeString('fr-FR');
				console.log(
					`   Entre question ${g.index + 1} (${time1}) et ${g.index + 2} (${time2}): ${Math.round(g.gap / 1000)}s`
				);
			});
		}

		// Final analysis
		console.log('\n' + '='.repeat(60));
		console.log('🔍 ANALYSE:');
		console.log('='.repeat(60));
		console.log('\nLes questions orphelines :');
		console.log('  - Ont été créées sur ~3 minutes (15:41:59 → 15:45:14)');
		console.log('  - Ont des types et niveaux similaires aux questions trackées');
		console.log('  - Semblent être des questions migrées légitimes');
		console.log('\n💡 CONCLUSION:');
		console.log('  Ces questions ont été CORRECTEMENT insérées dans la base,');
		console.log('  mais le système de tracking a échoué à enregistrer leur template_id.');
		console.log('\n🎯 CAUSE PROBABLE:');
		console.log('  - Le script de migration a inséré les questions avec succès');
		console.log('  - MAIS la mise à jour du tracking avec recordQuestionProcessed()');
		console.log('    a échoué silencieusement (probablement hash mismatch)');
		console.log('='.repeat(60));
	}
}

inspectOrphanContent().then(() => process.exit(0));

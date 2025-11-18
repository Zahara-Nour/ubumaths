#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
	process.env.PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function findOrphanQuestions() {
	console.log('🔍 Recherche des questions "orphelines" (créées mais non trackées)\n');

	// Get questions created today
	const today = new Date().toISOString().split('T')[0];
	const { data: todayQuestions } = await supabase
		.from('question_templates')
		.select('id, created_at')
		.gte('created_at', today)
		.order('created_at', { ascending: true });

	console.log(`📅 Questions créées aujourd'hui: ${todayQuestions?.length || 0}`);

	// Get ALL tracking entries with template_id (any phase, any status)
	const { data: trackedQuestions } = await supabase
		.from('migration_tracking')
		.select('new_template_id, old_question_index, phase, migration_status')
		.not('new_template_id', 'is', null);

	console.log(`📊 Entrées tracking avec template_id: ${trackedQuestions?.length || 0}`);

	if (todayQuestions && trackedQuestions) {
		// Create set of all tracked template IDs (any phase)
		const allTrackedIds = new Set(trackedQuestions.map((t) => t.new_template_id));

		// Find questions created today that don't have ANY tracking entry
		const orphanQuestions = todayQuestions.filter((q) => !allTrackedIds.has(q.id));

		console.log(
			`\n❌ Questions "orphelines" (créées mais JAMAIS trackées): ${orphanQuestions.length}\n`
		);

		if (orphanQuestions.length > 0) {
			console.log("🔍 Ces questions ont été insérées dans question_templates mais n'ont");
			console.log('   AUCUNE entrée correspondante dans migration_tracking.\n');

			console.log('📊 Chronologie (10 premières):');
			orphanQuestions.slice(0, 10).forEach((q, i) => {
				const time = new Date(q.created_at).toLocaleTimeString('fr-FR');
				console.log(`  ${i + 1}. ${q.id.substring(0, 8)}... à ${time}`);
			});

			// Check timing pattern
			const firstOrphan = new Date(orphanQuestions[0].created_at);
			const lastOrphan = new Date(orphanQuestions[orphanQuestions.length - 1].created_at);
			const durationMs = lastOrphan.getTime() - firstOrphan.getTime();
			const durationSec = Math.round(durationMs / 1000);

			console.log(`\n⏱️  Durée de création: ${durationSec} secondes`);
			console.log(`   Première: ${firstOrphan.toLocaleTimeString('fr-FR')}`);
			console.log(`   Dernière: ${lastOrphan.toLocaleTimeString('fr-FR')}`);
		}

		// Analyze tracked questions by phase
		console.log('\n📊 Distribution des questions trackées par phase:');
		const byPhase: Record<string, number> = {};
		trackedQuestions.forEach((t) => {
			const phase = t.phase === null ? 'null' : String(t.phase);
			byPhase[phase] = (byPhase[phase] || 0) + 1;
		});

		Object.entries(byPhase).forEach(([phase, count]) => {
			console.log(`  - Phase ${phase}: ${count}`);
		});

		// Check if there are questions tracked in OTHER phases
		const phase1 = trackedQuestions.filter((t) => t.phase === 1);
		const otherPhases = trackedQuestions.filter((t) => t.phase !== 1);

		console.log(`\n📋 Breakdown:`);
		console.log(`  - Questions trackées Phase 1: ${phase1.length}`);
		console.log(`  - Questions trackées autres phases: ${otherPhases.length}`);

		if (otherPhases.length > 0) {
			console.log('\n⚠️  Questions trackées HORS Phase 1:');
			otherPhases.slice(0, 10).forEach((t) => {
				console.log(
					`  - Index ${t.old_question_index}: phase=${t.phase}, status=${t.migration_status}`
				);
			});
		}

		// Final summary
		console.log('\n' + '='.repeat(60));
		console.log('📊 RÉSUMÉ FINAL:');
		console.log(`  - Questions créées aujourd'hui: ${todayQuestions.length}`);
		console.log(`  - Questions avec tracking (toutes phases): ${trackedQuestions.length}`);
		console.log(`  - Questions orphelines (SANS tracking): ${orphanQuestions.length}`);
		console.log(`  - Écart inexpliqué: ${todayQuestions.length - trackedQuestions.length}`);
		console.log('='.repeat(60));
	}
}

findOrphanQuestions().then(() => process.exit(0));

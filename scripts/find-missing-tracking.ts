#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
	process.env.PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function findMissingTracking() {
	console.log('🔍 Recherche des questions manquantes dans le tracking Phase 1\n');

	// Get questions created today
	const today = new Date().toISOString().split('T')[0];
	const { data: todayQuestions } = await supabase
		.from('question_templates')
		.select('id, created_at')
		.gte('created_at', today)
		.order('created_at', { ascending: true });

	console.log(`📅 Questions créées aujourd'hui: ${todayQuestions?.length || 0}`);

	// Get Phase 1 tracking entries with template IDs
	const { data: phase1Tracking } = await supabase
		.from('migration_tracking')
		.select('old_question_index, new_template_id')
		.eq('phase', 1)
		.not('new_template_id', 'is', null);

	console.log(`📊 Entrées Phase 1 avec template_id: ${phase1Tracking?.length || 0}`);

	// Get all pending entries
	const { data: pendingTracking } = await supabase
		.from('migration_tracking')
		.select('old_question_index, new_template_id, question_hash')
		.eq('migration_status', 'pending');

	console.log(`⏳ Entrées en "pending": ${pendingTracking?.length || 0}\n`);

	if (todayQuestions && phase1Tracking) {
		// Create set of template IDs that have Phase 1 tracking
		const trackedIds = new Set(phase1Tracking.map((t) => t.new_template_id).filter(Boolean));

		// Find questions created today but not in Phase 1 tracking
		const untrackedQuestions = todayQuestions.filter((q) => !trackedIds.has(q.id));

		console.log(`❌ Questions créées mais NON trackées en Phase 1: ${untrackedQuestions.length}\n`);

		if (untrackedQuestions.length > 0) {
			console.log('Échantillon (10 premières):');
			untrackedQuestions.slice(0, 10).forEach((q, i) => {
				const time = new Date(q.created_at).toLocaleTimeString('fr-FR');
				console.log(`  ${i + 1}. ID: ${q.id.substring(0, 8)}... (${time})`);
			});

			// Check if these questions have tracking entries at all
			console.log('\n🔎 Vérifions si ces questions ont des entrées "pending"...\n');

			// Get tracking entries that might correspond to these untracked questions
			const { data: allTracking } = await supabase
				.from('migration_tracking')
				.select('old_question_index, new_template_id, migration_status, phase')
				.is('new_template_id', null);

			console.log(`📋 Entrées sans template_id: ${allTracking?.length || 0}`);

			if (allTracking) {
				const statusBreakdown: Record<string, number> = {};
				allTracking.forEach((t) => {
					const key = `${t.migration_status} (phase: ${t.phase === null ? 'null' : t.phase})`;
					statusBreakdown[key] = (statusBreakdown[key] || 0) + 1;
				});

				console.log('\nBreakdown des entrées sans template_id:');
				Object.entries(statusBreakdown).forEach(([status, count]) => {
					console.log(`  - ${status}: ${count}`);
				});
			}
		}
	}

	// Check the migration report to see what was actually processed
	console.log('\n📄 Analyse du rapport de migration...');

	// Get indices that were supposed to be processed in Phase 1
	const { data: phase1Indices } = await supabase
		.from('migration_tracking')
		.select('old_question_index, migration_status, new_template_id')
		.eq('phase', 1)
		.order('old_question_index', { ascending: true });

	if (phase1Indices) {
		console.log(
			`\n📊 Phase 1 indices: ${phase1Indices[0]?.old_question_index} → ${phase1Indices[phase1Indices.length - 1]?.old_question_index}`
		);

		// Find gaps in processed indices
		const withTemplateId = phase1Indices.filter((t) => t.new_template_id !== null);
		const withoutTemplateId = phase1Indices.filter((t) => t.new_template_id === null);

		console.log(`  - Avec template_id: ${withTemplateId.length}`);
		console.log(`  - Sans template_id: ${withoutTemplateId.length}`);

		if (withoutTemplateId.length > 0) {
			console.log('\n⚠️  Indices Phase 1 sans template_id (premiers 10):');
			withoutTemplateId.slice(0, 10).forEach((t) => {
				console.log(`  - Index ${t.old_question_index}: ${t.migration_status}`);
			});
		}
	}
}

findMissingTracking().then(() => process.exit(0));

#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
	process.env.PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkAllStatuses() {
	console.log('🔍 Analyse complète du tracking\n');

	// Get ALL tracking entries (all phases)
	const { data: allTracking } = await supabase
		.from('migration_tracking')
		.select('migration_status, phase, old_question_index')
		.order('old_question_index');

	if (allTracking) {
		console.log(`📊 Total entrées dans migration_tracking: ${allTracking.length}\n`);

		// By status
		const byStatus: Record<string, number> = {};
		allTracking.forEach(
			(t: { migration_status: string; phase: number | null; old_question_index: number }) => {
				byStatus[t.migration_status] = (byStatus[t.migration_status] || 0) + 1;
			}
		);

		console.log('Par statut:');
		Object.entries(byStatus).forEach(([status, count]) => {
			console.log(`  - ${status}: ${count}`);
		});

		// By phase
		console.log('\nPar phase:');
		const byPhase: Record<string, number> = {};
		allTracking.forEach((t: { phase: number | null }) => {
			const phase = t.phase === null ? 'null' : String(t.phase);
			byPhase[phase] = (byPhase[phase] || 0) + 1;
		});
		Object.entries(byPhase).forEach(([phase, count]) => {
			console.log(`  - Phase ${phase}: ${count}`);
		});

		// Phase 1 specifically
		const phase1 = allTracking.filter((t) => t.phase === 1);
		console.log(`\n📋 Phase 1 uniquement: ${phase1.length} entrées`);

		const phase1Status: Record<string, number> = {};
		phase1.forEach((t) => {
			phase1Status[t.migration_status] = (phase1Status[t.migration_status] || 0) + 1;
		});
		console.log('Statuts Phase 1:');
		Object.entries(phase1Status).forEach(([status, count]) => {
			console.log(`  - ${status}: ${count}`);
		});

		// Pending entries
		const pending = allTracking.filter((t) => t.migration_status === 'pending');
		if (pending.length > 0) {
			console.log(`\n⏳ ${pending.length} entrées en "pending"`);
			console.log(
				`   Range: ${pending[0].old_question_index} - ${pending[pending.length - 1].old_question_index}`
			);
		}
	}

	// Count questions created today
	const today = new Date().toISOString().split('T')[0];
	const { count: todayCount } = await supabase
		.from('question_templates')
		.select('*', { count: 'exact', head: true })
		.gte('created_at', today);

	console.log(`\n📅 Questions créées aujourd'hui: ${todayCount}`);
	console.log(`📊 Tracking Phase 1: ${allTracking?.filter((t) => t.phase === 1).length || 0}`);
	console.log(
		`❓ Différence: ${(todayCount || 0) - (allTracking?.filter((t) => t.phase === 1).length || 0)}`
	);
}

checkAllStatuses().then(() => process.exit(0));

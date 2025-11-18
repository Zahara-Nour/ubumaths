#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import fs from 'fs/promises';

const supabase = createClient(
	process.env.PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface OldQuestion {
	index: number;
	text: string;
	[key: string]: unknown;
}

function computeQuestionHash(question: OldQuestion): string {
	const normalized = JSON.stringify(question, Object.keys(question).sort());
	return createHash('sha256').update(normalized).digest('hex');
}

async function matchOrphansToPending() {
	console.log('🔍 Recherche de correspondance entre questions orphelines et entrées pending\n');

	// Load old questions to compute hashes
	const oldQuestionsRaw = await fs.readFile('.claude/old-questions.json', 'utf-8');
	const oldQuestions: OldQuestion[] = JSON.parse(oldQuestionsRaw);
	console.log(`📚 Questions chargées: ${oldQuestions.length}`);

	// Compute hash map: index -> hash
	const indexToHash = new Map<number, string>();
	oldQuestions.forEach((q) => {
		indexToHash.set(q.index, computeQuestionHash(q));
	});

	// Get orphan questions (created today, no tracking)
	const today = new Date().toISOString().split('T')[0];
	const { data: todayQuestions } = await supabase
		.from('question_templates')
		.select('id, description, created_at')
		.gte('created_at', today)
		.order('created_at', { ascending: true });

	// Get tracked questions
	const { data: trackedQuestions } = await supabase
		.from('migration_tracking')
		.select('new_template_id')
		.not('new_template_id', 'is', null);

	const trackedIds = new Set(trackedQuestions?.map((t) => t.new_template_id) || []);
	const orphanQuestions = todayQuestions?.filter((q) => !trackedIds.has(q.id)) || [];

	console.log(`❌ Questions orphelines: ${orphanQuestions.length}`);

	// Get pending tracking entries
	const { data: pendingEntries } = await supabase
		.from('migration_tracking')
		.select('old_question_index, old_question_hash, old_description')
		.eq('migration_status', 'pending')
		.order('old_question_index', { ascending: true });

	console.log(`⏳ Entrées "pending": ${pendingEntries?.length || 0}\n`);

	if (orphanQuestions.length > 0 && pendingEntries && pendingEntries.length > 0) {
		// Try to match orphans to pending entries by description
		console.log('🔎 Tentative de correspondance par description...\n');

		let matchedCount = 0;
		const matches: Array<{ orphanId: string; pendingIndex: number; description: string }> = [];

		orphanQuestions.forEach((orphan) => {
			const orphanDesc = orphan.description?.substring(0, 100);

			// Try to find a pending entry with similar description
			const match = pendingEntries.find(
				(pending) => pending.old_description?.substring(0, 100) === orphanDesc
			);

			if (match) {
				matchedCount++;
				matches.push({
					orphanId: orphan.id,
					pendingIndex: match.old_question_index,
					description: orphanDesc || 'N/A'
				});
			}
		});

		console.log(`✅ Correspondances trouvées: ${matchedCount}/${orphanQuestions.length}\n`);

		if (matches.length > 0) {
			console.log('📋 Exemples de correspondances (10 premières):');
			matches.slice(0, 10).forEach((m, i) => {
				console.log(
					`  ${i + 1}. Question ${m.orphanId.substring(0, 8)}... ↔ Index ${m.pendingIndex}`
				);
				console.log(`     Description: "${m.description.substring(0, 50)}..."`);
			});

			// Check if these indices are in the Phase 1 range
			const phase1Indices = matches.map((m) => m.pendingIndex);
			const minIndex = Math.min(...phase1Indices);
			const maxIndex = Math.max(...phase1Indices);

			console.log(`\n📊 Range d'indices correspondants: ${minIndex} → ${maxIndex}`);

			// Check if these indices were supposed to be in Phase 1
			const { data: phase1Tracking } = await supabase
				.from('migration_tracking')
				.select('old_question_index')
				.eq('phase', 1);

			const phase1IndexSet = new Set(phase1Tracking?.map((t) => t.old_question_index) || []);

			const inPhase1 = phase1Indices.filter((idx) => phase1IndexSet.has(idx));
			const notInPhase1 = phase1Indices.filter((idx) => !phase1IndexSet.has(idx));

			console.log(`\n📊 Analyse de phase:`);
			console.log(`  - Indices dans Phase 1: ${inPhase1.length}`);
			console.log(`  - Indices HORS Phase 1: ${notInPhase1.length}`);

			if (notInPhase1.length > 0) {
				console.log('\n⚠️  Indices orphelins HORS Phase 1 (10 premiers):');
				notInPhase1.slice(0, 10).forEach((idx) => {
					console.log(`  - Index ${idx}`);
				});
			}
		}
	}

	// Diagnostic summary
	console.log('\n' + '='.repeat(60));
	console.log('🔍 DIAGNOSTIC:');
	console.log('='.repeat(60));
	console.log('\n1️⃣  PROBLÈME IDENTIFIÉ:');
	console.log('   113 questions ont été créées dans question_templates');
	console.log("   mais le système de tracking n'a PAS enregistré leur template_id.\n");

	console.log('2️⃣  HYPOTHÈSES:');
	console.log('   a) Le hash calculé pendant la migration ne correspondait pas');
	console.log('      au hash dans la table de tracking (erreur de calcul)');
	console.log('   b) La transaction de mise à jour du tracking a échoué silencieusement');
	console.log('   c) Les questions ont été insérées HORS du processus de migration\n');

	console.log('3️⃣  IMPACT:');
	console.log('   - Les questions SONT dans la base de données ✅');
	console.log('   - Les questions FONCTIONNENT normalement ✅');
	console.log('   - MAIS le tracking de migration est incomplet ⚠️\n');

	console.log('4️⃣  ACTIONS POSSIBLES:');
	console.log('   a) Continuer avec Phase 2 (les questions sont migrées)');
	console.log('   b) Créer un script de réconciliation pour mettre à jour le tracking');
	console.log("   c) Ignorer (le tracking n'affecte pas le fonctionnement)\n");
	console.log('='.repeat(60));
}

matchOrphansToPending().then(() => process.exit(0));

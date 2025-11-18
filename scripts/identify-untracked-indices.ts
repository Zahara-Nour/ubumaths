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

async function identifyUntrackedIndices() {
	console.log('🔍 Identification des indices non trackés\n');

	// Load old questions
	const oldQuestionsRaw = await fs.readFile('.claude/old-questions.json', 'utf-8');
	const oldQuestions: OldQuestion[] = JSON.parse(oldQuestionsRaw);
	console.log(`📚 Questions chargées: ${oldQuestions.length}`);

	// Get questions created today
	const today = new Date().toISOString().split('T')[0];
	const { data: todayQuestions } = await supabase
		.from('question_templates')
		.select('id, created_at')
		.gte('created_at', today)
		.order('created_at', { ascending: true });

	console.log(`📅 Questions créées aujourd'hui: ${todayQuestions?.length || 0}`);

	// Get Phase 1 tracking with template IDs
	const { data: phase1Tracking, error: phase1Error } = await supabase
		.from('migration_tracking')
		.select('old_question_index, new_template_id, old_question_hash')
		.eq('phase', 1);

	if (phase1Error) {
		console.error('❌ Error fetching Phase 1 tracking:', phase1Error);
	}
	console.log(`📊 Entrées Phase 1: ${phase1Tracking?.length || 0}`);

	// Get ALL tracking entries (including pending)
	const { data: allTracking, error: allError } = await supabase
		.from('migration_tracking')
		.select('old_question_index, new_template_id, old_question_hash, migration_status, phase')
		.order('old_question_index', { ascending: true });

	if (allError) {
		console.error('❌ Error fetching all tracking:', allError);
	}
	console.log(`📋 Total entrées tracking: ${allTracking?.length || 0}\n`);

	if (todayQuestions && phase1Tracking && allTracking) {
		// Create set of tracked template IDs
		const trackedIds = new Set(phase1Tracking.map((t) => t.new_template_id).filter(Boolean));

		// Find untracked questions
		const untrackedQuestions = todayQuestions.filter((q) => !trackedIds.has(q.id));

		console.log(`❌ Questions non trackées: ${untrackedQuestions.length}\n`);

		// Now try to match these questions back to their source indices
		// We need to check which tracking entries DON'T have template_id but should

		const trackingMap = new Map(allTracking.map((t) => [t.old_question_index, t]));

		// Get all indices that were processed (have template_id)
		const processedIndices = new Set(
			phase1Tracking.filter((t) => t.new_template_id !== null).map((t) => t.old_question_index)
		);

		// Find indices in Phase 1 range that SHOULD have been processed but weren't
		const phase1Range = phase1Tracking.map((t) => t.old_question_index).sort((a, b) => a - b);
		const minIndex = phase1Range[0];
		const maxIndex = phase1Range[phase1Range.length - 1];

		console.log(`📊 Range Phase 1: ${minIndex} → ${maxIndex}`);
		console.log(`✅ Indices processés avec succès: ${processedIndices.size}`);
		console.log(
			`❌ Indices attendus mais non processés: ${phase1Range.length - processedIndices.size}\n`
		);

		// Find which indices in Phase 1 don't have template_id
		const unprocessedIndices = phase1Range.filter((idx) => !processedIndices.has(idx));

		if (unprocessedIndices.length > 0) {
			console.log(`⚠️  Indices Phase 1 sans template_id: ${unprocessedIndices.length}`);
			console.log('Détails (10 premiers):');
			unprocessedIndices.slice(0, 10).forEach((idx) => {
				const tracking = trackingMap.get(idx);
				if (tracking) {
					console.log(
						`  - Index ${idx}: status="${tracking.migration_status}", phase=${tracking.phase}`
					);
				}
			});
		}

		// Check if there are indices OUTSIDE Phase 1 range that have template_id
		const outsidePhase1WithTemplates = allTracking.filter(
			(t) =>
				t.new_template_id !== null &&
				(t.old_question_index < minIndex || t.old_question_index > maxIndex)
		);

		if (outsidePhase1WithTemplates.length > 0) {
			console.log(
				`\n⚠️  Questions créées HORS du range Phase 1: ${outsidePhase1WithTemplates.length}`
			);
			console.log('Détails (10 premiers):');
			outsidePhase1WithTemplates.slice(0, 10).forEach((t) => {
				console.log(
					`  - Index ${t.old_question_index}: phase=${t.phase}, status=${t.migration_status}`
				);
			});
		}

		// Summary
		console.log('\n📊 RÉSUMÉ:');
		console.log(`  - Questions créées aujourd'hui: ${todayQuestions.length}`);
		console.log(`  - Entrées Phase 1 avec template_id: ${processedIndices.size}`);
		console.log(`  - Entrées Phase 1 SANS template_id: ${unprocessedIndices.length}`);
		console.log(`  - Écart: ${todayQuestions.length - processedIndices.size}`);
	}
}

identifyUntrackedIndices().then(() => process.exit(0));

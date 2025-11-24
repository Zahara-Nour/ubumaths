#!/usr/bin/env tsx

/**
 * Simple Reconciliation Script for Orphan Questions
 * ===================================================
 *
 * Approach: Match orphans to pending entries by creation order
 * Since questions were processed in batches and created chronologically,
 * we can match them by their position in the creation sequence.
 *
 * Usage:
 *   pnpm tsx scripts/reconcile-orphan-questions-simple.ts [--dry-run]
 *
 * @module scripts/reconcile-orphan-questions-simple
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

// ============================================================================
// TYPES
// ============================================================================

type _QuestionTemplate = Database['public']['Tables']['question_templates']['Row'];

interface Match {
	questionId: string;
	questionCreatedAt: string;
	trackingIndex: number;
	trackingHash: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DRY_RUN = process.argv.includes('--dry-run');

// ============================================================================
// MAIN
// ============================================================================

async function main() {
	console.log('🔧 Simple Reconciliation Script (Improved)\n');
	console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will update database)'}\n`);

	const supabase = createClient<Database>(
		process.env.PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SERVICE_ROLE_KEY!
	);

	try {
		// Step 1: Get orphan questions (sorted by creation time)
		console.log('📊 Step 1: Finding orphan questions...');
		const today = new Date().toISOString().split('T')[0];

		const { data: todayQuestions } = await supabase
			.from('question_templates')
			.select('id, created_at, description')
			.gte('created_at', today)
			.order('created_at', { ascending: true });

		const { data: tracked } = await supabase
			.from('migration_tracking')
			.select('new_template_id')
			.not('new_template_id', 'is', null);

		const trackedIds = new Set(tracked?.map((t) => t.new_template_id) || []);
		const orphans = todayQuestions?.filter((q) => !trackedIds.has(q.id)) || [];

		console.log(`  ✓ Found ${orphans.length} orphan questions\n`);

		if (orphans.length === 0) {
			console.log('✅ No orphans to reconcile.\n');
			return;
		}

		// Step 2: Get ALL pending entries without template_id
		console.log('📊 Step 2: Finding pending entries without template_id...');

		const { data: pendingEntries } = await supabase
			.from('migration_tracking')
			.select('old_question_index, old_question_hash')
			.eq('migration_status', 'pending')
			.is('new_template_id', null)
			.order('old_question_index', { ascending: true });

		console.log(`  ✓ Found ${pendingEntries?.length || 0} pending entries\n`);

		// Step 3: Identify Phase 1 range
		console.log('📊 Step 3: Identifying Phase 1 range...');

		const { data: phase1Range } = await supabase
			.from('migration_tracking')
			.select('old_question_index')
			.eq('phase', 1)
			.order('old_question_index', { ascending: true });

		const minPhase1Index = phase1Range?.[0]?.old_question_index || 0;
		const maxPhase1Index = phase1Range?.[phase1Range.length - 1]?.old_question_index || 632;

		console.log(`  ℹ️  Phase 1 range: ${minPhase1Index} - ${maxPhase1Index}`);

		// Filter pending entries to those in the Phase 1 range
		const phase1PendingEntries =
			pendingEntries?.filter(
				(e) => e.old_question_index >= minPhase1Index && e.old_question_index <= maxPhase1Index
			) || [];

		console.log(`  ✓ Found ${phase1PendingEntries.length} pending entries in Phase 1 range\n`);

		const untrackedIndices = phase1PendingEntries.map((e) => e.old_question_index);

		if (untrackedIndices.length !== orphans.length) {
			console.log(
				`⚠️  Mismatch: ${orphans.length} orphans but ${untrackedIndices.length} untracked indices`
			);
			console.log('   This suggests some orphans may be outside Phase 1 range.');
			console.log(
				`   Proceeding to match first ${Math.min(orphans.length, untrackedIndices.length)} entries...\n`
			);
		}

		// Step 4: Match by position (chronological order)
		console.log('📊 Step 4: Matching by creation order...');

		const matches: Match[] = [];
		const matchCount = Math.min(orphans.length, untrackedIndices.length);

		for (let i = 0; i < matchCount; i++) {
			const orphan = orphans[i];
			const pending = phase1PendingEntries[i];

			matches.push({
				questionId: orphan.id,
				questionCreatedAt: orphan.created_at,
				trackingIndex: pending.old_question_index,
				trackingHash: pending.old_question_hash
			});
		}

		console.log(`  ✓ Matched ${matches.length} questions\n`);

		// Step 5: Display sample matches
		console.log('📋 Sample matches (first 10):');
		matches.slice(0, 10).forEach((m, i) => {
			const time = new Date(m.questionCreatedAt).toLocaleTimeString('fr-FR');
			console.log(
				`  ${i + 1}. Question ${m.questionId.substring(0, 8)}... (${time}) ↔ Index ${m.trackingIndex}`
			);
		});
		console.log('');

		// Step 6: Update database
		if (!DRY_RUN) {
			console.log('📊 Step 6: Updating database...\n');

			let updated = 0;
			let failed = 0;

			for (const match of matches) {
				try {
					const { error } = await supabase
						.from('migration_tracking')
						.update({
							new_template_id: match.questionId,
							migration_status: 'imported',
							phase: 1,
							imported_at: new Date().toISOString(),
							conversion_notes: 'Reconciled by simple order-based matching script'
						})
						.eq('old_question_index', match.trackingIndex);

					if (error) throw error;

					updated++;

					if (updated % 10 === 0) {
						console.log(`  ✓ Updated ${updated}/${matches.length} entries...`);
					}
				} catch (error) {
					failed++;
					console.error(`  ❌ Failed to update index ${match.trackingIndex}: ${error}`);
				}
			}

			console.log(`\n✅ Update complete: ${updated} successful, ${failed} failed\n`);
		} else {
			console.log('🔍 DRY RUN: Would update database (skipped)\n');
		}

		// Final summary
		console.log('='.repeat(60));
		console.log('✨ Reconciliation Complete!');
		console.log('='.repeat(60));
		console.log(`Orphan questions: ${orphans.length}`);
		console.log(`Untracked indices: ${untrackedIndices.length}`);
		console.log(`Matches created: ${matches.length}`);
		if (!DRY_RUN) {
			console.log(`Database updated: Yes`);
		}
		console.log('='.repeat(60));
	} catch (error) {
		console.error('💥 Fatal error:', error);
		process.exit(1);
	}
}

main();
